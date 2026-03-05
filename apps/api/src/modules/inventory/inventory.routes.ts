import type { FastifyInstance } from 'fastify';
import * as inventoryService from './inventory.service.js';
import {
  updateStockBodySchema,
  adjustStockBodySchema,
  bulkUpdateStockBodySchema,
  inventoryQuerySchema,
  movementQuerySchema,
} from './inventory.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function inventoryRoutes(app: FastifyInstance) {
  // All inventory routes require auth
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    // List inventory items
    authApp.get('/api/inventory', async (request, reply) => {
      try {
        const query = inventoryQuerySchema.parse(request.query);
        const data = await inventoryService.listInventory(request.tenantId, query);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Get low-stock alerts
    authApp.get('/api/inventory/alerts', async (request, reply) => {
      try {
        const data = await inventoryService.getLowStockAlerts(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Update stock settings for an item
    authApp.put('/api/inventory/:menuItemId', async (request, reply) => {
      try {
        const { menuItemId } = request.params as { menuItemId: string };
        const body = updateStockBodySchema.parse(request.body);
        const data = await inventoryService.updateItemStock(request.tenantId, menuItemId, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Adjust stock (manual IN/OUT/ADJUSTMENT/RETURN)
    authApp.post('/api/inventory/adjust', async (request, reply) => {
      try {
        const body = adjustStockBodySchema.parse(request.body);
        const data = await inventoryService.adjustStock(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Bulk update stock quantities (inventory reconciliation)
    authApp.put('/api/inventory/bulk', async (request, reply) => {
      try {
        const body = bulkUpdateStockBodySchema.parse(request.body);
        const data = await inventoryService.bulkUpdateStock(request.tenantId, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // List movement history
    authApp.get('/api/inventory/movements', async (request, reply) => {
      try {
        const query = movementQuerySchema.parse(request.query);
        const data = await inventoryService.listMovements(request.tenantId, query);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
