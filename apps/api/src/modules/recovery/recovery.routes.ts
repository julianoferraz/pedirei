import type { FastifyInstance } from 'fastify';
import * as recoveryService from './recovery.service.js';
import {
  updateRecoverySettingsSchema,
  recoveryStatsQuerySchema,
} from './recovery.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';

export default async function recoveryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);
  app.addHook('preHandler', async (request) => {
    await checkPlanFeature(request.tenantId, 'hasSalesRecovery', 'Recuperação de Vendas');
  });

  // GET /api/recovery/settings — get recovery settings
  app.get('/api/recovery/settings', async (request, reply) => {
    try {
      const data = await recoveryService.getRecoverySettings(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // PUT /api/recovery/settings — update recovery settings
  app.put('/api/recovery/settings', async (request, reply) => {
    try {
      const body = updateRecoverySettingsSchema.parse(request.body);
      const data = await recoveryService.updateRecoverySettings(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // GET /api/recovery/stats?days=30 — recovery statistics
  app.get('/api/recovery/stats', async (request, reply) => {
    try {
      const query = recoveryStatsQuerySchema.parse(request.query);
      const data = await recoveryService.getRecoveryStats(request.tenantId, query.days);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // GET /api/recovery/attempts — list recent recovery attempts
  app.get('/api/recovery/attempts', async (request, reply) => {
    try {
      const data = await recoveryService.listRecoveryAttempts(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // GET /api/recovery/inactive-count — count of inactive customers for reengagement
  app.get('/api/recovery/inactive-count', async (request, reply) => {
    try {
      const count = await recoveryService.getInactiveCustomerCount(request.tenantId);
      return reply.send(success({ count }));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
