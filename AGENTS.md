# Swiss Keepsakes: agent instructions

Read this file first. Keep changes small, match the surrounding code, and verify what you change.
Detailed rules are in `docs/development-rules/`. Read the files that match your task, not all of them.

## Project

Web app for Lucerne keepsakes and fixed-departure tours. Guests use phones. Merchant owner and manager roles run the store, and referral partners see a limited view.
Product authority is `PRODUCT.md`. Today `front-end/` is a prototype with browser-held mock data and no backend. The planned backend is `docs/architecture/backend.md` (a proposal, not built).
The chosen stack, and what is in use versus only planned, is in `docs/development-rules/tech-stack.md`.

## Commands (run in `front-end/`)

- Type check: `pnpm exec tsc --noEmit`
- Lint, checking only: `pnpm lint` (0 errors expected; the 46 `react-refresh` warnings are known)
- Build: `pnpm build` (about 22 s, because the React Compiler runs)
- Unit tests: `pnpm test` (Vitest, about 2 s). Type-check the tests: `pnpm typecheck:tests`
- Rendering, routing or state change: compare builds with `pnpm verify:routes` and `pnpm verify:renders` (`front-end/scripts/verify/README.md`)
- End-to-end: `pnpm test:e2e` runs the demo specs on their own dev server (port 5391). With the Neon variables set it also runs the real-API specs (`*.api.spec.ts`, SPA on port 5392) against the Neon development branch (setup in `docs/development-rules/shared/testing.md`). Set `PLAYWRIGHT_CHANNEL=chrome` to use the installed Chrome
- Faster real-API e2e while iterating: `pnpm e2e:servers` (keeps the servers and one test database up), then `E2E_REUSE=1 pnpm test:e2e <spec> --project api-chromium-en --workers=2` (no Neon variables needed in that shell); a guard refuses servers of another worktree; specs must use unique data (`docs/development-rules/shared/testing.md`)
- Never run `pnpm lint:fix`. It rewrites every file, and other sessions are editing them. Fix your own files with `pnpm exec eslint --fix <files>`.
- Tests live in `front-end/tests/`. Setup and examples are in `docs/development-rules/shared/testing.md`.

## Definition of done

1. `pnpm exec tsc --noEmit` and `pnpm lint` report no errors, and `pnpm test` and `pnpm typecheck:tests` pass.
2. You ran the changed behavior (browser or script), not only the compiler. New logic has a test.
3. Your final message says what you did not verify.

## Read before you start

Always read `docs/development-rules/shared/code-style.md`. Then read by task.

- **Front-end work** (`front-end/`):
  - New files, imports, routes: `docs/development-rules/frontend/code-structure.md`
  - Components and hooks: `docs/development-rules/frontend/components-and-hooks.md`
  - Rendering, state, events, lists (React team rules): `docs/development-rules/frontend/react-rendering-and-state.md`
  - Routes, loaders, SSR, server code, head/SEO: `docs/development-rules/frontend/tanstack-start.md`
  - Effects, refs, custom hooks: `docs/development-rules/frontend/react-effects-and-refs.md`
  - Splitting components, context, reducers: `docs/development-rules/frontend/react-composition-and-context.md`
  - UI and styling: `docs/development-rules/frontend/heroui-and-styling.md`
  - Forms: `docs/development-rules/frontend/forms-and-validation.md`
  - Server data: `docs/development-rules/frontend/api-integration.md`
  - Errors and toasts: `docs/development-rules/frontend/error-handling.md`
  - First load, lists, typing, scrolling or streaming, new dependency, new icon: `docs/development-rules/frontend/performance.md`
  - Lint config: `docs/development-rules/frontend/linting.md`
- **Back-end work** (`api/`, `packages/`; design only for now): `docs/development-rules/backend/architecture.md`, `docs/development-rules/backend/api-contract.md`, `docs/development-rules/backend/data-jobs-security.md`
- **Both sides** (a rule, type or API shape used by the UI and the server, or any test): `docs/development-rules/shared/domain-and-contract.md`, `docs/development-rules/shared/testing.md`

