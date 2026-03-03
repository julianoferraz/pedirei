import type { FastifyInstance } from 'fastify';
import * as paymentService from './payment.service.js';
import { createPixBodySchema } from './payment.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function paymentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);

  app.post('/api/payment/pix/create', async (request, reply) => {
    try {
      const body = createPixBodySchema.parse(request.body);
      const data = await paymentService.createPixPayment(request.tenantId, body.orderId);
      return reply.status(201).send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/payment/pix/status/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await paymentService.checkPixStatus(request.tenantId, id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
