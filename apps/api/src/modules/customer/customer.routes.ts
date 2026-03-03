import type { FastifyInstance } from 'fastify';
import * as customerService from './customer.service.js';
import { customerQuerySchema } from './customer.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function customerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);

  app.get('/api/customers', async (request, reply) => {
    try {
      const query = customerQuerySchema.parse(request.query);
      const data = await customerService.listCustomers(request.tenantId, query);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/customers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await customerService.getCustomer(request.tenantId, id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/customers/:id/orders', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await customerService.getCustomerOrders(request.tenantId, id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
