import { prisma, Prisma } from '@pedirei/database';
import { campaignQueue } from '../../jobs/queue.js';

export interface AudienceFilter {
  minOrders?: number;
  minSpent?: number;
  lastOrderDays?: number;
  lastContactDays?: number;
  minFeedback?: number;
  hasLoyalty?: boolean;
  isRegistered?: boolean;
}

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

export async function previewAudience(tenantId: string, filter?: AudienceFilter) {
  const where = buildCustomerWhere(tenantId, filter);
  const count = await prisma.customer.count({ where });
  return { count };
}

export async function createCampaign(tenantId: string, data: {
  name: string;
  message: string;
  type: 'PROMOTIONAL' | 'REENGAGEMENT';
  scheduledAt?: string;
  audienceFilter?: AudienceFilter;
}) {
  const filter = data.audienceFilter || undefined;
  const { count } = await previewAudience(tenantId, filter);

  return prisma.campaign.create({
    data: {
      tenantId,
      name: data.name,
      message: data.message,
      type: data.type,
      status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      audienceFilter: filter ? (filter as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      targetCount: count,
    },
  });
}

export async function listCampaigns(tenantId: string) {
  return prisma.campaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCampaign(tenantId: string, id: string) {
  return prisma.campaign.findFirst({ where: { id, tenantId } });
}

export async function getCampaignStats(tenantId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, tenantId } });
  if (!campaign) throw new Error('Campanha não encontrada');

  const [sent, failed, pending] = await Promise.all([
    prisma.campaignMessage.count({ where: { campaignId: id, status: 'SENT' } }),
    prisma.campaignMessage.count({ where: { campaignId: id, status: 'FAILED' } }),
    prisma.campaignMessage.count({ where: { campaignId: id, status: 'PENDING' } }),
  ]);

  return {
    ...campaign,
    stats: { sent, failed, pending, total: sent + failed + pending },
  };
}

export async function updateCampaign(tenantId: string, id: string, data: Partial<{
  name: string;
  message: string;
  scheduledAt: string;
  audienceFilter: AudienceFilter;
}>) {
  const updateData: any = { ...data };
  if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
  if (data.audienceFilter) {
    updateData.audienceFilter = data.audienceFilter as unknown as Prisma.InputJsonValue;
    const { count } = await previewAudience(tenantId, data.audienceFilter);
    updateData.targetCount = count;
  }
  delete updateData.audienceFilter;

  return prisma.campaign.updateMany({
    where: { id, tenantId, status: { in: ['DRAFT', 'SCHEDULED'] } },
    data: updateData,
  });
}

export async function deleteCampaign(tenantId: string, id: string) {
  return prisma.campaign.deleteMany({
    where: { id, tenantId, status: { in: ['DRAFT', 'SCHEDULED'] } },
  });
}

export async function sendCampaign(tenantId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId, status: { in: ['DRAFT', 'SCHEDULED'] } },
  });
  if (!campaign) throw new Error('Campanha não encontrada ou já enviada');

  await prisma.campaign.update({
    where: { id },
    data: { status: 'SENDING' },
  });

  await campaignQueue.add('send-campaign', { campaignId: id }, {
    attempts: 1,
    removeOnComplete: true,
  });

  return { message: 'Campanha em processamento' };
}
