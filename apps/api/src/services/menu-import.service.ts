import OpenAI from 'openai';
import { prisma, Prisma } from '@pedirei/database';
import { getOpenAIClient } from './openai.service.js';
import { NotFoundError } from '../utils/errors.js';
import { env } from '../config/env.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportedCategory {
  name: string;
  description?: string;
  items: ImportedItem[];
}

export interface ImportedItem {
  name: string;
  description?: string;
  price: number;
}

export interface MenuImportResult {
  categories: ImportedCategory[];
  totalItems: number;
  savedCategories: number;
  savedItems: number;
  errors: string[];
}

// ─── AI Image → Menu ─────────────────────────────────────────────────────────

const MENU_EXTRACTION_PROMPT = `Você é um especialista em extrair cardápios de restaurantes a partir de imagens.
Analise a imagem fornecida e extraia TODOS os itens do cardápio.

Retorne um JSON válido no seguinte formato:
{
  "categories": [
    {
      "name": "Nome da categoria",
      "description": "Descrição opcional",
      "items": [
        {
          "name": "Nome do item",
          "description": "Descrição do item se houver",
          "price": 29.90
        }
      ]
    }
  ]
}

Regras:
- Se não houver categorias visíveis, agrupe por tipo (Entradas, Pratos, Bebidas, Sobremesas)
- Preços devem ser números decimais (ex: 29.90, não "R$ 29,90")
- Se o preço não for legível, coloque 0.00
- Se a descrição não existir, omita o campo
- Extraia TODOS os itens visíveis, mesmo que parcialmente legíveis
- Nomes devem estar em português
- Retorne APENAS o JSON, sem markdown ou explicações`;

const MENU_TEXT_EXTRACTION_PROMPT = `Você é um especialista em estruturar cardápios de restaurantes.
O usuário vai fornecer o texto de um cardápio (possivelmente copiado de PDF, site, ou digitado).
Organize os itens em categorias e extraia nome, descrição e preço.

Retorne um JSON válido no seguinte formato:
{
  "categories": [
    {
      "name": "Nome da categoria",
      "description": "Descrição opcional",
      "items": [
        {
          "name": "Nome do item",
          "description": "Descrição do item se houver",
          "price": 29.90
        }
      ]
    }
  ]
}

Regras:
- Se não houver categorias claras, agrupe por tipo (Entradas, Pratos Principais, Bebidas, Sobremesas, etc.)
- Preços devem ser números decimais (ex: 29.90)
- Se o preço não for encontrado, coloque 0.00
- Extraia TODOS os itens
- Retorne APENAS o JSON, sem markdown ou explicações`;

/**
 * Extract menu from image(s) using GPT-4o vision
 */
