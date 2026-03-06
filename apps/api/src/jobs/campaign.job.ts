import { prisma, Prisma } from '@pedirei/database';
import { createWorker, campaignQueue } from './queue.js';
import { sendWhatsAppMessage } from '@pedirei/whatsapp';
import { logger } from '../utils/logger.js';
import type { AudienceFilter } from '../modules/campaign/campaign.service.js';

function buildCustomerWhere(tenantId: string, filter?: AudienceFilter): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = { tenantId };

  if (!filter) return where;

  if (filter.minOrders != null) where.totalOrders = { gte: filter.minOrders };
  if (filter.minSpent != null) where.totalSpent = { gte: filter.minSpent };
  if (filter.lastOrderDays != null) {
    const since = new Date();
    since.setDate(since.getDate() - filter.lastOrderDays);
    where.lastOrderAt = { gte: since };
  }
  if (filter.lastContactDays != null) {
    const since = new Date();
    since.setDate(since.getDate() - filter.lastContactDays);
    where.lastContactAt = { gte: since };
  }
  if (filter.minFeedback != null) where.feedbackAvg = { gte: filter.minFeedback };
  if (filter.hasLoyalty) where.loyaltyPoints = { gt: 0 };
  if (filter.isRegistered != null) where.isRegistered = filter.isRegistered;

  return where;
}

export function startCampaignWorker() {
  return createWorker('campaign', async (job) => {
    const { campaignId } = job.data;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!campaign || campaign.status !== 'SENDING') return;

    const filter = campaign.audienceFilter as AudienceFilter | null;
    const where = buildCustomerWhere(campaign.tenantId, filter || undefined);

    const customers = await prisma.customer.findMany({
      where,
      select: { id: true, phone: true, name: true },
    });

    // Create CampaignMessage records for tracking
    if (customers.length > 0) {
      await prisma.campaignMessage.createMany({
        data: customers.map((c) => ({
          campaignId,
          customerId: c.id,
          phone: c.phone,
        })),
      });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { targetCount: customers.length },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      try {
        const msg = campaign.message
          .replace('{nome}', customer.name || 'Cliente')
          .replace('{loja}', campaign.tenant.name);
        const ok = await sendWhatsAppMessage(campaign.tenantId, customer.phone, msg);

        if (ok) {
          sentCount++;
          await prisma.campaignMessage.updateMany({
            where: { campaignId, customerId: customer.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
        } else {
          failedCount++;
          await prisma.campaignMessage.updateMany({
            where: { campaignId, customerId: customer.id },
            data: { status: 'FAILED', error: 'Envio retornou false' },
          });
        }
        // Rate limit: 1.5s between messages
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err: any) {
        failedCount++;
        await prisma.campaignMessage.updateMany({
          where: { campaignId, customerId: customer.id },
          data: { status: 'FAILED', error: err.message?.slice(0, 200) || 'Erro desconhecido' },
        });
        logger.error({ err, phone: customer.phone }, 'Campaign send failed');
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentCount,
        failedCount,
        sentAt: new Date(),
      },
    });

    logger.info({ campaignId, sentCount, failedCount, total: customers.length }, 'Campaign sent');
  });
}

// Polls SCHEDULED campaigns and triggers sending when scheduledAt <= now
export function startCampaignSchedulerJob() {
  campaignQueue.add('poll-scheduled', {}, {
    repeat: { every: 60_000 }, // every 1 minute
    removeOnComplete: true,
  });

  return createWorker('campaign-scheduler', async () => {
    const due = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
      },
    });

    for (const campaign of due) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'SENDING' },
      });

      await campaignQueue.add('send-campaign', { campaignId: campaign.id }, {
        attempts: 1,
        removeOnComplete: true,
      });

      logger.info({ campaignId: campaign.id }, 'Scheduled campaign triggered');
    }
  });
}
