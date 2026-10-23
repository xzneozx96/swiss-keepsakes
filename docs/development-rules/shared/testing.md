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
- `pnpm typecheck:tests` type-checks the tests. CI runs it.
- `pnpm test:e2e` runs Playwright. It starts its own dev server on port 5391 and stops it afterwards. Set `PLAYWRIGHT_CHANNEL=chrome` to use the installed Google Chrome. Without it, run `pnpm exec playwright install chromium` first.

Examples to copy: `front-end/tests/format.test.ts` replaces `Intl.NumberFormat` to reproduce Chrome's straight apostrophe, and `front-end/tests/storage.test.ts` makes `setItem` throw a quota error. `front-end/tests/e2e/smoke.spec.ts` checks that the app mounts, with a stable selector and no page errors. Use `/#/` URLs, because routing is hash based.

Gaps:
- `front-end/eslint.config.mjs` ignores `tests/*`, so tests are not linted. The owner's standard (`eslint .`) would lint them.
- Nothing type-checks `front-end/tests/e2e/*.spec.ts` or `front-end/playwright.config.ts`. `tsconfig.test.json` excludes the e2e folder and the config file sits outside both tsconfigs. agentic-rag has the same gap.
- There are no component tests yet. The first ones are unwritten, and the stubs in `setup.ts` are the generic ones only.

## Rules

- Test behavior, not implementation. No snapshot tests.
- Hooks and pure utilities get tests. A presentational component needs a test only when it contains logic.
- Check the empty, loading and error states of anything that fetches or lists.
- A rule in the shared domain package has a unit test for each transition and each boundary value. A rule that moves money or status is not finished until a test shows its result.
- A bug fix starts with a test or script that fails for the reason reported.

## Levels (from `docs/architecture/backend.md` section 12)

The front-end has unit tests and an end-to-end smoke test today. Use-case tests start with E2.8 in `api/test/application/`. The rows about the API and load wait for the backend modules.

Database tests are built (E1.9). They live in `api/test/integration/` and run with `pnpm test:integration` from the repo root, with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` set. They run on the Neon `development` branch (owner decision, 20.10.2026). Take only those two variables from `api/.env.local` and set `INTEGRATION_ALLOW_REMOTE_DATABASE=1`, for example `env $(grep -E '^DATABASE_URL(_UNPOOLED)?=' api/.env.local | xargs) INTEGRATION_ALLOW_REMOTE_DATABASE=1 pnpm test:integration`, and never print them. Each run creates its own `sk_test_*` database on the branch, migrates it and drops it, so it never writes to the branch's own database. After a run, check that none is left (`select count(*) from pg_database where datname like 'sk\_test\_%'`, the query the CI step uses). Never use the `production` or `staging` URLs. The harness refuses a host other than this machine unless the flag is set, which only a throwaway server or the `development` branch may get. `docker-compose.yml` stays for offline work and is optional, with both URLs set to `postgres://postgres@127.0.0.1:5433/swiss_keepsakes`. `pnpm test` never runs these tests, so it needs no database. The `integration (Neon)` CI job runs them on the pull request's Neon branch when started by hand, with `DATABASE_URL` through Neon's pooler (`docs/ops/ci.md`). Count rows by a marker your test made, not by table totals, because test files run in parallel on one database.

Mail tests are built (E2.8). Use the in-memory `Mailer` in `api/test/support/memory-mailer.ts`. It records each message, and `failWith` makes every send fail like an SMTP server. Render tests check each template in EN and DE with its data and recipient, and its HTML part (the code or link, escaping, no remote image, no script) (`api/test/application/notifications/`). `api/test/support/mail-preview.ts` writes every template's HTML for a look in a browser (`docs/ops/mail.md`). `api/test/integration/mail.test.ts` runs the `mail` job on real pg-boss, each test on its own queues with fast retries. The live suite, `pnpm --filter @sk/api test:smtp-live`, sends to the test inbox only. Its files end in `.live.ts`, so `pnpm test` and CI never run it (`docs/ops/mail.md`).

Auth tests are built (E2.2). `api/test/integration/auth.test.ts` runs the real Better Auth handler through `createApp` on real Postgres. It reads each sign-in code from the queued N01 job and gives every call its own `Fly-Client-IP`, because the code routes allow 3 calls a minute per address. Better Auth skips its origin check under `NODE_ENV=test`, which Vitest sets, so `createAuth` turns it on explicitly and a test proves it.

