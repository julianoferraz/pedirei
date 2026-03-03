import OpenAI from 'openai';
import { prisma } from '@pedirei/database';
import { env } from '../config/env.js';
import { decrypt } from './encryption.service.js';

export async function getOpenAIClient(tenantId?: string): Promise<OpenAI> {
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiMode: true, tenantOpenaiKey: true },
    });

    if (tenant?.aiMode === 'TENANT_KEY' && tenant.tenantOpenaiKey) {
      return new OpenAI({ apiKey: decrypt(tenant.tenantOpenaiKey) });
    }
  }

  return new OpenAI({ apiKey: env.OPENAI_API_KEY || '' });
}

export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: {
    model?: string;
    tools?: OpenAI.Chat.ChatCompletionTool[];
    tenantId?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
) {
  const client = await getOpenAIClient(options.tenantId);
  const model = options.model || 'gpt-4.1-mini';

  const response = await client.chat.completions.create({
    model,
    messages,
    tools: options.tools,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  });

  if (options.tenantId) {
    const usage = response.usage;
    if (usage) {
      await prisma.aiUsageLog.create({
        data: {
          tenantId: options.tenantId,
          model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          costEstimate: estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
        },
      });

      await prisma.tenant.update({
        where: { id: options.tenantId },
        data: { aiMonthlyTokens: { increment: usage.total_tokens } },
      });
    }
  }

  return response;
}

function estimateCost(model: string, prompt: number, completion: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4.1': { input: 0.002, output: 0.008 },
  };
  const rate = rates[model] || rates['gpt-4.1-mini'];
  return (prompt / 1000) * rate.input + (completion / 1000) * rate.output;
}
