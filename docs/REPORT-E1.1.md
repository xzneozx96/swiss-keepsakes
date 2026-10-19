# E1.1 report: pnpm workspace root and root Vitest

## Changed
- `pnpm-workspace.yaml`: `front-end`, `api`, `e2e`, `spikes`, `packages/*` (no `packages/` dir yet; an empty glob is valid).
- `package.json`: scripts `build` and `typecheck` run `pnpm -r --if-present`; `test` is `vitest run --passWithNoTests`; `e2e` unchanged. devDependency `vitest ^4.1.12` (same range as front-end).
- `vitest.config.mjs`: Vitest projects. `front-end` reuses its own `vite.config.ts` (jsdom, setup, `@` alias). A `node` project covers `api/**/*.test.ts` and `packages/**/*.test.ts`. `scripts/` (node:test) and `e2e/` (Playwright) are not collected.
- `api/package.json`: named `@sk/api`, keeps its `@neon/*` deps (previously a nameless file).
- One root `pnpm-lock.yaml`. Removed `front-end/pnpm-lock.yaml`, `e2e/pnpm-lock.yaml`, `api/package-lock.json`, `spikes/package-lock.json`.
- `.github/workflows/e2e.yml`: single `pnpm install --frozen-lockfile` at the root, pnpm version from root `packageManager`, cache keyed on the root lockfile, trace step now reads `docs/development-plan/delivery-plan.md`.

## Verified (from the root, real runs)
- `pnpm install --frozen-lockfile`: "Done in 668ms", lockfile up to date.
- `pnpm build`: exit 0 (tsc + vite build, "built in 23.63s").
- `pnpm typecheck`: exit 0 (front-end `tsc`, spikes `tsc --noEmit`).
- `pnpm test`: `Test Files 2 passed (2)`, `Tests 13 passed (13)`.
- `pnpm --dir front-end test`: `Test Files 2 passed (2)`, `Tests 13 passed (13)`.
- `PLAYWRIGHT_CHANNEL=chrome pnpm e2e`: `8 passed (19.1s)` (4 flows x en/de), tests unchanged.

## Not verified
- The workflow was not run on GitHub Actions. `node scripts/trace.mjs docs/development-plan/delivery-plan.md` and `playwright install --with-deps chromium` were not executed locally.
- Note: the `playwright install` step keeps `working-directory: e2e`, where `@playwright/test` is a workspace dependency.
- No `api`/`packages` tests exist, so the `node` Vitest project is unproven.
- pnpm ignored build scripts for esbuild and unrs-resolver; nothing failed, but `pnpm approve-builds` was not run.
- `pnpm lint` and `pnpm typecheck:tests` were not run (outside this story's scope).
- `pnpm --dir spikes` scripts other than typecheck were not run (need credentials).
