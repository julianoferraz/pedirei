# DECISION LOG — Pedirei.Online

## 2026-03-06 — Feature 12: Relatório Consolidado de Filiais

**Decision:** TenantGroup model with membership-based access, cross-tenant query aggregation in service layer, no JWT changes
**Reason:** Multi-unit networks (e.g., pizza chains) need consolidated reports across branches without compromising tenant isolation. Rather than modifying JWT to include multiple tenantIds (which would break the entire single-tenant auth flow), we use a TenantGroup + TenantGroupMember join model. When a user requests consolidated reports, `getGroupTenantIds()` verifies their tenant is a member of the group then returns all member tenantIds for use in `{ tenantId: { in: tenantIds } }` Prisma queries. This keeps the existing auth infrastructure intact — the JWT still carries a single tenantId, and group membership is validated at the service level. The HEADQUARTERS/BRANCH role distinction ensures only the headquarters tenant can manage group membership, while all members can view consolidated reports. Customer deduplication across branches is done by phone number (not customerId) since the same person will have different Customer records at different branches. The `crossBranchCustomers` metric is unique to multi-unit — it shows how many customers order from more than one branch, a key loyalty indicator for chains.
**Impact:** New `TenantGroup` + `TenantGroupMember` models with `GroupMemberRole` enum. No existing models modified. No JWT changes. Feature gated by existing `hasMultiUnit` flag (Negócio only). 10 new API endpoints (5 group CRUD + 5 consolidated reports). New Filiais admin page with group management + consolidated reporting dashboard.

## 2026-03-05 — Feature 11: Integração iFood/Rappi

**Decision:** Provider pattern with per-marketplace implementations, inbound webhook for orders, outbound status sync + catalog push
**Reason:** iFood and Rappi have fundamentally different auth mechanisms (OAuth2 vs API key) and API structures, so a common `MarketplaceProvider` interface abstracts the differences — exactly like the existing `PaymentProvider` pattern. Credentials are encrypted at rest using the same AES-256-GCM encryption service. A separate `MarketplaceIntegration` model (rather than fields on Tenant) allows multiple marketplace connections per tenant with independent status tracking. The webhook endpoint is public and always returns 200 to prevent marketplace retry storms — common best practice for marketplace integrations. Inbound orders are created via the same `prisma.order.create` flow but skip internal validations (min order, stock, etc.) since the marketplace already validated these. Status sync is bi-directional and fire-and-forget: when Pedirei updates an order status, it asynchronously pushes the corresponding status to the marketplace API. Catalog sync is admin-triggered (not automatic) to avoid unexpected menu changes on marketplaces. Feature gated to Negócio plan only since marketplace integrations require API credential management and represent a premium enterprise feature.
**Impact:** New `MarketplaceIntegration` model + `MarketplaceSource`/`MarketplaceStatus` enums. Two nullable fields on Order (marketplaceSource, marketplaceOrderId). `updateOrderStatus` in order.service.ts now fires async marketplace sync. Webhook URL pattern: `/api/webhook/marketplace/{provider}/{merchantId}`. Feature gated by `hasMarketplace` (Negócio plan only).

## 2026-03-05 — Feature 10: App Entregador (PWA)

**Decision:** Standalone PWA app with DRIVER role as Operator subtype, GPS tracking on Operator model
**Reason:** Delivery drivers need a lightweight mobile-first app they can install on their phones. A PWA (standalone mode, portrait orientation) is ideal — no app store needed, instant install via browser "Add to Home Screen". Drivers are modeled as `Operator` records with `role: 'DRIVER'` rather than a separate model, which lets them share the existing auth system (same login endpoint, JWT with role in payload). GPS coordinates are stored directly on the Operator row (`driverLat`, `driverLng`, `driverLocationAt`) rather than a separate location history table — we only need current position for real-time tracking, not full path history. The `requireDriver` middleware decorates off `requireTenant` to reuse multi-tenant isolation. The PWA auto-polls orders every 15s and sends GPS every ~30s via `watchPosition`. Order status transitions reuse the existing flow: `PREPARING → OUT_FOR_DELIVERY → DELIVERED`, with WhatsApp notifications triggered at each step.
**Impact:** New `apps/web-delivery` Vite+React PWA on port 3004. No new Prisma models — extends Operator and Order models. Feature gated by `hasDeliveryApp` plan flag (Profissional+). Admin gets full driver management + delivery assignment in the Entregas page.

