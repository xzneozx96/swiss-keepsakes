# Linting

Read this before you change lint configuration, add a rule, format code, or run a fixer. The owner's standard is `@antfu/eslint-config` with no Prettier (from `~/Projects/personal/agentic-rag/frontend/eslint.config.js`). This repo adopted it on 2026-10-19.

## The standard

- **`@antfu/eslint-config`** with `react: true` and `typescript: true`. It formats through ESLint Stylistic: single quotes, no semicolons, 2 spaces.
- **No Prettier, ever.** Do not add `.prettierrc`, `prettier.config.js`, or `prettier` or `eslint-plugin-prettier` to `devDependencies`.
- **`eslint-plugin-boundaries`** enforces layer direction, with `eslint-import-resolver-typescript` so it can classify `@/` imports.
- **Editor.** `front-end/.vscode/settings.json` turns the default formatter and Prettier off and runs ESLint fixes on save, as antfu's README documents. Without it a Prettier format-on-save would put the old style back.
- **Scripts** (run in `front-end/`): `pnpm lint` is `eslint .` and checks only. `pnpm lint:fix` is `eslint . --fix`.
- The React Hooks compiler rules come with the standard and stay at error level (`refs`, `purity`, `immutability`, `set-state-in-effect` and the others). `react-hooks/exhaustive-deps` is a warning and there are no suppressions of it.

## This repo's config

`front-end/eslint.config.mjs` is the standard plus these deliberate differences. Each has its reason in a comment.

| Setting | Why |
| :-- | :-- |
| `jsx.a11y` on, with `click-events-have-key-events` and `interactive-supports-focus` as warnings | The previous config linted accessibility with those two as warnings. antfu only enables jsx-a11y through `jsx: { a11y }` |
| `style/jsx-one-expression-per-line` with `allow: 'non-jsx'` | The default's autofix splits text and an expression onto two lines, and JSX then trims the space. It turned "Title: Name" into "Title:Name" |
| `e18e/prefer-array-fill` off | Its autofix turns `Array.from({ length }, () => make())` into `.fill(make())`, which calls `make` once and shares one object. It broke the snowfall |
| `prefer-arrow-callback` allows named functions | `memo(function ListingCard() {})` keeps the component name in React DevTools and in the render counter |
| `react-refresh/only-export-components` off in `src/routes/**`, a warning elsewhere | A TanStack file route exports `Route` next to its page, and the router's code splitter moves the page into its own module. In feature files it only costs a full reload instead of a hot swap in development (47 warnings today, files that mix helpers and components) |
| `boundaries/dependencies` layer rule | Shared code (`src/lib`, `src/hooks`, `src/contexts`, top-level `src/components`) must not import a feature or a route. The resolver reads `tsconfig.eslint.json` |

Do not use `boundaries/element-types`. It is deprecated in this plugin version.

## Traps found while adopting it

- **`tsconfig.eslint.json` has no `references`.** The TypeScript resolver forces `references: "auto"`, and with the references in `tsconfig.json` it cannot resolve `@/` imports, so the layer rule silently checked nothing. Prove a layer rule with a seeded violation after you change it.
- **An autofix is not always behavior-neutral.** Check a big fix by compiling each file before and after with esbuild (minified, so formatting disappears) and comparing. Review every file that differs. Also compare the production build, whose CSS must be byte-identical.
- **Tailwind reads class names from source text.** A class such as `before:content-['']` must keep unescaped quotes, or Tailwind emits an extra rule for the escaped spelling. `stop-card.tsx` has the one exception.
- **Do not run `pnpm lint:fix` on a shared tree.** It rewrites every file. Fix only your own files: `pnpm exec eslint --fix <files>`.
- **Install with pnpm.** The version is pinned in `package.json`. See `stack-notes.md`.

## Dependency advisories

`pnpm audit` reports 5 advisories (2 high, 3 critical), all in the dev dependency `eslint-plugin-boundaries` (through `handlebars` and `micromatch`). Version 7.2.0 pins the same versions, so upgrading does not help, and agentic-rag has the same exposure. `pnpm audit --prod` reports 0, so nothing ships to users. Use `pnpm audit --prod` as the audit command, and look again when the plugin updates.

## Open

- 47 `react-refresh` warnings remain in feature files. Fixing them means splitting helpers and contexts from components, which is its own refactor.
- Test files are linted now. `scripts/` is linted too.
