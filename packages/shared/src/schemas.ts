import { z } from 'zod';

export const phoneSchema = z.string().regex(/^\d{10,13}$/, 'Número de telefone inválido');

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: phoneSchema,
  storeName: z.string().min(2, 'Nome da loja deve ter pelo menos 2 caracteres'),
  storeSlug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  availableTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().default(true),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.number().positive('Preço deve ser positivo'),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
  isPaused: z.boolean().default(false),
  isTemporary: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
  ncm: z.string().optional(),
  cfop: z.string().optional(),
  csosn: z.string().optional(),
});

export const createOrderSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string().cuid(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1, 'Pedido deve ter pelo menos 1 item'),
  deliveryAddress: z.string().optional(),
  deliveryRef: z.string().optional(),
  paymentMethod: z.enum(['PIX_AUTO', 'PIX_DELIVERY', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH']),
  needsChange: z.boolean().default(false),
  changeFor: z.number().positive().optional(),
  generalNotes: z.string().optional(),
  customerPhone: z.string(),
  customerName: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  note: z.string().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  orderMode: z.enum(['ALWAYS_SITE', 'ALWAYS_WHATSAPP', 'CLIENT_CHOOSES']).optional(),
  minOrderValue: z.number().positive().optional().nullable(),
  estimatedDelivery: z.string().optional(),
});

export const updatePaymentConfigSchema = z.object({
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

export const updateDeliveryConfigSchema = z.object({
  deliveryFeeMode: z.enum(['FIXED', 'DISTANCE_BASED']).optional(),
  fixedDeliveryFee: z.number().min(0).optional().nullable(),
  maxDeliveryRadius: z.number().positive().optional().nullable(),
  estimatedDelivery: z.string().optional(),
});

export const updateMessagesSchema = z.object({
  msgReceived: z.string().optional(),
  msgPreparing: z.string().optional(),
  msgOutDelivery: z.string().optional(),
  msgDelivered: z.string().optional(),
});

export const updateAiConfigSchema = z.object({
  aiMode: z.enum(['PLATFORM_KEY', 'TENANT_KEY', 'HYBRID']).optional(),
  aiModel: z.string().optional(),
  tenantOpenaiKey: z.string().optional().nullable(),
  aiTokenLimit: z.number().int().positive().optional().nullable(),
});

export const updateReengagementSchema = z.object({
  reengageEnabled: z.boolean().optional(),
  reengageDays: z.number().int().positive().optional(),
  reengageMessage: z.string().optional().nullable(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['PROMOTIONAL', 'REENGAGEMENT']),
  scheduledAt: z.string().datetime().optional(),
});

export const operatingHoursSchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isOpen: z.boolean(),
}));

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
