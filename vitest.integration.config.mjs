import { defineConfig } from 'vitest/config'

// Tests against real Postgres: `pnpm test:integration` with DATABASE_URL and DATABASE_URL_UNPOOLED set,
// for example the Neon `development` branch with INTEGRATION_ALLOW_REMOTE_DATABASE=1 (docs/development-rules/shared/testing.md).
// `pnpm test` never runs these.
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
