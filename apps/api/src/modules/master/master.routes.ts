import type { FastifyInstance } from 'fastify';
import * as masterService from './master.service.js';
import {
  tenantsQuerySchema,
  updateTenantMasterBodySchema,
  changePlanBodySchema,
  updateAiMasterBodySchema,
  blockTenantBodySchema,
  updatePlatformConfigBodySchema,
  updatePlanBodySchema,
} from './master.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function masterRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticateMaster);

  app.get('/api/master/tenants', async (request, reply) => {
    try {
      const query = tenantsQuerySchema.parse(request.query);
      const data = await masterService.listTenants(query);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/master/tenants/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await masterService.getTenant(id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/master/tenants/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateTenantMasterBodySchema.parse(request.body);
      const data = await masterService.updateTenant(id, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/master/tenants/:id/plan', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = changePlanBodySchema.parse(request.body);
      const data = await masterService.changePlan(id, body.planId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/master/tenants/:id/ai', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateAiMasterBodySchema.parse(request.body);
      const data = await masterService.updateAiMode(id, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/master/tenants/:id/block', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = blockTenantBodySchema.parse(request.body);
      const data = await masterService.blockTenant(id, body.isActive);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/master/tenants/:id/reconnect', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await masterService.reconnectWhatsapp(id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/master/stats', async (_request, reply) => {
    try {
      const data = await masterService.getGlobalStats();
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/master/ai-usage', async (request, reply) => {
    try {
      const { page, limit } = request.query as { page?: string; limit?: string };
      const data = await masterService.getAiUsage(
        parseInt(page || '1', 10),
        parseInt(limit || '20', 10),
      );
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/master/config', async (_request, reply) => {
    try {
      const data = await masterService.getPlatformConfig();
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/master/config', async (request, reply) => {
    try {
      const body = updatePlatformConfigBodySchema.parse(request.body);
      const data = await masterService.updatePlatformConfig(body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/master/plans', async (_request, reply) => {
    try {
      const data = await masterService.listPlans();
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/master/plans/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updatePlanBodySchema.parse(request.body);
      const data = await masterService.updatePlan(id, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
