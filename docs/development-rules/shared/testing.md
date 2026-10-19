# Testing (front-end and back-end)

Read this before you write a test or decide what to verify.

## Front-end test setup (in use)

Set up on 2026-10-19 to match the owner's agentic-rag project: Vitest 4.1 with jsdom 28, Testing Library 16 and Playwright 1.64.

| What | Where |
| :-- | :-- |
| Unit and component tests | `front-end/tests/*.test.ts` and `*.test.tsx`. Import app code with `@/` |
| Setup | `front-end/tests/setup.ts`: jest-dom matchers and jsdom stubs for `scrollIntoView`, `ResizeObserver`, `IntersectionObserver`, `matchMedia` and `getAnimations` |
| Test config | The `test` block in `front-end/vite.config.ts`, including a `@` alias, because `tests/` sits outside `tsconfig.json` |
| Type check for tests | `front-end/tsconfig.test.json`, kept out of the main `tsconfig.json` so a test type error cannot fail the Vercel build |
| End-to-end | `front-end/tests/e2e/*.spec.ts` and `front-end/playwright.config.ts` |

Commands, run in `front-end/`:
- `pnpm test` runs every unit test (about 2 s). `pnpm exec vitest tests/format.test.ts` runs one file.
- `pnpm typecheck:tests` type-checks the tests. Nothing runs it automatically.
- `pnpm test:e2e` runs Playwright. It starts its own dev server on port 5391 and stops it afterwards. Set `PLAYWRIGHT_CHANNEL=chrome` to use the installed Google Chrome. Without it, run `pnpm exec playwright install chromium` first.

Examples to copy: `front-end/tests/format.test.ts` replaces `Intl.NumberFormat` to reproduce Chrome's straight apostrophe, and `front-end/tests/storage.test.ts` makes `setItem` throw a quota error. `front-end/tests/e2e/smoke.spec.ts` checks that the app mounts, with a stable selector and no page errors. Use `/#/` URLs, because routing is hash based.

Gaps:
- `front-end/eslint.config.mjs` ignores `tests/*`, so tests are not linted. The owner's standard (`eslint .`) would lint them.
- Nothing type-checks `front-end/tests/e2e/*.spec.ts` or `front-end/playwright.config.ts`. `tsconfig.test.json` excludes the e2e folder and the config file sits outside both tsconfigs. agentic-rag has the same gap.
- There is no CI, so nothing runs the tests for you. Run them before you finish.
- There are no component tests yet. The first ones are unwritten, and the stubs in `setup.ts` are the generic ones only.

## Rules

- Test behavior, not implementation. No snapshot tests.
- Hooks and pure utilities get tests. A presentational component needs a test only when it contains logic.
- Check the empty, loading and error states of anything that fetches or lists.
- A rule in the shared domain package has a unit test for each transition and each boundary value. A rule that moves money or status is not finished until a test shows its result.
- A bug fix starts with a test or script that fails for the reason reported.

## Levels (from `docs/architecture/backend.md` section 12)

The front-end has unit tests and an end-to-end smoke test today. The rows about use cases, the API and load wait for the backend modules.

Database tests are built (E1.9). They live in `api/test/integration/` and run with `pnpm test:integration` from the repo root, with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` set, for example to the compose Postgres (`docker compose up -d --wait postgres`, then both `postgres://postgres@127.0.0.1:5433/swiss_keepsakes`). Each run creates its own database, migrates it and drops it. It refuses a host other than this machine unless `INTEGRATION_ALLOW_REMOTE_DATABASE=1`, which only a throwaway server may get. `pnpm test` never runs them, so it needs no Docker. Count rows by a marker your test made, not by table totals, because test files run in parallel on one database.

The contract gate is built (E1.10). `api/test/contract.test.ts` builds `packages/api-contract/generated/` in memory from the API routes and fails when the committed files differ, so `pnpm test` runs it. After you change a route or a schema, run `pnpm contract:build` and commit the result. The gate is `pnpm test` plus `pnpm typecheck`: the test compares the files, lists the routes and checks the problem bodies, and the type check proves that the generated client's types equal the Zod types and that `problem()` refuses an unknown code or a status under 400.

| Level | Proves | Tool |
| :-- | :-- | :-- |
| Pure domain | Transition tables and policies | Vitest in `packages/domain` |
| Use cases | Each use case's decisions, with in-memory fakes of its ports | Vitest in `api/test/application` |
| Database | Locks, unique indexes and composite keys, against real Postgres | Vitest on a Neon branch |
| API | Route contracts, per-role permissions | Vitest |
| Contract | Front-end and API agree | CI fails if the regenerated client differs |
| End to end | Whole scenarios at 375px in English and German | Playwright on staging |
| Load | Hold and accept paths under concurrency | k6 |

## Front-end notes

When TanStack Query is added, wrap hooks and components that use it in a fresh `QueryClientProvider` per test, with retries off. A hook that needs IndexedDB or another browser API gets a fake from the test setup.
