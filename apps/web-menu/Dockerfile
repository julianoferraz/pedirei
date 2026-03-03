# ─── Web Menu Dockerfile (Next.js) ─────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web-menu/package.json ./apps/web-menu/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=apps/web-menu --include-workspace-root

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=https://api.pedirei.online
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace=apps/web-menu

# Production
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=https://api.pedirei.online
ENV INTERNAL_API_URL=http://pedirei-api:3001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web-menu/public ./apps/web-menu/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-menu/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-menu/.next/static ./apps/web-menu/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web-menu/server.js"]
