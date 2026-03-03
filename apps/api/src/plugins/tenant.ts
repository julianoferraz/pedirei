import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@pedirei/database';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('requireTenant', async (request: FastifyRequest) => {
    await app.authenticate(request);
    const { tenantId } = request.jwtPayload;
    if (!tenantId) {
      throw new UnauthorizedError('Token sem tenant associado');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isActive: true },
    });

    if (!tenant) {
      throw new UnauthorizedError('Tenant não encontrado');
    }

    if (!tenant.isActive) {
      throw new ForbiddenError('Loja desativada. Entre em contato com o suporte.');
    }

    request.tenantId = tenantId;
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    requireTenant: (request: FastifyRequest) => Promise<void>;
  }
}
