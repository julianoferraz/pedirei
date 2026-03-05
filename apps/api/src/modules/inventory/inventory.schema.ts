import { z } from 'zod';

export const updateStockBodySchema = z.object({
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const adjustStockBodySchema = z.object({
  menuItemId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN']),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
});

export const bulkUpdateStockBodySchema = z.array(
  z.object({
    menuItemId: z.string().min(1),
    stockQuantity: z.number().int().min(0),
  }),
);

export const inventoryQuerySchema = z.object({
  lowStockOnly: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const movementQuerySchema = z.object({
  menuItemId: z.string().optional(),
  type: z.enum(['IN', 'OUT', 'SALE', 'ADJUSTMENT', 'RETURN']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
