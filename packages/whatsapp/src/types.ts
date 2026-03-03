export interface WhatsAppMessage {
  from: string; // phone number (jid format: 5511999999999@s.whatsapp.net)
  phone: string; // clean phone number
  body: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'sticker' | 'unknown';
  mediaUrl?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  pushName?: string;
  timestamp: number;
  messageId: string;
}

export interface WhatsAppSendOptions {
  to: string;
  text?: string;
  image?: Buffer | string;
  caption?: string;
  buttons?: Array<{ id: string; text: string }>;
  listTitle?: string;
  listSections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface ConnectionStatus {
  tenantId: string;
  status: 'connecting' | 'open' | 'close' | 'qr';
  qrCode?: string; // base64 data URI
  phone?: string;
  name?: string;
  lastSeen?: Date;
}

export type MessageHandler = (
  tenantId: string,
  message: WhatsAppMessage,
) => Promise<string | void>;
