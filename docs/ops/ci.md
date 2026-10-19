# CI

`.github/workflows/ci.yml` runs on every pull request (opened, pushed to, reopened, closed) and on every push to `main`. Architecture section 11 is the design. Deploying staging and production comes with E2.9 and E7.

## Jobs

| Job | Runs on | What it does |
| :-- | :-- | :-- |
| `gates` | Every push and pull request update | The trace script's tests, story traceability, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test` (unit tests and the contract gate), `pnpm lint:zones`, the API lint, the front-end lint, the front-end test type check, `pnpm build`, and the dependency audit. Each gate is its own step and runs even when an earlier one failed, so the run shows every result. |
| `integration (Neon)` | Pull request updates | Creates the Neon branch `preview/pr-<number>` from `development`, or reuses it on later pushes. Migrates it with the release command over the direct URL. Runs `pnpm test:integration` with `DATABASE_URL` through Neon's pooler and `DATABASE_URL_UNPOOLED` direct. Each run creates its own `sk_test_*` database on the branch and drops it, and the last step fails if one is left. There are no seeds yet. The first module story adds them. |
| `delete Neon branch` | Pull request closed, merged or not | Deletes `preview/pr-<number>`. A branch that is already gone counts as deleted. |
| `API image` | Every push and pull request update | Builds the root `Dockerfile` with Buildx and the GitHub Actions cache, and does not push it, because no registry is chosen. `scripts/image-smoke.sh` then checks the image holds no dev dependency, no env file and no root user, runs the release command on an empty Postgres, waits for `/healthz` to answer 200, and expects exit code 0 after SIGTERM. Run the same script locally against any Postgres. |
| `e2e` | Every push and pull request update | The Playwright suite. The job keeps its old id and name, in case branch protection names it. |

The dependency audit fails the run on a high or critical advisory in a production dependency, since those ship in the image. Development dependencies only raise a warning. On 20.10.2026, the warning lists 5 advisories: `handlebars` and `braces` through `eslint-plugin-boundaries`, and `esbuild` through `drizzle-kit`.

A pull request runs one CI at a time. A new push cancels the run it replaces. A close cancels a run that may still be creating the branch, then deletes the branch. Runs on `main` are never cancelled.

## Neon branch rules

- CI touches one branch per pull request, named exactly `preview/pr-<number>`, with `development` as its parent. It never creates, changes or deletes `production`, `staging` or `development`, and never uses them as a parent.
- Only two things call the Neon API. `neondatabase/create-branch-action` creates the branch. `scripts/neon-preview-branch.mjs` reads its URLs (`connect`) and deletes it (`delete`). The script builds the name from the pull request number and refuses anything else. It matches the name exactly, because Neon's branch search also returns `preview/pr-12` for `preview/pr-1`. It never deletes a branch marked default or protected. The `[E1.13]` tests in `scripts/neon-preview-branch.test.mjs` cover these rules.
- Each branch expires 7 days after it is created, in case a close never deletes it. GitHub can drop a pending run when a newer one arrives in the same group, so a close that races a reopen may leave a branch until it expires. A push after expiry creates the branch again.
- The repository is public, so its logs are public. A branch inherits the `neondb_owner` password from `development`. Never use the create action's `db_url`, `db_url_pooled` or `password` outputs, because the action does not mask them. The `connect` step masks the password and both URLs before it exports them.
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
