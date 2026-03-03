import type { NfceProvider, NfceEmitParams, NfceResult } from './provider.interface.js';

export class FocusNfeProvider implements NfceProvider {
  name = 'focusnfe';
  private token: string;
  private baseUrl: string;

  constructor(credentials: { token: string; sandbox?: boolean }) {
    this.token = credentials.token;
    this.baseUrl = credentials.sandbox
      ? 'https://homologacao.focusnfe.com.br/v2'
      : 'https://api.focusnfe.com.br/v2';
  }

  async emit(params: NfceEmitParams): Promise<NfceResult> {
    const auth = Buffer.from(`${this.token}:`).toString('base64');
    const ref = `pedido_${params.orderId}`;

    const res = await fetch(`${this.baseUrl}/nfce?ref=${ref}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        natureza_operacao: 'VENDA AO CONSUMIDOR',
        forma_pagamento: '0',
        tipo_documento: '1',
        finalidade_emissao: '1',
        items: params.items.map((item, i) => ({
          numero_item: i + 1,
          codigo_produto: String(i + 1),
          descricao: item.name,
          quantidade_comercial: item.quantity,
          valor_unitario_comercial: item.unitPrice,
          ncm: item.ncm || '21069090',
          cfop: item.cfop || '5102',
          csosn: item.csosn || '102',
        })),
        formas_pagamento: [{
          forma_pagamento: params.paymentMethod === 'PIX_AUTO' ? '17' : '01',
          valor_pagamento: params.totalAmount,
        }],
      }),
    });

    const data = await res.json() as any;

    return {
      nfceNumber: data.numero || '',
      xml: data.caminho_xml_nota_fiscal || '',
      danfeUrl: data.caminho_danfe || '',
      emittedAt: new Date(),
    };
  }

  async query(ref: string): Promise<NfceResult> {
    const auth = Buffer.from(`${this.token}:`).toString('base64');
    const res = await fetch(`${this.baseUrl}/nfce/${ref}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = await res.json() as any;

    return {
      nfceNumber: data.numero || '',
      xml: data.caminho_xml_nota_fiscal || '',
      danfeUrl: data.caminho_danfe || '',
      emittedAt: new Date(data.data_emissao || Date.now()),
    };
  }
}
