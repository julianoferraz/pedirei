import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { ORDER_STATUS_FLOW } from '@pedirei/shared';
import { sendWhatsAppMessage } from '@pedirei/whatsapp';
import { decrementStockForOrder } from '../inventory/inventory.service.js';
import { registerSaleMovement } from '../cash-register/cash-register.service.js';
import { scheduleLowStockCheck } from '../../jobs/low-stock.job.js';
import { logger } from '../../utils/logger.js';
import type { z } from 'zod';
import type { createOrderBodySchema, orderQuerySchema } from './order.schema.js';

type CreateOrder = z.infer<typeof createOrderBodySchema>;
type OrderQuery = z.infer<typeof orderQuerySchema>;

export async function listOrders(tenantId: string, query: OrderQuery) {
  const { status, page, limit, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = { tenantId };
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getOrder(tenantId: string, id: string) {
  const order = await prisma.order.findFirst({
    where: { id, tenantId },
    include: {
      items: { include: { menuItem: { select: { imageUrl: true } } } },
      customer: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) throw new NotFoundError('Pedido');
  return order;
}

export async function createOrder(tenantId: string, data: CreateOrder) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      fixedDeliveryFee: true,
      deliveryFeeMode: true,
      creditFeePercent: true,
      debitFeePercent: true,
      minOrderValue: true,
    },
  });
  if (!tenant) throw new NotFoundError('Loja');

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: data.items.map((i) => i.menuItemId) },
      tenantId,
      isPaused: false,
    },
  });

  if (menuItems.length !== data.items.length) {
    throw new ValidationError('Um ou mais itens não estão disponíveis');
  }

  let subtotal = 0;
  const orderItems = data.items.map((item) => {
    const menuItem = menuItems.find((m: { id: string }) => m.id === item.menuItemId)!;
    const price = Number(menuItem.price);
    subtotal += price * item.quantity;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: new Prisma.Decimal(price),
      quantity: item.quantity,
      notes: item.notes,
    };
  });

  if (tenant.minOrderValue && subtotal < Number(tenant.minOrderValue)) {
    throw new ValidationError(`Pedido mínimo: R$ ${Number(tenant.minOrderValue).toFixed(2)}`);
  }

  const deliveryFee = tenant.deliveryFeeMode === 'FIXED'
    ? Number(tenant.fixedDeliveryFee || 0)
    : 0;

  let cardFee = 0;
  if (data.paymentMethod === 'CREDIT_CARD') {
    cardFee = subtotal * Number(tenant.creditFeePercent || 0) / 100;
  } else if (data.paymentMethod === 'DEBIT_CARD') {
    cardFee = subtotal * Number(tenant.debitFeePercent || 0) / 100;
  }

  const totalAmount = subtotal + deliveryFee + cardFee;

  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: data.customerPhone } },
    update: {
      name: data.customerName || undefined,
      lastOrderAt: new Date(),
      lastContactAt: new Date(),
      totalOrders: { increment: 1 },
      totalSpent: { increment: totalAmount },
    },
    create: {
      tenantId,
      phone: data.customerPhone,
      name: data.customerName,
      lastOrderAt: new Date(),
      lastContactAt: new Date(),
      totalOrders: 1,
      totalSpent: totalAmount,
    },
  });

  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: customer.id,
      orderNumber: (lastOrder?.orderNumber || 0) + 1,
      status: 'RECEIVED',
      deliveryAddress: data.deliveryAddress,
      deliveryRef: data.deliveryRef,
      subtotal: new Prisma.Decimal(subtotal),
      deliveryFee: new Prisma.Decimal(deliveryFee),
      cardFee: new Prisma.Decimal(cardFee),
      totalAmount: new Prisma.Decimal(totalAmount),
      paymentMethod: data.paymentMethod,
      needsChange: data.needsChange,
      changeFor: data.changeFor ? new Prisma.Decimal(data.changeFor) : null,
      generalNotes: data.generalNotes,
      items: { create: orderItems },
      statusHistory: { create: { status: 'RECEIVED' } },
    },
    include: { items: true, customer: { select: { id: true, name: true, phone: true } } },
  });

  // Decrement stock for items with inventory tracking
  await decrementStockForOrder(tenantId, order.id, data.items);

  // Register sale movement in open cash register (if any)
  await registerSaleMovement(tenantId, order.id, Number(order.totalAmount), 'Sistema');

  // Schedule low-stock check (debounced per tenant)
  await scheduleLowStockCheck(tenantId);

  return order;
}

export async function updateOrderStatus(tenantId: string, id: string, status: string, note?: string) {
  const order = await prisma.order.findFirst({ where: { id, tenantId } });
  if (!order) throw new NotFoundError('Pedido');

  const allowedNext = ORDER_STATUS_FLOW[order.status];
  if (!allowedNext?.includes(status)) {
    throw new ValidationError(`Não é possível mudar de ${order.status} para ${status}`);
  }

  const updateData: Prisma.OrderUpdateInput = {
    status: status as Prisma.EnumOrderStatusFieldUpdateOperationsInput['set'],
    statusHistory: { create: { status: status as any, note } },
  };

  const now = new Date();
  if (status === 'PREPARING') updateData.preparingAt = now;
  if (status === 'OUT_FOR_DELIVERY') updateData.outDeliveryAt = now;
  if (status === 'DELIVERED') updateData.deliveredAt = now;
  if (status === 'CANCELLED') {
    updateData.cancelledAt = now;
    updateData.cancelReason = note;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
    include: { items: true, customer: { select: { id: true, name: true, phone: true } }, tenant: { select: { msgPreparing: true, msgOutDelivery: true, msgDelivered: true } } },
  });

  // Send WhatsApp notification to customer
  try {
    const statusMessages: Record<string, string | undefined> = {
      PREPARING: updated.tenant.msgPreparing,
      OUT_FOR_DELIVERY: updated.tenant.msgOutDelivery,
      DELIVERED: updated.tenant.msgDelivered,
    };
    const msg = statusMessages[status];
    if (msg && updated.customer.phone) {
      await sendWhatsAppMessage(tenantId, updated.customer.phone, `📋 Pedido #${updated.orderNumber}\n${msg}`);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to send order status notification');
  }

  return updated;
}

export async function cancelOrder(tenantId: string, id: string, reason?: string) {
  return updateOrderStatus(tenantId, id, 'CANCELLED', reason);
}

export async function getTodaySummary(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, revenue, byStatus] = await Promise.all([
    prisma.order.count({ where: { tenantId, createdAt: { gte: today } } }),
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { tenantId, createdAt: { gte: today } },
      _count: true,
    }),
  ]);

  return {
    totalOrders: total,
    totalRevenue: Number(revenue._sum.totalAmount || 0),
    byStatus: byStatus.reduce(
      (acc: Record<string, number>, s: { status: string; _count: number }) => ({ ...acc, [s.status]: s._count }),
      {} as Record<string, number>,
    ),
  };
}

export async function trackOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      deliveryFee: true,
      totalAmount: true,
      paymentMethod: true,
      deliveryAddress: true,
      generalNotes: true,
      createdAt: true,
      preparingAt: true,
      outDeliveryAt: true,
      deliveredAt: true,
      cancelledAt: true,
      cancelReason: true,
      items: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          notes: true,
        },
      },
      tenant: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!order) throw new NotFoundError('Pedido');
  return order;
}
