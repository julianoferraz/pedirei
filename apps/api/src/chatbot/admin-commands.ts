import { prisma } from '@pedirei/database';
import { chatCompletion } from '../services/openai.service.js';
import { buildAdminPrompt } from './chatbot.prompts.js';
import {
  adminTools,
  handleToggleMenuItem,
  handleListPendingOrders,
  handleUpdateOrderStatus,
  handleSetDeliveryTime,
} from './chatbot.actions.js';
import { logger } from '../utils/logger.js';
import type OpenAI from 'openai';

export async function processAdminCommand(
  tenantId: string,
  message: string,
): Promise<string> {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return 'Restaurante não encontrado.';

    // Quick commands without AI
    const lower = message.toLowerCase().trim();

    if (lower === 'pedidos' || lower === 'p') {
      return handleListPendingOrders(tenantId);
    }

    if (lower === 'status') {
      const pending = await prisma.order.count({
        where: { tenantId, status: { in: ['RECEIVED', 'PREPARING'] } },
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = await prisma.order.count({
        where: { tenantId, createdAt: { gte: today } },
      });
      const todayRevenue = await prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      });

      return (
        `📊 *Resumo:*\n` +
        `📦 Pendentes: ${pending}\n` +
        `📋 Pedidos hoje: ${todayOrders}\n` +
        `💰 Faturamento: R$ ${Number(todayRevenue._sum?.totalAmount || 0).toFixed(2)}`
      );
    }

    // Match "entregue #123" or "pronto #123" patterns
    const statusMatch = lower.match(
      /^(confirmado?|preparando|pronto|saiu|entregue?)\s+#?(\w+)$/,
    );
    if (statusMatch) {
      const statusMap: Record<string, string> = {
        confirmado: 'PREPARING',
        confirma: 'PREPARING',
        preparando: 'PREPARING',
        pronto: 'OUT_FOR_DELIVERY',
        saiu: 'OUT_FOR_DELIVERY',
        entregue: 'DELIVERED',
        entrega: 'DELIVERED',
      };
      const status = statusMap[statusMatch[1]] || 'PREPARING';
      return handleUpdateOrderStatus(tenantId, {
        orderNumber: statusMatch[2],
        status,
      });
    }

    // Match "pausar <item>" or "ativar <item>"
    const toggleMatch = lower.match(/^(pausar|desativar|ativar)\s+(.+)$/);
    if (toggleMatch) {
      const active = toggleMatch[1] === 'ativar';
      return handleToggleMenuItem(tenantId, { itemName: toggleMatch[2], active });
    }

    // Match "tempo <min>"
    const timeMatch = lower.match(/^tempo\s+(\d+)/);
    if (timeMatch) {
      return handleSetDeliveryTime(tenantId, { minutes: parseInt(timeMatch[1]) });
    }

    // For complex commands, use AI
    const response = await chatCompletion(
      [
        { role: 'system', content: buildAdminPrompt(tenant.name) },
        { role: 'user', content: message },
      ],
      {
        tools: adminTools,
        tenantId,
        temperature: 0.3,
      },
    );

    const choice = response.choices[0];

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const results: string[] = [];
      for (const call of choice.message.tool_calls) {
        const args = JSON.parse(call.function.arguments || '{}');
        let result = '';

        switch (call.function.name) {
          case 'toggle_menu_item':
            result = await handleToggleMenuItem(tenantId, args);
            break;
          case 'list_pending_orders':
            result = await handleListPendingOrders(tenantId);
            break;
          case 'update_order_status':
            result = await handleUpdateOrderStatus(tenantId, args);
            break;
          case 'set_delivery_time':
            result = await handleSetDeliveryTime(tenantId, args);
            break;
          default:
            result = `Comando não reconhecido: ${call.function.name}`;
        }
        results.push(result);
      }
      return results.join('\n\n');
    }

    return choice.message.content || 'Não entendi o comando. Tente: pedidos, status, entregue #123, pausar <item>';
  } catch (error) {
    logger.error({ err: error }, 'Error processing admin command');
    return 'Erro ao processar comando. Tente novamente.';
  }
}
