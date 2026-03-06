import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError } from '../../utils/errors.js';
import type { z } from 'zod';
import type {
  createCategoryBodySchema,
  updateCategoryBodySchema,
  createMenuItemBodySchema,
  updateMenuItemBodySchema,
  reorderBodySchema,
} from './menu.schema.js';

type CreateCategory = z.infer<typeof createCategoryBodySchema>;
type UpdateCategory = z.infer<typeof updateCategoryBodySchema>;
type CreateMenuItem = z.infer<typeof createMenuItemBodySchema>;
type UpdateMenuItem = z.infer<typeof updateMenuItemBodySchema>;
type ReorderItem = z.infer<typeof reorderBodySchema>;

export async function listCategories(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createCategory(tenantId: string, data: CreateCategory) {
  return prisma.category.create({
    data: { ...data, tenantId },
  });
}

export async function updateCategory(tenantId: string, id: string, data: UpdateCategory) {
  const category = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!category) throw new NotFoundError('Categoria');
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(tenantId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!category) throw new NotFoundError('Categoria');
  return prisma.category.delete({ where: { id } });
}

export async function reorderCategories(tenantId: string, items: ReorderItem) {
  const ops = items.map((item) =>
    prisma.category.updateMany({
      where: { id: item.id, tenantId },
      data: { sortOrder: item.sortOrder },
    }),
  );
  await prisma.$transaction(ops);
}

export async function listItems(tenantId: string) {
  return prisma.menuItem.findMany({
    where: { tenantId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
  });
}

export async function createItem(tenantId: string, data: CreateMenuItem) {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, tenantId },
  });
  if (!category) throw new NotFoundError('Categoria');

  return prisma.menuItem.create({
    data: { ...data, tenantId, price: new Prisma.Decimal(data.price) },
  });
}

export async function updateItem(tenantId: string, id: string, data: UpdateMenuItem) {
  const item = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!item) throw new NotFoundError('Item');

  const updateData: Record<string, unknown> = { ...data };
  if (data.price !== undefined) {
    updateData.price = new Prisma.Decimal(data.price);
  }

  return prisma.menuItem.update({ where: { id }, data: updateData });
}

export async function deleteItem(tenantId: string, id: string) {
  const item = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!item) throw new NotFoundError('Item');
  return prisma.menuItem.delete({ where: { id } });
}

export async function toggleItem(tenantId: string, id: string) {
  const item = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!item) throw new NotFoundError('Item');
  return prisma.menuItem.update({
    where: { id },
    data: { isPaused: !item.isPaused },
  });
}

export async function reorderItems(tenantId: string, items: ReorderItem) {
  const ops = items.map((item) =>
    prisma.menuItem.updateMany({
      where: { id: item.id, tenantId },
      data: { sortOrder: item.sortOrder },
    }),
  );
  await prisma.$transaction(ops);
}

export async function getPublicMenu(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!tenant || !tenant.isActive) throw new NotFoundError('Loja');

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, isActive: true },
    include: {
      items: {
        where: {
          OR: [
            { isTemporary: false },
            { isTemporary: true, expiresAt: { gt: now } },
          ],
        },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isPaused: true,
          sortOrder: true,
          trackStock: true,
          stockQuantity: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Filter categories by time availability (availableFrom/availableTo)
  return categories.filter((cat) => {
    if (!cat.availableFrom || !cat.availableTo) return true;
    const from = cat.availableFrom;
    const to = cat.availableTo;
    // Handle overnight ranges (e.g. 22:00 - 06:00)
    if (from <= to) {
      return currentTime >= from && currentTime <= to;
    }
    return currentTime >= from || currentTime <= to;
  });
}

export async function getPublicInfo(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      phone: true,
      address: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      orderMode: true,
      minOrderValue: true,
      deliveryFeeMode: true,
      fixedDeliveryFee: true,
      estimatedDelivery: true,
      pixAutoEnabled: true,
      pixOnDelivery: true,
      cardCreditEnabled: true,
      cardDebitEnabled: true,
      cashEnabled: true,
      creditFeePercent: true,
      debitFeePercent: true,
      isActive: true,
      operatingHours: { orderBy: { dayOfWeek: 'asc' } },
      plan: { select: { hasBranding: true, hasMarketingPixels: true } },
      facebookPixelId: true,
      googleAnalyticsId: true,
      googleAdsId: true,
      tiktokPixelId: true,
    },
  });
  if (!tenant || !tenant.isActive) throw new NotFoundError('Loja');

  return {
    ...tenant,
    hasBranding: tenant.plan.hasBranding,
    // Only expose pixel IDs if plan allows
    facebookPixelId: tenant.plan.hasMarketingPixels ? tenant.facebookPixelId : null,
    googleAnalyticsId: tenant.plan.hasMarketingPixels ? tenant.googleAnalyticsId : null,
    googleAdsId: tenant.plan.hasMarketingPixels ? tenant.googleAdsId : null,
    tiktokPixelId: tenant.plan.hasMarketingPixels ? tenant.tiktokPixelId : null,
    plan: undefined,
  };
}

export async function createDailyMenu(tenantId: string, rawInput: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.dailyMenu.upsert({
    where: { tenantId_date: { tenantId, date: today } },
    update: { rawInput },
    create: { tenantId, date: today, rawInput },
  });
}
