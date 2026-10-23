# CI

`.github/workflows/ci.yml` runs on every pull request (opened, pushed to, reopened, closed) and on every push to `main`. Architecture section 11 is the design. Deploying staging and production comes with E2.9 and E7.

## Jobs

| Job | Runs on | What it does |
| :-- | :-- | :-- |
| `gates` | Every push and pull request update | The trace script's tests, story traceability, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test` (unit tests and the contract gate), `pnpm lint:zones`, the API lint, the front-end lint, the front-end test type check, `pnpm build`, and the dependency audit. Each gate is its own step and runs even when an earlier one failed, so the run shows every result. |
| `changes` | Pull request updates | Lists the files the pull request changes and sets `api=true` when any is under `api/`, `packages/`, `scripts/`, `.github/`, `e2e/`, `front-end/tests/e2e/`, the Playwright and Vite config, `front-end/src/main.tsx`, `front-end/src/lib/`, the auth and stores features, or a package, lockfile, Node version or Docker file. A failed diff also sets `api=true`, so a doubt runs the integration job. |
| `integration (Neon)` | Pull request updates that change one of those paths | Creates the Neon branch `preview/pr-<number>` from `development`, or reuses it on later pushes. Resets the branch's `neondb_owner` password and exports the new URLs. Checks that the branch holds no applied migration that `api/migrations` lacks (`pnpm --filter @sk/api db:check-branch`). Migrates it with `pnpm --filter @sk/api db:migrate` over the direct URL, with placeholder `BETTER_AUTH_URL`, `APP_URL` and `BETTER_AUTH_SECRET` values because the release command reads the whole config schema, which runs the release command from source with tsx. The `API image` job runs the compiled one. Runs `pnpm test:integration` with `DATABASE_URL` through Neon's pooler and `DATABASE_URL_UNPOOLED` direct. Then installs Playwright's Chromium and WebKit and runs the front-end `pnpm test:e2e` on the same branch (sign-in, smoke and the invitation screens), then the demo flows of the root `e2e/` folder (`pnpm e2e`, which builds the front-end first). Both start the real API (`api/test/support/e2e-server.ts`) on a database of its own and run the SPA on one origin (E2.1, `docs/development-rules/shared/testing.md`). No spec runs without the API. On failure it uploads the Playwright reports as `playwright-report`. Each run creates its own `sk_test_*` database on the branch (the integration tests and the e2e harness each make one) and drops it, and the last step fails if one is left. There are no seeds yet. The first module story adds them. |
| `delete Neon branch` | Pull request closed, merged or not | Deletes `preview/pr-<number>` with the script from the default branch, so code from the pull request never runs with the key at close. While the default branch lacks the script (until the E1.13 stack merges), it uses the pull request head's copy. A branch that is already gone counts as deleted. |
| `API image` | Every push and pull request update | Builds the root `Dockerfile` with Buildx and the GitHub Actions cache, and does not push it, because no registry is chosen. `scripts/image-smoke.sh` then checks the image holds no dev dependency, no env file and no root user, runs the release command on an empty Postgres, waits for `/healthz` to answer 200, and expects exit code 0 after SIGTERM. It sets no `SMTP_*`, so the log shows the `mail.smtp-unset` warning. It sets `BETTER_AUTH_URL` and a random `BETTER_AUTH_SECRET`, which the service and the release command require.

The Fly release step (`node api/dist/platform/db/migrate.js`, E2.9) receives the app's secrets, `BETTER_AUTH_SECRET` and `SMTP_PASSWORD` included, because it runs in the app's own environment and reads the same configuration as the service. Only CI, which has no app secrets, uses placeholders. Run the same script locally against any Postgres. |

The dependency audit fails the run on a high or critical advisory in a production dependency, since those ship in the image. Development dependencies only raise a warning, but the step still fails when the registry returns no report. On 20.10.2026, the warning lists 5 advisories: `handlebars` and `braces` through `eslint-plugin-boundaries`, and `esbuild` through `drizzle-kit`.

CI sends no mail. The live SMTP suite runs only on demand (`docs/ops/mail.md`).

