import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'
import { API_PORT, INBOX_PORT, SPA_PORT } from './tests/e2e/api-server'

// Own port with --strictPort, so a run never attaches to another session's dev server.
const PORT = 5391

// The `*.api.spec.ts` specs run against the real API, which makes its own sk_test_* database on the Neon
// development branch (api/test/support/e2e-server.ts). They run only when DATABASE_URL and
// DATABASE_URL_UNPOOLED are set, and the host guard of the integration tests applies (docs/development-rules/shared/testing.md):
//   env $(grep -E '^DATABASE_URL(_UNPOOLED)?=' ../api/.env.local | xargs) INTEGRATION_ALLOW_REMOTE_DATABASE=1 pnpm test:e2e
const withApi = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED)
const phone = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }
const apiProjects = (['chromium', 'webkit'] as const).flatMap(browserName =>
  (['en', 'de'] as const).map(language => ({
    name: `api-${browserName}-${language}`,
    testMatch: '**/*.api.spec.ts',
    use: {
      browserName,
      ...phone,
      locale: language === 'de' ? 'de-CH' : 'en-CH',
      baseURL: `http://localhost:${SPA_PORT}`,
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
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Unset uses Playwright's own Chromium (`pnpm exec playwright install chromium`).
      // PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome instead.
      testIgnore: '**/*.api.spec.ts',
      use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL },
    },
    ...(withApi ? apiProjects : []),
  ],
  webServer: [
    {
      command: `pnpm dev --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      // An empty value beats a VITE_API_ENABLED=true in .env.local, so these specs always see the demo.
      env: { VITE_API_ENABLED: '' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    ...(withApi
      ? [
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
            // The SPA in API mode, proxying /api to that API: one origin, as in production.
            command: `pnpm dev --port ${SPA_PORT} --strictPort`,
            url: `http://localhost:${SPA_PORT}`,
            env: { VITE_API_ENABLED: 'true', API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : []),
  ],
})
