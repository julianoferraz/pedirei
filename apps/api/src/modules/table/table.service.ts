import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

// ─── Table CRUD ─────────────────────────────────────────────────

export async function listTables(tenantId: string, isActive?: string) {
  const where: any = { tenantId };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  return prisma.dineInTable.findMany({
    where,
    orderBy: { number: 'asc' },
  });
}

export async function getTable(tenantId: string, id: string) {
  const table = await prisma.dineInTable.findFirst({ where: { id, tenantId } });
  if (!table) throw new NotFoundError('Mesa');
  return table;
}

export async function createTable(tenantId: string, data: { number: string; name?: string; capacity?: number }) {
  const exists = await prisma.dineInTable.findUnique({
    where: { tenantId_number: { tenantId, number: data.number } },
  });
  if (exists) throw new ValidationError(`Mesa ${data.number} já existe`);

  return prisma.dineInTable.create({
    data: {
      tenantId,
      number: data.number,
      name: data.name,
      capacity: data.capacity || 4,
    },
  });
}

export async function updateTable(tenantId: string, id: string, data: any) {
  const table = await prisma.dineInTable.findFirst({ where: { id, tenantId } });
  if (!table) throw new NotFoundError('Mesa');

  // If number changed, check uniqueness
  if (data.number && data.number !== table.number) {
    const exists = await prisma.dineInTable.findUnique({
      where: { tenantId_number: { tenantId, number: data.number } },
    });
    if (exists) throw new ValidationError(`Mesa ${data.number} já existe`);
  }

  return prisma.dineInTable.update({ where: { id }, data });
}

export async function deleteTable(tenantId: string, id: string) {
  const table = await prisma.dineInTable.findFirst({ where: { id, tenantId } });
  if (!table) throw new NotFoundError('Mesa');
  return prisma.dineInTable.delete({ where: { id } });
}

// ─── Batch create tables ────────────────────────────────────────

export async function createTablesInBatch(tenantId: string, from: number, to: number) {
  if (to < from || to - from > 100) throw new ValidationError('Intervalo inválido (máx 100 mesas)');

  const tables = [];
  for (let i = from; i <= to; i++) {
    const number = String(i);
    tables.push({
      tenantId,
      number,
      capacity: 4,
    });
  }

  // Skip existing
  const existing = await prisma.dineInTable.findMany({
    where: { tenantId, number: { in: tables.map((t) => t.number) } },
    select: { number: true },
  });
  const existingNumbers = new Set(existing.map((e) => e.number));
  const toCreate = tables.filter((t) => !existingNumbers.has(t.number));

  if (toCreate.length === 0) throw new ValidationError('Todas as mesas já existem');

  await prisma.dineInTable.createMany({ data: toCreate });
  return { created: toCreate.length, skipped: existingNumbers.size };
}

// ─── Public: get table info for QR landing ──────────────────────

export async function getTablePublicInfo(slug: string, tableNumber: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      dineInEnabled: true,
      isActive: true,
    },
  });

  if (!tenant || !tenant.isActive) throw new NotFoundError('Loja');
  if (!tenant.dineInEnabled) throw new ValidationError('Esta loja não aceita pedidos por mesa');

  const table = await prisma.dineInTable.findUnique({
    where: { tenantId_number: { tenantId: tenant.id, number: tableNumber } },
  });
  if (!table || !table.isActive) throw new NotFoundError('Mesa');

  return {
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
    },
    table: {
      number: table.number,
      name: table.name,
    },
  };
}

// ─── Public: create order from table QR ─────────────────────────

export async function createTableOrder(
  slug: string,
  tableNumber: string,
  data: {
    items: { menuItemId: string; quantity: number; notes?: string }[];
    paymentMethod: string;
    generalNotes?: string;
    customerPhone: string;
    customerName?: string;
  },
) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      dineInEnabled: true,
      isActive: true,
      creditFeePercent: true,
      debitFeePercent: true,
    },
  });

  if (!tenant || !tenant.isActive) throw new NotFoundError('Loja');
  if (!tenant.dineInEnabled) throw new ValidationError('Esta loja não aceita pedidos por mesa');

  const table = await prisma.dineInTable.findUnique({
    where: { tenantId_number: { tenantId: tenant.id, number: tableNumber } },
  });
  if (!table || !table.isActive) throw new NotFoundError('Mesa');

  const tenantId = tenant.id;

  // Validate menu items
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: data.items.map((i) => i.menuItemId) },
      tenantId,
      isPaused: false,
    },
  });

  if (menuItems.length !== data.items.length) {
    throw new ValidationError('Um ou mais itens não estão disponíveis');
  }

  let subtotal = 0;
  const orderItems = data.items.map((item) => {
    const menuItem = menuItems.find((m: { id: string }) => m.id === item.menuItemId)!;
    const price = Number(menuItem.price);
    subtotal += price * item.quantity;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: new Prisma.Decimal(price),
      quantity: item.quantity,
      notes: item.notes,
    };
  });

  let cardFee = 0;
  if (data.paymentMethod === 'CREDIT_CARD') {
    cardFee = subtotal * Number(tenant.creditFeePercent || 0) / 100;
  } else if (data.paymentMethod === 'DEBIT_CARD') {
    cardFee = subtotal * Number(tenant.debitFeePercent || 0) / 100;
  }

  const totalAmount = subtotal + cardFee; // No delivery fee for table orders

  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: data.customerPhone } },
    update: {
      name: data.customerName || undefined,
      lastOrderAt: new Date(),
      lastContactAt: new Date(),
      totalOrders: { increment: 1 },
      totalSpent: { increment: totalAmount },
    },
    create: {
      tenantId,
      phone: data.customerPhone,
      name: data.customerName,
      lastOrderAt: new Date(),
      lastContactAt: new Date(),
      totalOrders: 1,
      totalSpent: totalAmount,
    },
  });

  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: customer.id,
      orderNumber: (lastOrder?.orderNumber || 0) + 1,
      status: 'RECEIVED',
      orderType: 'TABLE',
      tableNumber,
      subtotal: new Prisma.Decimal(subtotal),
      deliveryFee: new Prisma.Decimal(0),
      cardFee: new Prisma.Decimal(cardFee),
      totalAmount: new Prisma.Decimal(totalAmount),
      paymentMethod: data.paymentMethod as any,
      generalNotes: data.generalNotes,
      items: { create: orderItems },
      statusHistory: { create: { status: 'RECEIVED' } },
    },
    include: { items: true },
  });

  // Trigger integrations (stock, cash register, loyalty)
  const { decrementStockForOrder } = await import('../inventory/inventory.service.js');
  const { registerSaleMovement } = await import('../cash-register/cash-register.service.js');
  const { earnPointsForOrder } = await import('../loyalty/loyalty.service.js');
  const { scheduleLowStockCheck } = await import('../../jobs/low-stock.job.js');

  await decrementStockForOrder(tenantId, order.id, data.items);
  await registerSaleMovement(tenantId, order.id, Number(order.totalAmount), 'Sistema');
  await scheduleLowStockCheck(tenantId);
  await earnPointsForOrder(tenantId, customer.id, order.id, Number(order.totalAmount));

  return order;
}
