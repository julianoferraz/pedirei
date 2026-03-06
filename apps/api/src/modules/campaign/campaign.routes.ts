import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as campaignService from './campaign.service.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';

const audienceFilterSchema = z.object({
  minOrders: z.number().int().min(0).optional(),
  minSpent: z.number().min(0).optional(),
  lastOrderDays: z.number().int().min(1).optional(),
  lastContactDays: z.number().int().min(1).optional(),
  minFeedback: z.number().min(0).max(5).optional(),
  hasLoyalty: z.boolean().optional(),
  isRegistered: z.boolean().optional(),
}).optional();

const createCampaignBody = z.object({
  name: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['PROMOTIONAL', 'REENGAGEMENT']),
  scheduledAt: z.string().datetime().optional(),
  audienceFilter: audienceFilterSchema,
});

const updateCampaignBody = z.object({
  name: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  audienceFilter: audienceFilterSchema,
});

export default async function campaignRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);
  app.addHook('preHandler', async (request) => {
    await checkPlanFeature(request.tenantId, 'hasBulkWhatsapp', 'Envio em Massa WhatsApp');
  });

  app.get('/api/campaigns', async (request, reply) => {
    try {
      const data = await campaignService.listCampaigns(request.tenantId);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/campaigns', async (request, reply) => {
    try {
      const body = createCampaignBody.parse(request.body);
      const data = await campaignService.createCampaign(request.tenantId, body);
      return reply.status(201).send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/campaigns/preview', async (request, reply) => {
    try {
      const body = z.object({ audienceFilter: audienceFilterSchema }).parse(request.body);
      const data = await campaignService.previewAudience(request.tenantId, body.audienceFilter);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/campaigns/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await campaignService.getCampaign(request.tenantId, id);
      if (!data) return reply.status(404).send(error('Campanha não encontrada'));
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/campaigns/:id/stats', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await campaignService.getCampaignStats(request.tenantId, id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.put('/api/campaigns/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateCampaignBody.parse(request.body);
      await campaignService.updateCampaign(request.tenantId, id, body);
      return reply.send(success({ message: 'Campanha atualizada' }));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/campaigns/:id/send', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await campaignService.sendCampaign(request.tenantId, id);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.delete('/api/campaigns/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await campaignService.deleteCampaign(request.tenantId, id);
      return reply.send(success({ message: 'Campanha excluída' }));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
