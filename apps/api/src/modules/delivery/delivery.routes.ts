import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as deliveryService from './delivery.service.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';

// ── Driver-facing endpoints (require DRIVER role) ─────────────

export default async function deliveryRoutes(app: FastifyInstance) {

  // Driver endpoints
  app.get('/api/delivery/my-orders', { preHandler: [app.requireDriver] }, async (request, reply) => {
    try {
      const { status } = request.query as { status?: string };
      const data = await deliveryService.listDriverOrders(request.tenantId, request.jwtPayload.sub, status);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/delivery/stats', { preHandler: [app.requireDriver] }, async (request, reply) => {
    try {
      const data = await deliveryService.getDriverStats(request.tenantId, request.jwtPayload.sub);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/delivery/orders/:id/accept', { preHandler: [app.requireDriver] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await deliveryService.acceptDelivery(request.tenantId, request.jwtPayload.sub, id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/delivery/orders/:id/confirm', { preHandler: [app.requireDriver] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await deliveryService.confirmDelivery(request.tenantId, request.jwtPayload.sub, id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/delivery/location', { preHandler: [app.requireDriver] }, async (request, reply) => {
    try {
      const body = z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }).parse(request.body);
      const data = await deliveryService.updateDriverLocation(request.tenantId, request.jwtPayload.sub, body.lat, body.lng);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // ── Admin-facing endpoints (require tenant auth + plan check) ─

  app.get('/api/delivery/drivers', { preHandler: [app.requireTenant] }, async (request, reply) => {
    try {
      await checkPlanFeature(request.tenantId, 'hasDeliveryApp', 'App Entregador');
      const data = await deliveryService.listDrivers(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/delivery/drivers', { preHandler: [app.requireTenant] }, async (request, reply) => {
    try {
      await checkPlanFeature(request.tenantId, 'hasDeliveryApp', 'App Entregador');
      const body = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
      }).parse(request.body);
      const data = await deliveryService.createDriver(request.tenantId, body);
      return reply.status(201).send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/delivery/pending', { preHandler: [app.requireTenant] }, async (request, reply) => {
    try {
      await checkPlanFeature(request.tenantId, 'hasDeliveryApp', 'App Entregador');
      const data = await deliveryService.listPendingDeliveries(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/delivery/orders/:id/assign', { preHandler: [app.requireTenant] }, async (request, reply) => {
    try {
      await checkPlanFeature(request.tenantId, 'hasDeliveryApp', 'App Entregador');
      const { id } = request.params as { id: string };
      const body = z.object({ driverId: z.string().min(1) }).parse(request.body);
      const data = await deliveryService.assignDriver(request.tenantId, id, body.driverId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
