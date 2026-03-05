import type { FastifyInstance } from 'fastify';
import * as kdsService from './kds.service.js';
import { kdsOrderQuerySchema, updateKdsItemStatusSchema, bumpOrderSchema } from './kds.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';

export default async function kdsRoutes(app: FastifyInstance) {
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    // Check plan feature on all KDS routes
    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasKds', 'KDS (Painel da Cozinha)');
    });

    // GET /api/kds/orders — active orders for kitchen display
    authApp.get('/api/kds/orders', async (request, reply) => {
      try {
        const query = kdsOrderQuerySchema.parse(request.query);
        const data = await kdsService.getKdsOrders(request.tenantId, query.status);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // GET /api/kds/completed — recently completed orders
    authApp.get('/api/kds/completed', async (request, reply) => {
      try {
        const data = await kdsService.getKdsCompletedOrders(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // PUT /api/kds/items/:id/status — update single item KDS status
    authApp.put('/api/kds/items/:id/status', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateKdsItemStatusSchema.parse(request.body);
        const data = await kdsService.updateKdsItemStatus(request.tenantId, id, body.kdsStatus);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // PUT /api/kds/orders/:id/start — start preparing an order
    authApp.put('/api/kds/orders/:id/start', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await kdsService.startPreparing(request.tenantId, id);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // PUT /api/kds/orders/:id/bump — mark order as ready (bump)
    authApp.put('/api/kds/orders/:id/bump', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = bumpOrderSchema.parse(request.body);
        const data = await kdsService.bumpOrder(request.tenantId, id, body.note);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // GET /api/kds/stats — KDS statistics for today
    authApp.get('/api/kds/stats', async (request, reply) => {
      try {
        const data = await kdsService.getKdsStats(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
