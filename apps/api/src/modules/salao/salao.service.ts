import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';
import { buildSessionBill, printToNetwork } from '../../services/printer.service.js';
import type { SessionBillData, PrinterConfig } from '../../services/printer.service.js';

// ─── MESAS ────────────────────────────────────────────────────────────────────

export async function listTables(tenantId: string) {
  const tables = await prisma.restaurantTable.findMany({
    where: { tenantId },
    include: {
      sessions: {
        where: { status: 'OPEN' },
        select: { id: true, guestName: true, openedAt: true, totalAmount: true },
        take: 1,
      },
    },
    orderBy: { number: 'asc' },
  });

  return tables.map((t) => {
    const openSession = t.sessions[0] || null;
    return {
      id: t.id,
      number: t.number,
      label: t.label,
      capacity: t.capacity,
      posX: t.posX,
      posY: t.posY,
      isActive: t.isActive,
      status: openSession ? ('OCCUPIED' as const) : ('AVAILABLE' as const),
      session: openSession
        ? {
            id: openSession.id,
            guestName: openSession.guestName,
            openedAt: openSession.openedAt.toISOString(),
            totalAmount: Number(openSession.totalAmount),
          }
        : undefined,
    };
  });
}

export async function createTable(
  tenantId: string,
  data: { number: string; label?: string; capacity?: number; posX?: number; posY?: number },
) {
  const existing = await prisma.restaurantTable.findUnique({
    where: { tenantId_number: { tenantId, number: data.number } },
  });
  if (existing) throw new ValidationError(`Mesa "${data.number}" já existe`);

  return prisma.restaurantTable.create({
    data: {
      tenantId,
      number: data.number,
      label: data.label,
      capacity: data.capacity ?? 4,
      posX: data.posX ?? 0,
      posY: data.posY ?? 0,
    },
  });
}

export async function updateTable(
  tenantId: string,
  tableId: string,
  data: { label?: string; capacity?: number; isActive?: boolean },
) {
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, tenantId } });
  if (!table) throw new NotFoundError('Mesa');
  return prisma.restaurantTable.update({ where: { id: tableId }, data });
}

export async function deleteTable(tenantId: string, tableId: string) {
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, tenantId } });
  if (!table) throw new NotFoundError('Mesa');

  const openSession = await prisma.tableSession.findFirst({
    where: { tableId, status: 'OPEN' },
  });
  if (openSession) throw new ValidationError('Não é possível excluir mesa com comanda aberta');

  return prisma.restaurantTable.delete({ where: { id: tableId } });
}

export async function updateLayout(
  tenantId: string,
  positions: Array<{ id: string; posX: number; posY: number }>,
) {
  const ops = positions.map((p) =>
    prisma.restaurantTable.updateMany({
      where: { id: p.id, tenantId },
      data: { posX: p.posX, posY: p.posY },
    }),
  );
  await prisma.$transaction(ops);
}

// ─── SESSÕES (COMANDAS) ──────────────────────────────────────────────────────

export async function openSession(
  tenantId: string,
  data: { tableId?: string; guestName?: string },
) {
  return prisma.$transaction(async (tx) => {
    if (data.tableId) {
      const table = await tx.restaurantTable.findFirst({
        where: { id: data.tableId, tenantId },
      });
      if (!table) throw new NotFoundError('Mesa');

      const existing = await tx.tableSession.findFirst({
        where: { tableId: data.tableId, status: 'OPEN' },
      });
      if (existing) throw new ValidationError('Esta mesa já tem uma comanda aberta');
    }

    return tx.tableSession.create({
      data: {
        tenantId,
        tableId: data.tableId || null,
        guestName: data.guestName || null,
      },
    });
  });
}

export async function getSession(tenantId: string, sessionId: string) {
  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, tenantId },
    include: {
      table: { select: { number: true, label: true } },
      items: {
        where: { removedAt: null },
        orderBy: { addedAt: 'desc' },
      },
    },
  });
  if (!session) throw new NotFoundError('Comanda');

  const totalAmount = session.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  return {
    ...session,
    totalAmount,
    items: session.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      customPrice: item.customPrice ? Number(item.customPrice) : null,
      subtotal: Number(item.unitPrice) * item.quantity,
    })),
  };
}

