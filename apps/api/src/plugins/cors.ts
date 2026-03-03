import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default fp(async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: [
      env.ADMIN_URL,
      env.MASTER_URL,
      env.MENU_URL,
      env.LANDING_URL,
      /\.pedirei\.online$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  });
});
