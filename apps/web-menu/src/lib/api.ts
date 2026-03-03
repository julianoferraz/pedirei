const isServer = typeof window === 'undefined';
const API_URL = isServer
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  return res.json();
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  primaryColor?: string;
  isOpen: boolean;
  operatingHours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  deliveryFee?: number;
  minimumOrder?: number;
  estimatedDeliveryMin?: number;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  paymentMethods: string[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export async function getTenantInfo(slug: string): Promise<TenantInfo> {
  const res = await apiFetch<{ success: boolean; data: TenantInfo }>(
    `/api/public/${slug}/info`,
  );
  return res.data;
}

export async function getTenantMenu(slug: string): Promise<Category[]> {
  const res = await apiFetch<{ success: boolean; data: Category[] }>(
    `/api/public/${slug}/menu`,
  );
  return res.data;
}
