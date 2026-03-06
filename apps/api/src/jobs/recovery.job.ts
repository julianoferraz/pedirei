import { prisma } from '@pedirei/database';
import { createWorker, recoveryQueue } from './queue.js';
import { sendWhatsAppMessage } from '@pedirei/whatsapp';
import { logger } from '../utils/logger.js';

export function startRecoveryWorker() {
  return createWorker('recovery', async (job) => {
    const { orderId, tenantId } = job.data;

    // Re-fetch order to ensure it's still cancelled (wasn't recovered already)
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId, status: 'CANCELLED' },
      include: {
        customer: { select: { id: true, phone: true, name: true } },
        tenant: {
          select: {
            recoveryEnabled: true,
            recoveryMessage: true,
            recoveryDiscountPct: true,
            name: true,
            slug: true,
            plan: { select: { hasSalesRecovery: true } },
          },
        },
        recoveryAttempts: { select: { id: true } },
      },
    });

    if (!order) return;
    if (!order.tenant.recoveryEnabled) return;
    if (!order.tenant.plan.hasSalesRecovery) return;

    // Don't send if already attempted recovery for this order
    if (order.recoveryAttempts.length > 0) return;

    // Build recovery message
    let message = order.tenant.recoveryMessage
      .replace('{nome}', order.customer.name || 'Cliente')
      .replace('{loja}', order.tenant.name)
      .replace('{pedido}', String(order.orderNumber));

    // Add discount mention if configured
    if (order.tenant.recoveryDiscountPct > 0) {
      message += `\n\n🎁 Use o cupom VOLTAR e ganhe ${order.tenant.recoveryDiscountPct}% de desconto no próximo pedido!`;
    }

    // Add menu link
    message += `\n\n📱 Peça novamente: https://pedirei.online/${order.tenant.slug}`;

    try {
      const ok = await sendWhatsAppMessage(tenantId, order.customer.phone, message);

      if (ok) {
        // Record recovery attempt
        await prisma.recoveryAttempt.create({
          data: {
            tenantId,
            orderId: order.id,
            customerId: order.customer.id,
            message,
          },
        });

        logger.info(
          { tenantId, orderId, customerPhone: order.customer.phone },
          'Recovery message sent',
        );
      }
    } catch (err) {
      logger.error({ err, tenantId, orderId }, 'Recovery message send failed');
    }
  });
}

/**
 * Schedule a recovery attempt for a cancelled order.
 * Called from order.service.ts when an order is cancelled.
 */
export async function scheduleRecovery(orderId: string, tenantId: string) {
  // Check if tenant has recovery enabled
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      recoveryEnabled: true,
      recoveryDelayMin: true,
      plan: { select: { hasSalesRecovery: true } },
    },
  });

  if (!tenant?.recoveryEnabled || !tenant.plan.hasSalesRecovery) return;

  await recoveryQueue.add(
    'send-recovery',
    { orderId, tenantId },
    {
      delay: tenant.recoveryDelayMin * 60 * 1000,
      jobId: `recovery-${orderId}`, // Deduplicate
      removeOnComplete: true,
    },
  );

  logger.info(
    { tenantId, orderId, delayMin: tenant.recoveryDelayMin },
    'Recovery scheduled',
  );
}
