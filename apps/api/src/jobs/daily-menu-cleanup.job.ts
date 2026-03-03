import { prisma } from '@pedirei/database';
import { createWorker, dailyCleanupQueue } from './queue.js';

export function startDailyCleanupWorker() {
  return createWorker('daily-cleanup', async () => {
    const now = new Date();

    // Remove expired temporary menu items
    const expired = await prisma.menuItem.updateMany({
      where: {
        isTemporary: true,
        expiresAt: { lt: now },
        isPaused: false,
      },
      data: { isPaused: true },
    });

    // Clean expired chat sessions
    const sessions = await prisma.chatSession.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Reset monthly AI token counters on 1st of month
    if (now.getDate() === 1) {
      await prisma.tenant.updateMany({
        data: { aiMonthlyTokens: 0 },
      });
      console.log('[Cleanup] Reset monthly AI token counters');
    }

    console.log(`[Cleanup] Paused ${expired.count} expired items, removed ${sessions.count} expired sessions`);
  });
}

export async function scheduleDailyCleanup() {
  await dailyCleanupQueue.add('cleanup', {}, {
    repeat: { pattern: '0 4 * * *' }, // 4am daily
  });
}
