import { prisma } from '@pedirei/database';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Check if the tenant has reached their monthly order limit.
 * Throws ForbiddenError if limit exceeded.
 * maxOrdersMonth === -1 means unlimited.
 */
export async function checkOrderLimit(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: { select: { maxOrdersMonth: true, name: true } },
      trialEndsAt: true,
    },
  });

  if (!tenant) return;

  // Check trial expiry
  if (tenant.trialEndsAt && new Date() > tenant.trialEndsAt) {
    // Trial expired — only block if on free plan (price = 0)
    const plan = await prisma.plan.findFirst({
      where: { tenants: { some: { id: tenantId } } },
      select: { price: true },
    });
    if (plan && Number(plan.price) === 0) {
      throw new ForbiddenError('Período de trial expirado. Faça upgrade do plano para continuar.');
    }
  }

  const maxOrders = tenant.plan.maxOrdersMonth;
  if (maxOrders === -1) return; // unlimited

  // Count orders this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const orderCount = await prisma.order.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
      status: { not: 'CANCELLED' },
    },
  });

  if (orderCount >= maxOrders) {
    throw new ForbiddenError(
      `Limite de ${maxOrders} pedidos/mês do plano ${tenant.plan.name} atingido. Faça upgrade para continuar.`,
    );
  }
}

/**
 * Check if the tenant can add another operator.
 * Throws ForbiddenError if limit exceeded.
 */
export async function checkOperatorLimit(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: { select: { maxOperators: true, name: true } },
    },
  });

  if (!tenant) return;

  const maxOperators = tenant.plan.maxOperators;
  if (maxOperators === -1) return; // unlimited

  const operatorCount = await prisma.operator.count({
    where: { tenantId, isActive: true },
  });

  if (operatorCount >= maxOperators) {
    throw new ForbiddenError(
      `Limite de ${maxOperators} operador(es) do plano ${tenant.plan.name} atingido. Faça upgrade para adicionar mais.`,
    );
  }
}

/**
 * Check if a specific plan feature is available for the tenant.
 * Throws ForbiddenError if not available.
 */
export async function checkPlanFeature(
  tenantId: string,
  feature: string,
  featureLabel: string,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: { select: { [feature]: true, name: true } as any },
    },
  });

  if (!tenant) return;

  const plan = tenant.plan as Record<string, any>;
  if (!plan[feature]) {
    throw new ForbiddenError(
      `${featureLabel} não está disponível no plano ${plan.name}. Faça upgrade para usar.`,
    );
  }
}
