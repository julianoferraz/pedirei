import type { FastifyInstance } from 'fastify';
import * as tenantService from './tenant.service.js';
import {
  updateTenantBodySchema,
  operatingHoursBodySchema,
  updatePaymentBodySchema,
  updateDeliveryBodySchema,
  updateMessagesBodySchema,
  updateAiBodySchema,
  updateNfceBodySchema,
  updateReengagementBodySchema,
} from './tenant.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function tenantRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);

  app.get('/api/tenant', async (request, reply) => {
    try {
      const data = await tenantService.getTenant(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant', async (request, reply) => {
    try {
      const body = updateTenantBodySchema.parse(request.body);
      const data = await tenantService.updateTenant(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/tenant/operating-hours', async (request, reply) => {
    try {
      const data = await tenantService.getOperatingHours(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant/operating-hours', async (request, reply) => {
    try {
      const body = operatingHoursBodySchema.parse(request.body);
      await tenantService.updateOperatingHours(request.tenantId, body);
      return reply.send(success({ message: 'Horários atualizados' }));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant/payment', async (request, reply) => {
    try {
      const body = updatePaymentBodySchema.parse(request.body);
      const data = await tenantService.updatePaymentConfig(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant/delivery', async (request, reply) => {
    try {
      const body = updateDeliveryBodySchema.parse(request.body);
      const data = await tenantService.updateDeliveryConfig(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant/messages', async (request, reply) => {
    try {
      const body = updateMessagesBodySchema.parse(request.body);
      const data = await tenantService.updateMessages(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant/ai', async (request, reply) => {
    try {
      const body = updateAiBodySchema.parse(request.body);
      const data = await tenantService.updateAiConfig(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant/nfce', async (request, reply) => {
    try {
      const body = updateNfceBodySchema.parse(request.body);
      const data = await tenantService.updateNfceConfig(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/tenant/reengagement', async (request, reply) => {
    try {
      const body = updateReengagementBodySchema.parse(request.body);
      const data = await tenantService.updateReengagementConfig(request.tenantId, body);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/tenant/stats', async (request, reply) => {
    try {
      const data = await tenantService.getStats(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // ── WhatsApp ────────────────────────────────────────────────
  app.post('/api/tenant/whatsapp/connect', async (request, reply) => {
    try {
      const data = await tenantService.connectWhatsappService(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/tenant/whatsapp/disconnect', async (request, reply) => {
    try {
      await tenantService.disconnectWhatsappService(request.tenantId);
      return reply.send(success({ disconnected: true }));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/tenant/whatsapp/status', async (request, reply) => {
    try {
      const data = tenantService.getWhatsappStatus(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
