import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 5429);
const frontEnd = fileURLToPath(new URL("../front-end", import.meta.url));
// The Start build: a Nitro output folder (`server/index.mjs` beside `public/`). `pnpm e2e` builds it first.
// E2E_DIST is a Nitro output folder (it held a static `dist` before E3.2).
const output = process.env.E2E_DIST ?? `${frontEnd}/.output`;
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
  webServer: {
    command: `node "${output}/server/index.mjs"`,
    env: { PORT: String(port), HOST: "127.0.0.1" },
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
