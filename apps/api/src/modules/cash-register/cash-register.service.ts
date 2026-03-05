import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import { parsePagination } from '../../utils/helpers.js';
import type { z } from 'zod';
import type {
  openCashRegisterBodySchema,
  closeCashRegisterBodySchema,
  addMovementBodySchema,
  cashRegisterQuerySchema,
  movementsQuerySchema,
} from './cash-register.schema.js';

type OpenBody = z.infer<typeof openCashRegisterBodySchema>;
type CloseBody = z.infer<typeof closeCashRegisterBodySchema>;
type AddMovementBody = z.infer<typeof addMovementBodySchema>;
type RegisterQuery = z.infer<typeof cashRegisterQuerySchema>;
type MovementsQuery = z.infer<typeof movementsQuerySchema>;

/**
 * Open a new cash register (only one can be open per tenant at a time)
 */
export async function openRegister(tenantId: string, body: OpenBody) {
  // Check no other register is open
  const existing = await prisma.cashRegister.findFirst({
    where: { tenantId, status: 'OPEN' },
  });
  if (existing) {
    throw new ConflictError('Já existe um caixa aberto. Feche o caixa atual antes de abrir outro.');
  }

  return prisma.cashRegister.create({
    data: {
      tenantId,
      openedBy: body.openedBy,
      openingBalance: body.openingBalance,
      notes: body.notes,
    },
  });
}

/**
 * Close a cash register and calculate expected balance
 */
export async function closeRegister(tenantId: string, registerId: string, body: CloseBody) {
  const register = await prisma.cashRegister.findFirst({
    where: { id: registerId, tenantId, status: 'OPEN' },
    include: { movements: true },
  });
  if (!register) {
    throw new NotFoundError('Caixa não encontrado ou já fechado.');
  }

  // Calculate expected balance: opening + deposits + sales - withdrawals - expenses
  let expectedBalance = Number(register.openingBalance);
  for (const mov of register.movements) {
    const amount = Number(mov.amount);
    if (mov.type === 'SALE' || mov.type === 'DEPOSIT') {
      expectedBalance += amount;
    } else {
      expectedBalance -= amount;
    }
  }

  return prisma.cashRegister.update({
    where: { id: registerId },
    data: {
      status: 'CLOSED',
      closedBy: body.closedBy,
      closingBalance: body.closingBalance,
      expectedBalance,
      closedAt: new Date(),
      notes: body.notes ? (register.notes ? `${register.notes}\n${body.notes}` : body.notes) : register.notes,
    },
  });
}

/**
 * Get the current open register for a tenant (if any)
 */
export async function getOpenRegister(tenantId: string) {
  return prisma.cashRegister.findFirst({
    where: { tenantId, status: 'OPEN' },
    include: {
      movements: { orderBy: { createdAt: 'desc' } },
    },
  });
}

/**
 * Add a manual movement (DEPOSIT, WITHDRAWAL, EXPENSE) to open register
 */
export async function addMovement(tenantId: string, registerId: string, body: AddMovementBody) {
  const register = await prisma.cashRegister.findFirst({
    where: { id: registerId, tenantId, status: 'OPEN' },
  });
  if (!register) {
    throw new NotFoundError('Caixa não encontrado ou está fechado.');
  }

  return prisma.cashMovement.create({
    data: {
      tenantId,
      cashRegisterId: registerId,
      type: body.type,
      amount: body.amount,
      description: body.description,
      operatorName: body.operatorName,
    },
  });
}

/**
 * Automatically register a SALE movement when an order is paid (called from order service)
 */
export async function registerSaleMovement(
  tenantId: string,
  orderId: string,
  amount: number,
  operatorName: string,
) {
  const openRegister = await prisma.cashRegister.findFirst({
    where: { tenantId, status: 'OPEN' },
  });
  if (!openRegister) return; // No open register, skip

  await prisma.cashMovement.create({
    data: {
      tenantId,
      cashRegisterId: openRegister.id,
      type: 'SALE',
      amount,
      description: `Pedido #${orderId}`,
      orderId,
      operatorName,
    },
  });
}

/**
 * List cash registers (with pagination and optional filters)
 */
export async function listRegisters(tenantId: string, query: RegisterQuery) {
  const { page, limit, skip } = parsePagination(query);

  const where: Prisma.CashRegisterWhereInput = { tenantId };

  if (query.status) {
    where.status = query.status;
  }
  if (query.startDate) {
    where.openedAt = { ...(where.openedAt as object), gte: new Date(query.startDate) };
  }
  if (query.endDate) {
    where.openedAt = { ...(where.openedAt as object), lte: new Date(query.endDate) };
  }

  const [items, total] = await Promise.all([
    prisma.cashRegister.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { movements: true } },
      },
    }),
    prisma.cashRegister.count({ where }),
  ]);

  return { items, total, page, limit };
}

/**
 * Get a single register with all movements
 */
export async function getRegisterDetail(tenantId: string, registerId: string) {
  const register = await prisma.cashRegister.findFirst({
    where: { id: registerId, tenantId },
    include: {
      movements: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!register) {
    throw new NotFoundError('Caixa não encontrado.');
  }
  return register;
}

/**
 * Daily summary report: all registers opened on a given date
 */
export async function dailySummary(tenantId: string, date: string) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const registers = await prisma.cashRegister.findMany({
    where: {
      tenantId,
      openedAt: { gte: start, lte: end },
    },
    include: {
      movements: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { openedAt: 'asc' },
  });

  let totalSales = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalExpenses = 0;

  for (const reg of registers) {
    for (const mov of reg.movements) {
      const amount = Number(mov.amount);
      switch (mov.type) {
        case 'SALE': totalSales += amount; break;
        case 'DEPOSIT': totalDeposits += amount; break;
        case 'WITHDRAWAL': totalWithdrawals += amount; break;
        case 'EXPENSE': totalExpenses += amount; break;
      }
    }
  }

  return {
    date,
    registersCount: registers.length,
    totalSales,
    totalDeposits,
    totalWithdrawals,
    totalExpenses,
    netTotal: totalSales + totalDeposits - totalWithdrawals - totalExpenses,
    registers,
  };
}