Sign-in end to end is built (E2.1). `front-end/tests/e2e/sign-in.api.spec.ts` runs the sign-in sheet against the real API, with no stub of Better Auth. `front-end/playwright.config.ts` starts `api/test/support/e2e-server.ts`, which makes an `sk_test_*` database on the Neon `development` branch, migrates it, runs `src/main.ts` on it and drops the database when Playwright stops it. A second small server in that file reads the sign-in code from the queued N01 job, ages a code and ends sessions, which a browser cannot do. The SPA runs on the Vite dev server in API mode and proxies `/api` to that API, so the browser sees one origin. The projects are `api-chromium-en`, `api-chromium-de`, `api-webkit-en` and `api-webkit-de` at 375x812. Only Google's consent page is stubbed. The specs run only when `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are set: `env $(grep -E '^DATABASE_URL(_UNPOOLED)?=' api/.env.local | xargs) INTEGRATION_ALLOW_REMOTE_DATABASE=1 pnpm --dir front-end test:e2e`. Without them `pnpm test:e2e` runs the demo specs only: `smoke.spec.ts` and `sign-in-demo.spec.ts` in the `chromium` project, which has its own dev server on port 5391 with `VITE_API_ENABLED` forced empty, so they always see the demo sign-in that Vercel serves. The demo flows in the root `e2e/` folder (`pnpm e2e`) also run the built demo app and need no API or database. The `integration (Neon)` job runs them when started by hand (`docs/ops/ci.md`). Pull requests do not run them automatically. After a run, check that no `sk_test_*` database is left, as for the integration tests.

The invitation screens A01 and A02 are covered end to end in `front-end/tests/e2e/stores.api.spec.ts` (E2.3, `[E2.3][S8]`), against the real API, in the four API projects. The test server in `api/test/support/e2e-server.ts` has two more calls for it. `POST /grant-admin` makes a user who signed in once a Super Admin, through `makeGrantSuperAdmin`, the use case behind `api/scripts/admin-grant.ts`. `POST /invitation-link` runs the real mail attempt (`makeSendMail`, the SMTP mailer over a transport that keeps the message, the N20 or N18 template (`template=N18`, N20 by default) and the links of `src/main.ts` at `APP_URL`, `invitationScreens`) for the newest job of that template for an address and returns the mail with its link. Each call has its own transport, so parallel specs never read each other's mail. The specs drive: the Super Admin creates the store in A01, a Super Admin who follows the Owner link gets the sign-out alone, another email is refused and the invitation stays open, the Owner signs in with the invited email and accepts, a second accept by the same Owner on another phone answers as the first did (E2.4), open for sale is refused with the checklist (the screen is made to think the store may open, and the real 409 answers), and after a resend the old link says the invitation is not found. Smaller specs cover the token leaving the address before sign-in, a link opened in a tab that already shows A02, A02 with no link, and the guard of A01. Before sign-in the screens show the store from the preview, and the visitor taps "Sign in to continue". The helpers both invitation specs share are in `front-end/tests/e2e/invitation-flows.ts`.

The Store Manager's side (E2.4, `[E2.4][AC02]`) is in `front-end/tests/e2e/members.api.spec.ts`, in the same four projects. The Owner invites a Manager in M22 and the N18 link comes from the real mail attempt. Another email is refused with the invitation still open. The Manager signs in with the invited email, accepts with the button, sees only that store and no members tab (and the API answers 403 to the members route). The Owner removes the Manager, who loses access on the next request. A revoked link and the old link after a resend stop working. `front-end/tests/stores-members.test.tsx` covers M01, M22 and the hidden tab with the HTTP answered in the test. `front-end/tests/stores-screens.test.tsx` covers the same screens with the HTTP answered in the test, every body parsed by the contract's Zod schema.

Store and invitation tests are built (E2.3). `api/test/application/identity/` runs each use case over `api/test/support/fake-identity.ts`, the identity ports in memory with a unit of work that rolls back on a throw. `api/test/platform/http/identity-routes.test.ts` runs the routes over the real `createApp` with stand-in use cases. `api/test/integration/stores.test.ts` runs the whole path on real Postgres through Better Auth sessions: the Super Admin invites, the mail attempt runs with the real `InvitationLink` and the in-memory `Mailer`, a wrong address is refused, the right one accepts once under parallel requests, and opening for sale is refused. The later A02 conditions are replaced there by test doubles, through `createIdentityWiring` in `api/test/support/identity-wiring.ts`. `pnpm --filter @sk/api admin:grant` is tested as a child process against the harness database. Never run it against the Neon `development` branch's own database, `staging` or `production` from a test.

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

Wrap hooks and components that read shop data in a fresh `QueryClientProvider` and `DataClientProvider` per test, with retries off. To prove a mutation invalidates what a screen reads, leave the demo store bridge out (`renderWithoutBridge` in `front-end/tests/data-client.test.tsx`), or the bridge refreshes the cache and hides a missing invalidation. A hook that needs IndexedDB or another browser API gets a fake from the test setup.

The stores client makes its `Idempotency-Key` with `crypto.randomUUID()`, which a browser offers only on https and on `localhost`. The Playwright specs use `http://localhost`, so they work. A test that opens the SPA on a LAN address over plain http, such as a phone on the dev server, gets no key and every command fails. Use the https preview or `localhost` there.
