import type { FastifyInstance } from 'fastify';
import * as marketplaceService from './marketplace.service.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';
import type { MarketplaceSource } from '@pedirei/shared';

export default async function marketplaceRoutes(app: FastifyInstance) {
  // ─── Admin endpoints (requireTenant + plan check) ──────────

  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    // List integrations
    authApp.get('/api/marketplace/integrations', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasMarketplace', 'Integração Marketplace');
      const data = await marketplaceService.listIntegrations(request.tenantId);
      return { data };
    });

    // Connect a marketplace
    authApp.post('/api/marketplace/connect', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasMarketplace', 'Integração Marketplace');
      const { provider, credentials } = request.body as {
        provider: MarketplaceSource;
        credentials: Record<string, string>;
      };
      const data = await marketplaceService.connectMarketplace(request.tenantId, provider, credentials);
      return { data };
    });

    // Disconnect a marketplace
    authApp.post('/api/marketplace/disconnect', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasMarketplace', 'Integração Marketplace');
      const { provider } = request.body as { provider: MarketplaceSource };
      const data = await marketplaceService.disconnectMarketplace(request.tenantId, provider);
      return { data };
    });

    // Sync catalog to marketplace
    authApp.post('/api/marketplace/sync-catalog', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasMarketplace', 'Integração Marketplace');
      const { provider } = request.body as { provider: MarketplaceSource };
      const data = await marketplaceService.syncCatalog(request.tenantId, provider);
      return { data };
    });

    // Get marketplace stats
    authApp.get('/api/marketplace/stats', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasMarketplace', 'Integração Marketplace');
      const data = await marketplaceService.getMarketplaceStats(request.tenantId);
      return { data };
    });
  });

  // ─── Webhook endpoints (public, no auth) ───────────────────

  app.post('/api/webhook/marketplace/:provider/:merchantId', async (request, reply) => {
    try {
      const { provider, merchantId } = request.params as { provider: string; merchantId: string };
      const signature = (request.headers['x-webhook-signature'] || request.headers['x-hub-signature'] || null) as string | null;

      const source = provider.toUpperCase() as MarketplaceSource;
      if (source !== 'IFOOD' && source !== 'RAPPI') {
        return reply.status(200).send({ received: true, error: 'Unknown provider' });
      }

      const result = await marketplaceService.handleMarketplaceWebhook(source, merchantId, request.body, signature);
      return reply.status(200).send({ received: true, processed: !!result });
    } catch (err) {
      app.log.error(err, 'Marketplace webhook error');
      // Always return 200 to prevent webhook retries
      return reply.status(200).send({ received: true, processed: false });
    }
  });
}
