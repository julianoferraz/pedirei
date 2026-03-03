export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const PLAN_SLUGS = {
  FREE: 'gratuito',
  ESSENTIAL: 'essencial',
  PROFESSIONAL: 'profissional',
  BUSINESS: 'negocio',
} as const;

export const DEFAULT_MESSAGES = {
  received: 'Pedido recebido! Estamos preparando.',
  preparing: 'Seu pedido está sendo preparado!',
  outDelivery: 'Seu pedido saiu para entrega!',
  delivered: 'Pedido entregue! Obrigado pela preferência!',
  storeClosed: 'No momento estamos fechados. Nossos horários de funcionamento são:',
  feedbackRequest: 'Olá! Como foi seu pedido? Dê uma nota de 1 a 5 e deixe um comentário se quiser 😊',
};

export const SESSION_TTL_SECONDS = 1800; // 30 min
export const FEEDBACK_DELAY_MIN = 120;
export const REENGAGE_DEFAULT_DAYS = 30;
export const MAX_RECONNECT_ATTEMPTS = 5;
export const RECONNECT_INTERVAL_MS = 30000;

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
