import { prisma } from '@pedirei/database';
import { createWorker, whatsappMonitorQueue } from './queue.js';
import { sendTelegramAlert } from '../services/notification.service.js';

export function startWhatsappMonitorWorker() {
  return createWorker('whatsapp-monitor', async () => {
    const disconnected = await prisma.tenant.findMany({
      where: {
        isActive: true,
        whatsappStatus: 'DISCONNECTED',
      },
      select: { id: true, name: true, slug: true },
    });

    if (disconnected.length > 0) {
      const names = disconnected.map((t: { name: string }) => t.name).join(', ');
      await sendTelegramAlert(
        `⚠️ <b>WhatsApp Desconectado</b>\n${disconnected.length} tenant(s): ${names}`,
      );
    }
  });
}

export async function scheduleWhatsappMonitor() {
  await whatsappMonitorQueue.add('monitor', {}, {
    repeat: { pattern: '*/5 * * * *' }, // every 5 minutes
  });
}
