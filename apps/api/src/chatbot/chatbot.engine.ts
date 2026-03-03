import { prisma } from '@pedirei/database';
import { isWithinTimeRange } from '@pedirei/shared';
import { chatCompletion } from '../services/openai.service.js';
import { getSession, saveSession, clearSession, ChatState } from './chatbot.session.js';
import { buildSystemPrompt, buildFeedbackPrompt, buildAdminPrompt } from './chatbot.prompts.js';
import {
  chatbotTools,
  adminTools,
  handleGetMenu,
  handleAddToCart,
  handleRemoveFromCart,
  handleGetCartSummary,
  handleSetDeliveryAddress,
  handleSetPaymentMethod,
  handleCreateOrder,
  handleGetLastOrder,
  handleCheckStoreHours,
  handleToggleMenuItem,
  handleListPendingOrders,
  handleUpdateOrderStatus,
  handleSetDeliveryTime,
} from './chatbot.actions.js';
import { parseFeedback } from './feedback.parser.js';
import { processAdminCommand } from './admin-commands.js';
import { logger } from '../utils/logger.js';
import type OpenAI from 'openai';

// ── Main message handler ────────────────────────────────────

export async function processCustomerMessage(
  tenantId: string,
  customerPhone: string,
  message: string,
): Promise<string> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { operatingHours: true },
    });

    if (!tenant) return 'Restaurante não encontrado.';
    if (!tenant.isActive) return 'Este restaurante está temporariamente indisponível.';

    // Check if sender is admin phone
    const isAdmin = await prisma.adminPhone.findFirst({
      where: { tenantId, phone: customerPhone },
    });

    if (isAdmin) {
      return processAdminCommand(tenantId, message);
    }

    // Check operating hours
    const now = new Date();
    const dayOfWeek = now.getDay();
    const todayHours = tenant.operatingHours.find((h: { dayOfWeek: number }) => h.dayOfWeek === dayOfWeek);
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isOpen = todayHours
      ? todayHours.isOpen && isWithinTimeRange(currentTime, todayHours.openTime, todayHours.closeTime)
      : false;

    const hoursText = tenant.operatingHours
      .filter((h: { isOpen: boolean }) => h.isOpen)
      .map(
        (h: { dayOfWeek: number; openTime: string; closeTime: string }) =>
          `${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][h.dayOfWeek]}: ${h.openTime}-${h.closeTime}`,
      )
      .join('\n');

    // Get session
    const state = await getSession(tenantId, customerPhone);

    // Check if it's a feedback response
    if (state.step === 'feedback') {
      return handleFeedbackMessage(tenantId, customerPhone, message, state);
    }

    // Add user message to history
    state.messageHistory.push({ role: 'user', content: message });

    // Keep only last 20 messages
    if (state.messageHistory.length > 20) {
      state.messageHistory = state.messageHistory.slice(-20);
    }

    // Build messages for OpenAI
    const systemMsg = buildSystemPrompt(tenant.name, isOpen, hoursText);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMsg },
      ...state.messageHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call OpenAI with tools
    const response = await chatCompletion(messages, {
      tools: isOpen ? chatbotTools : undefined,
      tenantId,
    });

    const choice = response.choices[0];
    let reply = '';

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      reply = await executeToolCalls(tenantId, customerPhone, state, choice.message.tool_calls);
    } else {
      reply = choice.message.content || 'Desculpe, não entendi. Pode repetir?';
    }

    // Save session
    state.messageHistory.push({ role: 'assistant', content: reply });
    await saveSession(tenantId, customerPhone, state);

    // Log
    await prisma.whatsappLog.create({
      data: {
        tenantId,
        direction: 'outbound',
        phone: customerPhone,
        messageType: 'text',
        content: reply.substring(0, 5000),
      },
    });

    return reply;
  } catch (error) {
    logger.error({ err: error }, 'Error processing customer message');
    return 'Desculpe, ocorreu um erro. Tente novamente em instantes.';
  }
}

// ── Tool calls execution ────────────────────────────────────

async function executeToolCalls(
  tenantId: string,
  customerPhone: string,
  state: ChatState,
  toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[],
): Promise<string> {
  const results: string[] = [];

  for (const call of toolCalls) {
    const args = JSON.parse(call.function.arguments || '{}');
    let result = '';

    switch (call.function.name) {
      case 'get_menu':
        result = await handleGetMenu(tenantId, args);
        break;

      case 'add_to_cart': {
        const r = await handleAddToCart(tenantId, state, args);
        Object.assign(state, r.state);
        result = r.text;
        break;
      }

      case 'remove_from_cart': {
        const r = await handleRemoveFromCart(state, args);
        Object.assign(state, r.state);
        result = r.text;
        break;
      }

      case 'get_cart_summary':
        result = handleGetCartSummary(state);
        break;

      case 'set_delivery_address': {
        const r = await handleSetDeliveryAddress(tenantId, state, args);
        Object.assign(state, r.state);
        result = r.text;
        break;
      }

      case 'set_payment_method': {
        const r = handleSetPaymentMethod(state, args);
        Object.assign(state, r.state);
        result = r.text;
        break;
      }

      case 'create_order': {
        const deliveryFee = 0; // TODO: calculate from address matching
        const r = await handleCreateOrder(tenantId, customerPhone, state, deliveryFee, args);
        result = r.text;

        // Clear session after order
        state.lastOrderId = r.orderId;
        state.step = 'feedback';
        state.cart = [];
        break;
      }

      case 'get_last_order':
        result = await handleGetLastOrder(tenantId, customerPhone);
        break;

      case 'check_store_hours':
        result = await handleCheckStoreHours(tenantId);
        break;

      default:
        result = `Função ${call.function.name} não reconhecida.`;
    }

    results.push(result);
  }

  return results.join('\n\n');
}

// ── Feedback handling ───────────────────────────────────────

async function handleFeedbackMessage(
  tenantId: string,
  customerPhone: string,
  message: string,
  state: ChatState,
): Promise<string> {
  if (!state.lastOrderId) {
    state.step = 'greeting';
    await saveSession(tenantId, customerPhone, state);
    return 'Como posso ajudar?';
  }

  const feedback = await parseFeedback(message, tenantId);

  if (feedback.rating) {
    await prisma.order.update({
      where: { id: state.lastOrderId },
      data: {
        feedbackRating: feedback.rating,
        feedbackComment: feedback.comment,
      },
    });

    await clearSession(tenantId, customerPhone);

    if (feedback.rating >= 4) {
      return `⭐ Obrigado pela avaliação de ${feedback.rating} estrelas! Ficamos felizes que gostou. Até a próxima! 🙏`;
    } else if (feedback.rating >= 3) {
      return `⭐ Obrigado pela avaliação! Vamos trabalhar para melhorar. Até breve!`;
    } else {
      return `⭐ Obrigado pelo feedback. Lamentamos que a experiência não foi boa. Vamos melhorar! O gerente será notificado.`;
    }
  }

  return 'Não consegui entender sua avaliação. Por favor, dê uma nota de 1 a 5 e um comentário.';
}
