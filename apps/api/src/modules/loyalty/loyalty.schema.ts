import { z } from 'zod';

// ── Loyalty Config (tenant settings) ──────────────────────
export const updateLoyaltyConfigSchema = z.object({
  loyaltyEnabled: z.boolean().optional(),
  loyaltyPointsPerReal: z.number().int().min(1).optional(),
  loyaltyMinOrderValue: z.number().min(0).optional().nullable(),
});

// ── Rewards CRUD ──────────────────────────────────────────
export const createRewardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  pointsCost: z.number().int().positive(),
  type: z.enum(['FREE_ITEM', 'DISCOUNT', 'PERCENTAGE']),
  discountValue: z.number().min(0).optional(),
  menuItemId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateRewardSchema = createRewardSchema.partial();

export const rewardQuerySchema = z.object({
  activeOnly: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ── Transactions ──────────────────────────────────────────
export const adjustPointsSchema = z.object({
  customerId: z.string().min(1),
  points: z.number().int(),
  description: z.string().min(1),
});

export const redeemRewardSchema = z.object({
  customerId: z.string().min(1),
  rewardId: z.string().min(1),
});

export const transactionQuerySchema = z.object({
  customerId: z.string().optional(),
  type: z.enum(['EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const customerLoyaltyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});
