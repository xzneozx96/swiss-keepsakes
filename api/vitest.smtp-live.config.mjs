import { existsSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// The live SMTP suite, on demand only: `pnpm --filter @sk/api test:smtp-live`. It sends real mail to the test
// inbox with SMTP_* from the shell or api/.env.local. `pnpm test`, `pnpm test:integration` and CI never run it.
const envFile = fileURLToPath(new URL('.env.local', import.meta.url))
if (existsSync(envFile))
  process.loadEnvFile(envFile)

export default defineConfig({
  test: {
    name: 'smtp-live',
    environment: 'node',
    include: ['test/live/**/*.live.ts'],
    testTimeout: 60_000,
  },
})
