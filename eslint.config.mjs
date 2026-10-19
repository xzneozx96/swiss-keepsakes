import tsParser from '@typescript-eslint/parser'
import { zones } from './eslint.boundaries.mjs'

// Layer rules for api/ and packages/ only. Style rules are not enabled here: the owner's antfu
// standard is applied by front-end/eslint.config.mjs, and packages/domain was extracted before this config existed.
export default [
  { ignores: ['front-end/**', 'e2e/**', 'spikes/**', 'client-resources/**', 'docs/**', 'scripts/fixtures/**', '**/node_modules/**', '**/dist/**'] },
  { languageOptions: { parser: tsParser } },
  zones,
]
