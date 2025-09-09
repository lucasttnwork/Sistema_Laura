#!/usr/bin/env node

/**
 * Integrity validation script for Laura 01 System
 * Validates that all components are properly integrated and functional
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const checks = [];
let allPassed = true;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);

  checks.push({
    description,
    status: exists ? 'PASS' : 'FAIL',
    path: filePath
  });

  if (!exists) {
    allPassed = false;
  }

  return exists;
}

function checkDirectoryExists(dirPath, description) {
  const fullPath = path.join(projectRoot, dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();

  checks.push({
    description,
    status: exists ? 'PASS' : 'FAIL',
    path: dirPath
  });

  if (!exists) {
    allPassed = false;
  }

  return exists;
}

function checkPackageJson(packagePath, requiredDeps = []) {
  const fullPath = path.join(projectRoot, packagePath);
  if (!fs.existsSync(fullPath)) {
    checks.push({
      description: `Package.json exists at ${packagePath}`,
      status: 'FAIL',
      path: packagePath
    });
    allPassed = false;
    return false;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    // Check required dependencies
    for (const dep of requiredDeps) {
      if (!pkg.dependencies || !pkg.dependencies[dep]) {
        checks.push({
          description: `Required dependency ${dep} in ${packagePath}`,
          status: 'FAIL',
          path: packagePath
        });
        allPassed = false;
      } else {
        checks.push({
          description: `Required dependency ${dep} in ${packagePath}`,
          status: 'PASS',
          path: packagePath
        });
      }
    }

    return true;
  } catch (error) {
    checks.push({
      description: `Valid JSON in ${packagePath}`,
      status: 'FAIL',
      path: packagePath
    });
    allPassed = false;
    return false;
  }
}

console.log('🔍 Validating Laura 01 System Integrity...\n');

// Configuration Files
log('📋 Checking Configuration Files:', 'blue');
checkFileExists('package.json', 'Root package.json exists');
checkFileExists('pnpm-workspace.yaml', 'PNPM workspace configuration');
checkFileExists('turbo.json', 'Turbo configuration');
checkFileExists('tsconfig.base.json', 'Base TypeScript configuration');
checkFileExists('tsconfig.build.json', 'Build TypeScript configuration');
checkFileExists('tsconfig.paths.json', 'Paths TypeScript configuration');
checkFileExists('.eslintrc.js', 'ESLint configuration');
checkFileExists('.prettierrc', 'Prettier configuration');
checkFileExists('.env.example', 'Environment template');
checkFileExists('.gitignore', 'Git ignore file');
checkFileExists('bmad-config.yaml', 'BMAD configuration');

// BMAD Core Structure
log('\n🤖 Checking BMAD Core Structure:', 'blue');
checkDirectoryExists('.bmad', 'BMAD local configuration directory');
checkDirectoryExists('.bmad/agents', 'BMAD agents directory');
checkDirectoryExists('.bmad/teams', 'BMAD teams directory');
checkDirectoryExists('.bmad/templates', 'BMAD templates directory');

// Apps Structure
log('\n🏗️ Checking Applications Structure:', 'blue');
checkDirectoryExists('apps/api/src', 'API application source');
checkDirectoryExists('apps/dashboard/src', 'Dashboard application source');
checkDirectoryExists('apps/worker/src', 'Worker application source');

// Packages Structure
log('\n📦 Checking Packages Structure:', 'blue');
checkDirectoryExists('packages/shared/src', 'Shared package source');
checkDirectoryExists('packages/prisma/src', 'Prisma package source');
checkDirectoryExists('packages/observability/src', 'Observability package source');
checkDirectoryExists('packages/whatsapp-zapi/src', 'WhatsApp Z-API package source');

// Database Structure
log('\n🗄️ Checking Database Structure:', 'blue');
checkFileExists('packages/prisma/schema.prisma', 'Prisma schema file');
checkDirectoryExists('packages/prisma/migrations', 'Database migrations directory');
checkDirectoryExists('packages/prisma/seeds', 'Database seeds directory');

// Documentation
log('\n📚 Checking Documentation:', 'blue');
checkDirectoryExists('docs/architecture', 'Architecture documentation');
checkDirectoryExists('docs/planning', 'Planning documentation');
checkDirectoryExists('docs/stories', 'Stories documentation');
checkFileExists('docs/architecture/coding-standards.md', 'Coding standards documentation');
checkFileExists('docs/architecture/tech-stack.md', 'Tech stack documentation');
checkFileExists('docs/architecture/project-structure.md', 'Project structure documentation');

// Scripts
log('\n⚡ Checking Scripts:', 'blue');
checkFileExists('scripts/setup.sh', 'Setup script');
checkFileExists('scripts/check-integrity.js', 'Integrity check script');

// Package Dependencies Check
log('\n📦 Checking Package Dependencies:', 'blue');
checkPackageJson('package.json');
checkPackageJson('apps/api/package.json', ['express', 'cors']);
checkPackageJson('apps/dashboard/package.json', ['express', 'cors']);
checkPackageJson('packages/shared/package.json');
checkPackageJson('packages/prisma/package.json', ['@prisma/client']);
checkPackageJson('packages/observability/package.json');
checkPackageJson('packages/whatsapp-zapi/package.json');

// Results Summary
console.log('\n' + '='.repeat(60));
log('📊 VALIDATION RESULTS:', 'blue');

let passedCount = 0;
let failedCount = 0;

checks.forEach(check => {
  const status = check.status === 'PASS' ? '✅' : '❌';
  const color = check.status === 'PASS' ? 'green' : 'red';
  log(`${status} ${check.description}`, color);

  if (check.status === 'PASS') {
    passedCount++;
  } else {
    failedCount++;
  }
});

console.log('\n' + '='.repeat(60));
log(`📈 SUMMARY: ${passedCount} passed, ${failedCount} failed`, allPassed ? 'green' : 'red');

if (allPassed) {
  log('🎉 All integrity checks passed! Laura 01 System is ready.', 'green');
  process.exit(0);
} else {
  log('⚠️  Some integrity checks failed. Please review and fix the issues.', 'red');
  process.exit(1);
}
