# Sistema Laura - Gestão de Compras e Materiais

Sistema completo de gestão de procurement para construção civil, com integração WhatsApp e dashboards em tempo real.

## 🚀 **Status do Desenvolvimento**

### ✅ **Concluído**
- ✅ Infraestrutura completa (API + Dashboard)
- ✅ Banco de dados SQLite configurado
- ✅ Autenticação JWT implementada
- ✅ Dashboard React funcional
- ✅ API REST completa com CRUD
- ✅ Seed com dados de exemplo
- ✅ Estrutura modular organizada

### 🔄 **Em Desenvolvimento**
- 🔄 Integração WhatsApp Business API
- 🔄 Sistema de aprovações hierárquicas
- 🔄 Notificações em tempo real
- 🔄 Upload de arquivos

### 📋 **Próximas Etapas**
- 📋 Configuração Supabase para produção
- 📋 Deploy na Railway
- 📋 Testes automatizados
- 📋 Documentação completa

## 🛠️ **Tecnologias Utilizadas**

### **Backend**
- **Node.js 18+** com TypeScript
- **Express.js** para API REST
- **Prisma ORM** com SQLite/PostgreSQL
- **JWT** para autenticação
- **Redis** para cache (opcional)

### **Frontend**
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para styling
- **React Router** para navegação
- **Axios** para chamadas HTTP

### **Banco de Dados**
- **SQLite** (desenvolvimento - mais simples)
- **PostgreSQL** (desenvolvimento via Docker)
- **Supabase** (produção)

## 📦 **Instalação e Configuração**

### **1. Pré-requisitos**
```bash
# Node.js 18+
node --version

# PNPM (gerenciador de pacotes)
npm install -g pnpm
```

### **2. Clone e Setup**
```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações
```

### **3. Configuração do Banco**
```bash
# Opção 1: SQLite (Recomendado para desenvolvimento)
# Já configurado por padrão no .env

# Opção 2: PostgreSQL via Docker
# Edite .env para usar PostgreSQL e execute:
pnpm docker:up

# Gerar cliente Prisma
pnpm prisma:generate

# Executar migrações
pnpm prisma:migrate

# Popular banco com dados de exemplo
pnpm seed
```

### **4. Executar o Sistema**
```bash
# Iniciar todos os serviços
pnpm dev

# Ou iniciar individualmente:
pnpm --filter=api dev      # API (porta 3000)
pnpm --filter=dashboard dev # Dashboard (porta 3001)
pnpm --filter=worker dev   # Worker (porta 3002)
```

### **5. Acessar o Sistema**
- **Dashboard**: http://localhost:3001
- **API**: http://localhost:3000
- **Prisma Studio**: `pnpm prisma:studio`

## 🔐 **Credenciais de Teste**

| Usuário | Cargo | WhatsApp | Senha |
|---------|-------|----------|-------|
| Laura Silva | Compradora | 5511999999999 | laura123 |
| João Santos | Fiscal | 5511988888888 | joao123 |
| Maria Oliveira | Gerente | 5511977777777 | maria123 |

## 📊 **Funcionalidades Implementadas**

### **Dashboard Executivo**
- 📈 Métricas em tempo real
- 📊 Gráficos de solicitações por status
- 🏆 Top fornecedores por volume
- 💰 Valores totais de cotações
- 📋 Timeline de atividades recentes

### **Gestão de Solicitações**
- ✅ Criar solicitações de materiais
- ✅ Vincular a obras específicas
- ✅ Upload de especificações técnicas
- ✅ Controle de status (Pendente/Aprovado/Reprovado)
- ✅ Histórico completo

### **Gestão de Fornecedores**
- ✅ Cadastro completo de fornecedores
- ✅ Classificação por categoria
- ✅ Controle de status (Ativo/Inativo)
- ✅ Histórico de performance

### **Sistema de Cotações**
- ✅ Distribuição automática para fornecedores
- ✅ Controle de prazos de resposta
- ✅ Comparativo de preços
- ✅ Histórico de alterações

