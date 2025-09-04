# BMAD Monorepo (scaffold)

Estrutura inicial do monorepo para o projeto Laura 01 System.

- Gerenciador: pnpm workspaces
- Orquestração: Turborepo
- Apps: `apps/api`, `apps/worker`, `apps/dashboard`
- Pacotes: `packages/shared`, `packages/types`, `packages/tsconfig`

Comandos (executar dentro de `bmad/`):

- `pnpm dev` — roda `turbo run dev` em paralelo
- `pnpm build` — build de todos os workspaces
- `pnpm lint` — lint em todos os workspaces
- `pnpm test` — testes em todos os workspaces

Próximos passos: Docker Compose (Postgres/Redis) e Prisma.
