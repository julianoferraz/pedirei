import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { startFeedbackWorker } from './feedback.job.js';
import { startReengagementWorker } from './reengagement.job.js';
import { startDailyCleanupWorker } from './daily-menu-cleanup.job.js';
import { startWhatsappMonitorWorker } from './whatsapp-monitor.job.js';
import { startCampaignWorker } from './campaign.job.js';

const connection = { connection: redis as any };

export const feedbackQueue = new Queue('feedback', connection);
export const reengagementQueue = new Queue('reengagement', connection);
export const dailyCleanupQueue = new Queue('daily-cleanup', connection);
export const whatsappMonitorQueue = new Queue('whatsapp-monitor', connection);
export const campaignQueue = new Queue('campaign', connection);

const workers: Worker[] = [];

export function createWorker(queueName: string, processor: (job: any) => Promise<void>) {
  const w = new Worker(queueName, processor, connection);
  workers.push(w);
  return w;
}

export function startAllWorkers() {
  startFeedbackWorker();
  startReengagementWorker();
  startDailyCleanupWorker();
  startWhatsappMonitorWorker();
  startCampaignWorker();
}

export async function closeAllWorkers() {
  await Promise.all(workers.map((w) => w.close()));
}
