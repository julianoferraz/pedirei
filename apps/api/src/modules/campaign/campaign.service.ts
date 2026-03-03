import { prisma, Prisma } from '@pedirei/database';

export async function createCampaign(tenantId: string, data: {
  name: string;
  message: string;
  type: 'PROMOTIONAL' | 'REENGAGEMENT';
  scheduledAt?: string;
}) {
  return prisma.campaign.create({
    data: {
      tenantId,
      name: data.name,
      message: data.message,
      type: data.type,
      status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });
}

export async function listCampaigns(tenantId: string) {
  return prisma.campaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateCampaign(tenantId: string, id: string, data: Partial<{
  name: string;
  message: string;
  scheduledAt: string;
}>) {
  return prisma.campaign.updateMany({
    where: { id, tenantId, status: { in: ['DRAFT', 'SCHEDULED'] } },
    data: {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    },
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

  // Actual sending is done by the campaign job
  return { message: 'Campanha em processamento' };
}
