import { prisma } from '@pedirei/database';
import type { UpdateRecoverySettings } from './recovery.schema.js';

/**
 * Get recovery settings for a tenant.
 */
export async function getRecoverySettings(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      recoveryEnabled: true,
      recoveryDelayMin: true,
      recoveryMessage: true,
      recoveryDiscountPct: true,
    },
  });
  return tenant;
}

/**
 * Update recovery settings.
 */
export async function updateRecoverySettings(tenantId: string, data: UpdateRecoverySettings) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data,
    select: {
      recoveryEnabled: true,
      recoveryDelayMin: true,
      recoveryMessage: true,
      recoveryDiscountPct: true,
    },
  });
}

/**
 * Get recovery statistics for dashboard.
 */
export async function getRecoveryStats(tenantId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Total cancelled orders in period
  const cancelledCount = await prisma.order.count({
    where: {
      tenantId,
      status: 'CANCELLED',
      cancelledAt: { gte: since },
    },
  });

  // Total recovery attempts sent
  const attemptCount = await prisma.recoveryAttempt.count({
    where: { tenantId, sentAt: { gte: since } },
  });

  // Successfully recovered
  const recoveredCount = await prisma.recoveryAttempt.count({
    where: { tenantId, sentAt: { gte: since }, recovered: true },
  });

  // Revenue recovered (sum of recovered order amounts)
  const recoveredRevenue = await prisma.recoveryAttempt.findMany({
    where: {
      tenantId,
      sentAt: { gte: since },
      recovered: true,
      recoveredOrderId: { not: null },
    },
    select: { recoveredOrderId: true },
  });

  let revenueRecovered = 0;
  if (recoveredRevenue.length > 0) {
    const orderIds = recoveredRevenue
      .map((r) => r.recoveredOrderId)
      .filter((id): id is string => id !== null);
    if (orderIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { totalAmount: true },
      });
      revenueRecovered = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    }
  }

  const conversionRate = attemptCount > 0 ? (recoveredCount / attemptCount) * 100 : 0;

  return {
    cancelledCount,
    attemptCount,
    recoveredCount,
    revenueRecovered,
    conversionRate: Math.round(conversionRate * 10) / 10,
  };
}

/**
 * List recent recovery attempts.
 */
export async function listRecoveryAttempts(tenantId: string, limit = 50) {
  return prisma.recoveryAttempt.findMany({
    where: { tenantId },
    include: {
      order: {
        select: { orderNumber: true, totalAmount: true, cancelledAt: true },
      },
      customer: {
        select: { name: true, phone: true },
      },
    },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });
}

/**
 * Get reengagement stats — customers who haven't ordered in X days.
 */
export async function getInactiveCustomerCount(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { reengageDays: true },
  });
  const cutoffDays = tenant?.reengageDays || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cutoffDays);

  return prisma.customer.count({
    where: {
      tenantId,
      lastOrderAt: { lt: cutoff },
      totalOrders: { gte: 1 },
    },
  });
}

/**
 * Send reengagement message to inactive customers (called by job).
 */
export async function getInactiveCustomersForReengagement(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      reengageEnabled: true,
      reengageDays: true,
      reengageMessage: true,
      name: true,
    },
  });
  if (!tenant?.reengageEnabled || !tenant.reengageMessage) return { tenant: null, customers: [] };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - tenant.reengageDays);

  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      lastOrderAt: { lt: cutoff },
      totalOrders: { gte: 1 },
    },
    select: { phone: true, name: true },
    take: 100,
  });

  return { tenant, customers };
}

/**
 * Record a recovery attempt for a cancelled order.
 */
export async function createRecoveryAttempt(
  tenantId: string,
  orderId: string,
  customerId: string,
  message: string,
) {
  return prisma.recoveryAttempt.create({
    data: { tenantId, orderId, customerId, message },
  });
}

/**
 * Mark a recovery attempt as successful (called when customer places a new order after recovery).
 */
export async function markRecoverySuccess(
  tenantId: string,
  customerId: string,
  newOrderId: string,
) {
  // Find the most recent unrecovered attempt for this customer
  const attempt = await prisma.recoveryAttempt.findFirst({
    where: {
      tenantId,
      customerId,
      recovered: false,
      sentAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // within 48h
    },
    orderBy: { sentAt: 'desc' },
  });

  if (attempt) {
    await prisma.recoveryAttempt.update({
      where: { id: attempt.id },
      data: {
        recovered: true,
        recoveredOrderId: newOrderId,
        recoveredAt: new Date(),
      },
    });
    return true;
  }
  return false;
}
