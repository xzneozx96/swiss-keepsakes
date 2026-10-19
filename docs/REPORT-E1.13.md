# E1.13 CI pipeline

## What changed

Workflow (`.github/workflows/e2e.yml` renamed to `ci.yml`, workflow name `ci`)
- Triggers: `pull_request` with types `opened`, `synchronize`, `reopened` and `closed`, and `push` to `main`.
- `permissions: contents: read`.
- Concurrency group `ci-<pr number or ref>`. It cancels in-progress runs on pull requests only. A push cancels the run it replaces. A close cancels a run that may still be creating the branch, then deletes the branch.
- Every action is pinned by commit, with the version in a comment:

| Action | Commit | Version |
| :-- | :-- | :-- |
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | v7.0.1 |
| `pnpm/action-setup` | `ea17c68df8912ef543352723c149a84f56e3d413` | v6.1.0, which reads `packageManager` |
| `actions/setup-node` | `949feb2413d6458794dcd2491c4babbbce0c15c1` | v7.1.0, with `node-version-file: .nvmrc` |
| `docker/setup-buildx-action` | `f87e5991a6d7451dcb8d9637bfbc97413f497069` | v4.4.1 |
| `docker/build-push-action` | `c3c9e263c25d99ce0380d002d59b67737d91b0dc` | v7.4.0 |
| `actions/upload-artifact` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | v7.0.2 |

- Every checkout sets `persist-credentials: false`.

Jobs
- `gates`. Its steps, in order:
  - the trace script's tests
  - traceability
  - install
  - `pnpm typecheck`
  - `pnpm test` (unit tests and the contract gate)
  - `pnpm lint:zones`
  - `pnpm --filter @sk/api lint`
  - `pnpm --dir front-end lint`
  - `pnpm --dir front-end typecheck:tests`
  - `pnpm build`
  - the two audits

  Each gate step has `if: !cancelled() && install succeeded`, so one failure does not hide the other results.
- `integration (Neon)`, on pull requests only.
  1. A "Neon secret" step. A fork or Dependabot pull request has no secret. Its job passes with a notice that says why, and the other jobs run. A pull request from this repository with no secret fails.
  2. Checkout and setup, then `node scripts/neon-preview-branch.mjs create`, which makes `preview/pr-<N>` from `development` with a 7-day expiry, or reuses it.
  3. Install.
  4. `node scripts/neon-preview-branch.mjs connect` (below).
  5. `pnpm --filter @sk/api db:migrate`, the release command over the direct URL.
  6. A step that drops the `sk_test_*` databases a cancelled run left behind.
  7. `pnpm test:integration`, with `DATABASE_URL` set to the pooled URL, `DATABASE_URL_UNPOOLED` set to the direct URL, and `INTEGRATION_ALLOW_REMOTE_DATABASE=1` set only on that step.
  8. An `always()` step. It fails if any `sk_test_*` database is left on the branch.
- `delete Neon branch`, on `closed` only. The same secret check. A sparse checkout of `scripts/` at the PR head commit, because the merge ref can be gone after a close. A shell assertion `^preview/pr-[1-9][0-9]*$`. Then `node scripts/neon-preview-branch.mjs delete`.
- `API image`. Buildx with `type=gha` layer cache, `load: true` and `push: false`, because no registry is chosen. Then `scripts/image-smoke.sh` against a `postgres:18.6` service container.
- `e2e`. The id and name are unchanged. The gates moved out of it, and its actions are pinned.

