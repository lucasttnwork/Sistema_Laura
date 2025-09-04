module.exports = {
  // TypeScript and JavaScript files
  '**/*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write', 'git add'],

  // JSON files
  '**/*.json': ['prettier --write', 'git add'],

  // Markdown files
  '**/*.md': ['prettier --write', 'git add'],

  // Package.json files
  '**/package.json': ['prettier --write', 'git add'],

  // Prisma schema files
  '**/*.prisma': ['npx prisma format', 'git add'],
};
