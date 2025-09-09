# @bmad/whatsapp-zapi

Pacote de integração com WhatsApp via Z-API para o sistema Laura 01.

## Funcionalidades

- ✅ Envio de mensagens de texto
- ✅ Envio de mensagens com mídia
- ✅ Processamento de mensagens recebidas
- ✅ Formatação automática de mapas de cotação
- ✅ Logging integrado com observabilidade
- ✅ Tratamento de erros robusto

## Configuração

### Variáveis de Ambiente

```bash
# Z-API Configuration
ZAPI_API_URL=https://api.z-api.io
ZAPI_API_TOKEN=your_zapi_token_here
ZAPI_INSTANCE_ID=your_instance_id_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bmad

# Redis
REDIS_URL=redis://localhost:6379
```

### Uso Básico

```typescript
import { ZAPIClient, WhatsAppMessageHandler } from '@bmad/whatsapp-zapi';

// Configurar cliente Z-API
const zapiClient = new ZAPIClient({
  apiUrl: process.env.ZAPI_API_URL!,
  apiToken: process.env.ZAPI_API_TOKEN!,
  instanceId: process.env.ZAPI_INSTANCE_ID!
});

// Configurar handler de mensagens
const messageHandler = new WhatsAppMessageHandler(zapiClient);

// Enviar mensagem
await zapiClient.sendMessage('+5511999999999', 'Olá! Sou Laura 01 da Kabbatec.');

// Processar mensagem recebida
await messageHandler.processMessage({
  id: 'msg123',
  from: '+5511988888888',
  to: '+5511999999999',
  body: 'Preciso solicitar materiais',
  timestamp: Date.now(),
  type: 'text'
});
```

## Estrutura do Pacote

```
packages/whatsapp-zapi/
├── src/
│   ├── index.ts          # Exportações principais
│   ├── zapi-client.ts    # Cliente Z-API
│   ├── message-handler.ts # Handler de mensagens
│   └── types.ts          # Definições TypeScript
├── package.json
├── tsconfig.json
└── README.md
```

## Dependências

- `axios`: Cliente HTTP para comunicação com Z-API
- `@bmad/observability`: Logging e tracing integrado

## Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Desenvolvimento com watch
pnpm dev

# Build
pnpm build

# Testes
pnpm test
```

## Integração com Laura 01

Este pacote foi desenvolvido especificamente para o sistema Laura 01, implementando:

- Processamento de solicitações de materiais
- Envio automático de cotações para fornecedores
- Formatação de mapas de cotação
- Comunicação bidirecional com fiscais de obra
