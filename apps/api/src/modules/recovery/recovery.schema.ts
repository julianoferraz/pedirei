import { z } from 'zod';

export const updateRecoverySettingsSchema = z.object({
  recoveryEnabled: z.boolean().optional(),
  recoveryDelayMin: z.number().int().min(5).max(1440).optional(),
  recoveryMessage: z.string().min(10).max(500).optional(),
  recoveryDiscountPct: z.number().int().min(0).max(50).optional(),
});

export const recoveryStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type UpdateRecoverySettings = z.infer<typeof updateRecoverySettingsSchema>;
