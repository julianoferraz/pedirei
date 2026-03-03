# PROJECT STRUCTURE — Pedirei.Online

```
/opt/pedirei/
├── apps/
│   ├── api/                              # Backend REST API
│   │   ├── src/
│   │   │   ├── server.ts                 # Fastify bootstrap
│   │   │   ├── config/
│   │   │   │   ├── env.ts                # Env validation (Zod)
│   │   │   │   └── redis.ts              # Redis/ioredis client
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts               # JWT auth plugin
│   │   │   │   ├── tenant.ts             # Multi-tenant middleware
│   │   │   │   └── cors.ts               # CORS config
│   │   │   ├── modules/
│   │   │   │   ├── auth/                 # Register, login, refresh, master login
│   │   │   │   ├── tenant/               # Tenant CRUD + configs
│   │   │   │   ├── menu/                 # Categories, items, import, daily
│   │   │   │   ├── order/                # Orders CRUD, status flow
│   │   │   │   ├── customer/             # Customer/lead management
│   │   │   │   ├── payment/              # PSP abstraction + providers
│   │   │   │   ├── nfce/                 # NFC-e emission + providers
│   │   │   │   ├── campaign/             # Promotional campaigns
│   │   │   │   ├── report/               # Revenue, top items, peak hours
│   │   │   │   ├── master/               # Platform admin operations
│   │   │   │   └── webhook/              # Payment webhooks
│   │   │   ├── chatbot/
│   │   │   │   ├── chatbot.engine.ts     # Main chatbot processor
│   │   │   │   ├── chatbot.prompts.ts    # OpenAI prompt templates
│   │   │   │   ├── chatbot.actions.ts    # Cart/order actions
│   │   │   │   ├── chatbot.session.ts    # Redis session management
│   │   │   │   ├── admin-commands.ts     # Admin WhatsApp commands
│   │   │   │   └── feedback.parser.ts    # Rating extraction
│   │   │   ├── jobs/
│   │   │   │   ├── queue.ts              # BullMQ config
│   │   │   │   ├── feedback.job.ts       # Delayed feedback request
│   │   │   │   ├── reengagement.job.ts   # Inactive customer re-engage
│   │   │   │   ├── daily-menu-cleanup.job.ts
│   │   │   │   ├── whatsapp-monitor.job.ts
│   │   │   │   └── campaign.job.ts       # Campaign dispatch
│   │   │   ├── services/
│   │   │   │   ├── openai.service.ts     # OpenAI API wrapper
│   │   │   │   ├── encryption.service.ts # AES-256-GCM
│   │   │   │   ├── geocoding.service.ts  # Nominatim reverse geocoding
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── menu-import.service.ts # GPT-4o vision import
│   │   │   │   └── printer.service.ts    # ESC/POS thermal printing
│   │   │   └── utils/
│   │   │       ├── errors.ts
│   │   │       ├── helpers.ts
│   │   │       └── logger.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web-menu/                         # Digital menu (Next.js 14)
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                  # Root redirect
│   │   │   ├── not-found.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx              # Tenant menu
│   │   │       └── MenuPage.tsx          # Client component
│   │   ├── src/hooks/useCart.ts
│   │   ├── src/lib/api.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web-admin/                        # Tenant dashboard (React + Vite)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx                   # Router
│   │   │   ├── contexts/AuthContext.tsx
│   │   │   ├── layouts/DashboardLayout.tsx
│   │   │   ├── lib/api.ts
│   │   │   └── pages/
│   │   │       ├── LoginPage.tsx
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── OrdersPage.tsx
│   │   │       ├── MenuPage.tsx
│   │   │       ├── CustomersPage.tsx
│   │   │       ├── ReportsPage.tsx
│   │   │       ├── SettingsPage.tsx
│   │   │       └── WhatsAppPage.tsx
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web-master/                       # Platform admin (React + Vite)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── contexts/AuthContext.tsx
│   │   │   ├── layouts/MasterLayout.tsx
│   │   │   └── pages/
│   │   │       ├── LoginPage.tsx
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── TenantsPage.tsx
│   │   │       ├── PlansPage.tsx
│   │   │       └── ConfigPage.tsx
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web-landing/                      # Landing page (Next.js 14)
│       ├── src/app/
│       │   ├── layout.tsx
│       │   └── page.tsx                  # Full landing page
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── shared/                           # Shared types & utils
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts                  # TypeScript types & interfaces
│   │       ├── schemas.ts               # Zod validation schemas
│   │       ├── constants.ts             # App constants
│   │       └── utils.ts                 # Helper functions
│   │
│   ├── database/                         # Prisma ORM
│   │   ├── prisma/
│   │   │   ├── schema.prisma            # Full schema (20+ models)
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── index.ts                 # Prisma client singleton
│   │       └── seed.ts                  # Plans + config + master admin
│   │
│   └── whatsapp/                         # Baileys connection manager
│       └── src/
│           ├── index.ts
│           ├── connection.ts            # Multi-tenant connection manager
│           ├── message-handler.ts       # Message routing
│           ├── sender.ts               # Send text/image/location
│           ├── session-store.ts         # PostgreSQL session persistence
│           └── types.ts
│
├── .github/workflows/deploy.yml          # Auto-deploy on push to main
├── docker-compose.yml                    # Dev (Postgres + Redis only)
├── docker-compose.prod.yml               # Production (all services)
├── nginx.conf.example                    # Nginx reverse proxy reference
├── .env.example                          # Environment variables template
├── package.json                          # Root workspaces config
├── turbo.json                            # Turborepo pipeline config
├── tsconfig.base.json                    # Shared TS config
├── README.md
├── CHANGELOG.md
├── DECISION_LOG.md
├── AI_PROJECT_CONTEXT.md
└── PROJECT_STRUCTURE.md
```
