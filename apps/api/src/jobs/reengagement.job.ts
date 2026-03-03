import { prisma } from '@pedirei/database';
import { createWorker, reengagementQueue } from './queue.js';

export function startReengagementWorker() {
  return createWorker('reengagement', async (job) => {
    const { tenantId } = job.data;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { reengageEnabled: true, reengageDays: true, reengageMessage: true, name: true },
    });

    if (!tenant?.reengageEnabled) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - tenant.reengageDays);

    const inactiveCustomers = await prisma.customer.findMany({
      where: {
        tenantId,
        lastOrderAt: { lt: cutoff },
        isRegistered: true,
      },
      select: { phone: true, name: true },
      take: 100,
    });

    console.log(`[Reengagement] Found ${inactiveCustomers.length} inactive customers for ${tenant.name}`);
    // Actual sending via WhatsApp module
  });
}

export async function scheduleReengagement() {
  const tenants = await prisma.tenant.findMany({
    where: { reengageEnabled: true, isActive: true },
    select: { id: true },
  });

  for (const tenant of tenants) {
    await reengagementQueue.add('check-inactive', { tenantId: tenant.id });
  }
}
