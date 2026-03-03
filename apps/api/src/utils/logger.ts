import pino from 'pino';
import type { FastifyBaseLogger } from 'fastify';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export function createLogger(base: FastifyBaseLogger, context: string) {
  return base.child({ context });
}
