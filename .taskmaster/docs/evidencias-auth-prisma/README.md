# 📋 Evidências - Gate Pré-Merge: Refatoração Auth para Prisma

**Feature**: "Refatorar Auth para Prisma (User + RefreshToken) — Opção B"
**Gate**: 1.5 - Pré-Merge
**Data**: _A ser preenchida quando executado_

---

## 🎯 **CHECKLIST DE EVIDÊNCIAS**

Para aprovação no gate pré-merge, todas as evidências abaixo devem ser coletadas:

### **1. BUILD & TYPE-CHECK**
- [ ] `evidencia-build.png` - Screenshot do comando `pnpm --filter @bmad/api build` com exit 0
- [ ] `evidencia-typecheck.png` - Screenshot do comando `pnpm --filter @bmad/api type-check` com exit 0  
- [ ] `evidencia-lint.png` - Screenshot do comando `pnpm --filter @bmad/api lint` com exit 0

### **2. SMOKE TESTS**
- [ ] `evidencia-health.png` - Print do endpoint `/health` retornando 200
- [ ] `evidencia-db-check.png` - Print do endpoint `/db-check` validando Prisma/PostgreSQL
- [ ] `evidencia-docker.png` - Screenshot dos containers subindo sem erros

### **3. TESTES AUTH ESPECÍFICOS**
- [ ] `evidencia-login.png` - Print do POST `/auth/login` retornando JWT válido
- [ ] `evidencia-profile.png` - Print do GET `/auth/profile` com token válido (200)
- [ ] `evidencia-refresh.png` - Print do POST `/auth/refresh` rotacionando tokens
- [ ] `evidencia-logout.png` - Print do POST `/auth/logout` invalidando refresh token

### **4. MIGRATIONS & SEED**
- [ ] `evidencia-migrate.png` - Screenshot do `prisma migrate deploy` aplicado sem erro
- [ ] `evidencia-seed.png` - Screenshot do `prisma db seed` executado sem erro
- [ ] `evidencia-db-tables.png` - Screenshot das tabelas User + RefreshToken criadas

---

## 📝 **COMO COLETAR AS EVIDÊNCIAS**

### **Build & Type-Check**
```bash
# Na raiz do projeto
pnpm --filter @bmad/api build
pnpm --filter @bmad/api type-check  
pnpm --filter @bmad/api lint
```

### **Smoke Tests**
```bash
# Verificar se API está rodando
curl http://localhost:3001/health
curl http://localhost:3001/db-check
```

### **Testes Auth**
```bash
# 1. Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bmad.com","password":"admin123"}'

# 2. Profile (usar o token do login)
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer SEU_JWT_TOKEN"

# 3. Refresh (usar o refreshToken do login)
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"SEU_REFRESH_TOKEN"}'

# 4. Logout
curl -X POST http://localhost:3001/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"SEU_REFRESH_TOKEN"}'
```

### **Migrations & Seed**
```bash
# Na pasta packages/prisma
pnpm prisma migrate deploy
pnpm db:seed

# Verificar tabelas criadas
pnpm prisma studio  # ou verificar no DB diretamente
```

---

## ✅ **CRITÉRIOS DE APROVAÇÃO**

- **PASS**: ✅ Todos os 11 itens do checklist completos
- **FAIL**: ❌ Qualquer item falhando bloqueia o merge
- **CONDITIONAL**: ⚠️ Máximo 1 warning em lint (deve ser documentado)

---

## 📧 **NOTIFICAÇÃO PÓS-COLETA**

Após coletar todas as evidências:

1. ✅ Verificar que todos os 11 arquivos estão presentes
2. ✅ Confirmar que não há falhas críticas
3. ✅ Documentar qualquer warning encontrado
4. ✅ Proceder com o merge ou reportar bloqueios

**Responsável**: Desenvolvedor Backend
**Aprovação**: DevOps Engineer / Release Manager
