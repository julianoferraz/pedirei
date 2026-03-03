import { redis } from '../config/redis.js';
import { prisma } from '@pedirei/database';
import { SESSION_TTL_SECONDS } from '@pedirei/shared';

export interface ChatState {
  step: 'greeting' | 'browsing' | 'cart' | 'address' | 'payment' | 'confirm' | 'feedback';
  cart: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }>;
  address?: string;
  addressRef?: string;
  paymentMethod?: string;
  needsChange?: boolean;
  changeFor?: number;
  generalNotes?: string;
  lastOrderId?: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const DEFAULT_STATE: ChatState = {
  step: 'greeting',
  cart: [],
  messageHistory: [],
};

function sessionKey(tenantId: string, phone: string) {
  return `chat:${tenantId}:${phone}`;
}

export async function getSession(tenantId: string, phone: string): Promise<ChatState> {
  const key = sessionKey(tenantId, phone);
  const data = await redis.get(key);
  if (data) {
    await redis.expire(key, SESSION_TTL_SECONDS);
    return JSON.parse(data);
  }
  return { ...DEFAULT_STATE, cart: [], messageHistory: [] };
}

export async function saveSession(tenantId: string, phone: string, state: ChatState) {
  const key = sessionKey(tenantId, phone);
  await redis.setex(key, SESSION_TTL_SECONDS, JSON.stringify(state));

  // Also persist in DB
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.chatSession.upsert({
    where: { tenantId_customerPhone: { tenantId, customerPhone: phone } },
    update: { state: state as any, lastMessage: new Date(), expiresAt },
    create: { tenantId, customerPhone: phone, state: state as any, expiresAt },
  });
}

export async function clearSession(tenantId: string, phone: string) {
  const key = sessionKey(tenantId, phone);
  await redis.del(key);
  await prisma.chatSession.deleteMany({
    where: { tenantId, customerPhone: phone },
  });
}
