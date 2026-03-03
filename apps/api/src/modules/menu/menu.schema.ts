import { z } from 'zod';

export const createCategoryBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  availableTo: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCategoryBodySchema = createCategoryBodySchema.partial();

export const reorderBodySchema = z.array(z.object({
  id: z.string(),
  sortOrder: z.number().int(),
}));

export const createMenuItemBodySchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isPaused: z.boolean().default(false),
  isTemporary: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
  ncm: z.string().optional(),
  cfop: z.string().optional(),
  csosn: z.string().optional(),
});

export const updateMenuItemBodySchema = createMenuItemBodySchema.partial();

export const dailyMenuBodySchema = z.object({
  rawInput: z.string().min(1),
});
