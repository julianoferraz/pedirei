# Changelog — Pedirei.Online

## [0.2.0] — 2026-03-05

### Feature: Controle de Estoque
- Added `trackStock`, `stockQuantity`, `lowStockThreshold` fields to `MenuItem` model
- Created `InventoryMovement` model with types: IN, OUT, SALE, ADJUSTMENT, RETURN
- Created `inventory` API module (schema, service, routes)
  - GET /api/inventory — list items with stock tracking
  - GET /api/inventory/alerts — low-stock alerts summary
  - PUT /api/inventory/:menuItemId — update stock settings
  - POST /api/inventory/adjust — manual stock adjustment
  - PUT /api/inventory/bulk — bulk stock update (reconciliation)
  - GET /api/inventory/movements — movement history
- Integrated stock decrement on order creation (order.service.ts)
- Created `InventoryPage` in web-admin with 3 tabs: Estoque, Movimentações, Alertas
- Added "Estoque" to web-admin sidebar navigation
- Created `low-stock.job.ts` BullMQ worker for WhatsApp alerts to admin phones
- Updated chatbot `handleGetMenu` to show stock indicators (ESGOTADO / restam X)
- Updated chatbot `handleAddToCart` to validate stock before adding to cart
- Auto-pause items when stock reaches zero
- Public menu API now returns `trackStock` and `stockQuantity` fields

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
