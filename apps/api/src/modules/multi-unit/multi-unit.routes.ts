import type { FastifyInstance } from 'fastify';
import * as multiUnitService from './multi-unit.service.js';
import { checkPlanFeature } from '../../middleware/plan-limits.js';
import { success } from '../../utils/helpers.js';

export default async function multiUnitRoutes(app: FastifyInstance) {
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);
    authApp.addHook('preHandler', async (request) => {
      await checkPlanFeature(request.tenantId, 'hasMultiUnit', 'Multi-Unidade (Filiais)');
    });

    // ─── Group Management ──────────────────────────────────

    authApp.get('/api/multi-unit/groups', async (request) => {
      const data = await multiUnitService.listGroups(request.tenantId);
      return success(data);
    });

    authApp.post('/api/multi-unit/groups', async (request) => {
      const { name } = request.body as { name: string };
      const data = await multiUnitService.createGroup(request.tenantId, name);
      return success(data);
    });

    authApp.delete('/api/multi-unit/groups/:groupId', async (request) => {
      const { groupId } = request.params as { groupId: string };
      await multiUnitService.deleteGroup(request.tenantId, groupId);
      return success({ deleted: true });
    });

    authApp.post('/api/multi-unit/groups/:groupId/members', async (request) => {
      const { groupId } = request.params as { groupId: string };
      const { slug } = request.body as { slug: string };
      const data = await multiUnitService.addMember(request.tenantId, groupId, slug);
      return success(data);
    });

    authApp.delete('/api/multi-unit/groups/:groupId/members/:memberId', async (request) => {
      const { groupId, memberId } = request.params as { groupId: string; memberId: string };
      await multiUnitService.removeMember(request.tenantId, groupId, memberId);
      return success({ deleted: true });
    });

    // ─── Consolidated Reports ──────────────────────────────

    authApp.get('/api/multi-unit/groups/:groupId/reports/revenue', async (request) => {
      const { groupId } = request.params as { groupId: string };
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const tenantIds = await multiUnitService.getGroupTenantIds(request.tenantId, groupId);
      const data = await multiUnitService.getConsolidatedRevenue(tenantIds, startDate, endDate);
      return success(data);
    });

    authApp.get('/api/multi-unit/groups/:groupId/reports/top-items', async (request) => {
      const { groupId } = request.params as { groupId: string };
      const { startDate, endDate, limit } = request.query as { startDate?: string; endDate?: string; limit?: string };
      const tenantIds = await multiUnitService.getGroupTenantIds(request.tenantId, groupId);
      const data = await multiUnitService.getConsolidatedTopItems(tenantIds, startDate, endDate, limit ? parseInt(limit, 10) : 10);
      return success(data);
    });

    authApp.get('/api/multi-unit/groups/:groupId/reports/payment-breakdown', async (request) => {
      const { groupId } = request.params as { groupId: string };
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const tenantIds = await multiUnitService.getGroupTenantIds(request.tenantId, groupId);
      const data = await multiUnitService.getConsolidatedPaymentBreakdown(tenantIds, startDate, endDate);
      return success(data);
    });

    authApp.get('/api/multi-unit/groups/:groupId/reports/order-status', async (request) => {
      const { groupId } = request.params as { groupId: string };
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const tenantIds = await multiUnitService.getGroupTenantIds(request.tenantId, groupId);
      const data = await multiUnitService.getConsolidatedOrderStatus(tenantIds, startDate, endDate);
      return success(data);
    });

    authApp.get('/api/multi-unit/groups/:groupId/reports/customer-analytics', async (request) => {
      const { groupId } = request.params as { groupId: string };
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      const tenantIds = await multiUnitService.getGroupTenantIds(request.tenantId, groupId);
      const data = await multiUnitService.getConsolidatedCustomerAnalytics(tenantIds, startDate, endDate);
      return success(data);
    });
  });
}
