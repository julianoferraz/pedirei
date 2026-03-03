import type { FastifyInstance } from 'fastify';
import { loginBodySchema, registerBodySchema, refreshBodySchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { prisma } from '@pedirei/database';
import { env } from '../../config/env.js';
import { sendContactEmail } from '../../services/email.service.js';
import { z } from 'zod';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    try {
      const body = registerBodySchema.parse(request.body);
      const result = await authService.register(app, body);
      return reply.status(201).send(success(result));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/auth/confirm', async (request, reply) => {
    try {
      const { token } = request.query as { token?: string };
      if (!token) return reply.status(400).send(error('Token obrigatório'));

      const operator = await prisma.operator.findFirst({
        where: { confirmToken: token },
      });
      if (!operator) return reply.status(400).send(error('Token inválido ou já utilizado'));

      await prisma.operator.update({
        where: { id: operator.id },
        data: { emailConfirmedAt: new Date(), confirmToken: null },
      });

      return reply.redirect(`${env.ADMIN_URL}/login?confirmed=1`);
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    try {
      const body = loginBodySchema.parse(request.body);
      const result = await authService.login(app, body);
      return reply.send(success(result));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/auth/refresh', async (request, reply) => {
    try {
      const body = refreshBodySchema.parse(request.body);
      const result = await authService.refreshToken(app, body.refreshToken);
      return reply.send(success(result));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.post('/api/auth/master/login', async (request, reply) => {
    try {
      const body = loginBodySchema.parse(request.body);
      const result = await authService.masterLogin(app, body);
      return reply.send(success(result));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // Contact form endpoint
  const contactSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    subject: z.string().min(1),
    message: z.string().min(10),
  });

  app.post('/api/contact', async (request, reply) => {
    try {
      const body = contactSchema.parse(request.body);
      await sendContactEmail(body);
      return reply.send(success({ message: 'Mensagem enviada com sucesso' }));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });
}
