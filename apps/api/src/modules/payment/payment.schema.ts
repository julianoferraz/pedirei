import { z } from 'zod';

export const createPixBodySchema = z.object({
  orderId: z.string(),
});
