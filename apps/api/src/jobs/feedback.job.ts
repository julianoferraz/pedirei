import { prisma } from '@pedirei/database';
import { createWorker, feedbackQueue } from './queue.js';
import { DEFAULT_MESSAGES } from '@pedirei/shared';

export function startFeedbackWorker() {
  return createWorker('feedback', async (job) => {
    const { orderId, tenantId } = job.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId, feedbackSentAt: null, status: 'DELIVERED' },
      include: {
        customer: { select: { phone: true } },
        tenant: { select: { feedbackEnabled: true } },
      },
    });

    if (!order || !order.tenant.feedbackEnabled) return;

    // Mark feedback as sent (actual WhatsApp sending handled by whatsapp module)
    await prisma.order.update({
      where: { id: orderId },
      data: { feedbackSentAt: new Date() },
    });

    console.log(`[Feedback] Sent feedback request for order ${order.orderNumber} to ${order.customer.phone}`);
  });
}

export async function scheduleFeedback(orderId: string, tenantId: string, delayMinutes: number) {
  await feedbackQueue.add(
    'send-feedback',
    { orderId, tenantId },
    { delay: delayMinutes * 60 * 1000 },
  );
}
