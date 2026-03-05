import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { errorResponse } from './utils/helpers.js';

// Plugins
import authPlugin from './plugins/auth.js';
import tenantPlugin from './plugins/tenant.js';
import corsPlugin from './plugins/cors.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import webhookRoutes from './modules/webhook/webhook.routes.js';
import nfceRoutes from './modules/nfce/nfce.routes.js';
import campaignRoutes from './modules/campaign/campaign.routes.js';
import reportRoutes from './modules/report/report.routes.js';
import masterRoutes from './modules/master/master.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import cashRegisterRoutes from './modules/cash-register/cash-register.routes.js';

// Jobs
import { startAllWorkers, closeAllWorkers } from './jobs/queue.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  // ── Error handler ───────────────────────────────────────────
  app.setErrorHandler((err: Error & { statusCode?: number; validation?: unknown }, _request, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(errorResponse(err.message, err.statusCode));
    }

    // Fastify validation errors
    if (err.validation) {
      return reply
        .status(400)
        .send(errorResponse('Erro de validação: ' + err.message, 400));
    }

    logger.error({ err }, 'Unhandled error');
    return reply.status(500).send(errorResponse('Erro interno do servidor', 500));
  });

  // ── Plugins ─────────────────────────────────────────────────
  await app.register(corsPlugin);
  await app.register(authPlugin);
  await app.register(tenantPlugin);

  // Rate limiting for public routes
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });

  await app.register(fastifyMultipart, {
    limits: { fileSize: env.MAX_FILE_SIZE },
  });

  // Ensure upload directory exists
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ── Health check ────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ── Routes ──────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(tenantRoutes);
  await app.register(menuRoutes);
  await app.register(orderRoutes);
  await app.register(customerRoutes);
  await app.register(paymentRoutes);
  await app.register(webhookRoutes);
  await app.register(nfceRoutes);
  await app.register(campaignRoutes);
  await app.register(reportRoutes);
  await app.register(masterRoutes);
  await app.register(inventoryRoutes);
  await app.register(cashRegisterRoutes);

  return app;
}

async function start() {
  const app = await buildApp();

  // Start BullMQ workers
  startAllWorkers();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await closeAllWorkers();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`🚀 Pedirei API running at http://0.0.0.0:${env.PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();

export { buildApp };
