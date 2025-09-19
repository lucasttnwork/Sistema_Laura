#!/bin/bash

# Script para limpar e reinstalar dependências do dashboard
echo "🧹 Limpando dependências antigas..."
rm -rf node_modules
rm -rf .next
rm -rf package-lock.json
rm -f yarn.lock

echo "📦 Instalando dependências..."
npm install

echo "✅ Instalação concluída!"
echo "🚀 Execute 'npm run dev' para iniciar o servidor de desenvolvimento"
