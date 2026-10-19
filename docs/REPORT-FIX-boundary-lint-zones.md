# Report: boundary lint zones (E1.7)

## What changed
- `eslint.boundaries.mjs`: `files` globs now cover ts, tsx, mts, cts, js, jsx, mjs, cjs for `packages/domain/src` and `api/src`. Element patterns use `index.*`, `ports.*`, `main.*` so any extension matches.
- New element type `ports` (`api/src/modules/*/ports.*`, captured by module). Rules (backend.md 4.1, backend/architecture.md):
  - ports may import the domain only (application, adapters, platform, composition, module-index are errors);
  - application/adapters/ports may not import another module's application, adapters or ports (own-module ports stay allowed for application);
  - the domain may not import ports;
  - adapters may not import the composition root (`main`), because the table does not list it.
- Fixtures added at the real path shape under `scripts/fixtures/boundaries/`: .tsx and .mjs domain violations, .tsx api violation, application -> other module ports, four ports violations (adapters, application, platform, other module ports), adapter -> main; clean: ports -> domain, adapter -> application/platform/domain.
- `scripts/boundaries.test.mjs`: lints all source extensions, 9 new `[E1.7]` tests, clean list extended.

## Verification (root)
- `pnpm test`: 12 files, 240 tests passed.
- `pnpm lint:zones`: exit 0. `pnpm typecheck` and `pnpm build`: Done (all packages).
- `lint:zones` on .tsx/.mjs: I temporarily created `packages/domain/src/tmp/{a.tsx,b.mjs}`, `api/src/modules/x/application/c.tsx` and `api/src/modules/x/ports.mjs`. Output: 4 errors (domain x2, application adapters, ports), exit 1. I removed them afterwards. (I also deleted the tracked `api/` files by mistake in that cleanup and restored them with `git restore api`; `git status` is clean outside this change.)

## Only proven by fixtures
`api/src` does not exist yet, so every api rule (application, adapters, ports, module-index, composition, cross-module) is proven only by the fixtures. The domain rules are proven by fixtures and by real `packages/domain/src` passing.

## Not verified / notes
- front-end was not touched, so e2e and the route diff were not run.
- Ports "may import domain only" is enforced against local layers; external packages (e.g. a type-only npm import) are not blocked from ports. The owner may want that tightened.
- When a file breaks two rules, only one message shows (e.g. ports importing another module's application reports the module rule); fixtures are written to hit one rule each.
- `tsconfig.eslint.json` and the root `package.json` needed no change.