### **Gestão de Obras**
- ✅ Cadastro de obras ativas
- ✅ Vinculação de fiscais responsáveis
- ✅ Controle de status
- ✅ Relatórios por obra

## 🏗️ **Arquitetura do Sistema**

```
Sistema Laura/
├── 📁 apps/                    # Aplicações executáveis
│   ├── 📁 api/                 # Backend Express + TypeScript
│   ├── 📁 dashboard/           # Dashboard React + Vite
│   └── 📁 worker/              # Processamento assíncrono
│
├── 📁 packages/                # Pacotes compartilhados
│   ├── 📁 prisma/              # Schema + migrações
│   ├── 📁 shared/              # Utilitários comuns
│   ├── 📁 observability/       # Logging + tracing
│   └── 📁 whatsapp-zapi/       # Integração WhatsApp
│
├── 📁 docs/                    # Documentação técnica
└── 📁 scripts/                 # Automação e utilitários
```

## 🔧 **Scripts Disponíveis**

```bash
# Desenvolvimento
pnpm dev                    # Iniciar todos os serviços
pnpm build                  # Build de produção
pnpm lint                   # Verificar código
pnpm test                   # Executar testes

# Banco de dados
pnpm prisma:generate        # Gerar cliente Prisma
pnpm prisma:migrate         # Executar migrações
pnpm prisma:studio          # Abrir Prisma Studio
pnpm seed                   # Popular banco com dados

# Docker
pnpm docker:up              # Iniciar containers
pnpm docker:down            # Parar containers

# Utilitários
pnpm clean                  # Limpar builds
pnpm setup                  # Setup inicial automatizado
```

## 🌐 **APIs Disponíveis**

### **Autenticação**
```
POST /auth/login
POST /auth/register
POST /auth/refresh
```

### **Obras**
```
GET    /api/obras
POST   /api/obras
GET    /api/obras/:id
PUT    /api/obras/:id
DELETE /api/obras/:id
```

### **Solicitações**
```
GET    /api/solicitacoes
POST   /api/solicitacoes
GET    /api/solicitacoes/:id
PUT    /api/solicitacoes/:id
DELETE /api/solicitacoes/:id
```

### **Fornecedores**
```
GET    /api/fornecedores
POST   /api/fornecedores
GET    /api/fornecedores/:id
PUT    /api/fornecedores/:id
DELETE /api/fornecedores/:id
```

### **Cotações**
```
GET    /api/cotacoes
POST   /api/cotacoes
GET    /api/cotacoes/:id
PUT    /api/cotacoes/:id
DELETE /api/cotacoes/:id
POST   /api/cotacoes/:id/approve
POST   /api/cotacoes/:id/reject
```

### **Dashboard**
```
GET /api/dashboard/stats
GET /api/dashboard/fornecedores/performance
GET /api/dashboard/obras/status
GET /api/dashboard/timeline
```

## 🚀 **Deploy para Produção**

### **Pré-requisitos para Produção**
1. Conta no Supabase
2. Conta na Railway
3. Domínio configurado (opcional)

### **Passos para Deploy**

#### **1. Configurar Supabase**
```bash
# Criar projeto no Supabase
# Configurar banco PostgreSQL
# Obter URL e chaves de API
```

#### **2. Configurar Railway**
```bash
# Conectar repositório
# Configurar variáveis de ambiente
# Deploy automático
```

#### **3. Migrações de Produção**
```bash
# Executar migrações no Supabase
pnpm prisma:migrate

# Executar seed de produção
pnpm seed
```

## 📚 **Documentação Adicional**

- [Arquitetura do Sistema](./docs/architecture/)
- [Guia de Desenvolvimento](./BMAD-Reinicializacao/README.md)
- [API Documentation](./docs/api/)
- [WhatsApp Integration](./packages/whatsapp-zapi/)

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 **Suporte**

Para suporte técnico ou dúvidas:
- Email: suporte@sistemalaura.com
- WhatsApp: +55 11 99999-9999
- Documentação: [docs.sistemalaura.com](https://docs.sistemalaura.com)

---

**🎉 Sistema Laura - Gestão inteligente de procurement para construção civil!**