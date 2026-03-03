import type { PaymentProvider, CreatePixParams, PixPaymentResult, PaymentStatusResult, WebhookResult } from './provider.interface.js';

export class EfiPayProvider implements PaymentProvider {
  name = 'efipay';
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://pix.api.efipay.com.br';

  constructor(credentials: { clientId: string; clientSecret: string; sandbox?: boolean }) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    if (credentials.sandbox) {
      this.baseUrl = 'https://pix-h.api.efipay.com.br';
    }
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });
    const data = await res.json() as any;
    return data.access_token;
  }

  async createPixPayment(params: CreatePixParams): Promise<PixPaymentResult> {
    const token = await this.getAccessToken();

    const cobRes = await fetch(`${this.baseUrl}/v2/cob`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendario: { expiracao: 1800 },
        valor: { original: params.amount.toFixed(2) },
        chave: '',
        infoAdicionais: [{ nome: 'Pedido', valor: params.externalReference }],
      }),
    });

    const cob = await cobRes.json() as any;

    const qrRes = await fetch(`${this.baseUrl}/v2/loc/${cob.loc.id}/qrcode`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const qr = await qrRes.json() as any;

    return {
      transactionId: cob.txid,
      pixCode: qr.qrcode || '',
      pixQrCodeBase64: qr.imagemQrcode || '',
      expiresAt: new Date(Date.now() + 30 * 60000),
    };
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/v2/cob/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json() as any;
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      CONCLUIDA: 'confirmed',
      ATIVA: 'pending',
    };

    return {
      transactionId,
      status: statusMap[data.status] || 'pending',
    };
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const pix = payload.pix?.[0];
    return {
      transactionId: pix?.txid || '',
      externalReference: '',
      status: pix ? 'confirmed' : 'failed',
    };
  }
}
