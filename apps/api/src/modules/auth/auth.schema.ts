import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10).max(13),
  storeName: z.string().min(2),
  storeSlug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string(),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
