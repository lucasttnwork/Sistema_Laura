# 🚀 Projeto Laura - Sistema BMAD Isolado

## 📋 Visão Geral

O **Sistema Laura** é um agente de IA integrado a um Dashboard para automação de compras e solicitações de materiais em obras da Kabbatec. Utiliza o método BMAD (Backend Multi-Agent Distribution) e integração com WhatsApp via Z-API.

## 🏗️ Arquitetura do Sistema

### Componentes Principais

```
laura-01-system/
├── 📁 apps/                    # Aplicações executáveis
│   ├── api/                   # API Backend (Express + TypeScript)
│   ├── dashboard/             # Dashboard Administrativo
│   └── worker/                # Processamento Assíncrono (BullMQ)
│
├── 📁 packages/               # Pacotes compartilhados
│   ├── shared/                # Utilitários e tipos comuns
│   ├── prisma/                # Cliente de banco e schemas
│   ├── observability/         # Logging e tracing
│   └── whatsapp-zapi/         # Integração WhatsApp
│
├── 📁 docs/                   # Documentação específica
│   ├── api/                   # Documentação da API
│   ├── deployment/            # Guias de deploy
│   └── integration/           # Integrações externas
│
├── 📁 infrastructure/         # Configurações de infraestrutura
│   ├── docker/                # Dockerfiles e configs
│   ├── k8s/                   # Kubernetes manifests
│   └── monitoring/            # Configs de monitoramento
│
└── 📁 scripts/                # Scripts de automação
    ├── setup/                 # Scripts de configuração inicial
    ├── deployment/            # Scripts de deploy
    └── maintenance/           # Scripts de manutenção
```

## 🔧 Stack Tecnológica

### Backend & Infraestrutura
- **Node.js 18+** com TypeScript
- **Express.js** para API REST
- **Prisma ORM** para PostgreSQL
- **Redis** para cache e filas
- **BullMQ** para processamento assíncrono
- **Docker** para containerização

### Integrações
- **Z-API** para WhatsApp Business
- **PostgreSQL** como banco principal
- **Redis** para cache e filas

### Observabilidade
- **OpenTelemetry** para tracing
- **Winston** para logging estruturado
- **Zipkin** para visualização de traces

## 📦 Dependências Organizadas

### Core Dependencies
```json
{
  "@prisma/client": "^6.15.0",
  "express": "^5.1.0",
  "bullmq": "^5.34.0",
  "ioredis": "^5.4.1",
  "axios": "^1.6.0",
  "zod": "^3.22.4"
}
```

### Development Dependencies
```json
{
  "typescript": "^5.9.2",
  "tsx": "^4.20.5",
  "vitest": "^2.0.5",
  "eslint": "^8.54.0",
  "prettier": "^3.1.0"
}
```

## 🔐 Variáveis de Ambiente

### Obrigatórias
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/laura01

# WhatsApp Z-API
ZAPI_API_URL=https://api.z-api.io
ZAPI_API_TOKEN=your_token
ZAPI_INSTANCE_ID=your_instance

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret
```

### Opcionais
```bash
# Observability
LOG_LEVEL=info
ZIPKIN_URL=http://localhost:9411

# Application
NODE_ENV=production
PORT=3001
```

## 🚀 Como Executar

### Desenvolvimento
```bash
# Instalar dependências
pnpm install

# Configurar banco
pnpm prisma:migrate
pnpm prisma:seed

# Executar em modo dev
pnpm dev
```

### Produção
```bash
# Build
pnpm build

# Executar
pnpm start
```

### Com Docker
```bash
# Subir infraestrutura
docker-compose up -d postgres redis

# Executar aplicação
docker-compose up api worker dashboard
```

## 📊 Funcionalidades do Sistema

### 🤖 Agente Laura
- **Processamento de solicitações** de materiais
- **Comunicação via WhatsApp** com fiscais de obra
- **Envio automático de cotações** para fornecedores
- **Geração de mapas de cotação** formatados
- **Aprovação de compras** via workflow estruturado

### 🎯 Workflow Principal

1. **Recebimento de Solicitação**
   - Fiscal envia solicitação via WhatsApp
   - Validação automática dos dados
   - Confirmação de obra e responsável

2. **Processamento de Cotação**
   - Seleção automática de fornecedores
   - Envio de solicitações via WhatsApp
   - Coleta e validação de respostas

3. **Geração de Mapa**
   - Organização de cotações recebidas
   - Formatação profissional do mapa
   - Envio para aprovação do fiscal

4. **Aprovação e Compra**
   - Workflow de aprovação estruturado
   - Registro de decisões tomadas
   - Histórico completo da transação

## 🔄 Integrações

### WhatsApp via Z-API
```typescript
import { ZAPIClient, WhatsAppMessageHandler } from '@bmad/whatsapp-zapi';

const zapiClient = new ZAPIClient({
  apiUrl: process.env.ZAPI_API_URL!,
  apiToken: process.env.ZAPI_API_TOKEN!,
  instanceId: process.env.ZAPI_INSTANCE_ID!
});

const messageHandler = new WhatsAppMessageHandler(zapiClient);
```

### Banco de Dados
```typescript
import { prisma } from '@bmad/prisma';

const obra = await prisma.obra.findUnique({
  where: { id: obraId },
  include: { solicitacoes: true }
});
```

### Observabilidade
```typescript
import { logger, tracer } from '@bmad/observability';

logger.info('Processing request', { requestId });
const span = tracer.startSpan('process-solicitacao');
```

## 📈 Monitoramento

### Métricas Principais
- **Taxa de resposta** das solicitações
- **Tempo médio** de processamento
- **Taxa de aprovação** de cotações
- **Uptime** dos serviços

### Logs Estruturados
- **Requests/Responses** da API
- **Mensagens WhatsApp** processadas
- **Erros e exceções** com contexto
- **Performance** de operações críticas

## 🔒 Segurança

### Autenticação
- JWT para API endpoints
- Validação de números WhatsApp
- Controle de permissões por cargo

### Validações
- Sanitização de inputs
- Rate limiting por IP/usuário
- Validação de schemas com Zod

## 📚 Documentação

### Para Desenvolvedores
- [Arquitetura do Sistema](docs/architecture.md)
- [API Reference](docs/api/)
- [Guias de Integração](docs/integration/)

### Para Usuários
- [Manual do Usuário](docs/user-manual.md)
- [FAQ](docs/faq.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🚢 Deployment

### Pré-requisitos
- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- Docker (opcional)

### Passos de Deploy
1. **Configurar variáveis** de ambiente
2. **Executar migrations** do banco
3. **Build da aplicação**
4. **Configurar WhatsApp** Z-API
5. **Iniciar serviços**

## 🔧 Manutenção

### Tarefas Regulares
- **Backup** do banco de dados
- **Monitoramento** de logs
- **Atualização** de dependências
- **Revisão** de performance

### Troubleshooting
- [Logs de erro](logs/error.log)
- [Métricas de sistema](monitoring/metrics.json)
- [Status dos serviços](health/status.json)

---

## ✅ Checklist de Isolamento

- [x] **Estrutura de pastas** organizada
- [x] **Dependências** isoladas em packages
- [x] **Configurações** centralizadas
- [x] **Documentação** específica do projeto
- [x] **Scripts de automação** para setup/deploy
- [x] **Integração WhatsApp** implementada
- [x] **Observabilidade** configurada
- [x] **Testes** estruturados
- [x] **Docker** configurado
- [x] **CI/CD** preparado

**Status:** ✅ Projeto completamente isolado e organizado
