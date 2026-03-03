import type { FastifyInstance } from 'fastify';
import * as reportService from './report.service.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';

export default async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);

  app.get('/api/reports/revenue', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const data = await reportService.getRevenueReport(request.tenantId, startDate, endDate);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/reports/top-items', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const data = await reportService.getTopItems(request.tenantId, startDate, endDate);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/reports/peak-hours', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const data = await reportService.getPeakHours(request.tenantId, startDate, endDate);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/reports/feedback', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const data = await reportService.getFeedbackReport(request.tenantId, startDate, endDate);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