A pull request runs one CI at a time. A new push cancels the run it replaces. A close cancels a run that may still be creating the branch, then deletes the branch. A run on `main` that has started is never cancelled, but GitHub keeps one pending run per group, so a third push to `main` replaces a second one that is still waiting.

The migration check exists because a reused branch keeps what earlier pushes applied, and drizzle's migrator compares timestamps only. A migration that was rewritten or removed since would go unnoticed. When the check fails, close and reopen the pull request for a fresh branch. If `development` itself carries the unknown migration, code outside this branch migrated `development`. The check is not part of the release command, because a rollback deploys an older image onto a newer schema on purpose.

A pull request that changes none of those paths skips `integration (Neon)`. The other jobs still run, so a documentation-only change finishes in about four minutes. A change to the front-end paths above runs the job, because every Playwright spec needs the real API. Any other front-end change skips it, so the Playwright specs do not run for it (owner decision 23.10.2026). The job is never run on pushes to `main`, as before, and pull requests from forks get no Neon secret, so neither runs a Playwright spec. Branch protection that names `integration (Neon)` as required treats the skipped job as passed.

## Neon branch rules

- CI touches one branch per pull request, named exactly `preview/pr-<number>`, with `development` as its parent. It never creates, changes or deletes `production`, `staging` or `development`, and never uses `production` or `staging` as a parent.
- Only `scripts/neon-preview-branch.mjs` calls the Neon API. `create` makes the branch from `development`, or reuses it and moves its expiry. `connect` resets the password, then reads the URLs. `delete` deletes the branch. The script builds the name from the pull request number and refuses anything else. It matches names exactly, because Neon's branch search also returns `preview/pr-12` for `preview/pr-1` and `development-old` for `development`. It refuses to create a branch when `development` is missing, and never deletes a branch marked default or protected. The `[E1.13]` tests in `scripts/neon-preview-branch.test.mjs` cover these rules.
- Each branch expires 3 days after its last run, in case a close never deletes it. GitHub can drop a pending run when a newer one arrives in the same group, so a close that races a reopen may leave a branch until it expires. A push after expiry creates the branch again.
- The Free plan allows 10 branches per project, and `production`, `staging` and `development` take 3, so at most 7 pull requests can have a branch at once. At the cap, `create` fails with a message that says so, and the integration job is red. Delete the branches of closed pull requests with `neon branches delete preview/pr-<number> --project-id plain-resonance-94662542`, or wait for them to expire.
- The repository is public, so its logs are public. A new branch starts with `development`'s `neondb_owner` password, and `development` was branched from `production`, so that password is `production`'s unless someone reset it. `connect` therefore resets the preview branch's password on every run and waits for the reset to finish before it reads the URLs, so every later step, dependencies included, holds a password that works on that branch only. Never put a password or a URL in a step output: `neondatabase/create-branch-action` does that without masking, and a debug re-run prints every step output. `connect` masks the password and both URLs before it exports them to the environment.
- The API key in `NEON_API_KEY` is limited to this project, not to preview branches. It can read the credentials of every branch, reset their passwords and delete them, `production` included. Only the script's checks keep CI on `preview/pr-<number>`.
- Pull requests from forks and Dependabot get no secrets. Their Neon jobs pass with a notice saying so, and the other jobs run. A pull request from this repository fails if the secret is missing.

## Secrets

- `NEON_API_KEY` (repository secret): a Neon organization API key named `sk-ci-github-actions`, limited to the project `plain-resonance-94662542`.
- `NEON_PROJECT_ID` (repository variable): `plain-resonance-94662542`.

## Rotate the Neon key

1. Create the new key. Neon shows it once.
   `neon api-keys create --name sk-ci-github-actions-<date> --project-id plain-resonance-94662542`
2. Store it. `gh secret set` asks for the value, so it does not end up in shell history.
   `gh secret set NEON_API_KEY --repo xzneozx96/swiss-keepsakes`
3. Re-run the `integration (Neon)` job on an open pull request and check that it passes.
4. Find the old key's id, then revoke it.
   `neon api-keys list --org-id org-nameless-rice-77984840`
   `neon api-keys revoke <id> --org-id org-nameless-rice-77984840`

Rotate at once if the key may have leaked, for example if it appears in a log. Then check `neon branches list --project-id plain-resonance-94662542` for branches you do not expect.
