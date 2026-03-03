import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@pedirei/database';
import type { FastifyInstance } from 'fastify';
import { AppError, ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import type { LoginBody, RegisterBody } from './auth.schema.js';
import type { JwtPayload } from '@pedirei/shared';
import { sendWelcomeEmail } from '../../services/email.service.js';

export async function register(app: FastifyInstance, data: RegisterBody) {
  const existingSlug = await prisma.tenant.findUnique({ where: { slug: data.storeSlug } });
  if (existingSlug) throw new ConflictError('Este slug já está em uso');

  const existingOperator = await prisma.operator.findFirst({
    where: { email: data.email },
  });
  if (existingOperator) throw new ConflictError('Este email já está cadastrado');

  const freePlan = await prisma.plan.findUnique({ where: { slug: 'gratuito' } });
  if (!freePlan) throw new AppError(500, 'Plano gratuito não encontrado');

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const confirmToken = crypto.randomBytes(32).toString('hex');
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const tenant = await prisma.tenant.create({
    data: {
      slug: data.storeSlug,
      name: data.storeName,
      phone: data.phone,
      email: data.email,
      planId: freePlan.id,
      trialEndsAt,
      operators: {
        create: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: 'OWNER',
          confirmToken,
        },
      },
      adminPhones: {
        create: {
          phone: data.phone,
          name: data.name,
          role: 'OWNER',
        },
      },
    },
    include: { operators: true },
  });

  const operator = tenant.operators[0];

  // Send welcome email asynchronously (do not block registration)
  sendWelcomeEmail(data.email, data.name, confirmToken).catch(() => {});

  const payload: JwtPayload = {
    sub: operator.id,
    tenantId: tenant.id,
    role: 'OWNER',
    email: operator.email,
  };

  const accessToken = app.jwt.sign(payload, { expiresIn: '1h' });
  const refreshToken = app.jwt.sign(payload, { expiresIn: '7d' });

  return { accessToken, refreshToken, tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name } };
}

export async function login(app: FastifyInstance, data: LoginBody) {
  const operator = await prisma.operator.findFirst({
    where: { email: data.email, isActive: true },
    include: { tenant: { select: { id: true, slug: true, name: true, isActive: true } } },
  });

  if (!operator) throw new UnauthorizedError('Email ou senha inválidos');
  if (!operator.tenant.isActive) throw new UnauthorizedError('Loja desativada');

  const valid = await bcrypt.compare(data.password, operator.password);
  if (!valid) throw new UnauthorizedError('Email ou senha inválidos');

  const payload: JwtPayload = {
    sub: operator.id,
    tenantId: operator.tenantId,
    role: operator.role,
    email: operator.email,
  };

  const accessToken = app.jwt.sign(payload, { expiresIn: '1h' });
  const refreshToken = app.jwt.sign(payload, { expiresIn: '7d' });

  return { accessToken, refreshToken, tenant: operator.tenant };
}

export async function masterLogin(app: FastifyInstance, data: LoginBody) {
  const admin = await prisma.masterAdmin.findUnique({ where: { email: data.email } });
  if (!admin) throw new UnauthorizedError('Credenciais inválidas');

  const valid = await bcrypt.compare(data.password, admin.password);
  if (!valid) throw new UnauthorizedError('Credenciais inválidas');

  const payload: JwtPayload = {
    sub: admin.id,
    role: 'MASTER',
    email: admin.email,
  };

  const accessToken = app.jwt.sign(payload, { expiresIn: '2h' });
  const refreshToken = app.jwt.sign(payload, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

export async function refreshToken(app: FastifyInstance, token: string) {
  try {
    const decoded = app.jwt.verify<JwtPayload>(token);
    const payload: JwtPayload = {
      sub: decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email,
    };

    const accessToken = app.jwt.sign(payload, { expiresIn: '1h' });
    const newRefreshToken = app.jwt.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    throw new UnauthorizedError('Refresh token inválido');
  }
}