export async function listOpenSessions(tenantId: string) {
  const sessions = await prisma.tableSession.findMany({
    where: { tenantId, status: 'OPEN' },
    include: {
      table: { select: { number: true, label: true } },
      items: { where: { removedAt: null } },
    },
    orderBy: { openedAt: 'asc' },
  });

  return sessions.map((s) => ({
    ...s,
    totalAmount: s.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    ),
  }));
}

export async function addItem(
  tenantId: string,
  sessionId: string,
  data: {
    menuItemId?: string;
    customName?: string;
    customPrice?: number;
    quantity: number;
    notes?: string;
  },
) {
  const hasMenu = !!data.menuItemId;
  const hasCustom = !!data.customName && data.customPrice !== undefined && data.customPrice !== null;

  if (hasMenu === hasCustom) {
    throw new ValidationError(
      'Informe menuItemId OU (customName + customPrice), não ambos nem nenhum',
    );
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({
      where: { id: sessionId, tenantId, status: 'OPEN' },
    });
    if (!session) throw new NotFoundError('Comanda');

    let name: string;
    let unitPrice: number;

    if (data.menuItemId) {
      const menuItem = await tx.menuItem.findFirst({
        where: { id: data.menuItemId, tenantId },
      });
      if (!menuItem) throw new NotFoundError('Item do cardápio');
      if (menuItem.isPaused) throw new ValidationError('Item indisponível');

      // Stock check for BY_QUANTITY
      if (menuItem.stockMode === 'BY_QUANTITY') {
        const currentQty = menuItem.stockQty ?? 0;
        if (currentQty < data.quantity) {
          throw new ValidationError(
            `Estoque insuficiente (disponível: ${currentQty})`,
          );
        }
        const newQty = currentQty - data.quantity;
        await tx.menuItem.update({
          where: { id: data.menuItemId },
          data: {
            stockQty: newQty,
            isPaused: newQty <= 0 ? true : undefined,
          },
        });
      }

      name = menuItem.name;
      unitPrice = Number(menuItem.price);
    } else {
      name = data.customName!;
      unitPrice = data.customPrice!;
    }

    const sessionItem = await tx.sessionItem.create({
      data: {
        sessionId,
        menuItemId: data.menuItemId || null,
        customName: data.customName || null,
        customPrice: data.customPrice !== undefined ? new Prisma.Decimal(data.customPrice) : null,
        name,
        unitPrice: new Prisma.Decimal(unitPrice),
        quantity: data.quantity,
        notes: data.notes || null,
      },
    });

    // Recalculate total
    const items = await tx.sessionItem.findMany({
      where: { sessionId, removedAt: null },
    });
    const total = items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );
    await tx.tableSession.update({
      where: { id: sessionId },
      data: { totalAmount: new Prisma.Decimal(total) },
    });

    return { ...sessionItem, unitPrice: Number(sessionItem.unitPrice), subtotal: unitPrice * data.quantity };
  });
}

export async function removeItem(tenantId: string, sessionId: string, sessionItemId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({
      where: { id: sessionId, tenantId, status: 'OPEN' },
    });
    if (!session) throw new NotFoundError('Comanda');

    const item = await tx.sessionItem.findFirst({
      where: { id: sessionItemId, sessionId, removedAt: null },
    });
    if (!item) throw new NotFoundError('Item');

    // Soft delete
    await tx.sessionItem.update({
      where: { id: sessionItemId },
      data: { removedAt: new Date() },
    });

    // Restore stock if BY_QUANTITY
    if (item.menuItemId) {
      const menuItem = await tx.menuItem.findFirst({
        where: { id: item.menuItemId },
      });
      if (menuItem && menuItem.stockMode === 'BY_QUANTITY') {
        const newQty = (menuItem.stockQty ?? 0) + item.quantity;
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: {
            stockQty: newQty,
            isPaused: newQty > 0 ? false : undefined,
          },
        });
      }
    }

    // Recalculate total
    const items = await tx.sessionItem.findMany({
      where: { sessionId, removedAt: null },
    });
    const total = items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );
    await tx.tableSession.update({
      where: { id: sessionId },
      data: { totalAmount: new Prisma.Decimal(total) },
    });
  });
}

