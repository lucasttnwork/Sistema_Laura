import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    server: {
      deps: {
        inline: [
          'express',
          'cookie-parser',
          'helmet',
          'express-rate-limit'
        ],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  ssr: {
    noExternal: ['express', 'cookie-parser', 'helmet', 'express-rate-limit']
  }
});


