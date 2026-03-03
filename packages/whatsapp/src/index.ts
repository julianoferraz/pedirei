export {
  connectWhatsApp,
  disconnectWhatsApp,
  getConnectionStatus,
  getAllConnections,
  sendWhatsAppMessage,
  reconnectAllTenants,
  onStatusChange,
} from './connection.js';

export { sendMessage, formatJid, extractPhone, markAsRead, sendPresence } from './sender.js';
export { handleIncomingMessage } from './message-handler.js';

export type {
  WhatsAppMessage,
  WhatsAppSendOptions,
  ConnectionStatus,
  MessageHandler,
} from './types.js';
