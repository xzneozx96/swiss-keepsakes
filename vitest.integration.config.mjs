import { defineConfig } from 'vitest/config'

// Tests against real Postgres: `pnpm test:integration` with DATABASE_URL and DATABASE_URL_UNPOOLED set,
// for example to the docker-compose Postgres. `pnpm test` never runs these.
export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    include: ['api/test/integration/**/*.test.ts'],
    globalSetup: ['api/test/integration/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
