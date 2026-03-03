import type { FastifyInstance } from 'fastify';
import * as orderService from './order.service.js';
import { printOrder, testPrint } from '../../services/printer.service.js';
import {
  createOrderBodySchema,
  updateOrderStatusBodySchema,
  cancelOrderBodySchema,
  orderQuerySchema,
} from './order.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkOrderLimit } from '../../middleware/plan-limits.js';
import { z } from 'zod';

export default async function orderRoutes(app: FastifyInstance) {
  // Public: create order (from web-menu)
  app.post('/api/orders', async (request, reply) => {
    try {
      const slug = (request.headers['x-tenant-slug'] as string) || '';
      const { prisma } = await import('@pedirei/database');
      const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
      if (!tenant) return reply.status(404).send(error('Loja não encontrada'));

      // Check plan order limits
      await checkOrderLimit(tenant.id);

      const body = createOrderBodySchema.parse(request.body);
      const data = await orderService.createOrder(tenant.id, body);
      return reply.status(201).send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // Public: track order by id
  app.get('/api/orders/:id/track', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await orderService.trackOrder(id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // Authenticated routes
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    authApp.get('/api/orders', async (request, reply) => {
      try {
        const query = orderQuerySchema.parse(request.query);
        const data = await orderService.listOrders(request.tenantId, query);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/orders/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await orderService.getOrder(request.tenantId, id);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/orders/:id/status', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateOrderStatusBodySchema.parse(request.body);
        const data = await orderService.updateOrderStatus(request.tenantId, id, body.status, body.note);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/orders/:id/cancel', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = cancelOrderBodySchema.parse(request.body);
        const data = await orderService.cancelOrder(request.tenantId, id, body.reason);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/orders/today/summary', async (request, reply) => {
      try {
        const data = await orderService.getTodaySummary(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // ─── Print Routes ───────────────────────────────────────────────

    authApp.post('/api/orders/:id/print', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await printOrder(id);
        if (!result.success) {
          return reply.status(500).send(error(result.error || 'Erro ao imprimir'));
        }
        return reply.send(success({ message: 'Pedido impresso com sucesso' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/printer/test', async (request, reply) => {
      try {
        const schema = z.object({
          type: z.enum(['network', 'usb']).default('network'),
          host: z.string().min(1),
          port: z.number().int().default(9100),
          width: z.enum(['32', '48']).default('48'),
        });
        const body = schema.parse(request.body);
        await testPrint({
          type: body.type,
          host: body.host,
          port: body.port,
          width: parseInt(body.width) as 32 | 48,
        });
        return reply.send(success({ message: 'Página de teste impressa' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
