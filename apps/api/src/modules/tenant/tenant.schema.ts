import { z } from 'zod';

export const updateTenantBodySchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  orderMode: z.enum(['ALWAYS_SITE', 'ALWAYS_WHATSAPP', 'CLIENT_CHOOSES']).optional(),
  minOrderValue: z.number().positive().optional().nullable(),
  estimatedDelivery: z.string().optional(),
});

export const operatingHoursBodySchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isOpen: z.boolean(),
}));

export const updatePaymentBodySchema = z.object({
  pixAutoEnabled: z.boolean().optional(),
  pixOnDelivery: z.boolean().optional(),
  cardCreditEnabled: z.boolean().optional(),
  cardDebitEnabled: z.boolean().optional(),
  cashEnabled: z.boolean().optional(),
  creditFeePercent: z.number().min(0).max(100).optional(),
  debitFeePercent: z.number().min(0).max(100).optional(),
  pspProvider: z.enum(['mercadopago', 'asaas', 'efipay', 'pagbank']).optional().nullable(),
  pspCredentials: z.record(z.string()).optional(),
});

export const updateDeliveryBodySchema = z.object({
  deliveryFeeMode: z.enum(['FIXED', 'DISTANCE_BASED']).optional(),
  fixedDeliveryFee: z.number().min(0).optional().nullable(),
  maxDeliveryRadius: z.number().positive().optional().nullable(),
  estimatedDelivery: z.string().optional(),
});

export const updateMessagesBodySchema = z.object({
  msgReceived: z.string().optional(),
  msgPreparing: z.string().optional(),
  msgOutDelivery: z.string().optional(),
  msgDelivered: z.string().optional(),
});

export const updateAiBodySchema = z.object({
  aiMode: z.enum(['PLATFORM_KEY', 'TENANT_KEY', 'HYBRID']).optional(),
  aiModel: z.string().optional(),
  tenantOpenaiKey: z.string().optional().nullable(),
  aiTokenLimit: z.number().int().positive().optional().nullable(),
});

export const updateNfceBodySchema = z.object({
  nfceEnabled: z.boolean().optional(),
  nfceProvider: z.enum(['focusnfe', 'nuvemfiscal', 'enotas', 'webmaniabr']).optional().nullable(),
  nfceCredentials: z.record(z.string()).optional(),
  nfceFiscalData: z.record(z.unknown()).optional(),
  nfceAutoEmit: z.boolean().optional(),
});

export const updateReengagementBodySchema = z.object({
  reengageEnabled: z.boolean().optional(),
  reengageDays: z.number().int().positive().optional(),
  reengageMessage: z.string().optional().nullable(),
});
