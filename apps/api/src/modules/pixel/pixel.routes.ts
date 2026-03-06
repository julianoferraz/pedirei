import type { FastifyInstance } from 'fastify';
import { checkPlanFeature } from '../../middleware/plan-limits.js';
import { updatePixelSettingsSchema } from './pixel.schema.js';
import { getPixelSettings, updatePixelSettings } from './pixel.service.js';
import { success } from '../../utils/response.js';

export default async function pixelRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireTenant);
  app.addHook('preHandler', async (request) => {
    await checkPlanFeature(request.tenantId, 'hasMarketingPixels', 'Pixels de Marketing');
  });

  // GET /api/pixels/settings
  app.get('/api/pixels/settings', async (request) => {
    const data = await getPixelSettings(request.tenantId);
    return success(data);
  });

  // PUT /api/pixels/settings
  app.put('/api/pixels/settings', async (request) => {
    const body = updatePixelSettingsSchema.parse(request.body);
    const data = await updatePixelSettings(request.tenantId, body);
    return success(data);
  });
}