## 2026-03-05 — Feature 8: Sugestões com IA

**Decision:** Hybrid approach — data-driven co-purchase analysis + GPT for creative tasks (descriptions, pricing)
**Reason:** Cart upselling needs to be fast and cheap, so the primary suggestion engine uses Prisma `groupBy` queries on OrderItem to find co-purchased items, with a fallback to popularity ranking. No AI tokens consumed for the public-facing suggestion endpoint. GPT is reserved for admin-side creative tools where latency tolerance is higher: generating item descriptions (3 style presets) and analyzing menu pricing. All GPT calls go through the existing `chatCompletion()` wrapper which auto-tracks tokens and costs in `AiUsageLog`. The public `/suggestions` endpoint is plan-gated at the tenant lookup level (returns empty array if plan lacks `hasAiSuggestions`), avoiding unnecessary processing. CartSuggestions component is lazy — only fetches when cart has items, and deduplicates against cart contents.
**Impact:** Feature gated by `hasAiSuggestions` (Profissional+). No new Prisma models needed — reuses existing `OrderItem` data for co-purchase analysis and existing `AiUsageLog` for token tracking. One new public endpoint, two admin AI endpoints, one usage endpoint. Web menu sidebar gets horizontal suggestion strip in cart drawer.

## 2026-03-05 — Feature 7: Pixels de Marketing

**Decision:** Client-side tracking pixel injection via Next.js `[slug]/layout.tsx` with server-gated exposure
**Reason:** Restaurant owners using paid ads need conversion tracking on their digital menu. Pixel IDs are stored as simple strings on the Tenant model (not a separate table) since there are exactly 4 supported platforms. The public info endpoint only exposes pixel IDs when `plan.hasMarketingPixels` is true — this server-side gating prevents plan circumvention. Scripts load with `afterInteractive` strategy to avoid blocking the menu's initial render. A dedicated `trackPurchase()` utility fires standardized conversion events (GA4 `purchase`, Meta `Purchase`, TikTok `PlaceAnOrder`) after successful order submission, giving accurate attribution data.
**Impact:** Feature gated by `hasMarketingPixels` plan flag (Profissional+). Four new nullable fields on Tenant. New `[slug]/layout.tsx` wraps all tenant pages. No impact on page load for tenants without pixels configured (component returns null).

## 2026-03-05 — Feature 6: Recuperação de Vendas

**Decision:** Delayed WhatsApp recovery messages for cancelled orders, with automatic recovery detection
**Reason:** Cancelled orders represent lost revenue. A configurable delay (default 30min) before sending the recovery message gives the restaurant time to reverse false cancellations, and gives the customer a cooling-off period before receiving a win-back message. The 48-hour window for `markRecoverySuccess` balances attribution accuracy without inflating recovery metrics. Optional discount percentage (via coupon code VOLTAR) provides a tangible re-engagement incentive.
**Impact:** New `RecoveryAttempt` model tracks all recovery messages. `cancelOrder()` now schedules a BullMQ delayed job. `createOrder()` checks for recent recovery attempts to auto-mark conversions. Two critical bugs fixed: `campaign.job.ts` and `reengagement.job.ts` both had the same defect — they queried target customers but never called `sendWhatsAppMessage()`. Both are now fully functional with 1.5s rate limiting between sends. Feature gated by `hasSalesRecovery` plan flag (Essencial+).

