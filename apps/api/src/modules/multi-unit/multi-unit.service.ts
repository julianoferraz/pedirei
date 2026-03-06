import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';

// ─── Group CRUD ───────────────────────────────────────────

export async function listGroups(tenantId: string) {
  // Find groups where this tenant is a member
  const memberships = await prisma.tenantGroupMember.findMany({
    where: { tenantId },
    include: {
      group: {
        include: {
          members: {
            include: {
              tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
            },
            orderBy: { role: 'asc' },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.group,
    myRole: m.role,
  }));
}

export async function createGroup(tenantId: string, name: string) {
  if (!name || name.trim().length < 2) {
    throw new ValidationError('Nome do grupo deve ter pelo menos 2 caracteres');
  }

  // Create group with this tenant as HEADQUARTERS
  const group = await prisma.tenantGroup.create({
    data: {
      name: name.trim(),
      ownerTenantId: tenantId,
      members: {
        create: {
          tenantId,
          role: 'HEADQUARTERS',
        },
      },
    },
    include: {
      members: {
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  return group;
}

export async function addMember(tenantId: string, groupId: string, memberSlug: string) {
  // Verify caller is HEADQUARTERS
  const myMembership = await prisma.tenantGroupMember.findFirst({
    where: { groupId, tenantId, role: 'HEADQUARTERS' },
  });
  if (!myMembership) {
    throw new ForbiddenError('Apenas a matriz pode adicionar filiais');
  }

  // Find target tenant by slug
  const targetTenant = await prisma.tenant.findUnique({
    where: { slug: memberSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!targetTenant) throw new NotFoundError('Loja não encontrada com esse slug');

  // Check already member
  const existing = await prisma.tenantGroupMember.findUnique({
    where: { groupId_tenantId: { groupId, tenantId: targetTenant.id } },
  });
  if (existing) throw new ValidationError('Loja já é membro deste grupo');

  return prisma.tenantGroupMember.create({
    data: { groupId, tenantId: targetTenant.id, role: 'BRANCH' },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });
}

export async function removeMember(tenantId: string, groupId: string, memberId: string) {
  // Verify caller is HEADQUARTERS
  const myMembership = await prisma.tenantGroupMember.findFirst({
    where: { groupId, tenantId, role: 'HEADQUARTERS' },
  });
  if (!myMembership) {
    throw new ForbiddenError('Apenas a matriz pode remover filiais');
  }

  const member = await prisma.tenantGroupMember.findFirst({
    where: { id: memberId, groupId },
  });
  if (!member) throw new NotFoundError('Membro');
  if (member.role === 'HEADQUARTERS') {
    throw new ValidationError('Não é possível remover a matriz');
  }

  return prisma.tenantGroupMember.delete({ where: { id: memberId } });
}

export async function deleteGroup(tenantId: string, groupId: string) {
  const group = await prisma.tenantGroup.findFirst({
    where: { id: groupId, ownerTenantId: tenantId },
  });
  if (!group) throw new NotFoundError('Grupo');

  return prisma.tenantGroup.delete({ where: { id: groupId } });
}

// ─── Get group member tenant IDs (for auth) ──────────────

export async function getGroupTenantIds(tenantId: string, groupId: string): Promise<string[]> {
  // Verify caller has access
  const myMembership = await prisma.tenantGroupMember.findFirst({
    where: { groupId, tenantId },
  });
  if (!myMembership) {
    throw new ForbiddenError('Você não pertence a este grupo');
  }

  const members = await prisma.tenantGroupMember.findMany({
    where: { groupId },
    select: { tenantId: true },
  });

  return members.map((m) => m.tenantId);
}

// ─── Consolidated Reports ─────────────────────────────────

function buildDateWhere(startDate?: string, endDate?: string) {
  const where: any = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  return where;
}

export async function getConsolidatedRevenue(
  tenantIds: string[],
  startDate?: string,
  endDate?: string,
) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const orders = await prisma.order.findMany({
    where: { tenantId: { in: tenantIds }, status: { not: 'CANCELLED' }, ...dateWhere },
    select: { tenantId: true, totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Per-tenant breakdown
  const perTenant: Record<string, { total: number; orderCount: number }> = {};
  const dailyRevenue: Record<string, number> = {};
  let grandTotal = 0;

  for (const order of orders) {
    const amount = Number(order.totalAmount);
    grandTotal += amount;

    if (!perTenant[order.tenantId]) perTenant[order.tenantId] = { total: 0, orderCount: 0 };
    perTenant[order.tenantId].total += amount;
    perTenant[order.tenantId].orderCount++;

    const day = order.createdAt.toISOString().split('T')[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + amount;
  }

  // Fetch tenant names
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, slug: true },
  });
  const tenantNameMap = Object.fromEntries(tenants.map((t) => [t.id, t.name]));

  const branches = Object.entries(perTenant).map(([tid, data]) => ({
    tenantId: tid,
    name: tenantNameMap[tid] || tid,
    total: data.total,
    orderCount: data.orderCount,
    avgTicket: data.orderCount > 0 ? data.total / data.orderCount : 0,
  })).sort((a, b) => b.total - a.total);

  return {
    grandTotal,
    totalOrders: orders.length,
    avgTicket: orders.length > 0 ? grandTotal / orders.length : 0,
    daily: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
    branches,
  };
}

export async function getConsolidatedTopItems(
  tenantIds: string[],
  startDate?: string,
  endDate?: string,
  limit = 10,
) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const items = await prisma.orderItem.groupBy({
    by: ['name'],
    where: {
      order: { tenantId: { in: tenantIds }, status: { not: 'CANCELLED' }, ...dateWhere },
    },
    _sum: { quantity: true },
    _count: true,
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  return items.map((i: any) => ({
    name: i.name,
    totalQuantity: i._sum.quantity,
    orderCount: i._count,
  }));
}

export async function getConsolidatedPaymentBreakdown(
  tenantIds: string[],
  startDate?: string,
  endDate?: string,
) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const orders = await prisma.order.findMany({
    where: { tenantId: { in: tenantIds }, status: { not: 'CANCELLED' }, ...dateWhere },
    select: { paymentMethod: true, totalAmount: true },
  });

  const breakdown: Record<string, { count: number; total: number }> = {};
  for (const order of orders) {
    const method = order.paymentMethod;
    if (!breakdown[method]) breakdown[method] = { count: 0, total: 0 };
    breakdown[method].count++;
    breakdown[method].total += Number(order.totalAmount);
  }

  return Object.entries(breakdown).map(([method, data]) => ({
    method,
    count: data.count,
    total: data.total,
    percentage: orders.length > 0 ? Math.round((data.count / orders.length) * 100) : 0,
  }));
}

export async function getConsolidatedOrderStatus(
  tenantIds: string[],
  startDate?: string,
  endDate?: string,
) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const statusGroups = await prisma.order.groupBy({
    by: ['status'],
    where: { tenantId: { in: tenantIds }, ...dateWhere },
    _count: true,
    _sum: { totalAmount: true },
  });

  const totalCount = statusGroups.reduce((sum: number, g: any) => sum + g._count, 0);

  return statusGroups.map((g: any) => ({
    status: g.status,
    count: g._count,
    total: Number(g._sum.totalAmount || 0),
    percentage: totalCount > 0 ? Math.round((g._count / totalCount) * 100) : 0,
  }));
}

export async function getConsolidatedCustomerAnalytics(
  tenantIds: string[],
  startDate?: string,
  endDate?: string,
) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const orders = await prisma.order.findMany({
    where: { tenantId: { in: tenantIds }, status: { not: 'CANCELLED' }, ...dateWhere },
    select: {
      customerId: true,
      tenantId: true,
      totalAmount: true,
      customer: { select: { name: true, phone: true } },
    },
  });

  // Cross-tenant customer map (by phone for dedup across branches)
  const customerMap = new Map<string, { name: string | null; phone: string; orders: number; spent: number; tenants: Set<string> }>();
  for (const order of orders) {
    const phone = order.customer.phone;
    const existing = customerMap.get(phone);
    const amount = Number(order.totalAmount);
    if (existing) {
      existing.orders++;
      existing.spent += amount;
      existing.tenants.add(order.tenantId);
    } else {
      customerMap.set(phone, {
        name: order.customer.name,
        phone,
        orders: 1,
        spent: amount,
        tenants: new Set([order.tenantId]),
      });
    }
  }

  const customers = Array.from(customerMap.values());
  const returning = customers.filter((c) => c.orders > 1).length;
  const crossBranch = customers.filter((c) => c.tenants.size > 1).length;

  const topCustomers = customers
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 10)
    .map(({ tenants, ...rest }) => ({ ...rest, branchCount: tenants.size }));

  return {
    totalCustomers: customers.length,
    newCustomers: customers.filter((c) => c.orders === 1).length,
    returningCustomers: returning,
    crossBranchCustomers: crossBranch,
    retentionRate: customers.length > 0 ? Math.round((returning / customers.length) * 100) : 0,
    topCustomers,
  };
}
