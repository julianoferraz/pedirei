import type { proto } from '@whiskeysockets/baileys';
import type { WhatsAppMessage, MessageHandler } from './types.js';
import { extractPhone } from './sender.js';
import { prisma } from '@pedirei/database';

/**
 * Process incoming Baileys message and route to handler
 */
export async function handleIncomingMessage(
  tenantId: string,
  msg: proto.IWebMessageInfo,
  handler: MessageHandler,
): Promise<string | void> {
  // Ignore status messages and group messages
  if (!msg.message || !msg.key.remoteJid) return;
  if (msg.key.fromMe) return;
  if (msg.key.remoteJid.endsWith('@g.us')) return; // groups
  if (msg.key.remoteJid === 'status@broadcast') return;

  const parsed = parseMessage(msg);
  if (!parsed) return;

  // Log incoming message
  await prisma.whatsappLog.create({
    data: {
      tenantId,
      direction: 'inbound',
      phone: parsed.phone,
      messageType: parsed.type,
      content: (parsed.body || parsed.caption || '').substring(0, 5000),
    },
  });

  // Route to handler
  return handler(tenantId, parsed);
}

/**
 * Parse Baileys message proto into our message type
 */
function parseMessage(msg: proto.IWebMessageInfo): WhatsAppMessage | null {
  const jid = msg.key.remoteJid!;
  const phone = extractPhone(jid);
  const timestamp = typeof msg.messageTimestamp === 'number'
    ? msg.messageTimestamp
    : Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000);
  const pushName = msg.pushName || undefined;
  const messageId = msg.key.id || '';

  const m = msg.message!;

  // Text message
  if (m.conversation || m.extendedTextMessage?.text) {
    return {
      from: jid,
      phone,
      body: m.conversation || m.extendedTextMessage!.text || '',
      type: 'text',
      pushName,
      timestamp,
      messageId,
    };
  }

  // Image
  if (m.imageMessage) {
    return {
      from: jid,
      phone,
      body: m.imageMessage.caption || '',
      caption: m.imageMessage.caption || undefined,
      type: 'image',
      pushName,
      timestamp,
      messageId,
    };
  }

  // Audio
  if (m.audioMessage) {
    return {
      from: jid,
      phone,
      body: '[Áudio]',
      type: 'audio',
      pushName,
      timestamp,
      messageId,
    };
  }

  // Document
  if (m.documentMessage) {
    return {
      from: jid,
      phone,
      body: m.documentMessage.fileName || '[Documento]',
      type: 'document',
      pushName,
      timestamp,
      messageId,
    };
  }

  // Location
  if (m.locationMessage) {
    return {
      from: jid,
      phone,
      body: `[Localização: ${m.locationMessage.degreesLatitude}, ${m.locationMessage.degreesLongitude}]`,
      type: 'location',
      latitude: m.locationMessage.degreesLatitude || undefined,
      longitude: m.locationMessage.degreesLongitude || undefined,
      pushName,
      timestamp,
      messageId,
    };
  }

  // Sticker
  if (m.stickerMessage) {
    return {
      from: jid,
      phone,
      body: '[Sticker]',
      type: 'sticker',
      pushName,
      timestamp,
      messageId,
    };
  }

  return null;
}
