import { chatCompletion } from '../services/openai.service.js';
import { buildFeedbackPrompt } from './chatbot.prompts.js';

export interface FeedbackResult {
  rating: number | null;
  comment: string;
}

export async function parseFeedback(
  message: string,
  tenantId: string,
): Promise<FeedbackResult> {
  // Try simple numeric extraction first
  const numMatch = message.match(/\b([1-5])\b/);
  if (numMatch) {
    return {
      rating: parseInt(numMatch[1]),
      comment: message,
    };
  }

  // Use AI for complex feedback
  try {
    const response = await chatCompletion(
      [
        { role: 'system', content: buildFeedbackPrompt() },
        { role: 'user', content: message },
      ],
      {
        tenantId,
        temperature: 0.3,
        maxTokens: 200,
      },
    );

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);
    return {
      rating: parsed.rating || null,
      comment: parsed.comment || message,
    };
  } catch {
    return { rating: null, comment: message };
  }
}
