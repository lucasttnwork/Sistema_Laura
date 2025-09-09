## BMAD Base Context — Sistema Laura (Brownfield)

Este arquivo fornece o contexto mínimo completo para qualquer agente continuar o trabalho seguindo o BMAD Method neste repositório. Contém: estado atual, referências a arquivos, configuração de MCPs, uso de agentes BMAD, prompts prontos, comandos essenciais, gates e próximos passos. Use-o como “documento base” ao iniciar novos chats.

### 1) Repositório e Referências
- Repositório GitHub: `https://github.com/lucasttnwork/Sistema_Laura.git`
- Tag de trabalho preferida no Taskmaster: `bmad-method`
- Arquivos locais relevantes:
  - PRD: `=.taskmaster/docs/prd.txt`
  - Inventário: `=.taskmaster/docs/inventario-atual.md`
  - Test Architect (Auth): `.taskmaster/docs/test-architect-auth.md`
  - Gates: `.taskmaster/docs/gates.md` (criar/atualizar se ausente)
  - Config MCP (Cursor): `.cursor/mcp.json`
  - API (principais): `apps/api/src/app.ts`, `apps/api/src/auth/auth.routes.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/jwt.service.ts`, `apps/api/src/auth/auth.middleware.ts`, `apps/api/src/auth/permissions.ts`, `apps/api/src/auth/types.ts`
  - Prisma: `packages/prisma/schema.prisma`, `packages/prisma/seeds/seed.ts`

### 2) BMAD Docs (fontes oficiais)
- Working in the Brownfield: [link](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/docs/working-in-the-brownfield.md)
- Enhanced IDE Development Workflow: [link](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/docs/enhanced-ide-development-workflow.md)
- User Guide: [link](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/docs/user-guide.md)
- Core Architecture (agentes, fluxos, checklists): [link](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/docs/core-architecture.md)

### 3) MCPs configurados (Cursor)
- Servidores MCP esperados em `.cursor/mcp.json`:
  - BMAD-METHOD Docs (GitMCP): carrega a documentação BMAD para consulta.
  - task-master-ai (Taskmaster via MCP): gerencia tasks/tags/subtasks/gates.
  - GitHub MCP: interação com repositórios git via MCP.
- Variáveis de ambiente (não commitar segredos):
  - Definir `GITHUB_PERSONAL_ACCESS_TOKEN` no sistema (PAT escopo `repo`).
  - Não guardar o token dentro do arquivo `.cursor/mcp.json`.