`scripts/neon-preview-branch.mjs`, plain Node `fetch`, no dependency. It is the only code that calls the Neon API.
- The pull request number sets the branch name, and anything other than `^[1-9]\d*$` is refused. So production, staging and development can never be named.
- Names are matched exactly, because Neon's branch `search` matches part of a name: `preview/pr-1` also returns `preview/pr-12`, and `development` also returns `development-old`.
- `create` reuses an existing `preview/pr-<N>`. Otherwise it looks up `development` by exact name, refuses if it is missing, and POSTs `{branch: {name, parent_id, expires_at: now + 7 days}, endpoints: [{type: 'read_write'}]}`. The response carries connection URIs, so it is never logged or written anywhere.
- `connect` reads `/connection_uri` for `neondb`/`neondb_owner`, direct and pooled. It writes `::add-mask::` for the password on its own, then for both URLs, and only then appends `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to `$GITHUB_ENV`.
- `delete` refuses a branch marked `default` or `protected`. It treats a missing branch as done, and retries Neon's 423 and 503.
- Tests: `scripts/neon-preview-branch.test.mjs`, 10 `[E1.13]` tests, added to the root Vitest `node` project, so `pnpm test` runs them. `trace.mjs` now shows `E1.13 tests=10`. The story's proof is a run link, but trace fails CI for a Verified story with no test.

Image
- `Dockerfile` (root): `node:22.23.3-trixie-slim`, pinned by index digest `sha256:154ba2f4…8dfa`. The stages:
  - `base`: the lockfile, the workspace file and the 3 manifests, then `corepack enable && corepack install`, which gets pnpm 10.33.4 from `packageManager`.
  - `build`: `pnpm install --frozen-lockfile --filter "@sk/api..."`, then `pnpm --filter @sk/api build`, which builds `@sk/api-contract` first.
  - `prod-deps`: the same filtered install with `--prod`.
  - runtime: the production `node_modules`, `api/dist`, `packages/api-contract/dist`, `api/migrations` and the package manifests. No `src/`. `USER node`, then `CMD ["node", "--conditions=sk-compiled", "api/dist/main.js"]`.
- The pnpm store sits in a BuildKit cache mount.
- No HEALTHCHECK: Fly runs its own checks, and `ROLE=worker` has no HTTP server.
- `.dockerignore` is an allow-list: the root manifests, `api/` and `packages/api-contract/`. It never sends `**/node_modules`, `**/dist`, `**/.env*`, `**/*.local` or `api/test`.
- The image serves the API only. Serving the SPA and the Fly deploy belong to other stories.
- `scripts/image-smoke.sh <image> <postgres url> [port]`, used by CI and by hand:
  1. Checks there is no dev dependency (tsx, typescript, vitest, drizzle-kit, eslint), no `.env*` file and no uid 0, and that the contract's `dist` exists.
  2. Runs the release command `node api/dist/platform/db/migrate.js` on the empty database.
  3. Starts the service and waits for `/healthz` to return `{"status":"ok"}`.
  4. Runs `docker stop`, which must end with exit code 0.

Docs
- New `docs/ops/ci.md`: the jobs, the Neon branch rules, the secrets, and how to rotate the key.
- `tech-stack.md`: the CI row (in use, except deploy) and the Hosting row (the image exists).
- `shared/testing.md`, `backend/api-contract.md` and `backend/data-jobs-security.md`: what CI runs now.

Dependencies added: none.

Dependency audit decision
- `pnpm audit --prod --audit-level=high` blocks. It finds 0 today, and production dependencies ship in the image.
- The full `pnpm audit --audit-level=high` only raises a warning annotation. Its 5 advisories are all in development tooling, and I cannot fix them here:
  - `handlebars` via `eslint-plugin-boundaries`: 2 critical (GHSA-8r5x-fm3f-whwj, GHSA-p8wg-vrv2-v86f) and 1 moderate (GHSA-xw65-4hp5-5hc7).
  - `braces` via `eslint-plugin-boundaries` > `micromatch`: 1 high (GHSA-vfj7-8cjw-p6xm), with no patched version listed.
  - `esbuild` 0.18 via `drizzle-kit` > `@esbuild-kit`: 1 moderate (GHSA-67mh-4wv8-2f99).

Docs consulted
- `neondatabase/create-branch-action` at `fb620d43` (v6, release 6.3.1): `action.yml`, `src/main.ts`, `src/branch.ts` and the bundled `dist`. The action calls `setOutput` for `db_url`, `db_url_pooled` and `password` and never `setSecret`. Its only `setSecret` is for an OIDC id token.
- `actions/runner`: `src/Runner.Worker/FileCommandManager.cs`. `SetOutputFileCommand` logs `context.Debug($"Set output {pair.Key} = {pair.Value}")`, so a debug run prints every step output in full. `ActionCommandManager.cs`: `add-mask` has `OmitEcho => true`. The env file's debug line runs after the step, so the masks registered earlier in that step already cover it.
- `neondatabase/delete-branch-action` v3.2.1 (`action.yaml`, README).
- Context7 `/websites/neon`: the GitHub integration workflow, `GET /connection_uri` (`pooled=true` adds `-pooler`), list branches (`search` is a partial match), delete branch (423 and 503 are safe to retry).
- Context7 `/websites/pnpm_io`: the Docker guide and `pnpm deploy`.
- Release notes and `action.yml` of each pinned action. Docker Hub tags for Node 22.
- Neon CLI help for `api-keys create`, `list` and `revoke`.

Where the result differs from the architecture, the docs or the task
- Architecture section 11 creates the branch from `staging` and loads the prototype seeds. Per the task, the branch comes from `development`. No seed exists, so migrating is the only data step today. The first module story (E2.5) adds seeds.
- Neither official Neon action is used. The tested script does their work.
  - `create-branch-action` was in the first runs (up to `a516550`). It writes the branch password and both URLs as unmasked step outputs, and a debug re-run would print them in this public log. No run on this pull request had debug logging on, and the log scan below finds the password 0 times. A preview branch has `development`'s password. Neon's docs example says "the password is masked when printed", which is not true of v6.3.1. The example also still uses `@v5` and the output `db_url_with_pooler`, which v6 calls `db_url_pooled`.
  - `delete-branch-action` v3.2.1 is a composite action. At run time it installs `neonctl@v2`, unpinned, with the API key in its environment. It puts its inputs into the shell script, and it fails when the branch is already gone, for example after it expired.
- `neondatabase/schema-diff-action` was not added. It posts PR comments, needs `pull-requests: write`, and is not in the acceptance row.
- The task cites D13 for the audit. D13 is Sentry and analytics. The audit is in architecture section 13 ("a dependency audit in CI").
- The task cites `docs/spikes/SP7.md`, which does not exist (E0.7 is Blocked). I read `spikes/sp7-fly-release/` instead. The image's release command is `node api/dist/platform/db/migrate.js`, not the spike's `npx tsx migrate.ts`.
- The fork and Dependabot skip is a check step that passes with a notice, not a job-level `if`, so the run says why.
- `pnpm deploy` was not used. In pnpm 10 it needs `injectWorkspacePackages` (which would change linking for everyone) or `--legacy`. The pnpm docs say the legacy deploy follows the lockfile's versions only since 12.4.1. Two filtered `--frozen-lockfile` installs use the lockfile exactly.
- The `git mv` of the workflow file landed in the first commit (`bf33d9d`) instead of the CI commit. It is a pure rename, so `bf33d9d` still has a valid workflow.

## Output

Local, in the worktree:

```
$ docker run --rm -v "$PWD:/repo" --workdir /repo rhysd/actionlint:1.7.12 -no-color -verbose
verbose: Found total 0 errors in 53 ms for .github/workflows/ci.yml          (exit 0; shellcheck 0.11.0 ran on every run: block)
$ shellcheck scripts/image-smoke.sh                                         (exit 0)

$ pnpm typecheck                 -> exit 0
$ pnpm test                      -> Test Files 22 passed (22), Tests 351 passed (351)
$ pnpm lint:zones                -> exit 0
$ pnpm --filter @sk/api lint     -> exit 0
$ node --test scripts/trace.test.mjs   -> pass 11, fail 0
$ node scripts/trace.mjs docs/development-plan/delivery-plan.md
E1.13 tests=10 status=Backlog    (exit 0)
(at 0f46601: pnpm test 354 passed, actionlint 0 errors)

$ docker build -t sk-api:e1-13 .            15 s cold, 273 MB
$ docker run --rm sk-api:e1-13 sh -c 'id; ...'
uid=1000(node) gid=1000(node)
api/node_modules/@sk/api-contract -> ../../../packages/api-contract
no tsx, typescript, vitest, drizzle-kit or eslint in node_modules/.pnpm; no .env* file

$ scripts/image-smoke.sh sk-api:e1-13 postgres://postgres@127.0.0.1:5453/swiss_keepsakes 3013   (scratch postgres:18.6 container)
== production dependencies only, not root
uid 1000, no dev dependency, no env file
== release command
{"level":30,...,"msg":"migrations applied"}
== service
GET /healthz -> {"status":"ok"}
{"worker":true,"msg":"jobs started"} {"address":"127.0.0.1","port":3013,"msg":"api listening"} {"role":"all","msg":"started"}
{"method":"GET","route":"/healthz","status":200,"ms":5,"msg":"request"}
{"reason":"SIGTERM","msg":"shutting down"} {"msg":"api stopped"} {"msg":"jobs stopped"} {"msg":"stopped"}
exit code after SIGTERM: 0

$ docker run ... sk-api:e1-13 node api/dist/main.js          (no sk-compiled flag)
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/api/node_modules/@sk/api-contract/src/index.ts' ...   exit=1
(src/ is not in the image, so a missing flag fails loudly instead of running .ts source)
```

Mutation checks of the `[E1.13]` tests. Each mutant was reverted, and the file compared identical afterwards. All tests pass again.

```
M1 first search hit instead of the exact name   x exact name (PR 1 deleted preview/pr-12), x already gone, x connect
                                                (at 10 tests: also x all three create tests)                      3, then 6 failed
M2 no default/protected refusal                 x delete refuses a preview branch marked default or protected      1 failed
M3 password not masked on its own               x connect masks the password and both URLs before it exports ...   1 failed
M4 unanchored number check /[1-9]\d*/           x a pull request number maps to preview/pr-<number> ...            1 failed
M5 no retry on 423                              x the API client ... retries a busy branch ...                     1 failed
M6 a mask written after the exports             x connect masks ... before it exports ...                          1 failed
C1 parent found by partial name                 x create branches from development ..., x create refuses when development is missing   2 failed
C2 never reuse                                  x create reuses the branch with the exact name and sends no create  1 failed
C3 expiry 1 day                                 x create branches from development ... with an expiry 7 days out    1 failed
C4 no refusal when development is missing      x create refuses when the development branch is missing ...        1 failed
C5 no JSON content type on a POST               x the API client sends ... a JSON body ...                          1 failed
```

The secret step, simulated locally with the step's own script:

```
same repo, key set            exit=0 available=true
fork, no key                  ::notice title=No Neon branch::GitHub gives no secrets to pull requests from forks or Dependabot ...   exit=0 available=false
dependabot[bot], no key       (same notice)                                                                                           exit=0 available=false
same repo, key missing        ::error::The NEON_API_KEY secret is missing.                                                            exit=1
```

GitHub Actions on this pull request:

| Run | Event | Result |
| :-- | :-- | :-- |
| [39321064213](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39321064213) | opened | green. gates, integration (Neon), API image, e2e. "Branch preview/pr-14 created successfully" |
| [39321944871](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39321944871) | push (docs) | cancelled: "Canceling since a higher priority waiting request for ci-14 exists" |
| [39322015222](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39322015222) | push (deliberate type error) | red. Typecheck X, Build X, API image X. Unit tests, lint, audits, integration and e2e still ran and passed. Annotation "Type 'string' is not assignable to type 'number'". Integration: "already exists, reusing existing branch" |
| [39322627160](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39322627160) | push (revert) | green |
| [39323130582](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39323130582) | closed | delete Neon branch: "Deleted preview/pr-14 (br-fancy-lab-baq5wpqf)". The other jobs were skipped |
| [39323222761](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39323222761) | reopened | green. "Branch preview/pr-14 created successfully" (br-wispy-lab-banjmr2d) |
| [39323737008](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39323737008) | closed | "Deleted preview/pr-14 (br-wispy-lab-banjmr2d)" |
| [39323830928](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39323830928) | reopened, then closed during its Install step | cancelled by the close |
| [39323886334](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39323886334) | closed (race) | "Deleted preview/pr-14 (br-dawn-shadow-bal7yc0m)", the branch the cancelled run had just created |
| [39324136133](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39324136133) | reopened | green (created by the action) |
| [39325599930](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39325599930) | push (`0f46601`, create moved into the script) | green. "Reusing preview/pr-14 (br-withered-star-ba41fm9a)" |
| [39326088961](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39326088961) | closed | "Deleted preview/pr-14 (br-withered-star-ba41fm9a)" |
| [39326153782](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39326153782) | reopened | green. "Created preview/pr-14 (br-frosty-flower-banm9jsf) from development, expires 2026-10-26T21:16:26Z". The pull request is left open |

The integration job on each green run (since `0f46601` the first line reads "Created preview/pr-14 (...) from development, expires ..." or "Reusing preview/pr-14 (...)"):

```
Branch preview/pr-14 created successfully
DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED point at preview/pr-14 (br-...)
Migrate the branch      env: DATABASE_URL: ***  DATABASE_URL_UNPOOLED: ***
{"level":30,...,"msg":"migrations applied"}
Integration tests       INTEGRATION_ALLOW_REMOTE_DATABASE: 1
 Test Files  5 passed (5)
      Tests  42 passed (42)
