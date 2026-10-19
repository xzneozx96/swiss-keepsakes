import boundaries from 'eslint-plugin-boundaries'

// Layer rules from docs/architecture/backend.md section 4.1.
// Patterns start with `**/` so the fixtures under scripts/fixtures/boundaries/ mirror the real paths.
const sameModule = '{{ from.captured.module }}'

const sourceExtensions = '{ts,tsx,mts,cts,js,jsx,mjs,cjs}'

export const zones = {
  files: [
    `**/packages/domain/src/**/*.${sourceExtensions}`,
    `**/packages/api-contract/src/**/*.${sourceExtensions}`,
    `**/packages/i18n/src/**/*.${sourceExtensions}`,
    `**/api/src/**/*.${sourceExtensions}`,
  ],
  plugins: { boundaries },
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.eslint.json' } },
    'boundaries/elements': [
      { type: 'domain', pattern: '**/packages/domain/src', mode: 'folder' },
      // The whole package, because src/client.ts imports the generated types beside src/.
      { type: 'api-contract', pattern: '**/packages/api-contract', mode: 'folder' },
      { type: 'i18n', pattern: '**/packages/i18n/src', mode: 'folder' },
      { type: 'module-index', pattern: '**/api/src/modules/*/index.*', mode: 'file', capture: ['prefix', 'module'] },
      { type: 'application', pattern: '**/api/src/modules/*/application', mode: 'folder', capture: ['prefix', 'module'] },
      { type: 'ports', pattern: '**/api/src/modules/*/ports.*', mode: 'file', capture: ['prefix', 'module'] },
      { type: 'adapters', pattern: '**/api/src/modules/*/adapters', mode: 'folder', capture: ['prefix', 'module'] },
      { type: 'platform', pattern: '**/api/src/platform', mode: 'folder' },
      { type: 'composition', pattern: '**/api/src/main.*', mode: 'file' },
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
            { to: { type: ['api-contract', 'i18n', 'application', 'adapters', 'ports', 'platform', 'composition', 'module-index'] } },
            { to: { origin: ['external', 'core'] } },
            { to: { isUnknown: true } },
          ],
          message: 'The domain may import only packages/domain',
        },
        {
          from: { type: 'api-contract' },
          disallow: [
            { to: { type: ['domain', 'i18n', 'application', 'adapters', 'ports', 'platform', 'composition', 'module-index'] } },
            { to: { origin: 'core' } },
            { to: { origin: 'external' }, dependency: { module: '!{zod,openapi-fetch}' } },
            // A package import is unknown too, so only a local file outside every zone is meant here.
            { to: { origin: 'local', isUnknown: true } },
          ],
          message: 'The API contract may import only itself, zod and openapi-fetch',
        },
        {
          from: { type: 'i18n' },
          disallow: [
            { to: { type: ['domain', 'api-contract', 'application', 'adapters', 'ports', 'platform', 'composition', 'module-index'] } },
            { to: { origin: ['external', 'core'] } },
            { to: { isUnknown: true } },
          ],
          message: 'The i18n package may import only packages/i18n',
        },
        {
          from: { type: 'application' },
          disallow: { to: { type: ['adapters', 'platform', 'composition'] } },
          message: 'The application layer must not import adapters or platform code',
        },
        {
          from: { type: 'application' },
          disallow: { to: { type: 'api-contract' } },
          message: 'Only adapters and platform code may import the API contract',
        },
        {
          from: { type: 'ports' },
          disallow: { to: { type: ['api-contract', 'application', 'adapters', 'platform', 'composition', 'module-index'] } },
          message: 'A ports file may import only the domain',
        },
        {
          from: { type: 'adapters' },
          disallow: { to: { type: 'composition' } },
          message: 'Adapters must not import the composition root',
        },
        {
          from: { type: ['application', 'adapters', 'ports', 'module-index'] },
          disallow: { to: { type: ['application', 'adapters', 'ports'], captured: { module: `!${sameModule}` } } },
          message: 'A module may import another module only through its index.ts',
        },
      ],
    }],
  },
}