export async function updateItemQty(
  tenantId: string,
  sessionId: string,
  sessionItemId: string,
  newQty: number,
) {
  if (newQty <= 0) {
    return removeItem(tenantId, sessionId, sessionItemId);
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({
      where: { id: sessionId, tenantId, status: 'OPEN' },
    });
    if (!session) throw new NotFoundError('Comanda');

    const item = await tx.sessionItem.findFirst({
      where: { id: sessionItemId, sessionId, removedAt: null },
    });
    if (!item) throw new NotFoundError('Item');

    const diff = newQty - item.quantity;

    // Adjust stock if BY_QUANTITY
    if (item.menuItemId && diff !== 0) {
      const menuItem = await tx.menuItem.findFirst({
        where: { id: item.menuItemId },
      });
      if (menuItem && menuItem.stockMode === 'BY_QUANTITY') {
        const currentQty = menuItem.stockQty ?? 0;
        if (diff > 0 && currentQty < diff) {
          throw new ValidationError(`Estoque insuficiente (disponível: ${currentQty})`);
        }
        const newStockQty = currentQty - diff;
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: {
            stockQty: newStockQty,
            isPaused: newStockQty <= 0 ? true : newStockQty > 0 ? false : undefined,
          },
        });
      }
    }

    await tx.sessionItem.update({
      where: { id: sessionItemId },
      data: { quantity: newQty },
    });

    // Recalculate total
    const items = await tx.sessionItem.findMany({
      where: { sessionId, removedAt: null },
    });
    const total = items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );
    await tx.tableSession.update({
      where: { id: sessionId },
      data: { totalAmount: new Prisma.Decimal(total) },
    });
  });
}

export async function closeSession(
  tenantId: string,
  sessionId: string,
  data: { paymentMethod: string },
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({
      where: { id: sessionId, tenantId, status: 'OPEN' },
      include: {
        table: { select: { number: true, label: true } },
        items: { where: { removedAt: null }, orderBy: { addedAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundError('Comanda');

    const total = session.items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );

    const closed = await tx.tableSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        paymentMethod: data.paymentMethod,
        totalAmount: new Prisma.Decimal(total),
      },
      include: {
        table: { select: { number: true, label: true } },
        items: { where: { removedAt: null }, orderBy: { addedAt: 'asc' } },
      },
    });

    return {
      ...closed,
      totalAmount: total,
      items: closed.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.unitPrice) * i.quantity,
      })),
    };
  });
}

export function splitSession(totalAmount: number, parts: number) {
  if (parts < 2) throw new ValidationError('Mínimo 2 partes para dividir');
  const perPart = Math.ceil((totalAmount / parts) * 100) / 100;
  return Array.from({ length: parts }, (_, i) => ({
    part: i + 1,
    amount: perPart,
  }));
}

export async function printSessionBill(
  tenantId: string,
  sessionId: string,
  splitPart?: { index: number; parts: number },
) {
  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, tenantId },
    include: {
      table: { select: { number: true } },
      items: { where: { removedAt: null }, orderBy: { addedAt: 'asc' } },
      tenant: {
        select: {
          name: true,
          printerType: true,
          printerIp: true,
          printerPort: true,
          printerWidth: true,
        },
      },
    },
  });
  if (!session) throw new NotFoundError('Comanda');

  const tenant = session.tenant;
  if (!tenant.printerType || !tenant.printerIp) {
    throw new ValidationError('Impressora não configurada');
  }

  const total = session.items.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0,
  );

  const billData: SessionBillData = {
    tenantName: tenant.name,
    tableNumber: session.table?.number,
    guestName: session.guestName || undefined,
    openedAt: session.openedAt,
    items: session.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.unitPrice) * i.quantity,
      notes: i.notes || undefined,
    })),
    total,
    paymentMethod: session.paymentMethod || undefined,
  };

  if (splitPart) {
    const splits = splitSession(total, splitPart.parts);
    const part = splits[splitPart.index - 1];
    if (!part) throw new ValidationError('Parte inválida');
    billData.splitPart = splitPart.index;
    billData.splitTotal = splitPart.parts;
    billData.splitAmount = part.amount;
  }

  const config: PrinterConfig = {
    type: (tenant.printerType as 'network' | 'usb') || 'network',
    host: tenant.printerIp || undefined,
    port: tenant.printerPort || 9100,
    width: (tenant.printerWidth as 32 | 48) || 48,
    openDrawer: false,
  };

  const buffer = buildSessionBill(billData, config);
  await printToNetwork(buffer, config.host!, config.port);
}
