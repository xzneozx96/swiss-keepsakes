import boundaries from 'eslint-plugin-boundaries'

// Layer rules from docs/architecture/backend.md section 4.1.
// Patterns start with `**/` so the fixtures under scripts/fixtures/boundaries/ mirror the real paths.
const sameModule = '{{ from.captured.module }}'

export const zones = {
  files: ['**/packages/domain/src/**/*.ts', '**/api/src/**/*.ts'],
  plugins: { boundaries },
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.eslint.json' } },
    'boundaries/elements': [
      { type: 'domain', pattern: '**/packages/domain/src', mode: 'folder' },
      { type: 'module-index', pattern: '**/api/src/modules/*/index.ts', mode: 'file', capture: ['prefix', 'module'] },
      { type: 'application', pattern: '**/api/src/modules/*/application', mode: 'folder', capture: ['prefix', 'module'] },
      { type: 'adapters', pattern: '**/api/src/modules/*/adapters', mode: 'folder', capture: ['prefix', 'module'] },
      { type: 'platform', pattern: '**/api/src/platform', mode: 'folder' },
      { type: 'composition', pattern: '**/api/src/main.ts', mode: 'file' },
    ],
  },
  rules: {
    'boundaries/dependencies': ['error', {
      default: 'allow',
      checkAllOrigins: true,
      checkUnknownLocals: true,
      rules: [
        {
          from: { type: 'domain' },
          disallow: [
            { to: { type: ['application', 'adapters', 'platform', 'composition', 'module-index'] } },
            { to: { origin: ['external', 'core'] } },
            { to: { isUnknown: true } },
          ],
          message: 'The domain may import only packages/domain',
        },
        {
          from: { type: 'application' },
          disallow: { to: { type: ['adapters', 'platform', 'composition'] } },
          message: 'The application layer must not import adapters or platform code',
        },
        {
          from: { type: ['application', 'adapters', 'module-index'] },
          disallow: { to: { type: ['application', 'adapters'], captured: { module: `!${sameModule}` } } },
          message: 'A module may import another module only through its index.ts',
        },
      ],
    }],
  },
}
