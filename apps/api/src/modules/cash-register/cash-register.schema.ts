import { z } from 'zod';

export const openCashRegisterBodySchema = z.object({
  openingBalance: z.number().min(0),
  openedBy: z.string().min(1),
  notes: z.string().optional(),
});

export const closeCashRegisterBodySchema = z.object({
  closingBalance: z.number().min(0),
  closedBy: z.string().min(1),
  notes: z.string().optional(),
});

export const addMovementBodySchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'EXPENSE']),
  amount: z.number().positive(),
  description: z.string().optional(),
  operatorName: z.string().min(1),
});

export const cashRegisterQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const movementsQuerySchema = z.object({
  type: z.enum(['SALE', 'DEPOSIT', 'WITHDRAWAL', 'EXPENSE']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
