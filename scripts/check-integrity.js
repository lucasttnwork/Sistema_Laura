#!/usr/bin/env node

/**
 * Script de verificação da integridade do projeto Laura 01
 * Verifica se todos os componentes estão presentes e configurados corretamente
 */

const fs = require('fs');
const path = require('path');

const CHECKLIST = {
  // Estrutura de pastas
  directories: [
    'apps/api',
    'apps/dashboard',
    'apps/worker',
    'packages/shared',
    'packages/prisma',
    'packages/observability',
    'packages/whatsapp-zapi',
    'docs',
    'scripts'
  ],

  // Arquivos críticos
  files: [
    'package.json',
    'pnpm-workspace.yaml',
    'turbo.json',
    'docker-compose.yml',
    '.env.example',
    'apps/api/package.json',
    'apps/dashboard/package.json',
    'apps/worker/package.json',
    'packages/shared/package.json',
    'packages/prisma/package.json',
    'packages/observability/package.json',
    'packages/whatsapp-zapi/package.json',
    'packages/prisma/schema.prisma'
  ],

  // Dependências críticas
  dependencies: {
    'apps/api/package.json': [
      '@bmad/observability',
      '@bmad/shared',
      '@bmad/whatsapp-zapi',
      '@prisma/client',
      'express',
      'bullmq',
      'ioredis'
    ],
    'packages/shared/package.json': [
      'zod'
    ],
    'packages/whatsapp-zapi/package.json': [
      'axios',
      '@bmad/observability'
    ],
    'packages/observability/package.json': [
      '@opentelemetry/api',
      'winston'
    ]
  }
};

function checkPathExists(filePath) {
  try {
    // Resolver caminho relativo ao diretório do projeto
    const projectRoot = path.resolve(__dirname, '..');
    const fullPath = path.resolve(projectRoot, filePath);
    const stats = fs.statSync(fullPath);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

function checkPackageDependencies(packagePath, requiredDeps) {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const fullPath = path.resolve(projectRoot, packagePath);
    const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const missing = [];
    const present = [];

    for (const dep of requiredDeps) {
      if (allDeps[dep]) {
        present.push(dep);
      } else {
        missing.push(dep);
      }
    }

    return {
      success: missing.length === 0,
      present,
      missing,
      total: requiredDeps.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function runIntegrityCheck() {
  console.log('🔍 Verificando integridade do projeto Laura 01...\n');

  let totalChecks = 0;
  let passedChecks = 0;

  // Verificar diretórios
  console.log('📁 Verificando estrutura de diretórios:');
  for (const dir of CHECKLIST.directories) {
    totalChecks++;
    const result = checkPathExists(dir);

    if (result.exists && result.isDirectory) {
      console.log(`  ✅ ${dir}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${dir} - ${result.exists ? 'Não é diretório' : 'Não encontrado'}`);
    }
  }

  console.log('\n📄 Verificando arquivos críticos:');
  for (const file of CHECKLIST.files) {
    totalChecks++;
    const result = checkPathExists(file);

    if (result.exists && result.isFile) {
      console.log(`  ✅ ${file}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${file} - ${result.exists ? 'Não é arquivo' : 'Não encontrado'}`);
    }
  }

  console.log('\n📦 Verificando dependências críticas:');
  for (const [packagePath, deps] of Object.entries(CHECKLIST.dependencies)) {
    totalChecks++;
    const result = checkPackageDependencies(packagePath, deps);

    if (result.success) {
      console.log(`  ✅ ${packagePath} (${result.present.length}/${result.total} deps)`);
      passedChecks++;
    } else if (result.error) {
      console.log(`  ❌ ${packagePath} - Erro: ${result.error}`);
    } else {
      console.log(`  ❌ ${packagePath} - Faltando: ${result.missing.join(', ')}`);
    }
  }

  // Verificar configurações especiais
  console.log('\n⚙️  Verificações especiais:');

  // Verificar se há scripts de build
  totalChecks++;
  const projectRoot = path.resolve(__dirname, '..');
  const packageJsonPath = path.resolve(projectRoot, 'package.json');
  const hasBuildScripts = fs.existsSync(packageJsonPath) &&
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).scripts?.build;
  if (hasBuildScripts) {
    console.log('  ✅ Scripts de build configurados');
    passedChecks++;
  } else {
    console.log('  ❌ Scripts de build não encontrados');
  }

  // Verificar workspace configuration
  totalChecks++;
  const workspacePath = path.resolve(projectRoot, 'pnpm-workspace.yaml');
  if (fs.existsSync(workspacePath)) {
    const workspace = fs.readFileSync(workspacePath, 'utf8');
    const hasAllPackages = [
      'packages/shared',
      'packages/prisma',
      'packages/observability',
      'packages/whatsapp-zapi'
    ].every(pkg => workspace.includes(pkg));

    if (hasAllPackages) {
      console.log('  ✅ Configuração do workspace correta');
      passedChecks++;
    } else {
      console.log('  ❌ Alguns packages não estão no workspace');
    }
  }

  // Resultado final
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESULTADO DA VERIFICAÇÃO:`);
  console.log(`   Total de verificações: ${totalChecks}`);
  console.log(`   Verificações aprovadas: ${passedChecks}`);
  console.log(`   Verificações reprovadas: ${totalChecks - passedChecks}`);
  console.log(`   Taxa de sucesso: ${Math.round((passedChecks / totalChecks) * 100)}%`);

  if (passedChecks === totalChecks) {
    console.log('\n🎉 Projeto Laura 01 está completamente íntegro!');
    console.log('✅ Todos os componentes estão presentes e configurados.');
  } else {
    console.log('\n⚠️  Algumas verificações falharam.');
    console.log('🔧 Verifique os itens marcados com ❌ acima.');
  }

  console.log('='.repeat(50));
}

// Executar verificação se chamado diretamente
if (require.main === module) {
  runIntegrityCheck();
}

module.exports = { runIntegrityCheck, checkPathExists, checkPackageDependencies };
