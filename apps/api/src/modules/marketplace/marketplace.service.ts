import { prisma, Prisma } from '@pedirei/database';
import type { MarketplaceSource } from '@pedirei/shared';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { encryptJson, decryptJson } from '../../services/encryption.service.js';
import { logger } from '../../utils/logger.js';
import { randomBytes } from 'crypto';
import type {
  MarketplaceProvider,
  MarketplaceOrder,
  CatalogCategory,
  IfoodCredentials,
  RappiCredentials,
} from './marketplace.interface.js';
import { IfoodProvider } from './providers/ifood.provider.js';
import { RappiProvider } from './providers/rappi.provider.js';

// Import order creation side-effects
import { sendWhatsAppMessage } from '@pedirei/whatsapp';

function getProvider(source: MarketplaceSource, credentials: string): MarketplaceProvider {
  const creds = decryptJson(credentials);
  switch (source) {
    case 'IFOOD':
      return new IfoodProvider(creds as IfoodCredentials);
    case 'RAPPI':
      return new RappiProvider(creds as RappiCredentials);
    default:
      throw new ValidationError(`Marketplace ${source} não suportado`);
  }
}

// ─── Integration CRUD ─────────────────────────────────────

export async function listIntegrations(tenantId: string) {
  return prisma.marketplaceIntegration.findMany({
    where: { tenantId },
    select: {
      id: true,
      provider: true,
      merchantId: true,
      status: true,
      catalogSyncedAt: true,
      lastWebhookAt: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function connectMarketplace(
  tenantId: string,
  provider: MarketplaceSource,
  credentials: Record<string, string>,
) {
  // Check if already connected
  const existing = await prisma.marketplaceIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });
  if (existing && existing.status === 'CONNECTED') {
    throw new ValidationError(`${provider} já está conectado`);
  }

  // Build typed credentials
  let typedCreds: IfoodCredentials | RappiCredentials;
  let merchantId: string;

  if (provider === 'IFOOD') {
    if (!credentials.clientId || !credentials.clientSecret || !credentials.merchantId) {
      throw new ValidationError('clientId, clientSecret e merchantId são obrigatórios para iFood');
    }
    typedCreds = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      merchantId: credentials.merchantId,
    };
    merchantId = credentials.merchantId;
  } else {
    if (!credentials.apiKey || !credentials.storeId) {
      throw new ValidationError('apiKey e storeId são obrigatórios para Rappi');
    }
    typedCreds = {
      apiKey: credentials.apiKey,
      storeId: credentials.storeId,
      apiSecret: credentials.apiSecret || undefined,
    };
    merchantId = credentials.storeId;
  }

  // Test connection
  const encrypted = encryptJson(typedCreds as Record<string, unknown>);
  const prov = getProvider(provider, encrypted);
  const isOk = await prov.testConnection();

  if (!isOk) {
    throw new ValidationError('Não foi possível conectar. Verifique as credenciais.');
  }

  // If iFood, save refreshed token
  if (provider === 'IFOOD') {
    const updatedCreds = (prov as IfoodProvider).getUpdatedCredentials();
    const reEncrypted = encryptJson(updatedCreds as unknown as Record<string, unknown>);

    const webhookSecret = randomBytes(32).toString('hex');

    return prisma.marketplaceIntegration.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      update: {
        credentials: reEncrypted,
        merchantId,
        status: 'CONNECTED',
        webhookSecret,
        isActive: true,
      },
      create: {
        tenantId,
        provider,
        credentials: reEncrypted,
        merchantId,
        status: 'CONNECTED',
        webhookSecret,
        isActive: true,
      },
      select: { id: true, provider: true, merchantId: true, status: true },
    });
  }

  const webhookSecret = randomBytes(32).toString('hex');

  return prisma.marketplaceIntegration.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    update: {
      credentials: encrypted,
      merchantId,
      status: 'CONNECTED',
      webhookSecret,
      isActive: true,
    },
    create: {
      tenantId,
      provider,
      credentials: encrypted,
      merchantId,
      status: 'CONNECTED',
      webhookSecret,
      isActive: true,
    },
    select: { id: true, provider: true, merchantId: true, status: true },
  });
}

export async function disconnectMarketplace(tenantId: string, provider: MarketplaceSource) {
  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });
  if (!integration) throw new NotFoundError('Integração');

  return prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: { status: 'DISCONNECTED', isActive: false, credentials: null },
    select: { id: true, provider: true, status: true },
  });
}

// ─── Catalog Sync ─────────────────────────────────────────

export async function syncCatalog(tenantId: string, provider: MarketplaceSource) {
  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });
  if (!integration || integration.status !== 'CONNECTED' || !integration.credentials) {
    throw new ValidationError(`${provider} não está conectado`);
  }

  // Fetch catalog
  const categories = await prisma.category.findMany({
    where: { tenantId, isActive: true },
    include: {
      items: {
        where: { isPaused: false },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, description: true, price: true, imageUrl: true, isPaused: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const catalogData: CatalogCategory[] = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description || undefined,
    sortOrder: cat.sortOrder,
    items: cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      price: Number(item.price),
      imageUrl: item.imageUrl || undefined,
      isPaused: item.isPaused,
    })),
  }));

  const prov = getProvider(provider, integration.credentials);
  const result = await prov.syncCatalog(catalogData);

  // Update sync timestamp
  await prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: { catalogSyncedAt: new Date() },
  });

  return result;
}

// ─── Webhook → Create Order ───────────────────────────────

