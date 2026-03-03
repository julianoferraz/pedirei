# AI PROJECT CONTEXT — Pedirei.Online

VERSION: 0.1.0
AI_WORKFLOW_MODE: ENTERPRISE
STRICT_ARCHITECTURE_ENFORCEMENT: TRUE

## PROJECT IDENTITY

- **Name:** Pedirei.Online
- **Type:** SaaS multi-tenant (B2B para restaurantes)
- **Domain:** Pedidos via WhatsApp + cardápio digital
- **Repository:** github.com/julianoferraz/pedirei
- **Server path:** /opt/pedirei

## CURRENT ARCHITECTURE STATE

Monorepo Turborepo com 5 aplicações e 3 pacotes compartilhados.

### Apps
| App | Tech | Port | Purpose |
|---|---|---|---|
| api | Fastify + TS | 3001 | Backend REST API |
| web-menu | Next.js 14 | 3002 | Cardápio digital (público) |
| web-admin | React + Vite | 3003 | Painel do lojista |
| web-master | React + Vite | 3004 | Painel master |
| web-landing | Next.js 14 | 3005 | Landing page |

### Packages
| Package | Purpose |
|---|---|
| shared | Types, Zod schemas, constants, utils |
| database | Prisma schema, migrations, seed, client |
| whatsapp | Baileys multi-tenant connection manager |

### Infrastructure
- PostgreSQL 16 (local or Docker)
- Redis 7 (cache + BullMQ queues)
- Nginx reverse proxy with wildcard subdomain
- Docker Compose for production
- GitHub Actions auto-deploy

## ARCHITECTURE RULES

1. All code in TypeScript with strict mode
2. All routes validated with Zod schemas
3. All DB operations filtered by tenantId (multi-tenant isolation)
4. Credentials encrypted with AES-256-GCM via encryption.service.ts
5. No static menu data in chatbot prompts (use function calling)
6. Standardized API responses: `{ success, data?, error? }`
7. Pagination on all list endpoints
8. Rate limiting on public routes
9. CORS restricted to system domains

## CODING STANDARDS

- Runtime: Node.js 22 LTS
- ORM: Prisma (never raw SQL unless for reports)
- Validation: Zod everywhere
- Auth: JWT + refresh tokens
- Logging: pino (built into Fastify)
- Error handling: try/catch with typed errors on all routes
- File uploads: max 5MB, jpg/png/webp only

## SECURITY PRINCIPLES

- Never expose credentials in code or logs
- Encrypt PSP/NFC-e/OpenAI keys at rest
- JWT secrets via environment variables only
- All tenant data strictly isolated by tenantId
- Rate limit public-facing endpoints
