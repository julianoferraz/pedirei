import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError } from '../../utils/errors.js';
import type { z } from 'zod';
import type { customerQuerySchema } from './customer.schema.js';

type CustomerQuery = z.infer<typeof customerQuerySchema>;

export async function listCustomers(tenantId: string, query: CustomerQuery) {
  const { page, limit, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = { tenantId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { lastOrderAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getCustomer(tenantId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
  if (!customer) throw new NotFoundError('Cliente');
  return customer;
}

export async function getCustomerOrders(tenantId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
  if (!customer) throw new NotFoundError('Cliente');

  return prisma.order.findMany({
    where: { tenantId, customerId: id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
