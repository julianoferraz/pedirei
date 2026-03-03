# DECISION LOG — Pedirei.Online

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
