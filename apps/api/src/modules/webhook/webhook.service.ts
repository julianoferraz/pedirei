import { prisma, Prisma } from '@pedirei/database';
import { MercadoPagoProvider } from '../payment/providers/mercadopago.provider.js';
import { AsaasProvider } from '../payment/providers/asaas.provider.js';
import { EfiPayProvider } from '../payment/providers/efipay.provider.js';
import { decryptJson } from '../../services/encryption.service.js';
import type { PaymentProvider, WebhookResult } from '../payment/providers/provider.interface.js';

function getProvider(providerName: string, credentials: string): PaymentProvider {
  const creds = decryptJson(credentials);
  switch (providerName) {
    case 'mercadopago': return new MercadoPagoProvider(creds as any);
    case 'asaas': return new AsaasProvider(creds as any);
    case 'efipay': return new EfiPayProvider(creds as any);
    default: throw new Error(`Provider ${providerName} not supported`);
  }
}

export async function handlePaymentWebhook(providerName: string, payload: unknown): Promise<WebhookResult | null> {
  const tenants = await prisma.tenant.findMany({
    where: { pspProvider: providerName, pspCredentials: { not: Prisma.DbNull } },
    select: { id: true, pspCredentials: true },
  });

  for (const tenant of tenants) {
    try {
      const provider = getProvider(providerName, tenant.pspCredentials as string);
      const result = await provider.handleWebhook(payload);

      if (result.transactionId) {
        const order = await prisma.order.findFirst({
          where: {
            tenantId: tenant.id,
            pspTransactionId: result.transactionId,
          },
        });

        if (order) {
          const statusMap: Record<string, string> = {
            confirmed: 'CONFIRMED',
            refunded: 'REFUNDED',
          };
          const newStatus = statusMap[result.status];
          if (newStatus) {
            await prisma.order.update({
              where: { id: order.id },
              data: { paymentStatus: newStatus as any },
            });
          }
          return result;
        }
      }
    } catch (err) {
      console.error(`Webhook processing error for tenant ${tenant.id}:`, err);
    }
  }

  return null;
}
