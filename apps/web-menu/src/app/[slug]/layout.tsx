import { getTenantInfo } from '@/lib/api';
import TrackingPixels from '@/components/TrackingPixels';

interface Props {
  params: { slug: string };
  children: React.ReactNode;
}

export default async function TenantLayout({ params, children }: Props) {
  let pixels: {
    facebookPixelId?: string | null;
    googleAnalyticsId?: string | null;
    googleAdsId?: string | null;
    tiktokPixelId?: string | null;
  } = {};

  try {
    const info = await getTenantInfo(params.slug);
    pixels = {
      facebookPixelId: (info as any).facebookPixelId,
      googleAnalyticsId: (info as any).googleAnalyticsId,
      googleAdsId: (info as any).googleAdsId,
      tiktokPixelId: (info as any).tiktokPixelId,
    };
  } catch {
    // Tenant not found — page.tsx will handle notFound()
  }

  return (
    <>
      <TrackingPixels {...pixels} />
      {children}
    </>
  );
}
