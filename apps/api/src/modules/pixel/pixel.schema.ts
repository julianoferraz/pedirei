import { z } from 'zod';

export const updatePixelSettingsSchema = z.object({
  facebookPixelId: z.string().max(50).nullable().optional(),
  googleAnalyticsId: z.string().max(50).nullable().optional(),
  googleAdsId: z.string().max(50).nullable().optional(),
  tiktokPixelId: z.string().max(50).nullable().optional(),
});
