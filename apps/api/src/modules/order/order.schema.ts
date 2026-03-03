import { z } from 'zod';

export const createOrderBodySchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1),
  deliveryAddress: z.string().optional(),
  deliveryRef: z.string().optional(),
  paymentMethod: z.enum(['PIX_AUTO', 'PIX_DELIVERY', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH']),
  needsChange: z.boolean().default(false),
  changeFor: z.number().positive().optional(),
  generalNotes: z.string().optional(),
  customerPhone: z.string(),
  customerName: z.string().optional(),
});

export const updateOrderStatusBodySchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  note: z.string().optional(),
});

export const cancelOrderBodySchema = z.object({
  reason: z.string().optional(),
});

export const orderQuerySchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
