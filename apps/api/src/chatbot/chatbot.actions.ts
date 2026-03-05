import { prisma } from '@pedirei/database';
import { ChatState } from './chatbot.session.js';
import { generateOrderNumber, formatCurrency } from '@pedirei/shared';
import type OpenAI from 'openai';

// ── Tool definitions for OpenAI function calling ─────────────

export const chatbotTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_menu',
      description: 'Lista o cardápio do restaurante, opcionalmente filtrado por categoria',
      parameters: {
        type: 'object',
        properties: {
          categoryName: { type: 'string', description: 'Nome da categoria para filtrar' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: 'Adiciona um item ao carrinho do cliente',
      parameters: {
        type: 'object',
        properties: {
          menuItemId: { type: 'string', description: 'ID do item do cardápio' },
          quantity: { type: 'number', description: 'Quantidade', default: 1 },
          notes: { type: 'string', description: 'Observações do item' },
        },
        required: ['menuItemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_cart',
      description: 'Remove um item do carrinho pelo nome',
      parameters: {
        type: 'object',
        properties: {
          menuItemId: { type: 'string', description: 'ID do item a remover' },
        },
        required: ['menuItemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cart_summary',
      description: 'Mostra o resumo do carrinho com itens e total',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_delivery_address',
      description: 'Define o endereço de entrega e calcula o frete',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Endereço completo' },
          reference: { type: 'string', description: 'Ponto de referência' },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_payment_method',
      description: 'Define a forma de pagamento',
      parameters: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH'] },
          changeFor: { type: 'number', description: 'Troco para quanto (se dinheiro)' },
        },
        required: ['method'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: 'Finaliza e cria o pedido',
      parameters: {
        type: 'object',
        properties: {
          generalNotes: { type: 'string', description: 'Observações gerais do pedido' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_last_order',
      description: 'Consulta o último pedido do cliente para possível repetição',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_store_hours',
      description: 'Verifica se a loja está aberta no horário atual',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ── Action handlers ─────────────────────────────────────────

export async function handleGetMenu(
  tenantId: string,
  args: { categoryName?: string },
): Promise<string> {
  const categories = await prisma.category.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(args.categoryName
        ? { name: { contains: args.categoryName, mode: 'insensitive' as const } }
        : {}),
    },
    include: {
      items: {
        where: { isPaused: false },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  let text = '';

  for (const cat of categories) {
    if (cat.items.length === 0) continue;
    text += `📋 *${cat.name}*\n`;
    for (const item of cat.items) {
      const stockInfo = item.trackStock && item.stockQuantity === 0
        ? ' \u274C ESGOTADO'
        : item.trackStock && item.stockQuantity <= 5
          ? ` (\u26A0\uFE0F restam ${item.stockQuantity})`
          : '';
      text += `  \u2022 ${item.name} \u2014 ${formatCurrency(Number(item.price))}${stockInfo}\n`;
      if (item.description) text += `    ${item.description}\n`;
      text += `    [ID: ${item.id}]\n`;
    }
    text += '\n';
  }

  return text || 'O cardápio está vazio no momento.';
}

export async function handleAddToCart(
  tenantId: string,
  state: ChatState,
  args: { menuItemId: string; quantity?: number; notes?: string },
): Promise<{ text: string; state: ChatState }> {
  const item = await prisma.menuItem.findFirst({
    where: { id: args.menuItemId, category: { tenantId }, isPaused: false },
  });

  if (!item) {
    return { text: '❌ Item não encontrado no cardápio.', state };
  }

  const quantity = args.quantity || 1;
  // Check stock availability
  if (item.trackStock && item.stockQuantity < quantity) {
    if (item.stockQuantity === 0) {
      return { text: `\u274C "${item.name}" est\u00E1 esgotado no momento.`, state };
    }
    return {
      text: `\u26A0\uFE0F Estoque insuficiente para "${item.name}". Dispon\u00EDvel: ${item.stockQuantity} unidade(s).`,
      state,
    };
  }
  const existingIdx = state.cart.findIndex((c) => c.menuItemId === item.id);

  if (existingIdx >= 0) {
    state.cart[existingIdx].quantity += quantity;
    if (args.notes) state.cart[existingIdx].notes = args.notes;
  } else {
    state.cart.push({
      menuItemId: item.id,
      name: item.name,
      price: Number(item.price),
      quantity,
      notes: args.notes,
    });
  }

  state.step = 'cart';
  const total = state.cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return {
    text: `✅ ${quantity}x ${item.name} adicionado(s)!\nCarrinho: ${state.cart.length} item(ns) — Total: ${formatCurrency(total)}`,
    state,
  };
}

export async function handleRemoveFromCart(
  state: ChatState,
  args: { menuItemId: string },
): Promise<{ text: string; state: ChatState }> {
  const idx = state.cart.findIndex((c) => c.menuItemId === args.menuItemId);
  if (idx < 0) {
    return { text: '❌ Item não encontrado no carrinho.', state };
  }

  const removed = state.cart.splice(idx, 1)[0];
  if (state.cart.length === 0) state.step = 'browsing';

  return {
    text: `🗑️ ${removed.name} removido do carrinho.`,
    state,
  };
}

export function handleGetCartSummary(state: ChatState): string {
  if (state.cart.length === 0) return '🛒 Seu carrinho está vazio.';

  let text = '🛒 *Seu Carrinho:*\n';
  let total = 0;

  for (const item of state.cart) {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    text += `  • ${item.quantity}x ${item.name} — ${formatCurrency(subtotal)}\n`;
    if (item.notes) text += `    📝 ${item.notes}\n`;
  }

  text += `\n💰 *Total: ${formatCurrency(total)}*`;
  return text;
}

export async function handleSetDeliveryAddress(
  tenantId: string,
  state: ChatState,
  args: { address: string; reference?: string },
): Promise<{ text: string; state: ChatState; deliveryFee: number }> {
  state.address = args.address;
  state.addressRef = args.reference;
  state.step = 'payment';

  // Try to find matching delivery zone
  const zones = await prisma.deliveryZone.findMany({
    where: { tenantId, isActive: true },
    orderBy: { fee: 'asc' },
  });

  // Simple neighborhood matching
  let deliveryFee = 0;
  let matchedZone = false;
  const normalizedAddr = args.address.toLowerCase();

  for (const zone of zones) {
    if (normalizedAddr.includes(zone.name.toLowerCase())) {
      deliveryFee = Number(zone.fee);
      matchedZone = true;
      break;
    }
  }

  if (!matchedZone && zones.length > 0) {
    deliveryFee = Number(zones[zones.length - 1].fee); // highest fee as fallback
  }

  let text = `📍 Endereço: ${args.address}`;
  if (args.reference) text += `\n📌 Ref: ${args.reference}`;
  text += `\n🚚 Taxa de entrega: ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}`;
  text += `\n\nQual a forma de pagamento?\n💳 Crédito | 💳 Débito | 💵 Dinheiro | 📱 PIX`;

  return { text, state, deliveryFee };
}

export function handleSetPaymentMethod(
  state: ChatState,
  args: { method: string; changeFor?: number },
): { text: string; state: ChatState } {
  state.paymentMethod = args.method;
  state.step = 'confirm';

  if (args.method === 'CASH') {
    state.needsChange = true;
    if (args.changeFor) {
      state.changeFor = args.changeFor;
    } else {
      return {
        text: '💵 Pagamento em dinheiro. Troco pra quanto?',
        state,
      };
    }
  }

  const total = state.cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const methodLabels: Record<string, string> = {
    PIX: '📱 PIX',
    CREDIT_CARD: '💳 Crédito',
    DEBIT_CARD: '💳 Débito',
    CASH: '💵 Dinheiro',
  };

  let confirmText = '📋 *Confirme seu pedido:*\n\n';
  for (const item of state.cart) {
    confirmText += `  ${item.quantity}x ${item.name} — ${formatCurrency(item.price * item.quantity)}\n`;
  }
  confirmText += `\n💰 Total: ${formatCurrency(total)}`;
  confirmText += `\n📍 ${state.address}`;
  confirmText += `\n💳 ${methodLabels[args.method] || args.method}`;
  if (state.changeFor) confirmText += ` (troco p/ ${formatCurrency(state.changeFor)})`;
  confirmText += `\n\n✅ Confirmar? (Sim/Não)`;

  return { text: confirmText, state };
}

export async function handleCreateOrder(
  tenantId: string,
  customerPhone: string,
  state: ChatState,
  deliveryFee: number,
  args: { generalNotes?: string },
): Promise<{ text: string; orderId: string }> {
  // Find or create customer
  let customer = await prisma.customer.findFirst({
    where: { tenantId, phone: customerPhone },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: { tenantId, phone: customerPhone },
    });
  }

  const subtotal = state.cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const totalAmount = subtotal + deliveryFee;

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
  });

  // Get next order number
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  const orderNumber = generateOrderNumber(lastOrder?.orderNumber ?? 0);

  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: customer.id,
      orderNumber,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: (state.paymentMethod as any) || 'CASH',
      deliveryAddress: state.address,
      deliveryRef: state.addressRef,
      changeFor: state.changeFor,
      generalNotes: args.generalNotes || state.generalNotes,
      items: {
        create: state.cart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          notes: c.notes,
        })),
      },
      statusHistory: {
        create: {
          status: 'RECEIVED',
          note: 'Pedido criado via WhatsApp',
        },
      },
    },
    include: { items: true },
  });

  // Update customer stats
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: totalAmount },
      lastOrderAt: new Date(),
    },
  });

  const estimatedTime = tenant.estimatedDelivery || '40-60 min';

  const text =
    `✅ *Pedido #${orderNumber} criado com sucesso!*\n\n` +
    `💰 Total: ${formatCurrency(totalAmount)}\n` +
    `⏱️ Tempo estimado: ${estimatedTime}\n\n` +
    `Acompanhe o status por aqui. Obrigado pela preferência! 🙏`;

  return { text, orderId: order.id };
}

