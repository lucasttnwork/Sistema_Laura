# Dashboard do Sistema Laura (Vite + React)

Stack consolidada em Vite (porta 3001) com React 18, Tailwind e Playwright. Este dashboard funciona como um "espelho" do banco de dados do Supabase, exibindo dados em tempo real das tabelas principais (`solicitacoes`, `cotacoes`, `obras`, `fornecedores`, `fiscais`, `contatos`).

## Design System & Tokens
- Tokens e componentes consolidados em `.taskmaster/docs/ui-design-system.md`.
- Paleta base: `background`, `surface`, `primary`, `muted`, `positive`, `warning`, `danger`.
- Escala de spacing 0–96 (incrementos de 0.25rem), sombras `soft|medium|strong` e radius `sm|md|lg|full`.
- Fonts: `Inter` para texto corrido e `Lexend` para headings.
- `data-testid`: `page-heading-<rota>` para headings, `btn-<acao>-<contexto>` em botoes (novo/salvar/cancelar/logout), `badge-<contexto>` e listas/tabelas com sufixos `*-card`/`*-table`; confirme expostos via `ConfirmDialog` com `confirmDataTestId`/`cancelDataTestId`.
- Componentes centrais: `Heading`, `Button`, `Card`, `Input`, `Badge`, `Alert`, `Dialog`.

## Scripts principais (pnpm)
- dev: inicia Vite
- build: build de producao
- preview: preview do build
- lint / lint:fix: ESLint em src
- type-check: tsc sem emitir
- test:playwright / test:playwright:ui: testes E2E

## Requisitos locais
- Node 18+
- pnpm 9+
- Variaveis de ambiente do Supabase em `.env`

Crie um `.env` em `apps/dashboard` com:

```
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

Obs.: existem fallbacks em `src/lib/supabaseClient.ts`, mas recomenda-se uso do `.env`.

## Fluxo local recomendado
1. pnpm install
2. pnpm --filter @bmad/dashboard dev
3. Acesse http://localhost:3001
4. pnpm --filter @bmad/dashboard type-check
5. pnpm --filter @bmad/dashboard test:playwright (opcional)

### Dicas Playwright
- Use `PLAYWRIGHT_TEST_BASE_URL` para alterar a origem (default http://localhost:3001).
- Para rodar apenas Chromium: `pnpm --filter @bmad/dashboard test:playwright --project=chromium`.
- Os relatorios HTML ficam em `apps/dashboard/playwright-report/index.html`.
- Resultados JUnit sao gravados em `apps/dashboard/test-results/junit.xml`.

### Dados de teste padrao
- Usuario: whatsapp 11943681101@login.local
- Senha: senha123

## Observabilidade & Performance
- Error tracking habilitado via `apps/dashboard/src/lib/observability.ts`, iniciado em `src/main.tsx`.
- `ErrorBoundary` global captura falhas de render e exibe fallback com `data-testid="error-boundary"`.
- Use `useErrorReporter()` para log manual em fluxos específicos.
- Envio remoto depende de `VITE_ERROR_REPORT_URL` e `VITE_ENABLE_ERROR_TRACKING`; desabilite em dev deixando a URL vazia ou forçando `false`.
- Lighthouse local: `pnpm --filter @bmad/dashboard lighthouse:all` (ou `:desktop`, `:mobile`), relatórios em `apps/dashboard/lh-report`.
- Workflow `dashboard-lh.yml` roda os testes Lighthouse no CI e publica os artefatos + log (`apps/dashboard/lhci-output.log`).
- Detalhes completos em `.taskmaster/docs/observabilidade-performance.md`.

## Pipeline CI
- Workflow: `.github/workflows/dashboard-e2e.yml`
- Etapas: pnpm install, type-check, build, playwright headless com artefatos
- Segredos esperados no repositorio: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Artefatos enviados: `apps/dashboard/playwright-report` e `apps/dashboard/test-results`

## Troubleshooting
- Certifique-se de que as tabelas do Supabase estao com dados basicos para nao falhar nos CRUDs.
- Se o dev server ja estiver ativo, defina `PLAYWRIGHT_SKIP_WEB_SERVER=1`.
- Playwright utiliza `data-testid` em titulos principais para evitar falhas por acentos/emojis.
- Dialogos longos contam com scroll interno (`overflow-y-auto` e `max-h`) para manter botoes acessiveis.

Notas:
- Residuos de Next/Cypress foram removidos deste pacote.
- Politicas Supabase nao foram alteradas.
