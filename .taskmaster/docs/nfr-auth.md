# NFR - Requisitos Não Funcionais para Autenticação
## Sistema Laura - Baseline de Qualidade

> **Story**: Refatorar Auth para Prisma (User + RefreshToken) — Opção B  
> **Data**: Janeiro 2025  
> **Status**: Baseline Definido

---

## 🧭 Baseline (Resumo)

- Performance p95: `GET /health`, `POST /auth/login`, `POST /auth/refresh` ≤ 300ms
- Erros 5xx: < 1% em dev e staging
- Logs estruturados: event, requestId, userId (quando autenticado)
- Rate limit: ativo nas rotas de auth
- Erros: mensagens claras, sem vazar dados sensíveis
- Métricas: expostas em `/metrics` (Prometheus); se indisponível, plano para habilitar

---

## 🎯 Visão Geral

Este documento estabelece os **Requisitos Não Funcionais (NFR)** para o sistema de autenticação do Sistema Laura, definindo métricas mensuráveis e critérios de aceite para garantir qualidade, segurança e experiência do usuário.

---

## ⚡ Performance

### Latência de Endpoints
| Endpoint | Métrica | Baseline | Critério de Aceite |
|----------|---------|-----------|-------------------|
| `GET /health` | p95 < 300ms | ≤ 50ms | ✅ Pass: ≤ 300ms<br>⚠️ Warning: 300-500ms<br>❌ Fail: > 500ms |
| `POST /auth/login` | p95 < 300ms | ≤ 200ms | ✅ Pass: ≤ 300ms<br>⚠️ Warning: 300-600ms<br>❌ Fail: > 600ms |
| `POST /auth/refresh` | p95 < 300ms | ≤ 150ms | ✅ Pass: ≤ 300ms<br>⚠️ Warning: 300-500ms<br>❌ Fail: > 500ms |

### Throughput
- **Mínimo**: 50 req/s por endpoint
- **Target**: 100 req/s por endpoint
- **Pico**: 200 req/s com degradação graceful

### Tempo de Resposta de Banco
- **Queries de autenticação**: < 100ms (p95)
- **Operações de refresh token**: < 50ms (p95)
- **Timeout de conexão**: 5s

---

## 🔧 Disponibilidade

### Taxa de Erro
| Ambiente | 5xx Errors | 4xx Errors | Uptime |
|----------|------------|------------|---------|
| **Development** | < 1% | < 5% | > 95% |
| **Staging** | < 1% | < 3% | > 98% |
| **Production** | < 0.5% | < 2% | > 99.5% |

### Recuperação de Falhas
- **MTTR (Mean Time To Recovery)**: < 5 minutos
- **Circuit Breaker**: Ativo em conexões DB
- **Graceful Degradation**: Auth funciona com cache local por 10min

### Monitoramento
- **Health Check**: Endpoint `/health` com status detalhado — Implementado
- **Métricas**: Endpoint `/metrics` habilitado via `prom-client` — Implementado
  - `http_request_duration_seconds{method,route,status_code}` — Histograma
  - `auth_requests_total{action, result}` — Contador (login, refresh, logout)
- **Logs Estruturados**: `winston` JSON com `service`, `requestId`, `userId` quando autenticado — Implementado
  - Correlação adicionada em `apps/api/src/app.ts` e `auth.middleware.ts`
  - Eventos: `auth.route.*`, `auth.login.*`, `auth.refresh.*`, `auth.logout.*`
- **Alertas**: Slack/email para > 2% de erro em 5min — Planejado

---

## 🔐 Segurança

### Rate Limiting
```yaml
Configuração de Rate Limit:
  /auth/login:
    - 5 tentativas por IP/15min
    - 10 tentativas por IP/hora
  /auth/refresh:
    - 20 tentativas por token/hora
    - 50 tentativas por IP/hora
  /auth/*:
    - 100 requests por IP/hora (global)
```

### Gestão de Tokens
- **JWT Access Token**: 15 minutos de vida
- **Refresh Token**: 30 dias, rotacionado a cada uso
- **Algoritmo**: RS256 com chaves RSA-2048
- **Revogação**: Blacklist ativa em Redis/DB

### Logs de Segurança
```json
{
  "timestamp": "2025-01-XX",
  "level": "SECURITY",
  "event": "auth_attempt",
  "requestId": "req-123456",
  "userId": "user-uuid-when-authenticated",
  "ip": "masked",
  "user_agent": "masked",
  "success": false,
  "reason": "invalid_credentials",
  "attempt_count": 3
}
```

### Critérios de Aceite - Segurança
- ✅ **Rate limit implementado** com headers informativos
- ✅ **Logs estruturados** para todos os eventos de auth, incluindo `requestId` e `userId` (quando autenticado)
- ✅ **Tokens seguros** com rotação automática
- ✅ **Validação de entrada** com sanitização
- ✅ **Headers de segurança** (HSTS, CSP, X-Frame-Options)

---

## 👤 Usabilidade

