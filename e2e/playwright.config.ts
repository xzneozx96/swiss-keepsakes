import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4317);
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
  webServer: {
    command: `pnpm exec vite preview --outDir "${dist}" --port ${port} --strictPort`,
    cwd: frontEnd,
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
