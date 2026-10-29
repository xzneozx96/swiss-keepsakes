/// <reference types="vitest/config" />
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const ZOD_IMPORT = /^zod$/

// The API's address for the dev server. The browser only ever calls /api on its own origin.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5002'

// Only `vite dev` forwards /api, through Nitro route rules (Nitro answers before Vite's `server.proxy` can).
// The built server (`.output`, also what `vite preview` serves) has no forwarding: production forwarding belongs to hosting.
const devApiRules = { '/api/**': { proxy: `${apiTarget}/api/**` } }

function nitroOptions(command: 'build' | 'serve') {
  return {
    routeRules: command === 'serve' ? devApiRules : {},
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Browser history needs absolute asset paths, so a deep link such as /store/orders loads its files.
  base: '/',
  resolve: {
    tsconfigPaths: true,
    // Nitro bundles `zod` as `_libs/zod.mjs`, which is all zod/v3 (no `.meta`), so the contract schemas throw in the server build: pin v4.
    alias: [{ find: ZOD_IMPORT, replacement: 'zod/v4' }],
  },
  server: { port: 3002, strictPort: true },
  plugins: [
    // TanStack Start (it includes the router plugin) must come before @vitejs/plugin-react.
    // Vitest renders components in jsdom and needs neither the server build nor its environments.
    ...(process.env.VITEST ? [] : [tanstackStart(), nitro(nitroOptions(command))]),
    react(),
    // React Compiler: memoizes every component and hook at build time, so no hand-written
    // memo is needed. The react-hooks lint rules keep the code compilable.
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    {
      name: 'warn-api-mode-with-demo-accounts',
      apply: 'build',
      buildStart() {
        if (process.env.VITE_API_ENABLED === 'true') {
          this.warn('VITE_API_ENABLED=true: guests sign in through the API, but the account, orders and checkout screens still read the demo data, and every account is the one demo guest. Do not deploy this build to guests until the account feature moves to the API.')
        }
      },
    },
  ],
  test: {
    // Files in tests/ sit outside tsconfig.json, so `resolve.tsconfigPaths` does not cover them.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
}))
