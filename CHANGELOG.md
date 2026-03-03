# Changelog — Pedirei.Online

## [0.1.0] — 2026-03-03

### Phase 1: Foundation
- Initialized Turborepo monorepo with npm workspaces
- Created `packages/shared` with types, Zod schemas, constants, and utils
- Created `packages/database` with full Prisma schema (20+ models, enums, indexes)
- Ran initial migration (`init`) against PostgreSQL
- Seeded database: 4 plans (Gratuito, Essencial, Profissional, Negócio), platform config, master admin

### Phase 2: API Core
- Created `apps/api` with Fastify 4.x + TypeScript
- Implemented plugins: JWT auth, multi-tenant middleware, CORS
- Implemented modules: auth, tenant, menu, order, customer, payment, campaign, report, master, webhook, nfce
- Payment provider abstraction: Mercado Pago, Asaas, EfiPay interfaces
- NFC-e provider abstraction: Focus NFe interface
- Services: OpenAI, encryption (AES-256-GCM), geocoding, notification, menu-import (GPT-4o vision), ESC/POS printing
- BullMQ jobs: feedback, reengagement, daily-menu-cleanup, whatsapp-monitor, campaign dispatch
- Structured logging with pino, env validation with Zod

### Phase 3: WhatsApp + Chatbot
- Created `packages/whatsapp` with Baileys multi-tenant connection manager
- Session persistence in PostgreSQL, auto-reconnect with 5 retries
- Message handler routing (admin vs customer)
- Chatbot engine with OpenAI function calling (get_menu, add_to_cart, create_order, etc.)
- Admin commands parser (pause_item, activate_item, list_pending_orders, etc.)
- Feedback parser (extracts rating + comment from free text)
- Chat session management via Redis with 30min TTL

### Phase 4: Frontends
- Created `apps/web-menu` (Next.js 14, App Router) — customer-facing digital menu
- Created `apps/web-admin` (React + Vite + Tailwind + shadcn/ui) — tenant dashboard
- Created `apps/web-master` (React + Vite + Tailwind + shadcn/ui) — platform admin
- Created `apps/web-landing` (Next.js 14) — marketing landing page

### Phase 5: Integrations
- AI menu import via GPT-4o vision (image/PDF → structured menu items)
- ESC/POS thermal printer service for order receipts
- Prisma migration for printer fields on Tenant model

### Phase 6: Infrastructure
- Dockerfiles for all 5 apps (multi-stage builds, nginx for SPAs)
- `docker-compose.yml` (development: Postgres + Redis)
- `docker-compose.prod.yml` (production: all services)
- GitHub Actions deploy workflow (auto-deploy on push to main)
- Nginx config reference with wildcard subdomain routing
- `.env.example` with all required environment variables