// ── Admin actions ───────────────────────────────────────────

export const adminTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'toggle_menu_item',
      description: 'Ativa ou desativa um item do cardápio',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: 'Nome do item' },
          active: { type: 'boolean', description: 'true para ativar, false para desativar' },
        },
        required: ['itemName', 'active'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pending_orders',
      description: 'Lista pedidos pendentes',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_order_status',
      description: 'Atualiza status de um pedido',
      parameters: {
        type: 'object',
        properties: {
          orderNumber: { type: 'string', description: 'Número do pedido' },
          status: {
            type: 'string',
            enum: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
          },
        },
        required: ['orderNumber', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_delivery_time',
      description: 'Altera o tempo estimado de entrega',
      parameters: {
        type: 'object',
        properties: {
          minutes: { type: 'number', description: 'Tempo em minutos' },
        },
        required: ['minutes'],
      },
    },
  },
];

export async function handleToggleMenuItem(
  tenantId: string,
  args: { itemName: string; active: boolean },
): Promise<string> {
  const item = await prisma.menuItem.findFirst({
    where: {
      category: { tenantId },
      name: { contains: args.itemName, mode: 'insensitive' },
    },
  });

  if (!item) return `❌ Item "${args.itemName}" não encontrado.`;

  await prisma.menuItem.update({
    where: { id: item.id },
    data: { isPaused: !args.active },
  });

  return `${args.active ? '✅' : '⏸️'} "${item.name}" ${args.active ? 'ativado' : 'desativado'} com sucesso.`;
}

