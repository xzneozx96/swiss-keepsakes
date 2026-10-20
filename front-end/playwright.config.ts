import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'
import { NEON_AUTH_URL } from './tests/e2e/neon-auth-url'

// Own ports with --strictPort, so a run never attaches to another session's dev server.
const PORT = 5391
// The same app with Neon Auth switched on. Its Neon Auth URL is fake: the sign-in specs answer every
// request to it inside the browser. WebKit is the acceptance browser (E2.1). Chromium keeps
// third-party cookies, so it shows the session flows working where the cookie survives.
const NEON_PORT = 5392
const NEON_SPECS = /neon-sign-in\.spec\.ts/
const phone = {
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  baseURL: `http://localhost:${NEON_PORT}`,
}
const webkitPhone = { ...phone, browserName: 'webkit' as const }
const chromiumPhone = { ...phone, browserName: 'chromium' as const, channel: process.env.PLAYWRIGHT_CHANNEL }

export default defineConfig<{ language: 'en' | 'de' }>({
  testDir: './tests/e2e',
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
      testIgnore: NEON_SPECS,
      // Unset uses Playwright's own Chromium (`pnpm exec playwright install chromium`).
      // PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome instead.
      use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL },
    },
    { name: 'webkit-en', testMatch: NEON_SPECS, use: { ...webkitPhone, language: 'en' } },
    { name: 'webkit-de', testMatch: NEON_SPECS, use: { ...webkitPhone, language: 'de' } },
    { name: 'chromium-en', testMatch: NEON_SPECS, use: { ...chromiumPhone, language: 'en' } },
    { name: 'chromium-de', testMatch: NEON_SPECS, use: { ...chromiumPhone, language: 'de' } },
  ],
  webServer: [
    {
      // Demo mode even when front-end/.env.local sets a Neon Auth URL, because the environment wins.
      command: `pnpm dev --port ${PORT} --strictPort`,
      env: { VITE_NEON_AUTH_URL: '' },
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm dev --port ${NEON_PORT} --strictPort`,
      env: { VITE_NEON_AUTH_URL: NEON_AUTH_URL },
      url: `http://localhost:${NEON_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
