import { prisma } from '@pedirei/database';
import { NotFoundError } from '../../utils/errors.js';
import { encrypt, encryptJson } from '../../services/encryption.service.js';
import { connectWhatsApp, disconnectWhatsApp, getConnectionStatus } from '@pedirei/whatsapp';
import type { WhatsAppMessage } from '@pedirei/whatsapp';
import { processCustomerMessage } from '../../chatbot/chatbot.engine.js';
import type { z } from 'zod';
import type {
  updateTenantBodySchema,
  updatePaymentBodySchema,
  updateDeliveryBodySchema,
  updateMessagesBodySchema,
  updateAiBodySchema,
  updateNfceBodySchema,
  updateReengagementBodySchema,
  operatingHoursBodySchema,
} from './tenant.schema.js';

type UpdateTenant = z.infer<typeof updateTenantBodySchema>;
type UpdatePayment = z.infer<typeof updatePaymentBodySchema>;
type UpdateDelivery = z.infer<typeof updateDeliveryBodySchema>;
type UpdateMessages = z.infer<typeof updateMessagesBodySchema>;
type UpdateAi = z.infer<typeof updateAiBodySchema>;
type UpdateNfce = z.infer<typeof updateNfceBodySchema>;
type UpdateReengagement = z.infer<typeof updateReengagementBodySchema>;
type OperatingHours = z.infer<typeof operatingHoursBodySchema>;

export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true, operatingHours: true },
  });
  if (!tenant) throw new NotFoundError('Tenant');
  return tenant;
}

export async function updateTenant(tenantId: string, data: UpdateTenant) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function getOperatingHours(tenantId: string) {
  return prisma.operatingHour.findMany({
    where: { tenantId },
    orderBy: { dayOfWeek: 'asc' },
  });
}

export async function updateOperatingHours(tenantId: string, hours: OperatingHours) {
  await prisma.operatingHour.deleteMany({ where: { tenantId } });
  return prisma.operatingHour.createMany({
    data: hours.map((h) => ({ ...h, tenantId })),
  });
}

export async function updatePaymentConfig(tenantId: string, data: UpdatePayment) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.pspCredentials) {
    updateData.pspCredentials = encryptJson(data.pspCredentials);
  }
  return prisma.tenant.update({ where: { id: tenantId }, data: updateData });
}

export async function updateDeliveryConfig(tenantId: string, data: UpdateDelivery) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function updateMessages(tenantId: string, data: UpdateMessages) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function updateAiConfig(tenantId: string, data: UpdateAi) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.tenantOpenaiKey) {
    updateData.tenantOpenaiKey = encrypt(data.tenantOpenaiKey);
  }
  return prisma.tenant.update({ where: { id: tenantId }, data: updateData });
}

export async function updateNfceConfig(tenantId: string, data: UpdateNfce) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.nfceCredentials) {
    updateData.nfceCredentials = encryptJson(data.nfceCredentials);
  }
  return prisma.tenant.update({ where: { id: tenantId }, data: updateData });
}

export async function updateReengagementConfig(tenantId: string, data: UpdateReengagement) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function getStats(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, todayRevenue, pendingOrders, preparingOrders, outOrders, deliveredToday, cancelledToday] =
    await Promise.all([
      prisma.order.count({ where: { tenantId, createdAt: { gte: today } } }),
      prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { tenantId, status: 'RECEIVED' } }),
      prisma.order.count({ where: { tenantId, status: 'PREPARING' } }),
      prisma.order.count({ where: { tenantId, status: 'OUT_FOR_DELIVERY' } }),
      prisma.order.count({ where: { tenantId, status: 'DELIVERED', deliveredAt: { gte: today } } }),
      prisma.order.count({ where: { tenantId, status: 'CANCELLED', cancelledAt: { gte: today } } }),
    ]);

  const revenue = Number(todayRevenue._sum.totalAmount || 0);
  const avgTicket = todayOrders > 0 ? revenue / todayOrders : 0;

  return {
    todayOrders,
    todayRevenue: revenue,
    avgTicket,
    pendingOrders,
    preparingOrders,
    outForDeliveryOrders: outOrders,
    deliveredToday,
    cancelledToday,
  };
}

export async function connectWhatsappService(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant');

  const handler = async (_tid: string, msg: WhatsAppMessage) => {
    const reply = await processCustomerMessage(_tid, msg.phone, msg.body);
    return reply;
  };

  const result = await connectWhatsApp(tenantId, handler);
  return result;
}

export async function disconnectWhatsappService(tenantId: string) {
  await disconnectWhatsApp(tenantId);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { whatsappStatus: 'DISCONNECTED', whatsappQrCode: null },
  });
}

export function getWhatsappStatus(tenantId: string) {
  return getConnectionStatus(tenantId);
}
