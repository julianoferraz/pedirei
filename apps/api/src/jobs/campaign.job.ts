import { prisma } from '@pedirei/database';
import { createWorker, campaignQueue } from './queue.js';
import { sendWhatsAppMessage } from '@pedirei/whatsapp';
import { logger } from '../utils/logger.js';

export function startCampaignWorker() {
  return createWorker('campaign', async (job) => {
    const { campaignId } = job.data;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!campaign || campaign.status !== 'SENDING') return;

    const customers = await prisma.customer.findMany({
      where: {
        tenantId: campaign.tenantId,
        totalOrders: { gte: 1 },
      },
      select: { phone: true, name: true },
    });

    let sentCount = 0;

    for (const customer of customers) {
      try {
        const msg = campaign.message
          .replace('{nome}', customer.name || 'Cliente')
          .replace('{loja}', campaign.tenant.name);
        const ok = await sendWhatsAppMessage(campaign.tenantId, customer.phone, msg);
        if (ok) sentCount++;
        // Small delay between messages to avoid rate limits
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        logger.error({ err, phone: customer.phone }, 'Campaign send failed');
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentCount,
        sentAt: new Date(),
      },
    });

    logger.info({ campaignId, sentCount, total: customers.length }, 'Campaign sent');
  });
}
