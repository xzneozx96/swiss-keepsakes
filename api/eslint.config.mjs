import antfu from '@antfu/eslint-config'

// The owner's style for api/ only. Layer rules stay in the root config (`pnpm lint:zones`).
export default antfu({
  typescript: true,
  // neon.ts is scaffolded by the Neon CLI and migrations/ is written by drizzle-kit. Each tool owns its format.
  ignores: ['dist/**', 'neon.ts', 'migrations/**'],
})
