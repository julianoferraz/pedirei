import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as campaignService from './campaign.service.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

const createCampaignBody = z.object({
  name: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['PROMOTIONAL', 'REENGAGEMENT']),
  scheduledAt: z.string().datetime().optional(),
});

const updateCampaignBody = z.object({
  name: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export default async function campaignRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);

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