export async function handleListPendingOrders(tenantId: string): Promise<string> {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ['RECEIVED', 'PREPARING'] },
    },
    include: { customer: true, items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (orders.length === 0) return '✅ Nenhum pedido pendente!';

  const statusEmoji: Record<string, string> = {
    RECEIVED: '🟡',
    PREPARING: '🟠',
  };

  let text = `📋 *Pedidos Pendentes (${orders.length}):*\n\n`;
  for (const order of orders) {
    text += `${statusEmoji[order.status] || '⚪'} #${order.orderNumber} — ${formatCurrency(Number(order.totalAmount))}\n`;
    text += `  📱 ${order.customer.name || order.customer.phone}\n`;
    for (const item of order.items) {
      text += `  • ${item.quantity}x ${item.menuItem.name}\n`;
    }
    text += '\n';
  }

  return text;
}

export async function handleUpdateOrderStatus(
  tenantId: string,
  args: { orderNumber: string; status: string },
): Promise<string> {
  const order = await prisma.order.findFirst({
    where: { tenantId, orderNumber: parseInt(args.orderNumber) || 0 },
  });

  if (!order) return `❌ Pedido #${args.orderNumber} não encontrado.`;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: args.status as any },
  });

  await prisma.orderStatusHistory.create({
    data: { orderId: order.id, status: args.status as any, note: 'Atualizado via WhatsApp' },
  });

  const labels: Record<string, string> = {
    CONFIRMED: 'Confirmado',
    PREPARING: 'Em preparo',
    READY: 'Pronto',
    OUT_FOR_DELIVERY: 'Saiu para entrega',
    DELIVERED: 'Entregue',
  };

  return `✅ Pedido #${args.orderNumber} atualizado para: ${labels[args.status] || args.status}`;
}

