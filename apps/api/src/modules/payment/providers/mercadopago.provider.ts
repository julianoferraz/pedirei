import type { PaymentProvider, CreatePixParams, PixPaymentResult, PaymentStatusResult, WebhookResult } from './provider.interface.js';

export class MercadoPagoProvider implements PaymentProvider {
  name = 'mercadopago';
  private accessToken: string;

  constructor(credentials: { accessToken: string }) {
    this.accessToken = credentials.accessToken;
  }

  async createPixPayment(params: CreatePixParams): Promise<PixPaymentResult> {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        transaction_amount: params.amount,
        description: params.description,
        external_reference: params.externalReference,
        payment_method_id: 'pix',
        payer: {
          email: params.payerEmail || 'cliente@pedirei.online',
          first_name: params.payerName || 'Cliente',
        },
      }),
    });

    const data = await response.json() as any;

    return {
      transactionId: String(data.id),
      pixCode: data.point_of_interaction?.transaction_data?.qr_code || '',
      pixQrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 || '',
      expiresAt: new Date(data.date_of_expiration || Date.now() + 30 * 60000),
    };
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${transactionId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = await response.json() as any;
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      approved: 'confirmed',
      pending: 'pending',
      refunded: 'refunded',
    };

    return {
      transactionId,
      status: statusMap[data.status] || 'failed',
      paidAt: data.date_approved ? new Date(data.date_approved) : undefined,
    };
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const paymentId = payload.data?.id || payload.id;
    const status = await this.checkPaymentStatus(String(paymentId));

    return {
      transactionId: String(paymentId),
      externalReference: '',
      status: status.status === 'pending' ? 'failed' : status.status,
    };
  }
}
