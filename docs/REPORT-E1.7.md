# E1.7 layer boundary lint zones

## What changed

- `eslint.boundaries.mjs`: the zones, built on `eslint-plugin-boundaries` (`boundaries/dependencies`), the plugin the front-end already uses. Architecture 4.1 names `import/no-restricted-paths`, but the front-end rule uses this plugin and `linting.md` says to keep it, so I did too.
  - `domain` imports only `packages/domain`. External packages (react), node core, unresolved aliases (`@/`), front-end and api paths all fail.
  - `application` (`api/src/modules/*/application`) may not import `adapters`, `platform` or `main.ts`.
  - A file in `application`, `adapters` or `index.ts` may not import another module's `application/` or `adapters/`. Another module's `index.ts` is fine.
  - `checkAllOrigins` and `checkUnknownLocals` are on. Without them the plugin skips external and unclassified imports, and the domain rule checked nothing for `react`.
  - Patterns start with `**/` so the fixtures mirror real paths. That glob counts as a capture, so captures are `['prefix', 'module']`.
- `eslint.config.mjs` (root): boundaries only, TypeScript parser, ignores `front-end`, `e2e`, `spikes`, `docs` and `scripts/fixtures`. It does not enable antfu style: `packages/domain` was extracted earlier with another style and fails 20 style rules, and I may not edit its source. `tsconfig.eslint.json` (root) is for the import resolver.
- Root `package.json`: script `lint:zones` (`eslint --no-error-on-unmatched-pattern api packages`, the flag because `api/src` does not exist yet) and devDependencies `eslint`, `eslint-import-resolver-typescript`, `eslint-plugin-boundaries`, `@typescript-eslint/parser`, `typescript`. All are versions already in the lockfile (same ones the front-end pins). pnpm does not hoist, and without a root `typescript` the root resolved TS 7, which typescript-eslint rejects. `pnpm-lock.yaml` changed only for the root importer.
- `front-end/eslint.config.mjs` is unchanged. The front-end has no zone to add, and `packages/domain` and `api` are not linted from there.
- `scripts/fixtures/boundaries/**`: 8 `violates-*.ts` files, 2 `clean-*.ts` files (one imports another module through its `index.ts`) and support files.
- `scripts/boundaries.test.mjs`: Vitest, 9 tests titled `[E1.7]`, added to the root `node` project in `vitest.config.mjs` so `pnpm test` runs it. It runs ESLint through the API with the same zones and asserts `[boundaries/dependencies, message]` is the only message for each violating file, and zero messages for every other fixture. The plan said `node --test`, but Vitest runs inside `pnpm test`, and `trace.test.mjs` is not a Vitest file.

## Output

Fixtures (`eslint`, run with the fixture config because the root config ignores them):

```
scripts/fixtures/boundaries/api/src/modules/orders/adapters/violates-cross-module-adapters.ts
  1:29  error  A module may import another module only through its index.ts  boundaries/dependencies
scripts/fixtures/boundaries/api/src/modules/orders/application/violates-application-adapters.ts
  1:27  error  The application layer must not import adapters or platform code  boundaries/dependencies
scripts/fixtures/boundaries/api/src/modules/orders/application/violates-application-platform.ts
  1:22  error  The application layer must not import adapters or platform code  boundaries/dependencies
scripts/fixtures/boundaries/api/src/modules/orders/application/violates-cross-module-application.ts
  1:25  error  A module may import another module only through its index.ts  boundaries/dependencies
scripts/fixtures/boundaries/packages/domain/src/orders/violates-domain-alias.ts
  1:29  error  The domain may import only packages/domain  boundaries/dependencies
scripts/fixtures/boundaries/packages/domain/src/orders/violates-domain-api.ts
  1:22  error  The domain may import only packages/domain  boundaries/dependencies
scripts/fixtures/boundaries/packages/domain/src/orders/violates-domain-front-end.ts
  1:26  error  The domain may import only packages/domain  boundaries/dependencies
scripts/fixtures/boundaries/packages/domain/src/orders/violates-domain-react.ts
  1:26  error  The domain may import only packages/domain  boundaries/dependencies
✖ 8 problems (8 errors, 0 warnings)
```

Real code:

- `npx eslint --no-error-on-unmatched-pattern api packages`: exit 0, no output.
- `cd front-end && npx eslint src`: `47 problems (0 errors, 47 warnings)`.
- `pnpm typecheck`, `pnpm test` (8 files, 64 tests), `pnpm build` and `PLAYWRIGHT_CHANNEL=chrome pnpm e2e` (8 passed): all pass.
- A scratch `api/src/modules/a/application/` set, removed afterwards: importing `../adapters/y` and `../../b/application/z` failed, and importing `../../b/index` passed. So the zones also match real paths, not only the fixture copies.

## Not verified

- `api/` has no source, so the api zones were only proven on fixtures and the scratch files above.
- Type-only imports and re-exports (`export ... from`) were not tested separately.
- The front-end's own `@sk/domain` imports are not restricted by this story.
- CI does not run `lint:zones` yet. I did not run `pnpm lint`, any `--fix`, or the lanes in the sprint plan that need a browser screenshot.
- `node scripts/trace.mjs` still exits 1 for E0.1 to E0.5, unchanged. E1.7 now shows `tests=9`.
