#!/bin/bash

#!/bin/bash

# Setup script for Sistema Laura
echo "🚀 Configurando Sistema Laura..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Instale Node.js 18+"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ é necessário. Versão atual: $(node -v)"
    exit 1
fi

# Verificar se PNPM está instalado
if ! command -v pnpm &> /dev/null; then
    echo "📦 Instalando PNPM..."
    npm install -g pnpm
fi

# Instalar dependências
echo "📦 Instalando dependências..."
pnpm install

# Copiar arquivo de ambiente
if [ ! -f .env ]; then
    echo "📋 Criando arquivo .env..."
    cp .env.example .env
    echo "⚠️  Configure o arquivo .env com suas configurações"
fi

# Perguntar sobre o tipo de banco de dados
echo ""
echo "🗄️  Qual banco de dados você deseja usar?"
echo "1) SQLite (recomendado para desenvolvimento - mais simples)"
echo "2) PostgreSQL (via Docker)"
read -p "Escolha (1/2) [1]: " db_choice
db_choice=${db_choice:-1}

if [ "$db_choice" = "2" ]; then
    echo "🐳 Iniciando PostgreSQL via Docker..."
    docker compose --profile postgres up -d

    # Aguardar PostgreSQL estar pronto
    echo "⏳ Aguardando PostgreSQL iniciar..."
    sleep 10

    # Atualizar .env para PostgreSQL
    sed -i 's/DB_PROVIDER="sqlite"/DB_PROVIDER="postgresql"/' .env
    sed -i 's/DATABASE_URL="file:.*"/DATABASE_URL="postgresql:\/\/postgres:password@localhost:5432\/laura_db?schema=public"/' .env
else
    echo "📱 Usando SQLite para desenvolvimento..."
fi

# Gerar cliente Prisma
echo "🗄️  Gerando cliente Prisma..."
pnpm prisma:generate

# Executar migrações
echo "🗄️  Executando migrações do banco..."
pnpm prisma:migrate --name init

# Popular banco com dados iniciais
echo "🌱 Populando banco com dados iniciais..."
pnpm seed

# Construir pacotes
echo "🔨 Construindo pacotes..."
pnpm build

echo ""
echo "✅ Setup concluído com sucesso!"
echo ""
echo "🚀 Próximos passos:"
echo "1. Configure o arquivo .env com suas chaves API (se necessário)"
echo "2. Execute 'pnpm dev' para iniciar os servidores de desenvolvimento"
echo "3. Acesse http://localhost:3001 para ver o dashboard"
echo ""
echo "📚 Comandos úteis:"
echo "• pnpm dev          - Iniciar desenvolvimento"
echo "• pnpm prisma:studio - Abrir Prisma Studio"
echo "• pnpm test         - Executar testes"
echo "• pnpm docker:up    - Iniciar serviços Docker (se usando PostgreSQL)"
echo ""
echo "🎯 Sistema Laura pronto para desenvolvimento!"
