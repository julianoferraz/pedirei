import type { WhatsAppSendOptions } from './types.js';

/**
 * Send a WhatsApp message via the Baileys socket.
 * The socket is passed in to avoid circular deps with connection manager.
 */
export async function sendMessage(sock: any, options: WhatsAppSendOptions): Promise<void> {
  const jid = formatJid(options.to);

  if (options.image) {
    await sock.sendMessage(jid, {
      image: typeof options.image === 'string' ? { url: options.image } : options.image,
      caption: options.caption || options.text || '',
    });
    return;
  }

  if (options.text) {
    await sock.sendMessage(jid, { text: options.text });
    return;
  }
}

/**
 * Format phone number to WhatsApp JID
 */
export function formatJid(phone: string): string {
  // Remove all non-digit chars
  const clean = phone.replace(/\D/g, '');

  // If already has @s.whatsapp.net, return as is
  if (phone.includes('@s.whatsapp.net')) return phone;

  return `${clean}@s.whatsapp.net`;
}

/**
 * Extract clean phone number from JID
 */
export function extractPhone(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');
}

/**
 * Mark message as read
 */
export async function markAsRead(sock: any, messageKey: any): Promise<void> {
  try {
    await sock.readMessages([messageKey]);
  } catch {
    // ignore read receipt errors
  }
}

/**
 * Send "typing" indicator
 */
export async function sendPresence(
  sock: any,
  jid: string,
  type: 'composing' | 'available' | 'unavailable' = 'composing',
): Promise<void> {
  try {
    await sock.sendPresenceUpdate(type, formatJid(jid));
  } catch {
    // ignore presence errors
  }
}
