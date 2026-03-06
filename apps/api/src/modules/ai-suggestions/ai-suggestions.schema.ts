import { z } from 'zod';

export const suggestionsQuerySchema = z.object({
  itemIds: z.string().transform((s) => s.split(',').filter(Boolean)),
});

export const generateDescriptionSchema = z.object({
  itemName: z.string().min(1).max(100),
  category: z.string().min(1).max(50).optional(),
  ingredients: z.string().max(500).optional(),
  style: z.enum(['casual', 'gourmet', 'fast-food']).default('casual'),
});

export const priceAnalysisSchema = z.object({
  categoryId: z.string().optional(),
});
