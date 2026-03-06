import { prisma } from '@pedirei/database';

export async function getRevenueReport(tenantId: string, startDate?: string, endDate?: string) {
  const where: any = { tenantId, status: { not: 'CANCELLED' } };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.order.findMany({
    where,
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const dailyRevenue: Record<string, number> = {};
  let total = 0;
  for (const order of orders) {
    const day = order.createdAt.toISOString().split('T')[0];
    const amount = Number(order.totalAmount);
    dailyRevenue[day] = (dailyRevenue[day] || 0) + amount;
    total += amount;
  }

  return {
    total,
    orderCount: orders.length,
    avgTicket: orders.length > 0 ? total / orders.length : 0,
    daily: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
  };
}

export async function getTopItems(tenantId: string, startDate?: string, endDate?: string, limit = 10) {
  const where: any = { order: { tenantId, status: { not: 'CANCELLED' } } };
  if (startDate || endDate) {
    where.order.createdAt = {};
    if (startDate) where.order.createdAt.gte = new Date(startDate);
    if (endDate) where.order.createdAt.lte = new Date(endDate);
  }

  const items = await prisma.orderItem.groupBy({
    by: ['name'],
    where,
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

export async function getPeakHours(tenantId: string, startDate?: string, endDate?: string) {
  const where: any = { tenantId, status: { not: 'CANCELLED' } };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.order.findMany({
    where,
    select: { createdAt: true },
  });

  const hourCounts: Record<number, number> = {};
  for (const order of orders) {
    const hour = order.createdAt.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    orders: hourCounts[h] || 0,
  }));
}

export async function getFeedbackReport(tenantId: string, startDate?: string, endDate?: string) {
  const where: any = { tenantId, feedbackRating: { not: null } };
  if (startDate || endDate) {
    where.feedbackAt = {};
    if (startDate) where.feedbackAt.gte = new Date(startDate);
    if (endDate) where.feedbackAt.lte = new Date(endDate);
  }

  const feedbacks = await prisma.order.findMany({
    where,
    select: { feedbackRating: true, feedbackComment: true, feedbackAt: true },
    orderBy: { feedbackAt: 'desc' },
  });

  const avg = feedbacks.length > 0
    ? feedbacks.reduce((sum: number, f: { feedbackRating: number | null }) => sum + (f.feedbackRating || 0), 0) / feedbacks.length
    : 0;

  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: feedbacks.filter((f: { feedbackRating: number | null }) => f.feedbackRating === rating).length,
  }));

  return {
    total: feedbacks.length,
    average: Math.round(avg * 100) / 100,
    distribution,
    recent: feedbacks.slice(0, 20),
  };
}

// ─── Advanced Reports (hasAdvReports) ──────────────────────────

export async function getPaymentBreakdown(tenantId: string, startDate?: string, endDate?: string) {
  const where: any = { tenantId, status: { not: 'CANCELLED' } };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.order.findMany({
    where,
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

export async function getCustomerAnalytics(tenantId: string, startDate?: string, endDate?: string) {
  const where: any = { tenantId, status: { not: 'CANCELLED' } };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.order.findMany({
    where,
    select: {
      customerId: true,
      totalAmount: true,
      customer: { select: { name: true, phone: true, totalOrders: true, totalSpent: true } },
    },
  });

  // Unique customers in period
  const customerMap = new Map<string, { name: string | null; phone: string; orders: number; spent: number }>();
  for (const order of orders) {
    const existing = customerMap.get(order.customerId);
    const amount = Number(order.totalAmount);
    if (existing) {
      existing.orders++;
      existing.spent += amount;
    } else {
      customerMap.set(order.customerId, {
        name: order.customer.name,
        phone: order.customer.phone,
        orders: 1,
        spent: amount,
      });
    }
  }

  const customers = Array.from(customerMap.values());
  const returning = customers.filter((c) => c.orders > 1).length;
  const newCustomers = customers.filter((c) => c.orders === 1).length;

  // Top 10 customers by revenue
  const topCustomers = customers
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 10);

  return {
    totalCustomers: customers.length,
    newCustomers,
    returningCustomers: returning,
    retentionRate: customers.length > 0 ? Math.round((returning / customers.length) * 100) : 0,
    topCustomers,
  };
}

export async function getOrderStatusBreakdown(tenantId: string, startDate?: string, endDate?: string) {
  const where: any = { tenantId };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const statusGroups = await prisma.order.groupBy({
    by: ['status'],
    where,
    _count: true,
    _sum: { totalAmount: true },
  });

  const total = statusGroups.reduce((sum: number, g: any) => sum + g._count, 0);

  return statusGroups.map((g: any) => ({
    status: g.status,
    count: g._count,
    total: Number(g._sum.totalAmount || 0),
    percentage: total > 0 ? Math.round((g._count / total) * 100) : 0,
  }));
}
