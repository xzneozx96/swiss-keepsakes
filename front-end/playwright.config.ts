import process from 'node:process'
import { defineConfig } from '@playwright/test'
import { API_PORT, INBOX_PORT, SPA_PORT } from './tests/e2e/api-server'

// Every spec runs against the real API, which makes its own sk_test_* database on the Neon development branch
// (api/test/support/e2e-server.ts), and the host guard of the integration tests applies (docs/development-rules/shared/testing.md):
//   env $(grep -E '^DATABASE_URL(_UNPOOLED)?=' ../api/.env.local | xargs) INTEGRATION_ALLOW_REMOTE_DATABASE=1 pnpm test:e2e
// Without those two URLs the run stops here, so no spec is skipped quietly.
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED)
  throw new Error('The end-to-end specs need DATABASE_URL and DATABASE_URL_UNPOOLED of the Neon development branch (docs/development-rules/shared/testing.md).')

const phone = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }
const projects = (['chromium', 'webkit'] as const).flatMap(browserName =>
  (['en', 'de'] as const).map(language => ({
    name: `${browserName}-${language}`,
    use: {
      browserName,
      ...phone,
      locale: language === 'de' ? 'de-CH' : 'en-CH',
      // Unset uses Playwright's own Chromium (`pnpm exec playwright install chromium`).
      // PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome instead.
      channel: browserName === 'chromium' ? process.env.PLAYWRIGHT_CHANNEL : undefined,
    },
  })),
)

export default defineConfig({
  testDir: './tests/e2e',
  // The dev server compiles a route's chunk on first use, and four workers share it.
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${SPA_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects,
  webServer: [
    {
      // The real API on its own database. The URL answers 200 once the API has started.
      command: 'node --import tsx test/support/e2e-server.ts',
      cwd: '../api',
      url: `http://127.0.0.1:${INBOX_PORT}/ready`,
      env: {
        E2E_API_PORT: String(API_PORT),
        E2E_INBOX_PORT: String(INBOX_PORT),
        E2E_ORIGIN: `http://localhost:${SPA_PORT}`,
      },
      // SIGTERM lets the script stop the API and drop its database. Playwright would SIGKILL it.
      gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 20_000 },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // The SPA, proxying /api to that API: one origin, as in production.
      command: `pnpm dev --port ${SPA_PORT} --strictPort`,
      url: `http://localhost:${SPA_PORT}`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
