# ─── Web Master Dockerfile (Vite SPA) ───────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web-master/package.json ./apps/web-master/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=apps/web-master --include-workspace-root

# Build
FROM base AS builder
ARG VITE_API_URL=https://api.pedirei.online
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace=packages/shared 2>/dev/null || true
RUN npm run build --workspace=apps/web-master

# Production - serve with nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web-master/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /assets { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
