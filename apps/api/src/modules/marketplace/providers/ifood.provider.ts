import type {
  MarketplaceProvider,
  MarketplaceOrder,
  MarketplaceStatusUpdate,
  CatalogCategory,
  IfoodCredentials,
} from '../marketplace.interface.js';
import { logger } from '../../../utils/logger.js';

const IFOOD_API_BASE = 'https://merchant-api.ifood.com.br';

export class IfoodProvider implements MarketplaceProvider {
  source = 'IFOOD' as const;
  private creds: IfoodCredentials;

  constructor(creds: IfoodCredentials) {
    this.creds = creds;
  }

  private async getAccessToken(): Promise<string> {
    // If token is still valid, reuse it
    if (this.creds.accessToken && this.creds.tokenExpiresAt) {
      const expiresAt = new Date(this.creds.tokenExpiresAt).getTime();
      if (Date.now() < expiresAt - 60_000) {
        return this.creds.accessToken;
      }
    }

    const res = await fetch(`${IFOOD_API_BASE}/authentication/v1.0/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grantType: 'client_credentials',
        clientId: this.creds.clientId,
        clientSecret: this.creds.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`iFood auth failed: ${res.status}`);
    }

    const data = await res.json() as { accessToken: string; expiresIn: number };
    this.creds.accessToken = data.accessToken;
    this.creds.tokenExpiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();

    return data.accessToken;
  }

  private async apiFetch(path: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    const res = await fetch(`${IFOOD_API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`iFood API ${res.status}: ${text}`);
    }
    return res.json();
  }

  validateWebhook(_payload: unknown, _signature: string | null): boolean {
    // iFood uses polling model primarily; webhooks are simpler
    // In production, validate Authorization header matching merchant credentials
    return true;
  }

  parseOrder(payload: unknown): MarketplaceOrder {
    const data = payload as any;
    const order = data.order || data;

    const paymentMap: Record<string, MarketplaceOrder['paymentMethod']> = {
      ONLINE: 'CREDIT_CARD',
      CASH: 'CASH',
      CREDIT: 'CREDIT_CARD',
      DEBIT: 'DEBIT_CARD',
    };

    return {
      marketplaceOrderId: order.id || order.orderId,
      customerName: order.customer?.name || 'Cliente iFood',
      customerPhone: order.customer?.phone?.number || order.customer?.phone || '',
      deliveryAddress: [
        order.delivery?.deliveryAddress?.streetName,
        order.delivery?.deliveryAddress?.streetNumber,
        order.delivery?.deliveryAddress?.neighborhood,
        order.delivery?.deliveryAddress?.city,
      ].filter(Boolean).join(', '),
      deliveryRef: order.delivery?.deliveryAddress?.complement || undefined,
      paymentMethod: paymentMap[order.payments?.[0]?.method] || 'CREDIT_CARD',
      needsChange: !!order.payments?.[0]?.changeFor,
      changeFor: order.payments?.[0]?.changeFor || undefined,
      subtotal: order.total?.subTotal || order.subTotal || 0,
      deliveryFee: order.total?.deliveryFee || order.deliveryFee || 0,
      totalAmount: order.total?.orderAmount || order.totalPrice || 0,
      items: (order.items || []).map((item: any) => ({
        externalId: item.id || item.externalCode,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.unitPrice || item.price || 0,
        notes: item.observations || undefined,
      })),
      generalNotes: order.extraInfo || undefined,
    };
  }

  async syncCatalog(categories: CatalogCategory[]): Promise<{ syncedItems: number }> {
    let syncedItems = 0;

    for (const category of categories) {
      try {
        // iFood catalog v2 — update category
        await this.apiFetch(`/catalog/v2.0/merchants/${this.creds.merchantId}/categories`, {
          method: 'PATCH',
          body: JSON.stringify([{
            merchantId: this.creds.merchantId,
            externalCode: category.id,
            name: category.name,
            description: category.description || '',
            order: category.sortOrder,
            status: 'AVAILABLE',
            items: category.items.map((item) => ({
              externalCode: item.id,
              name: item.name,
              description: item.description || '',
              price: { value: item.price, originalValue: item.price },
              imageUrl: item.imageUrl || undefined,
              status: item.isPaused ? 'UNAVAILABLE' : 'AVAILABLE',
            })),
          }]),
        });
        syncedItems += category.items.length;
      } catch (err) {
        logger.error({ err, categoryId: category.id }, 'Failed to sync iFood category');
      }
    }

    return { syncedItems };
  }

  async updateOrderStatus(update: MarketplaceStatusUpdate): Promise<void> {
    const statusMap: Record<string, string> = {
      CONFIRMED: 'confirm',
      DISPATCHED: 'dispatch',
      DELIVERED: 'delivery-completed',
      CANCELLED: 'cancellation/request',
    };

    const action = statusMap[update.status];
    if (!action) return;

    const endpoint = `/order/v1.0/orders/${update.marketplaceOrderId}/${action}`;
    const body = update.status === 'CANCELLED' ? JSON.stringify({ reason: update.reason || 'INTERNAL' }) : undefined;

    await this.apiFetch(endpoint, {
      method: 'POST',
      body,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      // Verify merchant exists
      await this.apiFetch(`/merchant/v1.0/merchants/${this.creds.merchantId}`);
      return true;
    } catch (err) {
      logger.error({ err }, 'iFood connection test failed');
      return false;
    }
  }

  /** Get updated credentials (after token refresh) */
  getUpdatedCredentials(): IfoodCredentials {
    return { ...this.creds };
  }
}
