import antfu from '@antfu/eslint-config'

// The owner's style for api/ only. Layer rules stay in the root config (`pnpm lint:zones`).
export default antfu({
  typescript: true,
  // Scaffolded by the Neon CLI, which owns its format.
  ignores: ['dist/**', 'neon.ts'],
})
