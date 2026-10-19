import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'front-end',
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['api/**/*.test.ts', 'packages/**/*.test.ts', 'scripts/boundaries.test.mjs', 'scripts/workspace.test.mjs'],
          // Integration tests need Postgres and have their own config (vitest.integration.config.mjs).
          exclude: ['**/node_modules/**', '**/dist/**', 'api/test/integration/**'],
        },
      },
    ],
  },
})
