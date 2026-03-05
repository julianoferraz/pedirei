import { prisma } from '@pedirei/database';
import { createWorker, lowStockQueue } from './queue.js';
import { sendWhatsAppMessage } from '@pedirei/whatsapp';
import { logger } from '../utils/logger.js';

export function startLowStockWorker() {
  return createWorker('low-stock', async (job) => {
    const { tenantId } = job.data;

    // Find items below threshold
    const lowStockItems = await prisma.$queryRaw<Array<{
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
        AND "stockQuantity" > 0
      ORDER BY "stockQuantity" ASC
    `;

    if (lowStockItems.length === 0) return;

    // Get admin phones for this tenant
    const adminPhones = await prisma.adminPhone.findMany({
      where: { tenantId, isActive: true },
      select: { phone: true },
    });

    if (adminPhones.length === 0) return;

    const itemList = lowStockItems
      .map((item) => `• ${item.name}: ${item.stockQuantity} un. (mín: ${item.lowStockThreshold})`)
      .join('\n');

    const message = `⚠️ *Alerta de Estoque Baixo*\n\n${lowStockItems.length} ${lowStockItems.length === 1 ? 'item precisa' : 'itens precisam'} de reposição:\n\n${itemList}\n\nAcesse o painel para repor o estoque.`;

    for (const admin of adminPhones) {
      try {
        await sendWhatsAppMessage(tenantId, admin.phone, message);
      } catch (err) {
        logger.error({ err, tenantId, phone: admin.phone }, 'Failed to send low stock alert');
      }
    }

    logger.info({ tenantId, count: lowStockItems.length }, 'Low stock alerts sent');
  });
}

/**
 * Schedule a low-stock check for a tenant (called after order creation)
 */
export async function scheduleLowStockCheck(tenantId: string) {
  await lowStockQueue.add(
    'check-low-stock',
    { tenantId },
    {
      delay: 5000, // 5s delay to batch multiple order items
      jobId: `low-stock-${tenantId}`, // Deduplicate: only one check per tenant
      removeOnComplete: true,
    },
  );
}
