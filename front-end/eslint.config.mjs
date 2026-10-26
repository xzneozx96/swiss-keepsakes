import antfu from '@antfu/eslint-config'
import boundaries from 'eslint-plugin-boundaries'

export default antfu(
  {
    react: true,
    typescript: true,
    jsx: {
      a11y: {
        overrides: {
          // Kept as warnings, as in the config this one replaced.
          'jsx-a11y/click-events-have-key-events': 'warn',
          'jsx-a11y/interactive-supports-focus': 'warn',
        },
      },
    },
    ignores: [
      'src/routeTree.gen.ts',
      'public/**',
      '.tanstack/**',
      'playwright-report/**',
      'test-results/**',
      '*.prototype.html',
      'src/dormant/**',
    ],
  },
  {
    rules: {
      'style/max-statements-per-line': 'off',
      'react/no-array-index-key': 'off',
      // Its autofix turns Array.from({ length }, () => make()) into .fill(make()), which calls make once and shares one object.
      'e18e/prefer-array-fill': 'off',
      // Named function expressions keep component names in React DevTools: memo(function ListingCard() {}).
      'prefer-arrow-callback': ['error', { allowNamedFunctions: true, allowUnboundThis: true }],
      'style/jsx-one-expression-per-line': ['error', { allow: 'non-jsx' }],
    },
  },
  {
    // Hooks, helpers and contexts share files with components in many features. Editing such a file
    // reloads the page instead of hot-swapping, which costs only developer time. Splitting them is its own refactor.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // A TanStack file route exports `Route` next to its page component. The router's code splitter
    // moves that component into its own module, so Fast Refresh works and this rule has nothing to protect.
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Shared code never imports a feature or a route.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.eslint.json' } },
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/{lib,hooks,contexts}/**' },
        { type: 'shared-ui', pattern: 'src/components/*.{ts,tsx}', mode: 'file' },
        { type: 'feature', pattern: 'src/features/**' },
        { type: 'route', pattern: 'src/routes/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', {
        default: 'allow',
        rules: [
          {
            from: { type: ['shared', 'shared-ui'] },
            disallow: { to: { type: ['feature', 'route'] } },
            message: 'Shared code must not import a feature or a route',
          },
        ],
      }],
    },
  },
)
