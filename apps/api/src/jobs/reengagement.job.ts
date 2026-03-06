import { prisma } from '@pedirei/database';
import { createWorker, reengagementQueue } from './queue.js';
import { sendWhatsAppMessage } from '@pedirei/whatsapp';
import { logger } from '../utils/logger.js';

export function startReengagementWorker() {
  return createWorker('reengagement', async (job) => {
    const { tenantId } = job.data;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { reengageEnabled: true, reengageDays: true, reengageMessage: true, name: true },
    });

    if (!tenant?.reengageEnabled || !tenant.reengageMessage) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - tenant.reengageDays);

    const inactiveCustomers = await prisma.customer.findMany({
      where: {
        tenantId,
        lastOrderAt: { lt: cutoff },
        totalOrders: { gte: 1 },
      },
      select: { id: true, phone: true, name: true },
      take: 100,
    });

    if (inactiveCustomers.length === 0) return;

    let sentCount = 0;
    for (const customer of inactiveCustomers) {
      try {
        const msg = tenant.reengageMessage
          .replace('{nome}', customer.name || 'Cliente')
          .replace('{loja}', tenant.name);
        const ok = await sendWhatsAppMessage(tenantId, customer.phone, msg);
        if (ok) {
          sentCount++;
          await prisma.customer.update({
            where: { id: customer.id },
            data: { lastContactAt: new Date() },
          });
        }
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        logger.error({ err, phone: customer.phone }, 'Reengagement send failed');
      }
    }

    logger.info({ tenantId, sentCount, total: inactiveCustomers.length }, 'Reengagement batch sent');
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
