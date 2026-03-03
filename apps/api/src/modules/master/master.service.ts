import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError } from '../../utils/errors.js';
import { connectWhatsApp } from '@pedirei/whatsapp';
import type { WhatsAppMessage } from '@pedirei/whatsapp';
import { processCustomerMessage } from '../../chatbot/chatbot.engine.js';
import type { z } from 'zod';
import type { tenantsQuerySchema } from './master.schema.js';

type TenantsQuery = z.infer<typeof tenantsQuerySchema>;

export async function listTenants(query: TenantsQuery) {
  const { page, limit, search, planSlug, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.TenantWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (planSlug) where.plan = { slug: planSlug };
  if (isActive !== undefined) where.isActive = isActive;

  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: { plan: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.tenant.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      plan: true,
      operators: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      _count: { select: { orders: true, customers: true, menuItems: true } },
    },
  });
  if (!tenant) throw new NotFoundError('Tenant');
  return tenant;
}

export async function updateTenant(id: string, data: Record<string, unknown>) {
  return prisma.tenant.update({ where: { id }, data });
}

export async function changePlan(id: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plano');
  return prisma.tenant.update({ where: { id }, data: { planId } });
}

export async function updateAiMode(id: string, data: { aiMode: string; aiTokenLimit?: number | null }) {
  return prisma.tenant.update({ where: { id }, data: data as any });
}

export async function blockTenant(id: string, isActive: boolean) {
  return prisma.tenant.update({ where: { id }, data: { isActive } });
}

export async function getGlobalStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalTenants,
    activeTenants,
    todayOrders,
    todayRevenue,
    connected,
    disconnected,
    aiTokensToday,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    }),
    prisma.tenant.count({ where: { whatsappStatus: 'CONNECTED' } }),
    prisma.tenant.count({ where: { whatsappStatus: 'DISCONNECTED' } }),
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { totalTokens: true },
    }),
  ]);

  return {
    totalTenants,
    activeTenants,
    todayOrdersGlobal: todayOrders,
    todayRevenueGlobal: Number(todayRevenue._sum.totalAmount || 0),
    connectedWhatsapp: connected,
    disconnectedWhatsapp: disconnected,
    totalAiTokensToday: aiTokensToday._sum.totalTokens || 0,
  };
}

export async function getAiUsage(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const usage = await prisma.aiUsageLog.groupBy({
    by: ['tenantId'],
    _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
    _count: true,
    orderBy: { _sum: { totalTokens: 'desc' } },
    skip,
    take: limit,
  });

  const tenantIds = usage.map((u: any) => u.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, slug: true },
  });

  const tenantMap = Object.fromEntries(tenants.map((t: { id: string }) => [t.id, t]));

  return usage.map((u: any) => ({
    tenant: tenantMap[u.tenantId],
    totalTokens: u._sum.totalTokens,
    promptTokens: u._sum.promptTokens,
    completionTokens: u._sum.completionTokens,
    requestCount: u._count,
  }));
}

export async function getPlatformConfig() {
  return prisma.platformConfig.findFirst();
}

export async function updatePlatformConfig(data: Record<string, unknown>) {
  return prisma.platformConfig.update({ where: { id: 'default' }, data });
}

export async function listPlans() {
  return prisma.plan.findMany({ orderBy: { price: 'asc' } });
}

export async function updatePlan(id: string, data: Record<string, unknown>) {
  return prisma.plan.update({ where: { id }, data });
}

export async function reconnectWhatsapp(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant');
  const handler = async (_tid: string, msg: WhatsAppMessage) => {
    const reply = await processCustomerMessage(_tid, msg.phone, msg.body);
    return reply;
  };
  const result = await connectWhatsApp(tenantId, handler);
  return result;
}
