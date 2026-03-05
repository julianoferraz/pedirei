import { prisma, Prisma } from '@pedirei/database';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { parsePagination } from '../../utils/helpers.js';
import type { z } from 'zod';
import type {
  updateStockBodySchema,
  adjustStockBodySchema,
  bulkUpdateStockBodySchema,
  inventoryQuerySchema,
  movementQuerySchema,
} from './inventory.schema.js';

type UpdateStock = z.infer<typeof updateStockBodySchema>;
type AdjustStock = z.infer<typeof adjustStockBodySchema>;
type BulkUpdateStock = z.infer<typeof bulkUpdateStockBodySchema>;
type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
type MovementQuery = z.infer<typeof movementQuerySchema>;

/**
 * List all menu items with inventory info (only items with trackStock = true)
 */
export async function listInventory(tenantId: string, query: InventoryQuery) {
  const { page, limit, skip } = parsePagination(query);
  const lowStockOnly = query.lowStockOnly === 'true';

  const where: Prisma.MenuItemWhereInput = {
    tenantId,
    trackStock: true,
  };

  if (lowStockOnly) {
    where.stockQuantity = { lte: prisma.menuItem.fields.lowStockThreshold as unknown as number };
  }

  // For lowStockOnly we need raw filtering since we compare two columns
  if (lowStockOnly) {
    const items = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      categoryId: string;
      categoryName: string;
      price: Prisma.Decimal;
      imageUrl: string | null;
      isPaused: boolean;
      trackStock: boolean;
      stockQuantity: number;
      lowStockThreshold: number;
    }>>`
      SELECT mi."id", mi."name", mi."categoryId", c."name" as "categoryName",
             mi."price", mi."imageUrl", mi."isPaused", mi."trackStock",
             mi."stockQuantity", mi."lowStockThreshold"
      FROM "MenuItem" mi
      JOIN "Category" c ON c."id" = mi."categoryId"
      WHERE mi."tenantId" = ${tenantId}
        AND mi."trackStock" = true
        AND mi."stockQuantity" <= mi."lowStockThreshold"
      ORDER BY mi."stockQuantity" ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "MenuItem"
      WHERE "tenantId" = ${tenantId}
        AND "trackStock" = true
        AND "stockQuantity" <= "lowStockThreshold"
    `;

    return { data: items, total: Number(countResult[0].count), page, limit };
  }

  const [data, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: { select: { name: true } },
        price: true,
        imageUrl: true,
        isPaused: true,
        trackStock: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
      orderBy: [{ stockQuantity: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.menuItem.count({ where }),
  ]);

  return {
    data: data.map((item) => ({
      ...item,
      categoryName: item.category.name,
      category: undefined,
    })),
    total,
    page,
    limit,
  };
}

/**
 * Update stock settings for a single menu item
 */
export async function updateItemStock(tenantId: string, menuItemId: string, data: UpdateStock) {
  const item = await prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId } });
  if (!item) throw new NotFoundError('Item do cardápio');

  return prisma.menuItem.update({
    where: { id: menuItemId },
    data,
  });
}

/**
 * Adjust stock quantity (manual movement: IN, OUT, ADJUSTMENT, RETURN)
 */
export async function adjustStock(tenantId: string, data: AdjustStock) {
  const item = await prisma.menuItem.findFirst({
    where: { id: data.menuItemId, tenantId, trackStock: true },
  });
  if (!item) throw new NotFoundError('Item com controle de estoque');

  const quantityChange = data.type === 'OUT' ? -data.quantity : data.quantity;
  const newQuantity = item.stockQuantity + quantityChange;

  if (newQuantity < 0) {
    throw new ValidationError(`Estoque insuficiente. Disponível: ${item.stockQuantity}`);
  }

  const [updatedItem, movement] = await prisma.$transaction([
    prisma.menuItem.update({
      where: { id: data.menuItemId },
      data: {
        stockQuantity: newQuantity,
        // Auto-pause if stock reaches zero
        isPaused: newQuantity === 0 ? true : item.isPaused,
      },
    }),
    prisma.inventoryMovement.create({
      data: {
        tenantId,
        menuItemId: data.menuItemId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
      },
    }),
  ]);

  return { item: updatedItem, movement };
}

/**
 * Bulk update stock quantities (for inventory count/reconciliation)
 */
export async function bulkUpdateStock(tenantId: string, updates: BulkUpdateStock) {
  const menuItemIds = updates.map((u) => u.menuItemId);
  const items = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, tenantId, trackStock: true },
  });

  if (items.length !== updates.length) {
    throw new ValidationError('Um ou mais itens não encontrados ou sem controle de estoque');
  }

  const operations = updates.flatMap((update) => {
    const currentItem = items.find((i) => i.id === update.menuItemId)!;
    const diff = update.stockQuantity - currentItem.stockQuantity;

    return [
      prisma.menuItem.update({
        where: { id: update.menuItemId },
        data: {
          stockQuantity: update.stockQuantity,
          isPaused: update.stockQuantity === 0 ? true : currentItem.isPaused,
        },
      }),
      prisma.inventoryMovement.create({
        data: {
          tenantId,
          menuItemId: update.menuItemId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(diff),
          reason: `Ajuste de inventário: ${currentItem.stockQuantity} → ${update.stockQuantity}`,
        },
      }),
    ];
  });

  await prisma.$transaction(operations);
  return { updated: updates.length };
}

/**
 * Decrement stock after an order is placed (called from order creation)
 */
export async function decrementStockForOrder(
  tenantId: string,
  orderId: string,
  items: Array<{ menuItemId: string; quantity: number }>,
) {
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, tenantId, trackStock: true },
  });

  if (menuItems.length === 0) return; // No items with stock tracking

  const operations = menuItems.flatMap((menuItem) => {
    const orderItem = items.find((i) => i.menuItemId === menuItem.id)!;
    const newQty = menuItem.stockQuantity - orderItem.quantity;

    if (newQty < 0) {
      throw new ValidationError(`Estoque insuficiente para "${menuItem.name}". Disponível: ${menuItem.stockQuantity}`);
    }

    return [
      prisma.menuItem.update({
        where: { id: menuItem.id },
        data: {
          stockQuantity: newQty,
          isPaused: newQty === 0 ? true : menuItem.isPaused,
        },
      }),
      prisma.inventoryMovement.create({
        data: {
          tenantId,
          menuItemId: menuItem.id,
          type: 'SALE',
          quantity: orderItem.quantity,
          reason: `Pedido #${orderId}`,
          orderId,
        },
      }),
    ];
  });

  await prisma.$transaction(operations);
}

/**
 * List movement history (audit log)
 */
export async function listMovements(tenantId: string, query: MovementQuery) {
  const { page, limit, skip } = parsePagination(query);

  const where: Prisma.InventoryMovementWhereInput = { tenantId };
  if (query.menuItemId) where.menuItemId = query.menuItemId;
  if (query.type) where.type = query.type;
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate);
  }

  const [data, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      include: {
        menuItem: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  return { data, total, page, limit };
}

/**
 * Get low-stock alerts summary
 */
export async function getLowStockAlerts(tenantId: string) {
  const items = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    stockQuantity: number;
    lowStockThreshold: number;
  }>>`
    SELECT "id", "name", "stockQuantity", "lowStockThreshold"
    FROM "MenuItem"
    WHERE "tenantId" = ${tenantId}
      AND "trackStock" = true
      AND "stockQuantity" <= "lowStockThreshold"
    ORDER BY "stockQuantity" ASC
  `;

  return {
    count: items.length,
    items,
  };
}
