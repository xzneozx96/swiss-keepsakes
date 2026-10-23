import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

// Every flow runs against the real API, which makes its own sk_test_* database on the Neon development branch
// (api/test/support/e2e-server.ts). Without the two URLs the run stops here, so no flow is skipped quietly:
//   env $(grep -E '^DATABASE_URL(_UNPOOLED)?=' ../api/.env.local | xargs) INTEGRATION_ALLOW_REMOTE_DATABASE=1 pnpm e2e
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("The flows need DATABASE_URL and DATABASE_URL_UNPOOLED of the Neon development branch (docs/development-rules/shared/testing.md).");
}

const port = Number(process.env.E2E_PORT ?? 4317);
const inboxPort = port + 1;
const apiPort = port + 2;
const frontEnd = fileURLToPath(new URL("../front-end", import.meta.url));
const dist = process.env.E2E_DIST ?? `${frontEnd}/dist`;
const phone = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: "./flows",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "phone-en", use: { ...phone, locale: "en-CH" } },
    { name: "phone-de", use: { ...phone, locale: "de-CH" } },
  ],
  webServer: [
    {
      // The real API on its own database. The URL answers 200 once the API has started.
      command: "node --import tsx test/support/e2e-server.ts",
      cwd: fileURLToPath(new URL("../api", import.meta.url)),
      url: `http://127.0.0.1:${inboxPort}/ready`,
      env: { E2E_API_PORT: String(apiPort), E2E_INBOX_PORT: String(inboxPort), E2E_ORIGIN: `http://localhost:${port}` },
      // SIGTERM lets the script stop the API and drop its database. Playwright would SIGKILL it.
      gracefulShutdown: { signal: "SIGTERM", timeout: 20_000 },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // The built SPA, proxying /api to that API: one origin, as in production.
      command: `pnpm exec vite preview --outDir "${dist}" --port ${port} --strictPort`,
      cwd: frontEnd,
      url: `http://localhost:${port}/`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
