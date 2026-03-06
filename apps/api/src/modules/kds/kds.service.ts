import { prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

/**
 * Get active KDS orders (RECEIVED or PREPARING) for the kitchen display.
 */
export async function getKdsOrders(tenantId: string, status?: string) {
  const where: any = {
    tenantId,
    status: status ? status : { in: ['RECEIVED', 'PREPARING'] },
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: { menuItem: { select: { name: true, imageUrl: true } } },
      },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return orders.map((o) => ({
    ...o,
    orderType: (o as any).orderType ?? 'DELIVERY',
    tableNumber: (o as any).tableNumber ?? null,
  }));
}

/**
 * Get recently completed orders (last 20 with status OUT_FOR_DELIVERY or DELIVERED)
 * for the "Prontos" column in KDS.
 */
export async function getKdsCompletedOrders(tenantId: string) {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
    },
    include: {
      items: true,
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  return orders;
}

/**
 * Update status of a single order item in the KDS.
 */
export async function updateKdsItemStatus(
  tenantId: string,
  itemId: string,
  kdsStatus: string,
) {
  // Verify item belongs to this tenant
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, order: { tenantId } },
    include: { order: { select: { id: true, tenantId: true } } },
  });
  if (!item) throw new NotFoundError('Item do pedido');

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: { kdsStatus: kdsStatus as any },
  });

  return updated;
}

/**
 * Bump an order: mark all items as READY and advance order status to OUT_FOR_DELIVERY.
 * This is the "pedido pronto" action in the KDS.
 */
export async function bumpOrder(tenantId: string, orderId: string, note?: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true },
  });
  if (!order) throw new NotFoundError('Pedido');

  if (order.status !== 'RECEIVED' && order.status !== 'PREPARING') {
    throw new ValidationError('Pedido não está em preparo ou recebido');
  }

  // Mark all items as READY
  await prisma.orderItem.updateMany({
    where: { orderId },
    data: { kdsStatus: 'READY' },
  });

  // Advance order to OUT_FOR_DELIVERY (ready for pickup/delivery)
  const now = new Date();
  const updateData: any = {
    status: 'OUT_FOR_DELIVERY',
    outDeliveryAt: now,
    statusHistory: {
      create: {
        status: 'OUT_FOR_DELIVERY',
        note: note || 'Marcado como pronto no KDS',
      },
    },
  };

  // If order was still RECEIVED, also set preparingAt
  if (order.status === 'RECEIVED') {
    updateData.preparingAt = now;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: true,
      customer: { select: { name: true, phone: true } },
    },
  });

  return updated;
}

/**
 * Start preparing an order: set status to PREPARING and all items to PREPARING.
 */
export async function startPreparing(tenantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!order) throw new NotFoundError('Pedido');

  if (order.status !== 'RECEIVED') {
    throw new ValidationError('Pedido não está com status Recebido');
  }

  // Update all items to PREPARING
  await prisma.orderItem.updateMany({
    where: { orderId },
    data: { kdsStatus: 'PREPARING' },
  });

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PREPARING',
      preparingAt: new Date(),
      statusHistory: {
        create: { status: 'PREPARING', note: 'Iniciado no KDS' },
      },
    },
    include: {
      items: true,
      customer: { select: { name: true, phone: true } },
    },
  });

  return updated;
}

/**
 * Get KDS stats for the current day.
 */
export async function getKdsStats(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [received, preparing, completed, avgPrepTime] = await Promise.all([
    prisma.order.count({
      where: { tenantId, status: 'RECEIVED', createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: { tenantId, status: 'PREPARING', createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: {
        tenantId,
        status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
        createdAt: { gte: today },
      },
    }),
    // Average prep time: from createdAt to outDeliveryAt
    prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: today },
        outDeliveryAt: { not: null },
      },
      select: { createdAt: true, outDeliveryAt: true },
    }),
  ]);

  let avgMinutes = 0;
  if (avgPrepTime.length > 0) {
    const totalMs = avgPrepTime.reduce((sum, o) => {
      return sum + (o.outDeliveryAt!.getTime() - o.createdAt.getTime());
    }, 0);
    avgMinutes = Math.round(totalMs / avgPrepTime.length / 60000);
  }

  return {
    received,
    preparing,
    completed,
    avgPrepMinutes: avgMinutes,
  };
}
