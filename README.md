# Pedirei.Online

SaaS multi-tenant de pedidos para restaurantes via WhatsApp e cardápio digital.

## Stack

- **Runtime:** Node.js 22 LTS
- **Backend:** Fastify 4.x + TypeScript + Prisma + PostgreSQL
- **Cache/Filas:** Redis + BullMQ
- **Cardápio Digital:** Next.js 14 (App Router) + Tailwind CSS
- **Painel Admin:** React 18 + Vite + Tailwind + shadcn/ui
- **Painel Master:** React 18 + Vite + Tailwind + shadcn/ui
- **Landing Page:** Next.js 14 + Tailwind CSS
- **WhatsApp:** Baileys (conexão multi-tenant)
- **IA:** OpenAI (GPT-4.1 mini + GPT-4o vision)
- **Monorepo:** Turborepo + npm workspaces
- **Deploy:** Docker Compose + GitHub Actions

## Estrutura

```
/opt/pedirei/
├── apps/
│   ├── api/            # Backend REST API (Fastify)
│   ├── web-menu/       # Cardápio digital (Next.js)
│   ├── web-admin/      # Painel do lojista (React + Vite)
│   ├── web-master/     # Painel master (React + Vite)
│   └── web-landing/    # Landing page (Next.js)
├── packages/
│   ├── shared/         # Tipos, schemas Zod, constantes
│   ├── database/       # Prisma schema + migrations + seed
│   └── whatsapp/       # Módulo Baileys multi-tenant
├── docker-compose.yml          # Dev (Postgres + Redis)
├── docker-compose.prod.yml     # Produção (todos os serviços)
├── nginx.conf.example          # Config Nginx de referência
└── .github/workflows/deploy.yml
```

## Quick Start (Desenvolvimento)

```bash
# 1. Clone
git clone https://github.com/julianoferraz/pedirei.git
cd pedirei

# 2. Copie as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 3. Suba Postgres e Redis
docker compose up -d

# 4. Instale dependências
npm install

# 5. Rode migrations e seed
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
npx tsx packages/database/src/seed.ts

# 6. Gere o Prisma client
npx prisma generate --schema=packages/database/prisma/schema.prisma

# 7. Rode o backend
cd apps/api && npx tsx src/server.ts
```

## Deploy (Produção)

```bash
cd /opt/pedirei
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

O deploy automático via GitHub Actions é acionado a cada push na branch `main`.

## Subdomínios

| Subdomínio | Serviço | Porta |
|---|---|---|
| `pedirei.online` | Landing Page | 3005 |
| `api.pedirei.online` | API REST | 3001 |
| `admin.pedirei.online` | Painel Lojista | 3003 |
| `master.pedirei.online` | Painel Master | 3004 |
| `*.pedirei.online` | Cardápio Digital | 3002 |

## Planos

| Plano | Pedidos/mês | Preço |
|---|---|---|
| Gratuito | 30 | R$ 0 |
| Essencial | 300 | R$ 69,90 |
| Profissional | 1.000 | R$ 129,90 |
| Negócio | Ilimitado | R$ 199,90 |

## Licença

Proprietário — © 2026 Pedirei.Online
