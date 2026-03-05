import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { parsePagination } from '../../utils/helpers.js';
import type { z } from 'zod';
import type {
  updateLoyaltyConfigSchema,
  createRewardSchema,
  updateRewardSchema,
  rewardQuerySchema,
  adjustPointsSchema,
  redeemRewardSchema,
  transactionQuerySchema,
  customerLoyaltyQuerySchema,
} from './loyalty.schema.js';

type UpdateConfig = z.infer<typeof updateLoyaltyConfigSchema>;
type CreateReward = z.infer<typeof createRewardSchema>;
type UpdateReward = z.infer<typeof updateRewardSchema>;
type RewardQuery = z.infer<typeof rewardQuerySchema>;
type AdjustPoints = z.infer<typeof adjustPointsSchema>;
type RedeemReward = z.infer<typeof redeemRewardSchema>;
type TransactionQuery = z.infer<typeof transactionQuerySchema>;
type CustomerLoyaltyQuery = z.infer<typeof customerLoyaltyQuerySchema>;

// ── Config ────────────────────────────────────────────────

export async function getLoyaltyConfig(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      loyaltyEnabled: true,
      loyaltyPointsPerReal: true,
      loyaltyMinOrderValue: true,
    },
  });
  if (!tenant) throw new NotFoundError('Tenant');
  return tenant;
}

export async function updateLoyaltyConfig(tenantId: string, data: UpdateConfig) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      loyaltyEnabled: data.loyaltyEnabled,
      loyaltyPointsPerReal: data.loyaltyPointsPerReal,
      loyaltyMinOrderValue: data.loyaltyMinOrderValue,
    },
    select: {
      loyaltyEnabled: true,
      loyaltyPointsPerReal: true,
      loyaltyMinOrderValue: true,
    },
  });
}

// ── Rewards CRUD ──────────────────────────────────────────

export async function createReward(tenantId: string, data: CreateReward) {
  return prisma.loyaltyReward.create({
    data: { tenantId, ...data },
  });
}

export async function updateReward(tenantId: string, rewardId: string, data: UpdateReward) {
  const existing = await prisma.loyaltyReward.findFirst({
    where: { id: rewardId, tenantId },
  });
  if (!existing) throw new NotFoundError('Recompensa');

  return prisma.loyaltyReward.update({
    where: { id: rewardId },
    data,
  });
}

export async function deleteReward(tenantId: string, rewardId: string) {
  const existing = await prisma.loyaltyReward.findFirst({
    where: { id: rewardId, tenantId },
  });
  if (!existing) throw new NotFoundError('Recompensa');

  await prisma.loyaltyReward.delete({ where: { id: rewardId } });
}

export async function listRewards(tenantId: string, query: RewardQuery) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.LoyaltyRewardWhereInput = { tenantId };
  if (query.activeOnly === 'true') where.isActive = true;

  const [items, total] = await Promise.all([
    prisma.loyaltyReward.findMany({ where, orderBy: { pointsCost: 'asc' }, skip, take: limit }),
    prisma.loyaltyReward.count({ where }),
  ]);
  return { items, total, page, limit };
}

// ── Points: Earn on order ─────────────────────────────────

export async function earnPointsForOrder(
  tenantId: string,
  customerId: string,
  orderId: string,
  orderTotal: number,
) {
  // Check if loyalty is enabled for this tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { loyaltyEnabled: true, loyaltyPointsPerReal: true, loyaltyMinOrderValue: true },
  });
  if (!tenant || !tenant.loyaltyEnabled) return;

  // Check minimum order value
  if (tenant.loyaltyMinOrderValue && orderTotal < Number(tenant.loyaltyMinOrderValue)) return;

  const pointsEarned = Math.floor(orderTotal) * tenant.loyaltyPointsPerReal;
  if (pointsEarned <= 0) return;

  // Atomic update: increment points and create transaction
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { increment: pointsEarned } },
    select: { loyaltyPoints: true },
  });

  await prisma.loyaltyTransaction.create({
    data: {
      tenantId,
      customerId,
      type: 'EARN',
      points: pointsEarned,
      balance: customer.loyaltyPoints,
      orderId,
      description: `+${pointsEarned} pts por pedido`,
    },
  });

  return { pointsEarned, newBalance: customer.loyaltyPoints };
}

// ── Points: Redeem reward ─────────────────────────────────

export async function redeemReward(tenantId: string, data: RedeemReward) {
  const [customer, reward] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
      select: { id: true, loyaltyPoints: true },
    }),
    prisma.loyaltyReward.findFirst({
      where: { id: data.rewardId, tenantId, isActive: true },
    }),
  ]);

  if (!customer) throw new NotFoundError('Cliente');
  if (!reward) throw new NotFoundError('Recompensa');

  if (customer.loyaltyPoints < reward.pointsCost) {
    throw new ValidationError(
      `Pontos insuficientes. Necessário: ${reward.pointsCost}, disponível: ${customer.loyaltyPoints}`,
    );
  }

  // Atomic: decrement points and create transaction
  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { loyaltyPoints: { decrement: reward.pointsCost } },
    select: { loyaltyPoints: true },
  });

  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      tenantId,
      customerId: customer.id,
      type: 'REDEEM',
      points: -reward.pointsCost,
      balance: updated.loyaltyPoints,
      rewardId: reward.id,
      description: `Resgatou: ${reward.name}`,
    },
  });

  return { reward, transaction, newBalance: updated.loyaltyPoints };
}

// ── Points: Manual adjustment ─────────────────────────────

export async function adjustPoints(tenantId: string, data: AdjustPoints) {
  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, tenantId },
    select: { id: true, loyaltyPoints: true },
  });
  if (!customer) throw new NotFoundError('Cliente');

  const newBalance = customer.loyaltyPoints + data.points;
  if (newBalance < 0) {
    throw new ValidationError('O ajuste resultaria em saldo negativo.');
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { loyaltyPoints: newBalance },
    select: { loyaltyPoints: true },
  });

  await prisma.loyaltyTransaction.create({
    data: {
      tenantId,
      customerId: customer.id,
      type: 'ADJUSTMENT',
      points: data.points,
      balance: updated.loyaltyPoints,
      description: data.description,
    },
  });

  return { newBalance: updated.loyaltyPoints };
}

// ── Transactions list ─────────────────────────────────────

export async function listTransactions(tenantId: string, query: TransactionQuery) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.LoyaltyTransactionWhereInput = { tenantId };
  if (query.customerId) where.customerId = query.customerId;
  if (query.type) where.type = query.type;

  const [items, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { customer: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.loyaltyTransaction.count({ where }),
  ]);
  return { items, total, page, limit };
}

// ── Customer loyalty ranking ──────────────────────────────

export async function listCustomerLoyalty(tenantId: string, query: CustomerLoyaltyQuery) {
  const { page, limit, skip } = parsePagination(query);

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId, loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        loyaltyPoints: true,
        totalOrders: true,
        totalSpent: true,
      },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where: { tenantId, loyaltyPoints: { gt: 0 } } }),
  ]);
  return { items, total, page, limit };
}

// ── Get customer points (for chatbot) ─────────────────────

export async function getCustomerPoints(tenantId: string, customerPhone: string) {
  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone: customerPhone } },
    select: { id: true, name: true, loyaltyPoints: true },
  });
  if (!customer) return { points: 0, rewards: [] };

  const rewards = await prisma.loyaltyReward.findMany({
    where: { tenantId, isActive: true, pointsCost: { lte: customer.loyaltyPoints } },
    orderBy: { pointsCost: 'asc' },
  });

  return { points: customer.loyaltyPoints, rewards };
}