export async function extractMenuFromImage(
  tenantId: string,
  imagePaths: string[],
): Promise<ImportedCategory[]> {
  const client = await getOpenAIClient(tenantId);

  const imageContents: OpenAI.Chat.ChatCompletionContentPart[] = [];

  for (const imagePath of imagePaths) {
    const absolutePath = imagePath.startsWith('/')
      ? imagePath
      : join(env.UPLOAD_DIR || 'uploads', imagePath);

    const imageBuffer = await readFile(absolutePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = getMimeType(imagePath);

    imageContents.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: 'high',
      },
    });
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: MENU_EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extraia o cardápio completo ${imagePaths.length > 1 ? `das ${imagePaths.length} imagens` : 'da imagem'} a seguir:`,
          },
          ...imageContents,
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  // Track usage
  if (response.usage) {
    await prisma.aiUsageLog.create({
      data: {
        tenantId,
        model: 'gpt-4o',
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        costEstimate: estimateVisionCost(response.usage.prompt_tokens, response.usage.completion_tokens),
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { aiMonthlyTokens: { increment: response.usage.total_tokens } },
    });
  }

  const content = response.choices[0]?.message?.content || '';
  return parseMenuJSON(content);
}

/**
 * Extract menu from raw text using GPT-4.1-mini
 */
export async function extractMenuFromText(
  tenantId: string,
  menuText: string,
): Promise<ImportedCategory[]> {
  const client = await getOpenAIClient(tenantId);

  const response = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: MENU_TEXT_EXTRACTION_PROMPT },
      { role: 'user', content: menuText },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  if (response.usage) {
    await prisma.aiUsageLog.create({
      data: {
        tenantId,
        model: 'gpt-4.1-mini',
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        costEstimate: estimateTextCost(response.usage.prompt_tokens, response.usage.completion_tokens),
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { aiMonthlyTokens: { increment: response.usage.total_tokens } },
    });
  }

  const content = response.choices[0]?.message?.content || '';
  return parseMenuJSON(content);
}

/**
 * Save extracted menu to database
 */
export async function saveImportedMenu(
  tenantId: string,
  categories: ImportedCategory[],
  options: {
    replaceExisting?: boolean;
    mergeCategories?: boolean;
  } = {},
): Promise<MenuImportResult> {
  const errors: string[] = [];
  let savedCategories = 0;
  let savedItems = 0;
  let totalItems = 0;

  // Count total items
  for (const cat of categories) {
    totalItems += cat.items.length;
  }

  // If replace, delete existing menu
  if (options.replaceExisting) {
    await prisma.$transaction([
      prisma.menuItem.deleteMany({ where: { tenantId } }),
      prisma.category.deleteMany({ where: { tenantId } }),
    ]);
  }

  // Get existing categories for merge
  const existingCategories = options.mergeCategories
    ? await prisma.category.findMany({ where: { tenantId } })
    : [];

  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const cat = categories[catIdx];

    try {
      // Find existing or create category
      let categoryId: string;

      if (options.mergeCategories) {
        const existing = existingCategories.find(
          (ec: { name: string; id: string }) => ec.name.toLowerCase() === cat.name.toLowerCase(),
        );
        if (existing) {
          categoryId = existing.id;
        } else {
          const created = await prisma.category.create({
            data: {
              name: cat.name,
              description: cat.description || null,
              tenantId,
              sortOrder: existingCategories.length + catIdx,
            },
          });
          categoryId = created.id;
          savedCategories++;
        }
      } else {
        const created = await prisma.category.create({
          data: {
            name: cat.name,
            description: cat.description || null,
            tenantId,
            sortOrder: catIdx,
          },
        });
        categoryId = created.id;
        savedCategories++;
      }

      // Create items
      for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
        const item = cat.items[itemIdx];

        try {
          await prisma.menuItem.create({
            data: {
              name: item.name,
              description: item.description || null,
              price: new Prisma.Decimal(item.price || 0),
              categoryId,
              tenantId,
              sortOrder: itemIdx,
              isPaused: false,
            },
          });
          savedItems++;
        } catch (err) {
          errors.push(`Erro ao salvar item "${item.name}": ${(err as Error).message}`);
        }
      }
    } catch (err) {
      errors.push(`Erro ao criar categoria "${cat.name}": ${(err as Error).message}`);
    }
  }

  return {
    categories,
    totalItems,
    savedCategories,
    savedItems,
    errors,
  };
}

// ─── Import from URL (fetches image) ────────────────────────────────────────

export async function extractMenuFromUrl(
  tenantId: string,
  imageUrl: string,
): Promise<ImportedCategory[]> {
  const client = await getOpenAIClient(tenantId);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: MENU_EXTRACTION_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extraia o cardápio completo da imagem a seguir:',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'high' },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  if (response.usage) {
    await prisma.aiUsageLog.create({
      data: {
        tenantId,
        model: 'gpt-4o',
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        costEstimate: estimateVisionCost(response.usage.prompt_tokens, response.usage.completion_tokens),
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { aiMonthlyTokens: { increment: response.usage.total_tokens } },
    });
  }

  const content = response.choices[0]?.message?.content || '';
  return parseMenuJSON(content);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMenuJSON(text: string): ImportedCategory[] {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new Error('JSON inválido: campo "categories" não encontrado');
    }

    // Validate and clean
    return parsed.categories.map((cat: any) => ({
      name: String(cat.name || 'Sem Categoria').trim(),
      description: cat.description ? String(cat.description).trim() : undefined,
      items: Array.isArray(cat.items)
        ? cat.items.map((item: any) => ({
            name: String(item.name || 'Item sem nome').trim(),
            description: item.description ? String(item.description).trim() : undefined,
            price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          }))
        : [],
    }));
  } catch (err) {
    throw new Error(`Falha ao interpretar resposta da IA: ${(err as Error).message}`);
  }
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function estimateVisionCost(promptTokens: number, completionTokens: number): number {
  // GPT-4o pricing: $2.50/1M input, $10.00/1M output
  return (promptTokens * 2.5 + completionTokens * 10.0) / 1_000_000;
}

function estimateTextCost(promptTokens: number, completionTokens: number): number {
  // GPT-4.1-mini pricing: $0.40/1M input, $1.60/1M output
  return (promptTokens * 0.4 + completionTokens * 1.6) / 1_000_000;
}
