import { prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { decryptJson } from '../../services/encryption.service.js';
import type { PaymentProvider } from './providers/provider.interface.js';
import { MercadoPagoProvider } from './providers/mercadopago.provider.js';
import { AsaasProvider } from './providers/asaas.provider.js';
import { EfiPayProvider } from './providers/efipay.provider.js';

function getProvider(providerName: string, credentials: string): PaymentProvider {
  const creds = decryptJson(credentials);
  switch (providerName) {
    case 'mercadopago':
      return new MercadoPagoProvider(creds as any);
    case 'asaas':
      return new AsaasProvider(creds as any);
    case 'efipay':
      return new EfiPayProvider(creds as any);
    default:
      throw new ValidationError(`Provider ${providerName} não suportado`);
  }
}

export async function createPixPayment(tenantId: string, orderId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { pspProvider: true, pspCredentials: true, name: true },
  });
  if (!tenant?.pspProvider || !tenant.pspCredentials) {
    throw new ValidationError('Provedor de pagamento não configurado');
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!order) throw new NotFoundError('Pedido');

  const provider = getProvider(tenant.pspProvider, tenant.pspCredentials as string);
  const result = await provider.createPixPayment({
    amount: Number(order.totalAmount),
    description: `Pedido #${order.orderNumber} - ${tenant.name}`,
    externalReference: order.id,
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      pspTransactionId: result.transactionId,
      pspPixCode: result.pixCode,
      pspPixQrCode: result.pixQrCodeBase64,
    },
  });

  return result;
}

export async function checkPixStatus(tenantId: string, orderId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { pspProvider: true, pspCredentials: true },
  });
  if (!tenant?.pspProvider || !tenant.pspCredentials) {
    throw new ValidationError('Provedor de pagamento não configurado');
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { pspTransactionId: true, paymentStatus: true },
  });
  if (!order?.pspTransactionId) throw new NotFoundError('Transação');

  const provider = getProvider(tenant.pspProvider, tenant.pspCredentials as string);
  const status = await provider.checkPaymentStatus(order.pspTransactionId);

  if (status.status === 'confirmed' && order.paymentStatus !== 'CONFIRMED') {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'CONFIRMED' },
    });
  }

  return status;
}
