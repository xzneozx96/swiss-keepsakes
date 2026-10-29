import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { API_PORT, INBOX_PORT, SPA_PORT } from './tests/e2e/api-server'
import { wantsDemo } from './tests/e2e/reuse'

// Own port with --strictPort, so a run never attaches to another session's dev server.
const PORT = Number(process.env.E2E_PORT ?? 5391)

// The `*.api.spec.ts` specs run against the real API, which makes its own sk_test_* database on the Neon
// development branch (api/test/support/e2e-server.ts). They run only when DATABASE_URL and
// DATABASE_URL_UNPOOLED are set, and the host guard of the integration tests applies (docs/development-rules/shared/testing.md):
//   env $(grep -E '^DATABASE_URL(_UNPOOLED)?=' ../api/.env.local | xargs) INTEGRATION_ALLOW_REMOTE_DATABASE=1 pnpm test:e2e
const withApi = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED)

// E2E_REUSE=1 reuses servers started earlier by `pnpm e2e:servers` (scripts/e2e-servers.mjs) and their one test
// database, so a run starts in seconds. A server that is not up stops the run (tests/e2e/reuse-refuse.mjs), and
// tests/e2e/global-setup.ts refuses servers of another worktree. Without it nothing is reused, as before.
// E2E_DEMO=0 leaves the demo server out; in a reuse run that is the default when --project names only the api project.
const reuse = process.env.E2E_REUSE === '1'
const withDemo = wantsDemo(process.env, process.argv)

/** A server's command; in a reuse run the command only refuses, because a server that should be up is not. */
function serverCommand(command: string, name: string) {
  return reuse ? `node ${fileURLToPath(new URL('./tests/e2e/reuse-refuse.mjs', import.meta.url))} "${name}"` : command
}
const phone = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }
// API flows run on Chromium in English only (owner, 2026-10-27). German API flows are not run.
const apiProject = {
  name: 'api-chromium-en',
  testMatch: '**/*.api.spec.ts',
  use: {
    browserName: 'chromium' as const,
    ...phone,
    locale: 'en-CH',
    baseURL: `http://localhost:${SPA_PORT}`,
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
}

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
    // E2E_BASE_URL points the demo specs at another server, e.g. a production build.
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: reuse ? './tests/e2e/global-setup.ts' : undefined,
  projects: [
    {
      name: 'chromium',
      // Unset uses Playwright's own Chromium (`pnpm exec playwright install chromium`).
      // PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome instead.
      testIgnore: '**/*.api.spec.ts',
      use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL },
    },
    ...(withApi ? [apiProject] : []),
  ],
  webServer: [
    ...(withDemo
      ? [{
          command: serverCommand(`pnpm dev --port ${PORT} --strictPort`, 'demo dev server'),
          url: `http://localhost:${PORT}`,
          // An empty value beats a VITE_API_ENABLED=true in .env.local, so these specs always see the demo.
          env: { VITE_API_ENABLED: '' },
          reuseExistingServer: reuse,
          timeout: 120_000,
        }]
      : []),
    ...(withApi
      ? [
          {
            // The real API on its own database. The URL answers 200 once the API has started.
            command: serverCommand('node --import tsx test/support/e2e-server.ts', 'e2e API'),
            cwd: '../api',
            url: `http://127.0.0.1:${INBOX_PORT}/ready`,
            env: {
              E2E_API_PORT: String(API_PORT),
              E2E_INBOX_PORT: String(INBOX_PORT),
              E2E_ORIGIN: `http://localhost:${SPA_PORT}`,
            },
            // SIGTERM lets the script stop the API and drop its database. Playwright would SIGKILL it.
            gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 20_000 },
            reuseExistingServer: reuse,
            timeout: 120_000,
          },
          {
            // The SPA in API mode, proxying /api to that API: one origin, as in production.
            command: serverCommand(`pnpm dev --port ${SPA_PORT} --strictPort`, 'API-mode dev server'),
            url: `http://localhost:${SPA_PORT}`,
            env: { VITE_API_ENABLED: 'true', API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
            reuseExistingServer: reuse,
            timeout: 120_000,
          },
        ]
      : []),
  ],
})
