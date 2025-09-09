# Inventário Inicial (BMAD) — Sistema Laura

Data: {{auto}}
Contexto: Brownfield conforme BMAD-METHOD (documentar antes de refatorar).

## Estrutura do Monorepo
- Workspaces: `apps/*`, `packages/*` (Turbo + PNPM)
- Scripts raiz úteis: `dev`, `build`, `lint`, `test`, `docker:*`, `prisma:*`, `check-integrity`

## API (`apps/api`)
- Stack: Express 5 + TypeScript, Prisma, Helmet, Rate Limit, Cookie Parser
- Observabilidade: `@bmad/observability` com `initTracing` e `metricsRouter`
- Healthchecks: `/health` e `/db-check`
- Autenticação: middleware JWT (rotas `/auth`, `authenticateJWT`, `requirePermission`)
- Rotas protegidas principais:
  - `GET /protected/test`, `GET /protected/schema-test`, `GET /protected/pedidos`, `POST /protected/pedidos/:id/approve`
- Filas (BullMQ/Redis): desabilitadas por ora (comentadas)
- Build/execução: `dev` com `tsx watch src/server-auth.ts`; `build` com `tsc`

## Banco de Dados / Prisma (`packages/prisma`)
- Provider: PostgreSQL (`DATABASE_URL`)
- Modelos: `User`, `Obra`, `Solicitacao`, `Fornecedor`, `Cotacao`, `Historico`, `Aprovacao`, `Arquivo`, `RefreshToken`, `Notificacao`, `Mensagem`
- Relações cobrindo usuários, obras, solicitações, cotações e aprovações
- Pendências: validar enumerações/status padronizados; índices/chaves únicas para performance

## Dashboard (`apps/dashboard`)
- Next.js com páginas (`index`, `dashboard`, `login`), Tailwind configurado
- Componentes: `Hero`, `Navbar`, `Services`
- Pendências: integração real com API, fluxo de login, páginas protegidas, métricas

## Observabilidade (`packages/observability`)
- Presente e acoplado na API; confirmar export de métricas e tracing endpoint

## Integrações WhatsApp (`packages/whatsapp-zapi`)
- Presente; ainda não mapeado o uso na API atual

## Riscos e Lacunas (alto nível)
- Autenticação: revisar armazenamento de tokens (frontend), refresh token e RBAC completo
- Filas/Redis: infraestrutura comentada; definir estratégia (BullMQ) e conexão
- Banco: padronizar `status` como enums; criar índices; seeds reproduzíveis
- Dashboard: proteção de rotas, consumo de métricas e estados em tempo real
- Observabilidade: confirmar scraping de métricas e spans; logs estruturados
- CI/CD: ainda não mapeado; definir pipeline com qualidade (gates BMAD)

## Recomendações imediatas BMAD
- Document-First: manter este inventário e evoluir PRD
- Ativar Test Architect nas fases: risco, design, trace, NFR, review, gate
- Adicionar smoke tests mínimos (API `/health`, `/db-check`, auth básica)
- Planejar remediações críticas antes de novas features
