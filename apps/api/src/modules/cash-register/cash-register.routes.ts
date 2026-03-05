import type { FastifyInstance } from 'fastify';
import * as cashRegisterService from './cash-register.service.js';
import {
  openCashRegisterBodySchema,
  closeCashRegisterBodySchema,
  addMovementBodySchema,
  cashRegisterQuerySchema,
  movementsQuerySchema,
} from './cash-register.schema.js';
import { success, error, paginated } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';

export default async function cashRegisterRoutes(app: FastifyInstance) {
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    // Plan check hook for all cash register routes
    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasCashRegister', 'Gestão de Caixa');
    });

    // Open a new cash register
    authApp.post('/api/cash-register/open', async (request, reply) => {
      try {
        const body = openCashRegisterBodySchema.parse(request.body);
        const data = await cashRegisterService.openRegister(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Close the current open register
    authApp.post('/api/cash-register/:id/close', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = closeCashRegisterBodySchema.parse(request.body);
        const data = await cashRegisterService.closeRegister(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Get current open register
    authApp.get('/api/cash-register/current', async (request, reply) => {
      try {
        const data = await cashRegisterService.getOpenRegister(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Add a movement to open register
    authApp.post('/api/cash-register/:id/movement', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = addMovementBodySchema.parse(request.body);
        const data = await cashRegisterService.addMovement(request.tenantId, id, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // List registers (history)
    authApp.get('/api/cash-register', async (request, reply) => {
      try {
        const query = cashRegisterQuerySchema.parse(request.query);
        const data = await cashRegisterService.listRegisters(request.tenantId, query);
        return reply.send(paginated(data.items, data.total, data.page, data.limit));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Get register detail with movements
    authApp.get('/api/cash-register/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await cashRegisterService.getRegisterDetail(request.tenantId, id);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Daily summary report
    authApp.get('/api/cash-register/report/daily', async (request, reply) => {
      try {
        const { date } = request.query as { date?: string };
        const reportDate = date || new Date().toISOString().split('T')[0];
        const data = await cashRegisterService.dailySummary(request.tenantId, reportDate);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
