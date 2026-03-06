import type { FastifyInstance } from 'fastify';
import * as reportService from './report.service.js';
import { reportQuerySchema, topItemsQuerySchema } from './report.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';

export default async function reportRoutes(app: FastifyInstance) {
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    // ─── Basic Reports (hasReports) ────────────────────────────

    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasReports', 'Relatórios');
    });

    authApp.get('/api/reports/revenue', async (request, reply) => {
      try {
        const { startDate, endDate } = reportQuerySchema.parse(request.query);
        const data = await reportService.getRevenueReport(request.tenantId, startDate, endDate);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/reports/top-items', async (request, reply) => {
      try {
        const { startDate, endDate, limit } = topItemsQuerySchema.parse(request.query);
        const data = await reportService.getTopItems(request.tenantId, startDate, endDate, limit);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/reports/peak-hours', async (request, reply) => {
      try {
        const { startDate, endDate } = reportQuerySchema.parse(request.query);
        const data = await reportService.getPeakHours(request.tenantId, startDate, endDate);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/reports/feedback', async (request, reply) => {
      try {
        const { startDate, endDate } = reportQuerySchema.parse(request.query);
        const data = await reportService.getFeedbackReport(request.tenantId, startDate, endDate);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });

  // ─── Advanced Reports (hasAdvReports) ──────────────────────

  app.register(async (advApp) => {
    advApp.addHook('preHandler', app.requireTenant);
    advApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasAdvReports', 'Relatórios Avançados');
    });

    advApp.get('/api/reports/payment-breakdown', async (request, reply) => {
      try {
        const { startDate, endDate } = reportQuerySchema.parse(request.query);
        const data = await reportService.getPaymentBreakdown(request.tenantId, startDate, endDate);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    advApp.get('/api/reports/customer-analytics', async (request, reply) => {
      try {
        const { startDate, endDate } = reportQuerySchema.parse(request.query);
        const data = await reportService.getCustomerAnalytics(request.tenantId, startDate, endDate);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    advApp.get('/api/reports/order-status', async (request, reply) => {
      try {
        const { startDate, endDate } = reportQuerySchema.parse(request.query);
        const data = await reportService.getOrderStatusBreakdown(request.tenantId, startDate, endDate);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
