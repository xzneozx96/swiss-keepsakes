import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'front-end',
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['api/**/*.test.ts', 'packages/**/*.test.ts', 'scripts/boundaries.test.mjs'],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
    ],
  },
})
