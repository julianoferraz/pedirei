# ─── API Dockerfile ────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/whatsapp/package.json ./packages/whatsapp/
RUN npm ci --workspace=apps/api --include-workspace-root

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build shared packages
RUN npm run build --workspace=packages/shared || true
RUN npm run build --workspace=packages/database || true
RUN npm run build --workspace=packages/whatsapp || true

# Production
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 pedirei
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/package.json ./

# Create uploads dir
RUN mkdir -p uploads && chown pedirei:nodejs uploads

USER pedirei
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "--import", "tsx/esm", "apps/api/src/server.ts"]
