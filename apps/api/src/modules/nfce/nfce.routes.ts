import type { FastifyInstance } from 'fastify';
import * as nfceService from './nfce.service.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function nfceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);

  app.post('/api/nfce/emit/:orderId', async (request, reply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      const data = await nfceService.emitNfce(request.tenantId, orderId);
      return reply.status(201).send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/nfce/:orderId', async (request, reply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      const data = await nfceService.getNfce(request.tenantId, orderId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
