import type { PaymentProvider, CreatePixParams, PixPaymentResult, PaymentStatusResult, WebhookResult } from './provider.interface.js';

export class AsaasProvider implements PaymentProvider {
  name = 'asaas';
  private apiKey: string;
  private baseUrl: string;

  constructor(credentials: { apiKey: string; sandbox?: boolean }) {
    this.apiKey = credentials.apiKey;
    this.baseUrl = credentials.sandbox
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';
  }

  async createPixPayment(params: CreatePixParams): Promise<PixPaymentResult> {
    const paymentRes = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: JSON.stringify({
        billingType: 'PIX',
        value: params.amount,
        description: params.description,
        externalReference: params.externalReference,
        dueDate: new Date(Date.now() + 30 * 60000).toISOString().split('T')[0],
      }),
    });

    const payment = await paymentRes.json() as any;

    const qrRes = await fetch(`${this.baseUrl}/payments/${payment.id}/pixQrCode`, {
      headers: { access_token: this.apiKey },
    });

    const qr = await qrRes.json() as any;

    return {
      transactionId: payment.id,
      pixCode: qr.payload || '',
      pixQrCodeBase64: qr.encodedImage || '',
      expiresAt: new Date(qr.expirationDate || Date.now() + 30 * 60000),
    };
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    const res = await fetch(`${this.baseUrl}/payments/${transactionId}`, {
      headers: { access_token: this.apiKey },
    });

    const data = await res.json() as any;
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      CONFIRMED: 'confirmed',
      RECEIVED: 'confirmed',
      PENDING: 'pending',
      REFUNDED: 'refunded',
    };

    return {
      transactionId,
      status: statusMap[data.status] || 'failed',
      paidAt: data.confirmedDate ? new Date(data.confirmedDate) : undefined,
    };
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const eventMap: Record<string, WebhookResult['status']> = {
      PAYMENT_CONFIRMED: 'confirmed',
      PAYMENT_RECEIVED: 'confirmed',
      PAYMENT_REFUNDED: 'refunded',
    };

    return {
      transactionId: payload.payment?.id || '',
      externalReference: payload.payment?.externalReference || '',
      status: eventMap[payload.event] || 'failed',
    };
  }
}