Exemplo (conceitual) de entrada MCP GitHub em `.cursor/mcp.json` (sem segredo hardcoded):
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "disabled": false
    }
  }
}
```
Defina no PowerShell (persistência por usuário):
```powershell
[System.Environment]::SetEnvironmentVariable("GITHUB_PERSONAL_ACCESS_TOKEN","SEU_TOKEN_AQUI","User")
```

### 4) Tom de agente (Personalidade “Ícarus”)
Quando guiar pelo BMAD neste projeto, adote tom didático, direto e bem-humorado, exemplo:
- “Mano, vou te contar como esse trem funciona…”
- “Meu querido, nem em um milhão de anos…”
- “Rapaiz… Esse trem vai ser top demais.”
Falar simples, com alto rigor técnico, explicando conceitos complexos de forma progressiva. Priorizar passos curtos, verificáveis e com evidência.

### 5) Estado atual (resumo)
- Abordagem: Brownfield seguindo BMAD.
- Decisão estruturante: Opção B (alinhar código ao Prisma) para autenticação.
- Autenticação: JWT + RefreshToken em tabela dedicada; `User.password` dedicada; permissões derivadas por cargo em tempo de execução.
- Documentos:
  - PRD e Inventário: presentes e alinhados ao brownfield.
  - Test Architect (Design + Trace) para Auth salvo em `.taskmaster/docs/test-architect-auth.md`.
- Taskmaster:
  - Tag: `bmad-method` ativa.
  - Tarefa 2 “Implement Authentication System” em progresso.
  - Subtask criada: “Refatorar Auth para Prisma (User + RefreshToken) — Opção B”.
- Repositório: Git inicializado e publicado no GitHub.

### 6) Fluxo BMAD (Brownfield) que seguimos
1. Documentar antes de refatorar (Inventário + PRD).
2. Planejar no Taskmaster (tag dedicada) e priorizar riscos.
3. Test Architect em ciclos: risk → design → trace → nfr → gate.
4. Implementar com rastreabilidade (tasks ↔ código ↔ testes ↔ evidência).
5. Passar por gates (pré-merge → staging → produção) com prova.

### 7) Agentes BMAD — quando usar
- PM (`@pm`): criar/atualizar PRD brownfield (épicos/histórias, integração).
- Architect (`@architect`): documentar projeto, desenhar integração/migração.
- SM/Planner (Taskmaster): quebrar/encadear tasks e subtarefas.
- Test Architect (`@qa`): risk, design, trace, nfr, gate.
- Dev: implementar histórias uma a uma, com evidência e testes.
- Reviewer/Release: revisão técnica, pipeline e release com rollback.

### 8) Prompts prontos (colar em novos chats)

8.1) Realinhar plano no Taskmaster (tag `bmad-method`)
```text
Atualize o plano no Taskmaster (tag `bmad-method`):
- Em “Implement Authentication System”, certifique que existe a subtask: “Refatorar Auth para Prisma (User + RefreshToken) — Opção B”.
- Critérios de aceite: login/refresh/logout OK; tokens na tabela RefreshToken; senha em `User.password`; rota protegida 200 com Bearer.
- Vincule à documentação: .taskmaster/docs/test-architect-auth.md, riscos e gates.
```

8.2) Test Architect — Risk
```text
@qa
*risk {story: “Refatorar Auth para Prisma (User + RefreshToken)”}
Liste risco, probabilidade, impacto, mitigação, evidência esperada, dono e prioridade. Relacione com a subtask do Taskmaster.
```

8.3) Test Architect — Design e Trace
```text
@qa
*design {story: “Refatorar Auth para Prisma (User + RefreshToken)”}
Casos: login ok/ko, refresh ok/ko (revogado/expirado), protegida 200/401, logout, logout-all. Dados de seed, endpoints, entradas/saídas.

