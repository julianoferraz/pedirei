import { prisma } from '@pedirei/database';
import { chatCompletion } from '../../services/openai.service.js';

/**
 * Get frequently ordered together items (co-purchase analysis).
 * Pure data-driven — no AI needed, just SQL aggregation.
 */
export async function getCoOrderedItems(tenantId: string, itemIds: string[], limit = 4) {
  if (itemIds.length === 0) return [];

  // Find orders that contain any of the given items, then find other items in those orders
  const results = await prisma.$queryRaw<
    Array<{ menuItemId: string; name: string; price: number; imageUrl: string | null; coCount: number }>
  >`
    SELECT oi2."menuItemId", oi2."name", CAST(oi2."price" AS FLOAT) as price,
           mi."imageUrl", COUNT(DISTINCT oi2."orderId") as "coCount"
    FROM "OrderItem" oi1
    JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId"
      AND oi2."menuItemId" != oi1."menuItemId"
    JOIN "Order" o ON o."id" = oi1."orderId" AND o."tenantId" = ${tenantId}
      AND o."status" != 'CANCELLED'
    LEFT JOIN "MenuItem" mi ON mi."id" = oi2."menuItemId"
    WHERE oi1."menuItemId" IN (${itemIds.join(',')})
      AND mi."isPaused" = false
    GROUP BY oi2."menuItemId", oi2."name", oi2."price", mi."imageUrl"
    ORDER BY "coCount" DESC
    LIMIT ${limit}
  `.catch(() => []);

  return results;
}

/**
 * Get popular items for a tenant (fallback when no co-purchase data).
 */
export async function getPopularItems(tenantId: string, excludeIds: string[], limit = 4) {
  const items = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: {
      order: { tenantId, status: { not: 'CANCELLED' } },
      menuItemId: { notIn: excludeIds },
    },
    _count: { menuItemId: true },
    orderBy: { _count: { menuItemId: 'desc' } },
    take: limit,
  });

  if (items.length === 0) return [];

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: items.map((i) => i.menuItemId) },
      isPaused: false,
    },
    select: { id: true, name: true, price: true, imageUrl: true },
  });

  return items
    .map((item) => {
      const mi = menuItems.find((m) => m.id === item.menuItemId);
      if (!mi) return null;
      return { menuItemId: mi.id, name: mi.name, price: Number(mi.price), imageUrl: mi.imageUrl };
    })
    .filter(Boolean);
}

/**
 * Get smart suggestions for items in the cart.
 * Uses co-purchase data first, falls back to popular items.
 */
export async function getSuggestions(tenantId: string, cartItemIds: string[]) {
  // Try co-purchase suggestions first
  let suggestions = await getCoOrderedItems(tenantId, cartItemIds, 4);

  // Fall back to popular items if not enough co-purchase data
  if (suggestions.length < 2) {
    const popular = await getPopularItems(tenantId, cartItemIds, 4);
    suggestions = popular as any;
  }

  return suggestions;
}

/**
 * AI: Generate a menu item description.
 */
export async function generateItemDescription(
  tenantId: string,
  data: { itemName: string; category?: string; ingredients?: string; style?: string },
) {
  const styleGuides: Record<string, string> = {
    casual: 'Tom informal e convidativo, como um restaurante de bairro.',
    gourmet: 'Tom sofisticado e descritivo, valorizando ingredientes e técnicas.',
    'fast-food': 'Tom direto e apetitoso, focando no sabor e praticidade.',
  };

  const response = await chatCompletion(
    [
      {
        role: 'system',
        content: `Você é um copywriter especialista em cardápios de restaurantes brasileiros. ${styleGuides[data.style || 'casual']} Escreva descrições curtas (1-2 frases, máximo 120 caracteres) que aumentam o apetite do cliente.`,
      },
      {
        role: 'user',
        content: `Gere uma descrição para o item "${data.itemName}"${data.category ? ` da categoria "${data.category}"` : ''}${data.ingredients ? `. Ingredientes: ${data.ingredients}` : ''}. Responda APENAS com a descrição, sem aspas.`,
      },
    ],
    { tenantId, temperature: 0.8, maxTokens: 100 },
  );

  return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * AI: Analyze menu prices and suggest optimizations.
 */
export async function analyzePrices(tenantId: string, categoryId?: string) {
  const where: any = { tenantId, isPaused: false };
  if (categoryId) where.categoryId = categoryId;

  const items = await prisma.menuItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      price: true,
      category: { select: { name: true } },
    },
    orderBy: { price: 'asc' },
    take: 50,
  });

  if (items.length < 3) {
    return { insights: [], summary: 'Poucos itens para análise. Adicione mais itens ao cardápio.' };
  }

  const menuSummary = items
    .map((i) => `- ${i.name} (${i.category.name}): R$ ${Number(i.price).toFixed(2)}`)
    .join('\n');

  const response = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'Você é um consultor de precificação para restaurantes brasileiros. Analise o cardápio e dê insights práticos e concisos sobre precificação. Responda em JSON: { "insights": [{ "item": "nome", "suggestion": "texto curto" }], "summary": "resumo geral em 1-2 frases" }',
      },
      {
        role: 'user',
        content: `Analise os preços deste cardápio e sugira otimizações:\n\n${menuSummary}`,
      },
    ],
    { tenantId, temperature: 0.5, maxTokens: 500 },
  );

  try {
    const text = response.choices[0]?.message?.content || '{}';
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { insights: [], summary: 'Não foi possível gerar análise.' };
  }
}

/**
 * AI: Generate upsell phrase for cart context (used server-side, cached).
 */
export async function generateUpsellText(
  tenantId: string,
  cartItems: string[],
  suggestedItem: string,
) {
  const response = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'Você gera frases curtas de upsell (máximo 60 chars) para cardápios digitais. Tom casual e amigável. Sem emojis excessivos, máximo 1. Responda APENAS com a frase.',
      },
      {
        role: 'user',
        content: `O cliente tem no carrinho: ${cartItems.join(', ')}. Sugira "${suggestedItem}" com uma frase curta de complemento.`,
      },
    ],
    { tenantId, temperature: 0.9, maxTokens: 50 },
  );

  return response.choices[0]?.message?.content?.trim() || `Que tal adicionar ${suggestedItem}?`;
}
