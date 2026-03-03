import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { JwtPayload } from '@pedirei/shared';

declare module 'fastify' {
  interface FastifyRequest {
    jwtPayload: JwtPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(fjwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '1h' },
  });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify<JwtPayload>();
      request.jwtPayload = payload;
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  });

  app.decorate('authenticateMaster', async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify<JwtPayload>();
      if (payload.role !== 'MASTER') {
        throw new UnauthorizedError('Acesso restrito ao administrador master');
      }
      request.jwtPayload = payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    authenticateMaster: (request: FastifyRequest) => Promise<void>;
  }
}
