import { prisma } from '@pedirei/database';

const PIXEL_SELECT = {
  facebookPixelId: true,
  googleAnalyticsId: true,
  googleAdsId: true,
  tiktokPixelId: true,
} as const;

export async function getPixelSettings(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: PIXEL_SELECT,
  });
}

export async function updatePixelSettings(
  tenantId: string,
  data: {
    facebookPixelId?: string | null;
    googleAnalyticsId?: string | null;
    googleAdsId?: string | null;
    tiktokPixelId?: string | null;
  },
) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data,
    select: PIXEL_SELECT,
  });
}
