import type { FastifyInstance } from 'fastify';
import * as loyaltyService from './loyalty.service.js';
import {
  updateLoyaltyConfigSchema,
  createRewardSchema,
  updateRewardSchema,
  rewardQuerySchema,
  adjustPointsSchema,
  redeemRewardSchema,
  transactionQuerySchema,
  customerLoyaltyQuerySchema,
} from './loyalty.schema.js';
import { success, error, paginated } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';

export default async function loyaltyRoutes(app: FastifyInstance) {
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasLoyalty', 'Programa de Fidelidade');
    });

    // ── Config ──────────────────────────────────────
    authApp.get('/api/loyalty/config', async (request, reply) => {
      try {
        const data = await loyaltyService.getLoyaltyConfig(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/loyalty/config', async (request, reply) => {
      try {
        const body = updateLoyaltyConfigSchema.parse(request.body);
        const data = await loyaltyService.updateLoyaltyConfig(request.tenantId, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // ── Rewards CRUD ────────────────────────────────
    authApp.get('/api/loyalty/rewards', async (request, reply) => {
      try {
        const query = rewardQuerySchema.parse(request.query);
        const data = await loyaltyService.listRewards(request.tenantId, query);
        return reply.send(paginated(data.items, data.total, data.page, data.limit));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/loyalty/rewards', async (request, reply) => {
      try {
        const body = createRewardSchema.parse(request.body);
        const data = await loyaltyService.createReward(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/loyalty/rewards/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateRewardSchema.parse(request.body);
        const data = await loyaltyService.updateReward(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.delete('/api/loyalty/rewards/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await loyaltyService.deleteReward(request.tenantId, id);
        return reply.send(success({ deleted: true }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // ── Points operations ───────────────────────────
    authApp.post('/api/loyalty/redeem', async (request, reply) => {
      try {
        const body = redeemRewardSchema.parse(request.body);
        const data = await loyaltyService.redeemReward(request.tenantId, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/loyalty/adjust', async (request, reply) => {
      try {
        const body = adjustPointsSchema.parse(request.body);
        const data = await loyaltyService.adjustPoints(request.tenantId, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // ── Transactions & rankings ─────────────────────
    authApp.get('/api/loyalty/transactions', async (request, reply) => {
      try {
        const query = transactionQuerySchema.parse(request.query);
        const data = await loyaltyService.listTransactions(request.tenantId, query);
        return reply.send(paginated(data.items, data.total, data.page, data.limit));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/loyalty/customers', async (request, reply) => {
      try {
        const query = customerLoyaltyQuerySchema.parse(request.query);
        const data = await loyaltyService.listCustomerLoyalty(request.tenantId, query);
        return reply.send(paginated(data.items, data.total, data.page, data.limit));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
