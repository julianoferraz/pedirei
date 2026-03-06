# Changelog — Pedirei.Online

## [0.8.0] — 2026-03-05

### Feature 6: Recuperação de Vendas
- **Schema**: Added `RecoveryAttempt` model, `RECOVERY` campaign type, `hasSalesRecovery` plan flag, recovery settings on Tenant (`recoveryEnabled`, `recoveryDelayMin`, `recoveryMessage`, `recoveryDiscountPct`)
- **Migration**: `20260305180000_add_sales_recovery` — full SQL migration
- **Plan gating**: `hasSalesRecovery` enabled for Essencial+ plans
- **API — Recovery endpoints**: `GET/PUT /api/recovery/settings`, `GET /api/recovery/stats?days=`, `GET /api/recovery/attempts`, `GET /api/recovery/inactive-count`
- **Job — recovery.job.ts**: BullMQ worker processes delayed recovery messages; `scheduleRecovery()` queues message with configurable delay after cancellation
- **Order integration**: `cancelOrder()` auto-schedules recovery; `createOrder()` calls `markRecoverySuccess()` to detect recovered customers (48h window)
- **Bug fix — campaign.job.ts**: Was querying customers but NEVER sending WhatsApp messages; now fully functional with rate limiting (1.5s between sends)
- **Bug fix — reengagement.job.ts**: Was querying inactive customers but NEVER sending messages; now sends with template vars and updates `lastContactAt`
- **Admin — Recuperação page**: Dashboard with KPIs (cancelados, msgs enviadas, recuperados, receita recuperada, conversão %), period filter, recent attempts table; Settings tab with enable toggle, delay config, discount %, message template editor

## [0.7.0] — 2026-03-05

### Feature 5: Garçom Digital (QR Mesa)
- **Schema**: Added `DineInTable` model, `OrderType` enum (DELIVERY/PICKUP/TABLE), `orderType` + `tableNumber` on Order, `dineInEnabled` on Tenant, `hasTableOrder` plan flag
- **Migration**: `20260305170000_add_dine_in_tables` — full SQL migration
- **Plan gating**: `hasTableOrder` enabled for Profissional+ plans
- **API — Table CRUD**: `GET/POST/PUT/DELETE /api/tables`, batch creation `POST /api/tables/batch`
- **API — Public QR endpoints**: `GET /api/public/:slug/table/:tableNumber` (landing info), `POST /api/public/:slug/table/:tableNumber/order` (create table order)
- **Table orders**: orderType=TABLE, deliveryFee=0, integrates with stock, cash register, loyalty
- **Admin — Mesas page**: Full table management with create/edit/delete, batch creation (1-N), QR code display per table, print all QR codes, toggle dine-in mode
- **KDS**: Shows "Mesa X" badge on table orders for kitchen visibility
- **Orders page**: Shows table indicator for table orders, added RECEIVED status
- **Web Menu**: Detects `?mesa=X` query param from QR scan, shows table banner, skips delivery fields, submits to table order API
- **Checkout**: Table-aware — no delivery fee, name optional, submits to dedicated table order endpoint

## [0.6.0] — 2026-03-05

### Feature: Relatórios Completos (Reports System)
- Added plan gating: `hasReports` (Essencial+) for 4 basic report endpoints, `hasAdvReports` (Profissional+) for 3 advanced endpoints
- Created `report.schema.ts` with Zod validation for query params
- Basic reports: revenue (daily), top items, peak hours, feedback distribution
- Advanced reports: payment method breakdown, customer analytics (new vs returning, retention rate, top by revenue), order status breakdown
- Rewrote `ReportsPage` in web-admin with comprehensive dashboard:
  - 4 KPI cards: Faturamento, Pedidos, Ticket Médio, Nota Média
  - Period filter (7/30/90 dias)
  - Daily revenue bar chart with proportional bars
  - Top 10 items ranking
  - Peak hours histogram (24h)
  - Feedback rating distribution with stars
  - Payment method breakdown with progress bars (Adv)
  - Customer analytics grid with retention rate (Adv)
  - Order status breakdown with color-coded badges (Adv)
- Graceful degradation: advanced section shows upgrade prompt if plan doesn't include

## [0.5.0] — 2026-03-05

