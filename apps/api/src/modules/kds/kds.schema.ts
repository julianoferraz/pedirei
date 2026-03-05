import { z } from 'zod';

export const kdsOrderQuerySchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING']).optional(),
});

export const updateKdsItemStatusSchema = z.object({
  kdsStatus: z.enum(['PENDING', 'PREPARING', 'READY']),
});

export const bumpOrderSchema = z.object({
  note: z.string().max(200).optional(),
});
