import { notFound } from 'next/navigation';
import { getTenantInfo, getTenantMenu } from '@/lib/api';
import MenuPage from './MenuPage';
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const info = await getTenantInfo(params.slug);
    return {
      title: `${info.name} | Cardápio Digital`,
      description: info.description || `Peça online no ${info.name}`,
      openGraph: {
        title: info.name,
        description: info.description || `Cardápio digital de ${info.name}`,
        images: info.bannerUrl ? [info.bannerUrl] : [],
      },
    };
  } catch {
    return { title: 'Restaurante não encontrado' };
  }
}

export default async function TenantPage({ params }: Props) {
  try {
    const [info, menu] = await Promise.all([
      getTenantInfo(params.slug),
      getTenantMenu(params.slug),
    ]);
    return <MenuPage info={info} categories={menu} />;
  } catch {
    notFound();
  }
}
