import type { FastifyInstance } from 'fastify';
import * as tableService from './table.service.js';
import {
  createTableSchema,
  updateTableSchema,
  tableQuerySchema,
  createTableOrderSchema,
} from './table.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';
import { checkOrderLimit } from '../../middleware/plan-limits.js';
import { z } from 'zod';

export default async function tableRoutes(app: FastifyInstance) {
  // ─── Public routes (QR code landing) ─────────────────────────

  // GET /api/public/:slug/table/:tableNumber — table info for QR landing
  app.get('/api/public/:slug/table/:tableNumber', async (request, reply) => {
    try {
      const { slug, tableNumber } = request.params as { slug: string; tableNumber: string };
      const data = await tableService.getTablePublicInfo(slug, tableNumber);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // POST /api/public/:slug/table/:tableNumber/order — create order from table
  app.post('/api/public/:slug/table/:tableNumber/order', async (request, reply) => {
    try {
      const { slug, tableNumber } = request.params as { slug: string; tableNumber: string };

      // Check order limit for this tenant
      const { prisma } = await import('@pedirei/database');
      const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
      if (tenant) await checkOrderLimit(tenant.id);

      const body = createTableOrderSchema.parse(request.body);
      const data = await tableService.createTableOrder(slug, tableNumber, body);
      return reply.status(201).send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // ─── Authenticated routes (admin) ────────────────────────────

  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);
    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasTableOrder', 'Garçom Digital (Mesas)');
    });

    // GET /api/tables — list tables
    authApp.get('/api/tables', async (request, reply) => {
      try {
        const query = tableQuerySchema.parse(request.query);
        const data = await tableService.listTables(request.tenantId, query.isActive);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // GET /api/tables/:id — get single table
    authApp.get('/api/tables/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await tableService.getTable(request.tenantId, id);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // POST /api/tables — create single table
    authApp.post('/api/tables', async (request, reply) => {
      try {
        const body = createTableSchema.parse(request.body);
        const data = await tableService.createTable(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // POST /api/tables/batch — create tables in batch (1-N)
    authApp.post('/api/tables/batch', async (request, reply) => {
      try {
        const body = z.object({
          from: z.number().int().min(1),
          to: z.number().int().min(1),
        }).parse(request.body);
        const data = await tableService.createTablesInBatch(request.tenantId, body.from, body.to);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // PUT /api/tables/:id — update table
    authApp.put('/api/tables/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateTableSchema.parse(request.body);
        const data = await tableService.updateTable(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // DELETE /api/tables/:id — delete table
    authApp.delete('/api/tables/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await tableService.deleteTable(request.tenantId, id);
        return reply.send(success({ message: 'Mesa excluída' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // PUT /api/tenant/dine-in — toggle dine-in mode
    authApp.put('/api/tenant/dine-in', async (request, reply) => {
      try {
        const body = z.object({ dineInEnabled: z.boolean() }).parse(request.body);
        const { prisma } = await import('@pedirei/database');
        await prisma.tenant.update({
          where: { id: request.tenantId },
          data: { dineInEnabled: body.dineInEnabled },
        });
        return reply.send(success({ message: body.dineInEnabled ? 'Garçom Digital ativado' : 'Garçom Digital desativado' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
