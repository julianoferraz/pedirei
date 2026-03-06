import { z } from 'zod';

export const createTableSchema = z.object({
  number: z.string().min(1).max(10),
  name: z.string().max(50).optional(),
  capacity: z.number().int().min(1).max(100).default(4),
});

export const updateTableSchema = z.object({
  number: z.string().min(1).max(10).optional(),
  name: z.string().max(50).nullable().optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const tableQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
});

export const createTableOrderSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1),
  paymentMethod: z.enum(['PIX_AUTO', 'PIX_DELIVERY', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH']),
  generalNotes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().min(8),
});
