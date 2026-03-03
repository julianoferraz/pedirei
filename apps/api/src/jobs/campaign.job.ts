import { prisma } from '@pedirei/database';
import { createWorker, campaignQueue } from './queue.js';

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
        isRegistered: true,
      },
      select: { phone: true },
    });

    // Actual sending handled by WhatsApp module
    console.log(`[Campaign] ${campaign.name}: sending to ${customers.length} customers`);

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentCount: customers.length,
        sentAt: new Date(),
      },
    });
  });
}