export async function handleSetDeliveryTime(
  tenantId: string,
  args: { minutes: number },
): Promise<string> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { estimatedDelivery: `${args.minutes} min` },
  });
  return `✅ Tempo estimado de entrega atualizado para ${args.minutes} minutos.`;
}

// ── Additional customer actions ─────────────────────────────

export async function handleGetLastOrder(
  tenantId: string,
  customerPhone: string,
): Promise<string> {
  const customer = await prisma.customer.findFirst({
    where: { tenantId, phone: customerPhone },
  });

  if (!customer) return '📦 Você ainda não fez nenhum pedido conosco.';

  const lastOrder = await prisma.order.findFirst({
    where: { tenantId, customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { menuItem: true } } },
  });

  if (!lastOrder) return '📦 Você ainda não fez nenhum pedido conosco.';

  const statusLabels: Record<string, string> = {
    RECEIVED: '🟡 Recebido',
    PREPARING: '🟠 Em preparo',
    OUT_FOR_DELIVERY: '🚚 Saiu para entrega',
    DELIVERED: '✅ Entregue',
    CANCELLED: '❌ Cancelado',
  };

  let text = `📦 *Último Pedido #${lastOrder.orderNumber}*\n`;
  text += `Status: ${statusLabels[lastOrder.status] || lastOrder.status}\n`;
  text += `Data: ${lastOrder.createdAt.toLocaleDateString('pt-BR')}\n\n`;

  for (const item of lastOrder.items) {
    text += `  • ${item.quantity}x ${item.menuItem.name}\n`;
  }
  text += `\n💰 Total: ${formatCurrency(Number(lastOrder.totalAmount))}`;
  text += `\n\nDeseja repetir este pedido?`;

  return text;
}

export async function handleCheckStoreHours(tenantId: string): Promise<string> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const hours = await prisma.operatingHour.findUnique({
    where: { tenantId_dayOfWeek: { tenantId, dayOfWeek } },
  });

  if (!hours || !hours.isOpen) {
    // Find next open day
    const allHours = await prisma.operatingHour.findMany({
      where: { tenantId, isOpen: true },
      orderBy: { dayOfWeek: 'asc' },
    });

    if (allHours.length === 0) return '⚠️ A loja não possui horários de funcionamento cadastrados.';

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const nextOpen = allHours.find((h) => h.dayOfWeek > dayOfWeek) || allHours[0];
    return `🔴 Estamos fechados agora. Próximo horário: ${dayNames[nextOpen.dayOfWeek]} das ${nextOpen.openTime} às ${nextOpen.closeTime}.`;
  }

  // Check if within hours
  const { openTime, closeTime } = hours;
  let isOpen = false;
  if (openTime <= closeTime) {
    isOpen = currentTime >= openTime && currentTime <= closeTime;
  } else {
    isOpen = currentTime >= openTime || currentTime <= closeTime;
  }

  if (isOpen) {
    return `🟢 Estamos abertos! Horário de hoje: ${openTime} às ${closeTime}.`;
  }

  return `🔴 Estamos fechados agora. Horário de hoje: ${openTime} às ${closeTime}.`;
}
