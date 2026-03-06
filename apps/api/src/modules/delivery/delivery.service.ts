import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { ORDER_STATUS_FLOW } from '@pedirei/shared';
import { sendWhatsAppMessage } from '@pedirei/whatsapp';
import { logger } from '../../utils/logger.js';

export async function listDriverOrders(tenantId: string, driverId: string, status?: string) {
  const where: Prisma.OrderWhereInput = {
    tenantId,
    driverId,
    orderType: 'DELIVERY',
  };
  if (status) where.status = status as any;

  return prisma.order.findMany({
    where,
    include: {
      items: { select: { name: true, quantity: true, notes: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function listPendingDeliveries(tenantId: string) {
  return prisma.order.findMany({
    where: {
      tenantId,
      orderType: 'DELIVERY',
      status: { in: ['PREPARING', 'OUT_FOR_DELIVERY'] },
    },
    include: {
      items: { select: { name: true, quantity: true } },
      customer: { select: { name: true, phone: true } },
      driver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function assignDriver(tenantId: string, orderId: string, driverId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, orderType: 'DELIVERY' },
  });
  if (!order) throw new NotFoundError('Pedido');
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    throw new ValidationError('Pedido já finalizado');
  }

  const driver = await prisma.operator.findFirst({
    where: { id: driverId, tenantId, role: 'DRIVER', isActive: true },
  });
  if (!driver) throw new NotFoundError('Entregador');

  return prisma.order.update({
    where: { id: orderId },
    data: { driverId },
    include: {
      customer: { select: { name: true, phone: true } },
      driver: { select: { id: true, name: true } },
    },
  });
}

export async function acceptDelivery(tenantId: string, driverId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, driverId },
  });
  if (!order) throw new NotFoundError('Pedido não atribuído a você');

  if (order.status !== 'PREPARING') {
    throw new ValidationError('Pedido não está em preparo');
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'OUT_FOR_DELIVERY',
      outDeliveryAt: new Date(),
      statusHistory: { create: { status: 'OUT_FOR_DELIVERY', note: 'Entregador saiu para entrega' } },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      tenant: { select: { msgOutDelivery: true } },
    },
  });

  // Notify customer
  try {
    if (updated.customer.phone && updated.tenant.msgOutDelivery) {
      await sendWhatsAppMessage(tenantId, updated.customer.phone, `📋 Pedido #${updated.orderNumber}\n${updated.tenant.msgOutDelivery}`);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to send delivery notification');
  }

  return updated;
}

export async function confirmDelivery(tenantId: string, driverId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, driverId },
  });
  if (!order) throw new NotFoundError('Pedido não atribuído a você');

  if (order.status !== 'OUT_FOR_DELIVERY') {
    throw new ValidationError('Pedido não está em rota de entrega');
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      statusHistory: { create: { status: 'DELIVERED', note: 'Entrega confirmada pelo entregador' } },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      tenant: { select: { msgDelivered: true } },
    },
  });

  // Notify customer
  try {
    if (updated.customer.phone && updated.tenant.msgDelivered) {
      await sendWhatsAppMessage(tenantId, updated.customer.phone, `📋 Pedido #${updated.orderNumber}\n${updated.tenant.msgDelivered}`);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to send delivery confirmation');
  }

  return updated;
}

export async function updateDriverLocation(tenantId: string, driverId: string, lat: number, lng: number) {
  return prisma.operator.update({
    where: { id: driverId },
    data: {
      driverLat: new Prisma.Decimal(lat),
      driverLng: new Prisma.Decimal(lng),
      driverLocationAt: new Date(),
    },
    select: { id: true, driverLat: true, driverLng: true, driverLocationAt: true },
  });
}

export async function listDrivers(tenantId: string) {
  return prisma.operator.findMany({
    where: { tenantId, role: 'DRIVER', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      driverLat: true,
      driverLng: true,
      driverLocationAt: true,
      _count: {
        select: {
          driverOrders: { where: { status: 'OUT_FOR_DELIVERY' } },
        },
      },
    },
  });
}

export async function createDriver(tenantId: string, data: { name: string; email: string; password: string }) {
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(data.password, 12);

  return prisma.operator.create({
    data: {
      tenantId,
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'DRIVER',
    },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function getDriverStats(tenantId: string, driverId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayDelivered, todayActive, totalDelivered] = await Promise.all([
    prisma.order.count({
      where: { driverId, tenantId, status: 'DELIVERED', deliveredAt: { gte: today } },
    }),
    prisma.order.count({
      where: { driverId, tenantId, status: 'OUT_FOR_DELIVERY' },
    }),
    prisma.order.count({
      where: { driverId, tenantId, status: 'DELIVERED' },
    }),
  ]);

  return { todayDelivered, todayActive, totalDelivered };
}