### Experiência de Erro
| Cenário | Resposta | Feedback ao Usuário |
|---------|----------|-------------------|
| **Credenciais inválidas** | 401 | "Email ou senha incorretos" |
| **Conta bloqueada** | 423 | "Conta temporariamente bloqueada. Tente em 15 minutos" |
| **Token expirado** | 401 | "Sessão expirada. Faça login novamente" |
| **Rate limit excedido** | 429 | "Muitas tentativas. Aguarde 15 minutos" |
| **Erro interno** | 500 | "Erro temporário. Tente novamente em instantes" |

### Lockout e Recuperação
- **Lockout temporário**: 15 minutos após 5 tentativas
- **Feedback visual**: Contador de tentativas restantes
- **Auto-unlock**: Automático após período
- **Bypass admin**: Disponível para suporte

### Tempos de Resposta UX
- **Feedback visual**: Loading state em < 100ms
- **Indicador de progresso**: Para operações > 1s
- **Timeout de sessão**: Aviso 2min antes da expiração

---

## 📊 Métricas Mensuráveis

### Métricas de Performance
```yaml
Coleta Automática:
  - response_time_histogram (buckets: 0.1, 0.3, 0.6, 1, 3, 5s)
  - request_count_total (labels: endpoint, status, method)
  - active_sessions_gauge
  - token_generation_duration_histogram
  - database_query_duration_histogram
```

### Métricas de Segurança
```yaml
Eventos Monitorados:
  - failed_login_attempts_total
  - rate_limit_violations_total  
  - token_validation_failures_total
  - suspicious_activity_events_total
  - account_lockout_events_total
```

### Métricas de Negócio
```yaml
KPIs:
  - successful_login_rate (%)
  - session_duration_avg (minutes)
  - token_refresh_success_rate (%)
  - user_lockout_frequency
  - security_incident_count
```

---

## ✅ Critérios de Aceite Finais

### Performance ✅
- [ ] **P95 latência** ≤ 300ms para todos os endpoints críticos
- [ ] **Throughput** ≥ 50 req/s sustentado por 10 minutos
- [ ] **Tempo de resposta DB** < 100ms para queries de auth

### Disponibilidade ✅  
- [ ] **Taxa de erro 5xx** < 1% em ambiente de staging
- [ ] **Uptime** > 98% medido em 7 dias consecutivos
- [x] **Health check** responde em < 50ms (baseline local)
- [x] **Endpoint `/metrics`** exposto

### Segurança ✅
- [ ] **Rate limiting** funcional com contadores precisos
- [ ] **Logs estruturados** para 100% dos eventos de auth
- [ ] **Tokens JWT** validados com algoritmo RS256
- [ ] **Refresh tokens** rotacionados a cada uso

### Usabilidade ✅
- [ ] **Mensagens de erro** claras e informativas, sem detalhes sensíveis
- [ ] **Lockout temporário** com feedback de tempo restante
- [ ] **Loading states** visíveis em < 100ms
- [ ] **Timeout de sessão** com aviso prévio

---

## 🔄 Processo de Validação

### Testes Automatizados
1. **Performance**: K6/Artillery com cenários de carga
2. **Segurança**: OWASP ZAP + testes manuais
3. **Funcional**: Jest/Vitest com cobertura > 80%
4. **E2E**: Playwright para fluxos críticos

### Ambiente de Teste
- **Staging**: Dados sintéticos + cenários reais
- **Load Testing**: Ambiente dedicado com dados de produção anonimizados
- **Security Testing**: Ambiente isolado com ferramentas especializadas

### Aprovação
- [ ] **Tech Lead**: Validação técnica dos NFRs
- [ ] **QA**: Execução de testes automatizados
- [ ] **DevOps**: Validação de métricas e alertas
- [ ] **Product Owner**: Aprovação de critérios de UX

---

## 📈 Roadmap de Melhorias

### Fase 1 - Baseline (Atual)
- Implementação de métricas básicas
- Rate limiting fundamental
- Logs estruturados

### Fase 2 - Otimização (Q2 2025)
- Cache inteligente de sessões
- Métricas avançadas com ML
- Detecção de anomalias

### Fase 3 - Excelência (Q3 2025)
- Zero-downtime deployment
- Adaptive rate limiting
- Segurança comportamental

---

**Documento versionado**: v1.0  
**Próxima revisão**: Março 2025  
**Responsável**: Equipe de Desenvolvimento Sistema Laura

---

## 🔗 Evidências e Vínculos
- Código: `apps/api/src/app.ts` — middleware de `requestId`, `timingMiddleware`, `/metrics`
- Código: `apps/api/src/auth/auth.routes.ts` — contadores `auth_requests_total` por ação/resultado
- Código: `apps/api/src/auth/auth.middleware.ts` — logs com `requestId`/`userId`
- Código: `packages/observability/src/metrics.ts` — definição de métricas
- Código: `packages/observability/src/logger.ts` — `createRequestLogger`
