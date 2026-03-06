import type { MarketplaceSource } from '@pedirei/shared';

/** Normalized order from marketplace */
export interface MarketplaceOrder {
  marketplaceOrderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryRef?: string;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX_DELIVERY';
  needsChange: boolean;
  changeFor?: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  items: MarketplaceOrderItem[];
  generalNotes?: string;
}

export interface MarketplaceOrderItem {
  externalId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

/** Normalized catalog item to push to marketplace */
export interface CatalogCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: CatalogItem[];
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isPaused: boolean;
}

/** Marketplace status update to push */
export interface MarketplaceStatusUpdate {
  marketplaceOrderId: string;
  status: 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  reason?: string;
}

/** Credentials structures */
export interface IfoodCredentials {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

export interface RappiCredentials {
  apiKey: string;
  storeId: string;
  apiSecret?: string;
}

export type MarketplaceCredentials = IfoodCredentials | RappiCredentials;

/** Provider interface — each marketplace implements this */
export interface MarketplaceProvider {
  source: MarketplaceSource;

  /** Validate webhook signature */
  validateWebhook(payload: unknown, signature: string | null): boolean;

  /** Parse incoming order webhook into normalized format */
  parseOrder(payload: unknown): MarketplaceOrder;

  /** Push catalog to marketplace */
  syncCatalog(categories: CatalogCategory[]): Promise<{ syncedItems: number }>;

  /** Update order status on marketplace platform */
  updateOrderStatus(update: MarketplaceStatusUpdate): Promise<void>;

  /** Test connection / validate credentials */
  testConnection(): Promise<boolean>;
}
