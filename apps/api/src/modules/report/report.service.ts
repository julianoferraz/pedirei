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