### Feature: KDS — Painel da Cozinha (Kitchen Display System)
- Added `hasKds` boolean flag to `Plan` model
- Added `KdsItemStatus` enum (PENDING, PREPARING, READY) and `kdsStatus` field to `OrderItem`
- Created `kds` API module (schema, service, routes)
  - GET /api/kds/orders — active orders (RECEIVED + PREPARING)
  - GET /api/kds/completed — recently completed orders
  - PUT /api/kds/items/:id/status — update single item KDS status
  - PUT /api/kds/orders/:id/start — start preparing an order
  - PUT /api/kds/orders/:id/bump — mark order as ready (all items READY + advance status)
  - GET /api/kds/stats — today's KDS statistics (received, preparing, completed, avg prep time)
- Plan-gated via `checkPlanFeature('hasKds')` — available on Profissional+ plans
- Created `KdsPage` in web-admin with 3-column kanban (Novos, Preparando, Prontos)
- Live timer per order (color-coded: green < 10min, yellow < 20min, red 20min+)
- Per-item status toggle (click to advance: PENDING → PREPARING → READY)
- Auto-refresh via polling every 8 seconds
- Added "Cozinha" (ChefHat icon) to web-admin sidebar navigation
- Migration: `20260305160000_add_kds`
- Seeds updated: Profissional, Negócio plans get `hasKds: true`

## [0.4.0] — 2026-03-05

### Feature: Programa de Fidelidade (Loyalty Program)
- Added `hasLoyalty` boolean flag to `Plan` model
- Added `loyaltyEnabled`, `loyaltyPointsPerReal`, `loyaltyMinOrderValue` config fields to `Tenant`
- Added `loyaltyPoints` field to `Customer` model
- Created `LoyaltyReward` model (name, pointsCost, type: FREE_ITEM/DISCOUNT/PERCENTAGE)
- Created `LoyaltyTransaction` model (EARN/REDEEM/ADJUSTMENT/EXPIRE with balance tracking)
- Created `loyalty` API module (schema, service, routes)
  - GET/PUT /api/loyalty/config — loyalty configuration
  - CRUD /api/loyalty/rewards — reward management
  - POST /api/loyalty/redeem — redeem reward for customer
  - POST /api/loyalty/adjust — manual points adjustment
  - GET /api/loyalty/transactions — transaction history
  - GET /api/loyalty/customers — loyalty ranking
- Plan-gated via `checkPlanFeature('hasLoyalty')` — available on Essencial+ plans
- Auto-earns points on order creation via `earnPointsForOrder()`
- Created `LoyaltyPage` in web-admin with 4 tabs: Configuração, Recompensas, Clientes, Histórico
- Added "Fidelidade" (Star icon) to web-admin sidebar navigation
- Chatbot integration: `check_loyalty_points` tool for customers to check points via WhatsApp
- Migration: `20260305150000_add_loyalty_program`
- Seeds updated: Essencial, Profissional, Negócio plans get `hasLoyalty: true`

## [0.3.0] — 2026-03-06

### Feature: Gestão de Caixa (Cash Register)
- Added `hasCashRegister` boolean flag to `Plan` model
- Created `CashRegister` model (open/close, opening/closing/expected balance, operator tracking)
- Created `CashMovement` model with types: SALE, DEPOSIT, WITHDRAWAL, EXPENSE
- Created `cash-register` API module (schema, service, routes)
  - POST /api/cash-register/open — open new register (one per tenant)
  - POST /api/cash-register/:id/close — close register with balance comparison
  - GET /api/cash-register/current — get current open register with movements
  - POST /api/cash-register/:id/movement — add manual movement (deposit/withdrawal/expense)
  - GET /api/cash-register — list register history with pagination
  - GET /api/cash-register/:id — register detail with all movements
  - GET /api/cash-register/report/daily — daily summary report
- Plan-gated via `checkPlanFeature('hasCashRegister')` — available on Profissional+ plans
- Auto-registers SALE movement on order creation when register is open
- Created `CashRegisterPage` in web-admin with 3 tabs: Caixa Atual, Histórico, Relatório Diário
- Added "Caixa" (Landmark icon) to web-admin sidebar navigation
- Close register shows expected vs actual balance difference
- Migration: `20260306120000_add_cash_register`
- Seeds updated: Profissional and Negócio plans get `hasCashRegister: true`

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
