# AI PROJECT CONTEXT — Pedirei.Online

VERSION: 0.1.0
AI_WORKFLOW_MODE: ENTERPRISE
STRICT_ARCHITECTURE_ENFORCEMENT: TRUE

**Documento de referência para agentes de IA e desenvolvedores.**
> Consulte este arquivo antes de implementar, corrigir ou atualizar qualquer parte do projeto.

Regra obrigatória: Antes de implementar, atualizar, modificar ou corrigir qualquer parte deste sistema, você deve consultar e seguir as regras deste arquivo localizado na raiz do projeto e seguir estritamente e à risca todas as instruções, diretrizes e padrões definidos nele. Nenhuma alteração deve ser feita sem antes ter lido e compreendido completamente o conteúdo desse arquivo. Qualquer decisão técnica, estrutural ou de fluxo deve estar em conformidade com o que está documentado aqui e ao final de cada seção, há um lembrete para consultar este guia novamente antes de prosseguir. O não cumprimento desta regra resultará em erros, inconsistências e falhas no sistema, pois este guia é a fonte definitiva de verdade para o projeto. Portanto, antes de qualquer ação, leia este arquivo cuidadosamente e mantenha-o como referência constante durante todo o processo de desenvolvimento e manutenção do sistema. O guia deve ser atualizado sempre que houver mudanças significativas, mas até lá, ele é a única fonte de verdade para todas as decisões relacionadas a este projeto.

Tudo que for feito ou modificado deve ser atualizado no arquivo log.md

🚀 Deploy e Ambiente

- Todo código editado deve ser salvo com Ctrl+S (auto-commit para GitHub automático)
- O deploy na VPS acontece automaticamente após o push (GitHub Actions)
- Aguardar 30 segundos após salvar para o deploy concluir

## ✅ Verificação do deploy

Após salvar e aguardar, verificar se funcionou:
1. Acessar a URL do projeto no navegador e  verificar os logs via terminal:
   ssh root@161.97.171.94 "docker logs NOME_CONTAINER --tail 20"
   ou
   ssh root@161.97.171.94 "pm2 logs NOME_PROJETO --lines 20"

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
