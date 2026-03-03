export interface PaymentProvider {
  name: string;
  createPixPayment(params: CreatePixParams): Promise<PixPaymentResult>;
  checkPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;
  handleWebhook(payload: unknown): Promise<WebhookResult>;
}

export interface CreatePixParams {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail?: string;
  payerName?: string;
}

export interface PixPaymentResult {
  transactionId: string;
  pixCode: string;
  pixQrCodeBase64: string;
  expiresAt: Date;
}

export interface PaymentStatusResult {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'refunded' | 'failed';
  paidAt?: Date;
}

export interface WebhookResult {
  transactionId: string;
  externalReference: string;
  status: 'confirmed' | 'refunded' | 'failed';
}