sk_test_* databases left on the branch: 0
```

The 42 integration tests, with the unit of work, idempotency claims and `/healthz`, pass with request pools on Neon's `-pooler` host. Over PgBouncer, each sk_test database is reached by name after `CREATE DATABASE`. The shapes, from `neon connection-string` locally with the id cut: direct `ep-<id>.c-8.eu-central-1.aws.neon.tech/neondb`, pooled `ep-<id>-pooler.c-8.eu-central-1.aws.neon.tech/neondb`, both `?sslmode=require&channel_binding=require`.

The API image job on CI runs the same smoke: `uid 1000, no dev dependency, no env file`, `migrations applied`, `GET /healthz -> {"status":"ok"}`, `exit code after SIGTERM: 0`. It takes about 2 min cold and 35 s with the GitHub cache.

Masking. I downloaded all 13 runs' logs and searched them for the branch password (read locally into a shell variable, never printed) and the endpoint host:

```
run           password  endpoint host  ep-*
39326153782   0         0              0
... (all 13 runs on this pull request)   0   0   0
```

Two runs contain the text "npg_", inside the pull request body that build-push-action prints from the event payload. That is this report's own wording, not a password.

The preview branch password equals the `development` password (compared locally, never printed). Neon copies roles to a child branch.

Neon branches (`neon branches list --project-id plain-resonance-94662542`):

```
while open:
preview/pr-14         br-fancy-lab-baq5wpqf     ready  2026-10-26T20:39:05Z  2026-10-19T20:39:06Z   (parent br-green-dust-bad9e3ed = development)
development / [default] production / staging     never expire
after each close (3 times):
development           br-green-dust-bad9e3ed    ready  2026-10-19T07:10:25Z
[default] production  br-little-smoke-bar8uj5x  ready  2026-10-19T06:59:37Z
staging               br-noisy-haze-ba000ubs    ready  2026-10-19T07:10:18Z
after the 4th close: the same three only
now (open, made by the script):
preview/pr-14         br-frosty-flower-banm9jsf ready  2026-10-26T21:16:26Z  2026-10-19T21:16:27Z   (Parent Id br-green-dust-bad9e3ed = development)
```

Cleanup: the scratch Postgres container `sk-e1-13-pg` and the image `sk-api:e1-13` are removed. Ports 5453 and 3013 are free. No smoke container is left. `sk-e1-9` and `sk-e1-10` were not touched.

## Not verified

- A push to `main`. Nothing was merged, so the gates, image and e2e jobs on `push`, and the Neon jobs skipping there, did not run on GitHub.
- A close by merge. Every close was `gh pr close` without a merge. A merged close event has a different `GITHUB_SHA`, and the delete job checks out the head commit.
- A debug re-run. I read the runner source instead of turning debug on.
- A real fork or Dependabot pull request. Only the step's script was run locally with those inputs.
- Neon deleting a branch at its 7-day expiry.
- GitHub dropping a pending `closed` run for a newer event in the same group. This is the race that the expiry covers.
- A changed migration on a reused branch. The migrate step only applies new migrations to a branch it reuses. The integration tests always migrate a fresh database, so they still catch it.
- The image on arm64, the image pushed to a registry, Fly, the release command on Fly, and serving the SPA. Other stories own them.
- The integration tests do not run on `push` to `main`. They run on pull requests only.
- psql comes from the GitHub runner image (ubuntu-24.04). It is not pinned.
- `pg` prints its `sslmode=require` deprecation warning in the CI logs (it already treats `require` as `verify-full`). I left the URLs as Neon returns them, because libpq's `verify-full` would need a root certificate file for psql.
- `@neon/config` and `@neon/env` (with a native keyring module) are in `api` dependencies, though only `api/neon.ts` uses them, so the image carries them. Not changed here.
- Intermediate commits were not run one by one. CI ran on each pushed head: `abaf14f`, `2a4084d` (cancelled), `86e1a64` (red on purpose), `a516550` and `0f46601`.

Open questions for the owner
- Mark `production`, `staging` and `development` as protected in Neon. The script already refuses protected and default branches, but protection blocks every key.
- The preview branch shares `development`'s `neondb_owner` password, and `development` was branched from `production` (not checked whether they match). Masking keeps it out of the public logs. A password reset on each new preview branch, or a separate CI role, would limit the damage if it ever leaked.
- Branch protection on `main` is off. Should `gates`, `integration (Neon)`, `API image` and `e2e` become required checks?
- The 5 development-dependency advisories (above) need upstream fixes, or a replacement for `eslint-plugin-boundaries`.

## Review fixes

An independent Opus review of 0f46601 found 2 High, 3 Medium and several Low. The fixes are commits 1473b61 to 95fcef3. Where this section and the sections above differ, this section wins.

- H1. The close-time delete job now checks out the default branch (`github.event.repository.default_branch`, sparse `scripts`), so a PR author's code never runs with the key at close time and older PR heads without the script no longer break. A "Choose the delete script" step falls back to the PR head only while the default branch lacks `scripts/neon-preview-branch.mjs`, which is true until this stack merges. The fallback ran on GitHub (close run 39332115608, "Deleted preview/pr-14"). The default-branch path was proved locally only, by running the step's script against a directory with and without the file, and was not tried on the real heads of #8, #10 or #12.
- H2. The preview branch inherited `development`'s `neondb_owner` password, which came from `production`. `connect` now resets the password on every run, create or reuse, masks the new one at once, waits for the reset's operations, then reads both URIs and refuses any URI that does not carry the reset password. Tests assert the reset is sent before any connection URI is read and that the inherited password is never exported. The parent compared the live passwords in-process, printing nothing: the preview branch's password differs from `development`'s. The parent also scanned run 39332203432 for both passwords: 0 occurrences each.
- M1. `main(argv, env, { fetch, write, pollMs, retryDelayMs })` is exported and tested over a fake fetch. Tests assert the exact `::add-mask::` lines come before any other output, the exact `GITHUB_ENV` content, that `GITHUB_OUTPUT` is never created, that the PR number comes from `PR_NUMBER` and not `GITHUB_RUN_NUMBER`, and that 423 and 503 stop after 5 attempts. 13 new mutants and 6 earlier ones were each killed.
- M2. Expiry is 3 days, and extended on every reuse (L3). `create` fails with a clear message when Neon reports the branch limit (10 on the Free plan, counting the three long-lived branches, so at most 7 previews). The match is on the response message, because Neon documents no code for it. It was tested with a fake 422, and the real response was not seen.
- M3. `pnpm --filter @sk/api db:check-branch` fails in CI when a branch's `drizzle.__drizzle_migrations` holds a hash that `api/migrations` lacks, using drizzle's own hash reader. It is CI-only and not part of the release command, because an SP7-style rollback deploys an older image onto a newer schema on purpose. On the fresh preview branch it reported 0 applied, which shows `development` has no drizzle table today.
- L1. Branch lookups follow `pagination.next` with the cursor.
- L2. `connect` runs right after `create`, before `pnpm install`.
- L5. The dev audit parses `pnpm audit --json` and fails when there is no report, so a registry outage is no longer reported as an advisory.
- L6. The image smoke test now fails when `node_modules/.pnpm` is missing and requires `hono@` in it.
- L7. `docs/ops/ci.md` now says the key can read credentials for, reset and delete every branch including production, that a new branch starts with `development`'s password (which came from `production`), the 10-branch cap, that pending runs on `main` can be replaced, and that CI migrates with `tsx` from source while the image job covers the compiled release command.

Evidence at 95fcef3: `actionlint` 0 errors, `pnpm typecheck`, `pnpm lint:zones` and the api lint pass, `pnpm test` reports 362 passed, `trace` shows E1.13 with 19 tests and exits 0, and the integration suite reports 43 passed locally with 0 `sk_test_` databases left. CI: push run [39331615085](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39331615085) green, close run [39332115608](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39332115608) deleted `preview/pr-14` with only the three long-lived branches left, and reopen run [39332203432](https://github.com/xzneozx96/swiss-keepsakes/actions/runs/39332203432) green with all of `gates`, `integration (Neon)`, `API image` and `e2e` passing.

Not verified after the fixes:

- The default-branch delete path on GitHub, and a delete on the real heads of #8, #10 and #12.
- The real branch-limit response from Neon.
- A close by merge.

Owner decisions that remain: rotate the `development` and `production` passwords so they differ, make `gates`, `integration (Neon)`, `API image` and `e2e` required checks on `main`, and decide whether a fork or Dependabot PR may merge with a green but empty Neon check. Neon branch protection needs a paid plan.