## Rules that have bitten us (front-end)

1. **Route search constants.** Do put values a route's `validateSearch` reads in `front-end/src/features/<feature>/lib/search-params.ts`. Don't import them from a hook or component file. One such import put the guest order screen and its calendar libraries into everyone's first load (63 KB).
2. **Icons.** Do keep `front-end/src/components/icons.ts` as plain `export { X as YIcon } from "reicon-react"`. Don't wrap icons in a call. Wrapping put all 86 icons in the first load (54 KB).
3. **Per-frame updates.** Do use a ref or a throttle for scroll, pointer and stream updates. Don't call `setState` on every frame or streamed word.
4. **Data reads and writes.** Do read shop data with the feature query hooks (`useOrders(select)`) and change it with `useCommand` or, on a screen that saves and leaves, `useSubmit` (`features/<feature>/api/`). Use `useDemoSelector` and `useDemoActions` only for browser-only state: role, clock, sign-in, cart, saved gifts, drafts. The demo stand-ins that still write shop data to the store are listed in `docs/development-rules/frontend/api-integration.md`; do not add others.
5. **Layer direction.** Don't import `@/features` from `front-end/src/lib`, `hooks`, `contexts` or top-level `components`. ESLint enforces this.
6. **German dictionary.** Don't import `@/i18n/de` or `@sk/i18n/de` from code on the first-load path. German is a lazy chunk.
7. **Formatters.** Do use the cached helpers in `packages/domain/src/shared/format.ts`. Don't create `new Intl.*` or long regexes inside render.
8. **Hooks rules.** Don't read or write refs during render or call `setState` synchronously in an effect. ESLint enforces this.
9. **Heavy libraries.** Do load maps, charts, calendar, editor and QR code with a dynamic `import()` and their CSS. Don't import them from route files or shared modules.
10. **Loading skeletons.** Do shape skeletons like the real layout: `DataTable` `isLoading` for tables, skeleton rows or cards for lists. Don't use generic grey blocks. In Sprint 6 Content > Categories showed one generic block while the screen is a grouped table and a drill-in list. `front-end/tests/skeleton-guard.test.ts` enforces the `w-full rounded-3xl` case. See "Reuse shared UI and match loading layouts" in `docs/development-rules/frontend/heroui-and-styling.md`.
11. **Shared UI.** Do search `front-end/src/components` before you build a control, and use `RouteTabs`, `PageTabs`, `DetailTabs`, `DataTable`, `SheetFrame`, `ConfirmDialog`, `StatusChip`, `EmptyState` and `RowActions`. Don't restyle HeroUI primitives in a feature. In Sprint 6 the Categories and Settings tabs were a bigger pill than the Orders tabs because each screen styled `Tabs` itself. `front-end/tests/tabs-guard.test.ts` enforces the `Tabs` import. See the same section.

TanStack's own skills ship in `node_modules` and match the installed version. List them from the repo root with `find node_modules/.pnpm -path '*@tanstack*/skills/*' -name SKILL.md`, and read the one for the API you use. Where they say "use `createServerFn`", the rules in `tanstack-start.md` win.

Existing code does not always follow these. Do not copy it as a template. `docs/development-rules/frontend/performance.md` lists what was left on purpose.

## Boundaries

- Never commit secrets. Never edit `front-end/src/routeTree.gen.ts` (generated).
- Do not commit or push unless asked.
- Other sessions edit the same working tree. Re-read a file before you edit it, stage only your own files, and do not run `git stash`, `checkout`, `reset` or `clean`.
- Do not add a dependency, a form library or a data-fetching library without asking.
- Code style is the owner's standard, `@antfu/eslint-config` with no Prettier (single quotes, no semicolons). Never add Prettier. See `docs/development-rules/frontend/linting.md`.

## References

- `docs/development-rules/README.md` explains the folders and how rules are kept current.
- `docs/front-end-audit/` holds the one-by-one check of the 70 React best-practice rules.
