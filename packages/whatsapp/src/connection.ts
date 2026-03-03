import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import Redis from 'ioredis';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '@pedirei/database';
import type { ConnectionStatus, MessageHandler } from './types.js';
import { handleIncomingMessage } from './message-handler.js';
import { sendMessage, formatJid, sendPresence, markAsRead } from './sender.js';

const logger = pino({ level: 'warn' });

// Active connections map
const connections = new Map<string, {
  sock: any;
  status: ConnectionStatus;
}>();

// Event listeners
const statusListeners = new Set<(status: ConnectionStatus) => void>();

export function onStatusChange(listener: (status: ConnectionStatus) => void) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function emitStatus(status: ConnectionStatus) {
  for (const listener of statusListeners) {
    try { listener(status); } catch { /* ignore */ }
  }
}

/**
 * Connect WhatsApp for a tenant
 */
export async function connectWhatsApp(
  tenantId: string,
  messageHandler: MessageHandler,
  authDir?: string,
): Promise<ConnectionStatus> {
  // If already connected, return status
  const existing = connections.get(tenantId);
  if (existing?.sock?.user) {
    return existing.status;
  }

  // Disconnect if a stale connection exists
  if (existing) {
    try { existing.sock?.end(); } catch { /* ignore */ }
    connections.delete(tenantId);
  }

  const sessDir = authDir || path.join(process.cwd(), '.wa-sessions', tenantId);
  if (!fs.existsSync(sessDir)) {
    fs.mkdirSync(sessDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Pedirei.Online', 'Chrome', '22.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  const status: ConnectionStatus = {
    tenantId,
    status: 'connecting',
  };

  connections.set(tenantId, { sock, status });
  emitStatus(status);

  // Connection update events
  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      status.status = 'qr';
      status.qrCode = await QRCode.toDataURL(qr);
      emitStatus(status);
    }

    if (connection === 'open') {
      status.status = 'open';
      status.qrCode = undefined;
      status.phone = sock.user?.id?.split(':')[0] || undefined;
      status.name = sock.user?.name || undefined;
      status.lastSeen = new Date();
      emitStatus(status);

      // Save connection info in DB
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          whatsappStatus: 'CONNECTED',
        },
      });
    }

    if (connection === 'close') {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      status.status = 'close';
      emitStatus(status);

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappStatus: 'DISCONNECTED' },
      }).catch(() => { /* ignore */ });

      connections.delete(tenantId);

      // Reconnect unless logged out
      if (reason !== DisconnectReason.loggedOut) {
        setTimeout(() => {
          connectWhatsApp(tenantId, messageHandler, authDir);
        }, 5000);
      } else {
        // Clean session on logout
        try {
          fs.rmSync(sessDir, { recursive: true, force: true });
        } catch { /* ignore */ }
      }
    }
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (upsert: any) => {
    if (upsert.type !== 'notify') return;

    for (const msg of upsert.messages) {
      try {
        // Show typing
        if (msg.key.remoteJid && !msg.key.fromMe) {
          await sendPresence(sock, msg.key.remoteJid, 'composing');
        }

        const reply = await handleIncomingMessage(tenantId, msg, messageHandler);

        if (reply && msg.key.remoteJid) {
          await sendMessage(sock, {
            to: msg.key.remoteJid,
            text: reply,
          });
          await markAsRead(sock, msg.key);
          await sendPresence(sock, msg.key.remoteJid, 'available');
        }
      } catch (err) {
        console.error(`[WA ${tenantId}] Error handling message:`, err);
      }
    }
  });

  return status;
}

/**
 * Disconnect WhatsApp for a tenant
 */
export async function disconnectWhatsApp(tenantId: string): Promise<void> {
  const conn = connections.get(tenantId);
  if (conn) {
    try {
      await conn.sock.logout();
    } catch {
      conn.sock.end();
    }
    connections.delete(tenantId);
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { whatsappStatus: 'DISCONNECTED' },
  }).catch(() => { /* ignore */ });
}

/**
 * Get connection status for a tenant
 */
export function getConnectionStatus(tenantId: string): ConnectionStatus {
  const conn = connections.get(tenantId);
  return conn?.status || { tenantId, status: 'close' };
}

/**
 * Get all active connections
 */
export function getAllConnections(): ConnectionStatus[] {
  return Array.from(connections.values()).map((c) => c.status);
}

/**
 * Send a text message from a tenant's WhatsApp
 */
export async function sendWhatsAppMessage(
  tenantId: string,
  to: string,
  text: string,
): Promise<boolean> {
  const conn = connections.get(tenantId);
  if (!conn || conn.status.status !== 'open') return false;

  try {
    await sendMessage(conn.sock, { to, text });
    return true;
  } catch (err) {
    console.error(`[WA ${tenantId}] Send error:`, err);
    return false;
  }
}

/**
 * Reconnect all active tenants on startup
 */
export async function reconnectAllTenants(messageHandler: MessageHandler): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, whatsappStatus: 'CONNECTED' },
    select: { id: true },
  });

  for (const tenant of tenants) {
    try {
      await connectWhatsApp(tenant.id, messageHandler);
    } catch (err) {
      console.error(`[WA] Failed to reconnect tenant ${tenant.id}:`, err);
    }
  }
}