## 2026-03-05 — Feature 5: Garçom Digital (QR Mesa)

**Decision:** QR-code-based table ordering with public API endpoints, separate from WhatsApp flow
**Reason:** Dine-in customers scan a QR code at their table, which opens the digital menu at `pedirei.online/{slug}?mesa={number}`. Orders are placed directly via a dedicated public endpoint (`/api/public/:slug/table/:tableNumber/order`) without requiring WhatsApp or authentication. This keeps the table ordering flow fast and frictionless. Table orders set `orderType=TABLE`, `deliveryFee=0`, and integrate with existing stock, cash register, and loyalty systems via dynamic imports. QR codes are generated via external API (api.qrserver.com) to avoid adding server-side dependencies. Plan flag `hasTableOrder` gates the feature to Profissional+ plans. The `DineInTable` model stores table metadata with a unique constraint on `(tenantId, number)`.

## 2026-03-05 — Relatórios Completos

**Decision:** Two-tier reports system with plan-gated basic and advanced endpoints
**Reason:** Reports are critical for restaurant operations. Basic reports (revenue, top items, peak hours, feedback) cover essential analytics for Essencial+ plans. Advanced reports (payment breakdown, customer analytics, order status) provide deeper insights for Profissional+ plans. No new schema models needed — all data derived from existing Order, OrderItem, and Customer tables.
**Impact:** Report routes now gated by `hasReports`/`hasAdvReports` plan flags. Frontend dashboard provides 7 visualization sections with period filter. Advanced section gracefully degrades to upgrade prompt on lower-tier plans. Three new service methods: `getPaymentBreakdown`, `getCustomerAnalytics`, `getOrderStatusBreakdown`.

---

## 2026-03-05 — KDS (Painel da Cozinha)

**Decision:** Kanban-style kitchen display with per-item status tracking and polling-based refresh
**Reason:** KDS needs to be simple and fast for kitchen staff. Three-column kanban (Novos → Preparando → Prontos) is the industry standard. Per-item KdsItemStatus (PENDING/PREPARING/READY) on OrderItem allows granular tracking. Polling at 8s interval is simpler than WebSocket and adequate for kitchen use — can upgrade to SSE/WS later if needed.
**Impact:** OrderItem now has `kdsStatus` field. `bumpOrder` action marks all items READY and advances order to OUT_FOR_DELIVERY. `startPreparing` advances order to PREPARING. Stats endpoint provides avg prep time for operational metrics. Feature gated by `hasKds` plan flag (Profissional+). Color-coded timers alert kitchen staff to delayed orders.

---

## 2026-03-05 — Programa de Fidelidade

**Decision:** Points-per-real system with LoyaltyReward catalog and LoyaltyTransaction audit trail
**Reason:** Simple, configurable loyalty system. Tenant sets points-per-real ratio and minimum order value. Points accumulate on Customer model for fast queries. Separate LoyaltyTransaction table provides full audit trail with running balance. Rewards support three types (free item, fixed discount, percentage discount) for flexibility.
**Impact:** Order creation now calls `earnPointsForOrder()` to auto-credit points. Chatbot `check_loyalty_points` tool lets customers check balance and available rewards via WhatsApp. Feature gated by `hasLoyalty` plan flag (Essencial+). Admin panel provides config, reward CRUD, customer ranking, and transaction history.

---

## 2026-03-06 — Gestão de Caixa

**Decision:** Separate CashRegister + CashMovement models with one-open-per-tenant constraint
**Reason:** Simple cash register lifecycle (open → record movements → close). Only one register can be open at a time per tenant, enforced at service level. CashMovement tracks all monetary movements including automatic SALE entries from orders. Expected vs actual balance comparison at close time for cash reconciliation.
**Impact:** Order creation now calls `registerSaleMovement()` to automatically log sales in open register. Feature gated by `hasCashRegister` plan flag (Profissional+). Frontend provides full register lifecycle with 3 tabs: current register, history, and daily summary reports.

