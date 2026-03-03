export interface NfceProvider {
  name: string;
  emit(params: NfceEmitParams): Promise<NfceResult>;
  query(nfceNumber: string): Promise<NfceResult>;
}

export interface NfceEmitParams {
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    ncm?: string;
    cfop?: string;
    csosn?: string;
  }>;
  totalAmount: number;
  paymentMethod: string;
  fiscalData: Record<string, unknown>;
}

export interface NfceResult {
  nfceNumber: string;
  xml: string;
  danfeUrl: string;
  emittedAt: Date;
}
