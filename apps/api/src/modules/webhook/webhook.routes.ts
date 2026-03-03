import type { FastifyInstance } from 'fastify';
import * as webhookService from './webhook.service.js';

export default async function webhookRoutes(app: FastifyInstance) {
  app.post('/api/webhook/payment/:provider', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string };
      const result = await webhookService.handlePaymentWebhook(provider, request.body);
      return reply.send({ received: true, processed: !!result });
    } catch (err) {
      app.log.error(err, 'Webhook processing error');
      return reply.status(200).send({ received: true, processed: false });
    }
  });
}
