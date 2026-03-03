import { prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { decryptJson } from '../../services/encryption.service.js';
import { FocusNfeProvider } from './providers/focusnfe.provider.js';

export async function emitNfce(tenantId: string, orderId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { nfceEnabled: true, nfceProvider: true, nfceCredentials: true, nfceFiscalData: true },
  });

  if (!tenant?.nfceEnabled || !tenant.nfceProvider || !tenant.nfceCredentials) {
    throw new ValidationError('NFC-e não configurada');
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: { include: { menuItem: true } } },
  });
  if (!order) throw new NotFoundError('Pedido');
  if (order.nfceNumber) throw new ValidationError('NFC-e já emitida para este pedido');

  const creds = decryptJson(tenant.nfceCredentials as string);
  const provider = new FocusNfeProvider(creds as any);

  const result = await provider.emit({
    orderId: order.id,
    items: order.items.map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.price),
      ncm: i.menuItem?.ncm || undefined,
      cfop: i.menuItem?.cfop || undefined,
      csosn: i.menuItem?.csosn || undefined,
    })),
    totalAmount: Number(order.totalAmount),
    paymentMethod: order.paymentMethod,
    fiscalData: (tenant.nfceFiscalData as Record<string, unknown>) || {},
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      nfceNumber: result.nfceNumber,
      nfceXml: result.xml,
      nfceDanfeUrl: result.danfeUrl,
      nfceEmittedAt: result.emittedAt,
    },
  });

  return result;
}

export async function getNfce(tenantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { nfceNumber: true, nfceXml: true, nfceDanfeUrl: true, nfceEmittedAt: true },
  });
  if (!order) throw new NotFoundError('Pedido');
  if (!order.nfceNumber) throw new NotFoundError('NFC-e');
  return order;
}