export async function handleMarketplaceWebhook(
  provider: MarketplaceSource,
  merchantId: string,
  payload: unknown,
  signature: string | null,
) {
  // Find integration by provider + merchantId
  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { provider, merchantId, status: 'CONNECTED', isActive: true },
    include: {
      tenant: {
        select: {
          id: true,
          fixedDeliveryFee: true,
          creditFeePercent: true,
          debitFeePercent: true,
          msgReceived: true,
        },
      },
    },
  });

  if (!integration || !integration.credentials) {
    logger.warn({ provider, merchantId }, 'Marketplace webhook: no active integration found');
    return null;
  }

  const prov = getProvider(provider, integration.credentials);

  // Validate webhook signature
  if (!prov.validateWebhook(payload, signature)) {
    logger.warn({ provider, merchantId }, 'Marketplace webhook: invalid signature');
    return null;
  }

  // Parse normalized order
  const marketplaceOrder = prov.parseOrder(payload);

  // Check if order already exists (idempotency)
  const existingOrder = await prisma.order.findFirst({
    where: {
      tenantId: integration.tenantId,
      marketplaceSource: provider,
      marketplaceOrderId: marketplaceOrder.marketplaceOrderId,
    },
  });
  if (existingOrder) {
    logger.info({ orderId: existingOrder.id }, 'Marketplace order already exists, skipping');
    return existingOrder;
  }

  const tenantId = integration.tenantId;

  // Upsert customer
  const customerPhone = marketplaceOrder.customerPhone || `${provider.toLowerCase()}-${marketplaceOrder.marketplaceOrderId}`;
  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: customerPhone } },
    update: {
      name: marketplaceOrder.customerName || undefined,
      lastOrderAt: new Date(),
      lastContactAt: new Date(),
      totalOrders: { increment: 1 },
      totalSpent: { increment: marketplaceOrder.totalAmount },
    },
    create: {
      tenantId,
      phone: customerPhone,
      name: marketplaceOrder.customerName,
      lastOrderAt: new Date(),
      lastContactAt: new Date(),
      totalOrders: 1,
      totalSpent: marketplaceOrder.totalAmount,
    },
  });

  // Get next order number
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  // Create order
  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: customer.id,
      orderNumber: (lastOrder?.orderNumber || 0) + 1,
      status: 'RECEIVED',
      orderType: 'DELIVERY',
      marketplaceSource: provider,
      marketplaceOrderId: marketplaceOrder.marketplaceOrderId,
      deliveryAddress: marketplaceOrder.deliveryAddress,
      deliveryRef: marketplaceOrder.deliveryRef,
      subtotal: new Prisma.Decimal(marketplaceOrder.subtotal),
      deliveryFee: new Prisma.Decimal(marketplaceOrder.deliveryFee),
      cardFee: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(marketplaceOrder.totalAmount),
      paymentMethod: marketplaceOrder.paymentMethod,
      needsChange: marketplaceOrder.needsChange,
      changeFor: marketplaceOrder.changeFor ? new Prisma.Decimal(marketplaceOrder.changeFor) : null,
      generalNotes: marketplaceOrder.generalNotes
        ? `[${provider}] ${marketplaceOrder.generalNotes}`
        : `[${provider}]`,
      items: {
        create: marketplaceOrder.items.map((item) => ({
          menuItemId: item.externalId, // mapped by marketplace externalCode = our menuItem.id
          name: item.name,
          price: new Prisma.Decimal(item.price),
          quantity: item.quantity,
          notes: item.notes,
        })),
      },
      statusHistory: { create: { status: 'RECEIVED', note: `Pedido via ${provider}` } },
    },
    include: { items: true },
  });

  // Update webhook timestamp
  await prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: { lastWebhookAt: new Date() },
  });

  logger.info({ orderId: order.id, marketplace: provider, mkOrderId: marketplaceOrder.marketplaceOrderId }, 'Marketplace order created');

  return order;
}

// ─── Status Sync (Pedirei → Marketplace) ──────────────────

export async function syncOrderStatusToMarketplace(
  tenantId: string,
  orderId: string,
  newStatus: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { marketplaceSource: true, marketplaceOrderId: true },
  });

  if (!order?.marketplaceSource || !order?.marketplaceOrderId) return;

  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider: order.marketplaceSource } },
  });

  if (!integration?.credentials || integration.status !== 'CONNECTED') return;

  const statusMap: Record<string, string> = {
    PREPARING: 'CONFIRMED',
    OUT_FOR_DELIVERY: 'DISPATCHED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  };

  const marketplaceStatus = statusMap[newStatus];
  if (!marketplaceStatus) return;

  try {
    const prov = getProvider(order.marketplaceSource, integration.credentials);
    await prov.updateOrderStatus({
      marketplaceOrderId: order.marketplaceOrderId,
      status: marketplaceStatus as any,
    });
    logger.info(
      { orderId, marketplace: order.marketplaceSource, status: marketplaceStatus },
      'Marketplace status synced',
    );
  } catch (err) {
    logger.error({ err, orderId }, 'Failed to sync marketplace status');
  }
}

// ─── Stats ────────────────────────────────────────────────

export async function getMarketplaceStats(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [ifoodToday, rappiToday, ifoodTotal, rappiTotal] = await Promise.all([
    prisma.order.count({
      where: { tenantId, marketplaceSource: 'IFOOD', createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: { tenantId, marketplaceSource: 'RAPPI', createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: { tenantId, marketplaceSource: 'IFOOD' },
    }),
    prisma.order.count({
      where: { tenantId, marketplaceSource: 'RAPPI' },
    }),
  ]);

  return { ifoodToday, rappiToday, ifoodTotal, rappiTotal };
}
