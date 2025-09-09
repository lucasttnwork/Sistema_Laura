## Título
refactor(auth): migrar autenticação para Prisma e fortalecer JWT/Permissões

## O que / Por quê (BMAD)
- Implementa refatoração do módulo de autenticação para utilizar Prisma como ORM unificado, reduzindo dívida técnica e padronizando acesso a dados.
- Fortalece a geração/validação de JWT, revisão de escopos e middleware de permissões, alinhando-se às práticas de segurança e aos requisitos de auditoria.
- Melhora observabilidade (logs/metrics) e testabilidade (isolação de camadas, mocks) para facilitar troubleshooting e cobertura automatizada.

Referências:
- Test Architect (design/trace): `.taskmaster/docs/test-architect-auth.md`
- NFRs (desempenho, segurança, confiabilidade): `.taskmaster/docs/nfr-auth.md`
- Riscos e mitigação: `.taskmaster/docs/riscos.md`
- Gates pré-merge: `.taskmaster/docs/gates.md`
- Evidências: `.taskmaster/docs/evidencias-auth-prisma/`

## Escopo principal
- Migração de autenticação para Prisma (entidades de usuário/sessão/refresh-token).
- Reforço de JWT (claims mínimos, expiração, rotação de refresh, verificação de audience/issuer quando aplicável).
- Padronização de `auth.middleware` e `permissions` com checagem explícita de papéis/escopos.
- Ajustes de testes E2E/smoke e unitários para nova camada de dados.

## Riscos e Mitigação
Consultar `.taskmaster/docs/riscos.md`. Principais pontos resumidos:
- Mudança de camada de dados pode introduzir regressões: cobertura de testes e smoke em ambiente isolado; plano de rollback abaixo.
- Rotação de tokens: risco de invalidação indevida — mantida compatibilidade de claims e janela de tolerância; feature flag se aplicável.
- Migrações de banco: executar em janela controlada; validar dry-run e backup antes do deploy.

## Test Architect (Design/Trace) e Evidências
- Design/Trace: ver `.taskmaster/docs/test-architect-auth.md` (matriz de casos, fixtures e isolamento por camada).
- NFRs: ver `.taskmaster/docs/nfr-auth.md` com critérios mensuráveis (latência, throughput, taxa de erro, segurança).
- Evidências anexadas em `.taskmaster/docs/evidencias-auth-prisma/`, incluindo (amostra):
  - `build.log`, `install.log`, `lint.log`, `test.log`
  - `api-typecheck*.txt`, `workspace-list-typescript.txt`
  - `docker-up.log`, `smoke-health.txt`/`smoke-health.json`, `smoke-db-check.txt`/`.json`
  - `prisma-generate.txt`, `prisma-migrate.txt`, `prisma-seed.txt`, `migrate.log`, `seed.log`
  - `RESUMO-GATE.md` (consolidação do gate)

## NFRs (com evidências)
- Desempenho: latência p50/p95 validada nos smoke/health; ver arquivos em evidências e `.taskmaster/docs/nfr-auth.md`.
- Confiabilidade: testes de inicialização e conexão DB (smoke-db-check) sem erros.
- Segurança: validação de escopos/perfis em `permissions`; JWT com expiração/assinado e rotação de refresh.

## Gate Pré-Merge (Checklist)
Checklist consolidado conforme `.taskmaster/docs/gates.md` e evidências em `evidencias-auth-prisma/`:
- [x] Build e typecheck sem erros (ver `build.log`, `api-typecheck-final.txt`).
- [x] Linting sem violações bloqueantes (`api-lint-final.txt`).
- [x] Testes unitários e de autenticação aprovados (`api-test-auth.txt`, `test.log`).
- [x] Smoke/health OK (`smoke-health.txt`/`.json`), DB OK (`smoke-db-check.txt`/`.json`).
- [x] Migrações Prisma validadas em ambiente de teste (`prisma-migrate.txt`, `migrate.log`).
- [x] Evidências compiladas (`RESUMO-GATE.md`).

## Rollback (Procedimento Detalhado)

### 🔄 **Estratégia de Rollback**
- **RTO (Recovery Time Objective)**: < 15 minutos
- **RPO (Recovery Point Objective)**: < 5 minutos de dados
- **Janela de Manutenção**: Fora do horário comercial (20h-6h)

### 📊 **Passos de Rollback**

#### **1. Banco de Dados (Prisma)**
```bash
# PRODUÇÃO - Rollback de migração
prisma migrate resolve --rolled-back 20250909025817_migration_2
prisma migrate deploy  # aplicar estado anterior

# STAGING/DEV - Reset completo (apenas se necessário)
prisma migrate reset --force
prisma db seed
```

#### **2. Aplicação**
```bash
# Redeploy da versão anterior
git checkout <tag-anterior-estavel>
railway deploy  # ou plataforma equivalente

# Verificar variáveis de ambiente
railway variables  # validar JWT_SECRET, DATABASE_URL, etc.
```

#### **3. Validação Pós-Rollback**
```bash
# Health checks básicos
curl -f http://localhost:3001/health
curl -f http://localhost:3001/db-check

# Teste de auth com credenciais conhecidas
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sistema.com", "password": "admin123"}'
```

### ⚠️ **Considerações Críticas**
- **Tokens JWT**: Tokens emitidos durante janela de falha podem precisar ser invalidados
- **Refresh Tokens**: Manter compatibilidade com tokens válidos anteriores
- **Backup**: Backup automático antes de qualquer migração
- **Comunicação**: Notificar usuários sobre interrupção temporária
- **Monitoramento**: Validar métricas de performance pós-rollback

### 🎯 **Critérios de Sucesso do Rollback**
- [ ] Health checks 200 OK por 5+ minutos
- [ ] Login/logout funcionando normalmente
- [ ] Zero erros 5xx nos logs
- [ ] Latência < 300ms (baseline NFR)
- [ ] Todas as funcionalidades críticas operacionais

## Instruções de Deploy
- Executar migrações com `prisma migrate deploy` antes do roll-out do serviço.
- Verificar healthcheck e autenticação básica (login/refresh) pós-deploy.
- Monitorar logs e métricas de autenticação nas primeiras horas.

## Impacto e Compatibilidade
- Endpoints de autenticação mantidos; alterações internas de persistência (Prisma).
- Tokens existentes continuam válidos até expiração; fluxo de refresh compatível.

## Itens de Follow-up (se aplicável)
- Harden adicional de headers de segurança em gateway/reverse-proxy.
- Testes de carga focados em endpoints de login/refresh.

## Solicitação de Review
- QA: validação funcional/regressão dos fluxos de login/refresh/permissions.
- Security: revisão de claims JWT, tempo de expiração, rotação de refresh, e matriz de permissões.

Labels sugeridos: `security`, `backend`, `qa`.
Reviewers sugeridos: Equipes/usuários de QA e Security do repositório.


