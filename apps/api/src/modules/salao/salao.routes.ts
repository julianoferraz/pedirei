import type { FastifyInstance } from 'fastify';
import * as salaoService from './salao.service.js';
import * as menuService from '../menu/menu.service.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function salaoRoutes(app: FastifyInstance) {
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);
    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasTableManagement', 'Módulo Salão');
    });

    // ─── MESAS ────────────────────────────────────────────────

    authApp.get('/api/salao/tables', async (request, reply) => {
      try {
        const data = await salaoService.listTables(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/salao/tables', async (request, reply) => {
      try {
        const body = request.body as {
          number: string;
          label?: string;
          capacity?: number;
          posX?: number;
          posY?: number;
        };
        const data = await salaoService.createTable(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/salao/tables/layout', async (request, reply) => {
      try {
        const body = request.body as Array<{ id: string; posX: number; posY: number }>;
        await salaoService.updateLayout(request.tenantId, body);
        return reply.send(success({ message: 'Layout atualizado' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/salao/tables/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { label?: string; capacity?: number; isActive?: boolean };
        const data = await salaoService.updateTable(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.delete('/api/salao/tables/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await salaoService.deleteTable(request.tenantId, id);
        return reply.send(success({ message: 'Mesa excluída' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // ─── SESSÕES ──────────────────────────────────────────────

    authApp.get('/api/salao/sessions', async (request, reply) => {
      try {
        const data = await salaoService.listOpenSessions(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/salao/sessions', async (request, reply) => {
      try {
        const body = request.body as { tableId?: string; guestName?: string };
        const data = await salaoService.openSession(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/salao/sessions/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await salaoService.getSession(request.tenantId, id);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/salao/sessions/:id/items', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as {
          menuItemId?: string;
          customName?: string;
          customPrice?: number;
          quantity: number;
          notes?: string;
        };
        const data = await salaoService.addItem(request.tenantId, id, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.delete('/api/salao/sessions/:id/items/:itemId', async (request, reply) => {
      try {
        const { id, itemId } = request.params as { id: string; itemId: string };
        await salaoService.removeItem(request.tenantId, id, itemId);
        return reply.send(success({ message: 'Item removido' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.patch('/api/salao/sessions/:id/items/:itemId', async (request, reply) => {
      try {
        const { id, itemId } = request.params as { id: string; itemId: string };
        const { quantity } = request.body as { quantity: number };
        await salaoService.updateItemQty(request.tenantId, id, itemId, quantity);
        return reply.send(success({ message: 'Quantidade atualizada' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/salao/sessions/:id/split', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { parts } = request.query as { parts?: string };
        const numParts = parseInt(parts || '2', 10);
        const session = await salaoService.getSession(request.tenantId, id);
        const data = salaoService.splitSession(session.totalAmount, numParts);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/salao/sessions/:id/close', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { paymentMethod: string };
        const data = await salaoService.closeSession(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/salao/sessions/:id/print', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { splitPart?: number; splitTotal?: number };
        const splitPart =
          body.splitPart && body.splitTotal
            ? { index: body.splitPart, parts: body.splitTotal }
            : undefined;
        await salaoService.printSessionBill(request.tenantId, id, splitPart);
        return reply.send(success({ message: 'Imprimindo...' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });

  // ─── Stock route (added to menu namespace, no plan gate for stock itself) ──

  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    authApp.patch('/api/menu/items/:id/stock', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as {
          stockMode: 'NONE' | 'AVAILABLE' | 'BY_QUANTITY';
          stockQty?: number;
        };
        const data = await menuService.updateStock(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
