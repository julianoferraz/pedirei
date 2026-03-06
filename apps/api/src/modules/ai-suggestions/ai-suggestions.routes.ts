import type { FastifyInstance } from 'fastify';
import { checkPlanFeature } from '../../middleware/plan-limits.js';
import {
  suggestionsQuerySchema,
  generateDescriptionSchema,
  priceAnalysisSchema,
} from './ai-suggestions.schema.js';
import {
  getSuggestions,
  generateItemDescription,
  analyzePrices,
} from './ai-suggestions.service.js';
import { success, error } from '../../utils/helpers.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import { prisma } from '@pedirei/database';

export default async function aiSuggestionsRoutes(app: FastifyInstance) {
  // ── Public: cart suggestions (no auth, plan-gated by slug lookup) ──

  app.get('/api/public/:slug/suggestions', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const query = suggestionsQuerySchema.parse(request.query);

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, isActive: true, plan: { select: { hasAiSuggestions: true } } },
      });

      if (!tenant || !tenant.isActive) throw new NotFoundError('Loja');
      if (!tenant.plan.hasAiSuggestions) return reply.send(success([]));

      const data = await getSuggestions(tenant.id, query.itemIds);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // ── Admin: AI tools (authenticated + plan-gated) ──

  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);
    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasAiSuggestions', 'Sugestões com IA');
    });

    // Generate description for a menu item
    authApp.post('/api/ai/generate-description', async (request, reply) => {
      try {
        const body = generateDescriptionSchema.parse(request.body);
        const description = await generateItemDescription(request.tenantId, body);
        return reply.send(success({ description }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Analyze menu prices
    authApp.post('/api/ai/price-analysis', async (request, reply) => {
      try {
        const body = priceAnalysisSchema.parse(request.body);
        const analysis = await analyzePrices(request.tenantId, body.categoryId);
        return reply.send(success(analysis));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // Get AI usage stats
    authApp.get('/api/ai/usage', async (request, reply) => {
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: request.tenantId },
          select: { aiMonthlyTokens: true, aiTokenLimit: true, aiModel: true },
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await prisma.aiUsageLog.aggregate({
          where: { tenantId: request.tenantId, createdAt: { gte: thirtyDaysAgo } },
          _sum: { totalTokens: true, costEstimate: true },
          _count: true,
        });

        return reply.send(
          success({
            model: tenant?.aiModel,
            monthlyTokens: tenant?.aiMonthlyTokens || 0,
            tokenLimit: tenant?.aiTokenLimit,
            last30Days: {
              requests: logs._count,
              tokens: logs._sum.totalTokens || 0,
              cost: Number(logs._sum.costEstimate || 0),
            },
          }),
        );
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