@qa
*trace {story: “Refatorar Auth para Prisma (User + RefreshToken)”}
Mapa task ↔ arquivos ↔ testes ↔ commit/PR. Tabela de rastreabilidade. Salvar/atualizar em `.taskmaster/docs/test-architect-auth.md`.
```

8.4) Test Architect — NFR
```text
@qa
*nfr {story: “Refatorar Auth para Prisma (User + RefreshToken)”}
Defina baseline: p95 < 300ms (/health, /auth/login, /auth/refresh), 5xx < 1% dev/staging, logs estruturados, rate limit ativo, mensagens de erro claras.
Salvar em `.taskmaster/docs/nfr-auth.md`.
```

8.5) Test Architect — Gate (pré-merge)
```text
@qa
*gate {pre-merge for: “Refatorar Auth para Prisma (User + RefreshToken)”}
Checklist objetivo: build/type-check/lint OK; smoke (/health, /db-check) OK; testes auth básicos OK; migrations/seed aplicadas; evidências anexadas.
Atualizar `.taskmaster/docs/gates.md`.
```

### 9) Comandos essenciais

9.1) Taskmaster (MCP/CLI)
```powershell
npx -y task-master-ai list --with-subtasks
npx -y task-master-ai next
npx -y task-master-ai set-status --id=2 --status=in-progress
```

9.2) Prisma e Seeds
```powershell
pnpm --filter @bmad/prisma prisma generate
pnpm --filter @bmad/prisma prisma migrate dev --schema packages/prisma/schema.prisma
pnpm --filter @bmad/prisma tsx packages/prisma/seeds/seed.ts
```

9.3) API (build/test/dev)
```powershell
pnpm --filter @bmad/api build
pnpm --filter @bmad/api test
pnpm --filter @bmad/api dev
```

### 10) Autenticação — pontos de implementação
- Substituir `prisma.usuario*` → `prisma.user*` nos serviços/rotas/middlewares.
- Guardar refresh tokens na tabela `RefreshToken` (não em JSON de permissions).
- Usar `User.password` (bcrypt) em vez de hash em JSON.
- Derivar permissões por cargo via `getPermissionsByCargo` e incluí-las no JWT.
- Seed consistente com regex de login (ex.: `+55` no WhatsApp).
- Testes automatizados: login, rota protegida, refresh (ok/ko), logout, logout-all.

### 11) Gates — evidência esperada (pré-merge)
- Build, type-check e lint OK.
- Smoke: `/health` e `/db-check` OK.
- Testes auth básicos passando (login, protegida, refresh, logout).
- Migrations/seed aplicadas (prints/saídas anexadas).
- Evidências linkadas em `.taskmaster/docs/gates.md` e `.taskmaster/docs/test-architect-auth.md`.

### 12) Próximos passos sugeridos
1. Concluir/validar refatoração de Auth (Opção B) e fechar gate pré-merge.
2. Reconciliar rotas de negócio com o schema atual (Solicitação/Cotação/Aprovação).
3. Confirmar observabilidade (`/metrics`) e logs estruturados.
4. Montar pipeline CI com gates (lint/type/test/build/smoke) e artefatos de evidência.
5. Staging com rollback ensaiado; depois produção com monitoramento ativo.

### 13) Boas práticas BMAD (essência)
- Documente antes de mexer; não refatore às cegas.
- Uma história por vez; passe por risk/design/trace/nfr/gate sempre que aplicável.
- Evidência > opinião: anexe saídas/prints/links.
- Rastreabilidade ponta a ponta (PRD → task → código → teste → release).
- Segurança de segredos: tokens apenas em variáveis de ambiente.

---
Se você é um novo agente: leia este arquivo por completo, confira os documentos em `.taskmaster/docs/`, sincronize o Taskmaster (tag `bmad-method`), aplique o fluxo do Test Architect na história ativa e prossiga com os “Próximos passos sugeridos”.


### 14) Flatten e Sharding (BMAD — recomendado em Brownfield)
- Quando usar Web Agents (ex.: Gemini) para documentação/planejamento com contexto amplo:
  - Gere um arquivo único da base de código:
  ```bash
  npx bmad-method flatten
  ```
  - Faça upload do `flattened` ou forneça a URL do GitHub ao agente. Referência: Working in the Brownfield [link](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/docs/working-in-the-brownfield.md)
- Em IDE (Cursor), salve documentos em `.taskmaster/docs/` e use o PO para “shard” quando indicado:
```text
@po
shard docs/brownfield-prd.md

@po
shard docs/brownfield-architecture.md
```
- Sequência de agentes típica (planejamento brownfield):
```text
@architect → *document-project
@pm        → *create-brownfield-prd
@architect → *create-brownfield-architecture
@po        → *execute-checklist-po
```

### 15) Feature flags e Rollback (boas práticas BMAD)
- Ative feature flags para mudanças de risco (liberação controlada).
- Mantenha plano de rollback testado (pré-release): reversão de deploy e de migrações.
- Migrações reversíveis e dados críticos com backup/máscara em ambientes não-prod.
- Paridade de ambientes (dev ≈ staging ≈ prod dentro do razoável) e monitoramento pós-deploy.

### 16) Troubleshooting Brownfield (conforme docs)
- “AI não entende o codebase”: reexecute `*document-project` com caminhos específicos ou use `npx bmad-method flatten`. [link](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/docs/working-in-the-brownfield.md)
- “Planos não batem com nossos padrões”: atualize a documentação com convenções do time antes de planejar.
- “Muito boilerplate para mudança pequena”: use `@pm → *create-brownfield-story` ao invés de fluxo completo.
- “Pontos de integração confusos”: adicione contexto sobre sistemas envolvidos na criação do PRD.

### 17) Como iniciar um novo chat neste repositório (passo a passo)
1. Diga ao agente para usar este arquivo como base: “Leia `BMAD_CONTEXT.md` e sincronize contexto”.
2. Confirme tag no Taskmaster: `bmad-method`; liste `next` e status.
3. Se for planejamento: execute a sequência de agentes (document-project → PRD → arquitetura → checklist PO) e shard docs.
4. Se for execução: aplique ciclo Test Architect (risk → design → trace → nfr → gate) na história ativa.
5. Exija evidências de gate (build, testes, smoke, migrations/seed) anexadas em `.taskmaster/docs/`.
6. Abra PR com descrição BMAD (o que/por quê/risco/evidências) e solicite review QA.