---

## 2026-03-05 — Controle de Estoque

**Decision:** Stock tracking via fields on MenuItem + separate InventoryMovement audit model
**Reason:** Lightweight approach that doesn't require a separate Inventory table. `trackStock` boolean allows per-item opt-in. Movement log provides full audit trail. Auto-pause at zero stock prevents overselling.
**Impact:** Order creation now calls `decrementStockForOrder()` in a transaction. Low-stock BullMQ job sends WhatsApp alerts. Chatbot validates stock before adding to cart.

---

## 2026-03-03 — Initial Architecture

**Decision:** Turborepo monorepo with npm workspaces
**Reason:** Single repo for all 5 apps + 3 shared packages. Turborepo handles build caching, task orchestration, and dependency graph. npm workspaces chosen over pnpm for simplicity since Node.js 22 ships with npm 11.
**Impact:** All apps share types, schemas, and database client without publishing to npm.

---

**Decision:** Fastify over Express for the API
**Reason:** Built-in TypeScript support, schema-based validation, pino logging, plugin system, better performance. Native support for JSON schema which pairs well with Zod.
**Impact:** All API modules follow Fastify plugin pattern with route/service/schema separation.

---

**Decision:** Prisma over Drizzle/Knex for ORM
**Reason:** Type-safe client generation, declarative schema, migration system, studio for debugging. Widely adopted, good documentation.
**Impact:** Schema lives in `packages/database/prisma/schema.prisma`. All apps import `@pedirei/database`.

---

**Decision:** Baileys for WhatsApp (not Evolution API)
**Reason:** Direct control over multi-tenant connections, no external service dependency, session stored in PostgreSQL for persistence. Lower-level but more flexible for the chatbot engine.
**Impact:** Each tenant maintains its own Baileys socket in `packages/whatsapp`. Sessions serialized to `Tenant.whatsappSessionData`.

---

**Decision:** OpenAI function calling for chatbot actions
**Reason:** Structured output, deterministic action execution, clean separation between AI reasoning and system operations. Model decides WHAT to do, system executes HOW.
**Impact:** Chatbot engine defines tools (get_menu, add_to_cart, create_order, etc.) and processes function call responses.

---

**Decision:** AES-256-GCM for credential encryption at rest
**Reason:** PSP tokens, OpenAI keys, NFC-e credentials must never be stored in plaintext. AES-256-GCM provides authenticated encryption with a single `ENCRYPTION_KEY` env var.
**Impact:** All sensitive fields go through `encryption.service.ts` before database storage.

---

**Decision:** Vite + React for admin panels, Next.js for public-facing pages
**Reason:** Admin panels are SPAs (no SEO needed) — Vite provides fastest DX. Web-menu and landing page need SSR/SSG for SEO and performance — Next.js App Router.
**Impact:** web-admin and web-master use Vite + React. web-menu and web-landing use Next.js 14.

---

**Decision:** BullMQ for job queues
**Reason:** Delayed jobs (feedback after 2h), recurring jobs (reengagement cron), campaign dispatch all need reliable async processing with retry logic. BullMQ uses Redis (already in stack).
**Impact:** Jobs defined in `apps/api/src/jobs/`. Workers started alongside the API server.

---

**Decision:** Multi-tenant via tenantId filter (not separate databases)
**Reason:** Single database with row-level tenant isolation. Simpler operations, single migration path. tenantId is enforced on every query via the tenant plugin middleware.
**Impact:** Every service method receives `tenantId` and filters accordingly. No cross-tenant data leakage possible.

---

**Decision:** Docker multi-stage builds with nginx for SPA serving
**Reason:** SPAs (web-admin, web-master) build to static files — nginx serves them efficiently with gzip and long-lived cache headers. Next.js apps use standalone output mode.
**Impact:** Dockerfiles use `node:22-alpine` for build, `nginx:alpine` for SPA serving, standalone Node.js for Next.js.
