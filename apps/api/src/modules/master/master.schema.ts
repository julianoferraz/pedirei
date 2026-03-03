import { z } from 'zod';

export const updateTenantMasterBodySchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const changePlanBodySchema = z.object({
  planId: z.string(),
});

export const updateAiMasterBodySchema = z.object({
  aiMode: z.enum(['PLATFORM_KEY', 'TENANT_KEY', 'HYBRID']),
  aiTokenLimit: z.number().int().positive().optional().nullable(),
});

export const blockTenantBodySchema = z.object({
  isActive: z.boolean(),
});

export const updatePlatformConfigBodySchema = z.object({
  defaultAiModel: z.string().optional(),
  defaultAiProvider: z.string().optional(),
  platformOpenaiKey: z.string().optional().nullable(),
  alertTelegramBotToken: z.string().optional().nullable(),
  alertTelegramChatId: z.string().optional().nullable(),
});

export const updatePlanBodySchema = z.object({
  name: z.string().optional(),
  maxOrdersMonth: z.number().int().optional(),
  maxOperators: z.number().int().optional(),
  hasReports: z.boolean().optional(),
  hasAdvReports: z.boolean().optional(),
  hasNfce: z.boolean().optional(),
  hasPrinting: z.boolean().optional(),
  hasRepeatOrder: z.boolean().optional(),
  hasPhotoImport: z.boolean().optional(),
  hasWhatsappCmd: z.boolean().optional(),
  hasCustomDomain: z.boolean().optional(),
  hasMultiUnit: z.boolean().optional(),
  hasBranding: z.boolean().optional(),
  price: z.number().min(0).optional(),
});

export const tenantsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  planSlug: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
