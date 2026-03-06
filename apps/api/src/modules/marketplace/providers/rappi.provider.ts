import { createHmac, timingSafeEqual } from 'crypto';
import type {
  MarketplaceProvider,
  MarketplaceOrder,
  MarketplaceStatusUpdate,
  CatalogCategory,
  RappiCredentials,
} from '../marketplace.interface.js';
import { logger } from '../../../utils/logger.js';

const RAPPI_API_BASE = 'https://services.rappi.com.br/api/v1';

export class RappiProvider implements MarketplaceProvider {
  source = 'RAPPI' as const;
  private creds: RappiCredentials;

  constructor(creds: RappiCredentials) {
    this.creds = creds;
  }

  private async apiFetch(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${RAPPI_API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.creds.apiKey,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Rappi API ${res.status}: ${text}`);
    }
    return res.json();
  }

  validateWebhook(payload: unknown, signature: string | null): boolean {
    if (!this.creds.apiSecret || !signature) return false;
    try {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expected = createHmac('sha256', this.creds.apiSecret).update(body).digest('hex');
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length) return false;
      return timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  parseOrder(payload: unknown): MarketplaceOrder {
    const data = payload as any;
    const order = data.order || data;

    const paymentMap: Record<string, MarketplaceOrder['paymentMethod']> = {
      cash: 'CASH',
      credit_card: 'CREDIT_CARD',
      debit_card: 'DEBIT_CARD',
      pix: 'PIX_DELIVERY',
    };

    return {
      marketplaceOrderId: order.id || order.order_id,
      customerName: order.client?.name || 'Cliente Rappi',
      customerPhone: order.client?.phone || '',
      deliveryAddress: [
        order.delivery?.address?.street,
        order.delivery?.address?.number,
        order.delivery?.address?.neighborhood,
        order.delivery?.address?.city,
      ].filter(Boolean).join(', '),
      deliveryRef: order.delivery?.address?.complement || undefined,
      paymentMethod: paymentMap[order.payment?.method] || 'CREDIT_CARD',
      needsChange: !!order.payment?.change_value,
      changeFor: order.payment?.change_value || undefined,
      subtotal: order.totals?.subtotal || 0,
      deliveryFee: order.totals?.delivery_fee || 0,
      totalAmount: order.totals?.total || order.total_value || 0,
      items: (order.items || order.products || []).map((item: any) => ({
        externalId: item.id || item.sku,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.unit_price || item.price || 0,
        notes: item.comments || undefined,
      })),
      generalNotes: order.comments || undefined,
    };
  }

  async syncCatalog(categories: CatalogCategory[]): Promise<{ syncedItems: number }> {
    let syncedItems = 0;

    try {
      const catalogPayload = {
        store_id: this.creds.storeId,
        categories: categories.map((cat) => ({
          external_id: cat.id,
          name: cat.name,
          description: cat.description || '',
          sort_order: cat.sortOrder,
          products: cat.items.map((item) => ({
            external_id: item.id,
            name: item.name,
            description: item.description || '',
            price: item.price,
            image_url: item.imageUrl || undefined,
            available: !item.isPaused,
          })),
        })),
      };

      await this.apiFetch(`/stores/${this.creds.storeId}/catalog`, {
        method: 'PUT',
        body: JSON.stringify(catalogPayload),
      });

      syncedItems = categories.reduce((acc, c) => acc + c.items.length, 0);
    } catch (err) {
      logger.error({ err }, 'Failed to sync Rappi catalog');
    }

    return { syncedItems };
  }

  async updateOrderStatus(update: MarketplaceStatusUpdate): Promise<void> {
    const statusMap: Record<string, string> = {
      CONFIRMED: 'accepted',
      DISPATCHED: 'dispatched',
      DELIVERED: 'delivered',
      CANCELLED: 'rejected',
    };

    const rappiStatus = statusMap[update.status];
    if (!rappiStatus) return;

    await this.apiFetch(`/orders/${update.marketplaceOrderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: rappiStatus,
        reason: update.reason || undefined,
      }),
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.apiFetch(`/stores/${this.creds.storeId}`);
      return true;
    } catch (err) {
      logger.error({ err }, 'Rappi connection test failed');
      return false;
    }
  }
}
