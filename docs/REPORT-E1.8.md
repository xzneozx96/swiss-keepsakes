# E1.8 API skeleton

## What changed

- `api/src/main.ts`: composition only.
  - It reads the config, creates the logger, starts the HTTP server and the worker by `ROLE`, and stops both on SIGINT or SIGTERM.
  - A bad config prints a message to stderr and exits 1.
  - A shutdown that takes over 10 s exits 1.
- `api/src/platform/config.ts`: one Zod schema over the environment.
  - `ROLE` is `api`, `worker` or `all`. The default is `all`, the mode production machines run (D1).
  - `PORT` is 0 to 65535 and defaults to 3000. 0 picks a free port, which the process tests use.
  - `LOG_LEVEL` takes a pino level and defaults to `info`.
  - `DATABASE_URL` is required and must be a `postgres://` or `postgresql://` URL. Nothing connects to it yet (E1.9). It is the one required variable and it is a secret, so the startup check proves both "missing" and "never printed".
  - A blank value counts as unset, so `PORT=` does not coerce to 0.
  - The message lists each bad variable as `NAME: reason`. It is built from the issue path and message only, never the input.
- `api/src/platform/logger.ts`: pino, JSON to stdout. `email`, `phone`, `token`, `accessToken`, `authorization`, `cookie` and `engraving` are redacted at the top level and one level down (section 13).
- `api/src/platform/http/app.ts`: `OpenAPIHono`, so E1.10 can build on it.
  - Request ids come from Hono's `requestId()`. An incoming `X-Request-Id` of up to 255 characters from `[A-Za-z0-9_=-]` is kept. Anything else is replaced by a UUID. The response always carries it.
  - A per-request child logger (`c.get('logger')`) carries `requestId`. Each request logs one line with the method, route pattern, status and ms. It logs the pattern, not the URL, because `/partner/{token}` will carry a token.
  - `GET /healthz` returns `{"status":"ok"}` and touches no database. Section 13 says it should check the database and the pg-boss heartbeat. That arrives with E1.9.
- `api/src/platform/http/problem.ts`: RFC 9457 `application/problem+json` with `type`, `status`, `title`, `instance` (the path) and `requestId`. Codes:
  - `not-found` for an unknown route.
  - `validation-failed` from `defaultHook`, with `errors: [{ in, path, message }]`.
  - `about:blank` with the status text for Hono `HTTPException`s, such as malformed JSON (400) or a wrong content type (415).
  - `internal-error` for anything else. The cause is logged with the request id and never sent.
- `api/src/platform/http/server.ts` wraps `serve()` and `close()`.
- `api/src/platform/jobs/worker.ts` is the worker shell. It logs start and stop and keeps the process alive. pg-boss replaces its body in E1.9.
- `api/package.json` scripts:
  - `dev`: `tsx watch --env-file-if-exists=.env.local src/main.ts`
  - `start`: `node dist/main.js`
  - `build`: `tsc -p tsconfig.build.json`, which emits `dist/`
  - `typecheck`: `tsc`, covering source and tests
  - `lint`
- `api/tsconfig.json` uses NodeNext with `.ts` import paths and `rewriteRelativeImportExtensions`, so `dist/` runs on plain Node (checked below). `@sk/domain` is not imported, because its exports point at `.ts` source that `dist/` could not load.
- Root `package.json`: `pnpm dev` runs `pnpm --filter @sk/api dev`. That is one process with `ROLE=all`, as section 11 describes for local work and as production machines run. Variables already set in the shell override `api/.env.local`, so `ROLE=api pnpm dev` works.
- `api/.env.example` is committed. Copy it to `api/.env.local`, which git ignores through `*.local`. `neon env pull` writes the same file.
- `docker-compose.yml` (root, project name `swiss-keepsakes`):
  - Images: `postgres:18.6`, `ghcr.io/xzneozx96/minio:RELEASE.2025-09-07T16-13-09Z` and `axllent/mailpit:v1.31.6`.
  - Each service has a healthcheck, so `docker compose up -d --wait` returns once all three are healthy.
  - Host ports: Postgres 5433, MinIO 9100, Mailpit 1025 and 8025, all bound to 127.0.0.1. This machine already runs another project's Postgres on 5432 and MinIO on 9000.
  - No credential is committed. Postgres uses `POSTGRES_HOST_AUTH_METHOD: trust`. MinIO has no root user set, so it runs on its built-in `minioadmin` default and logs a warning saying so.
  - The Postgres volume mounts at `/var/lib/postgresql`, because from version 18 the image keeps data in `/var/lib/postgresql/18/docker`.
- Lint: `api/eslint.config.mjs` applies `@antfu/eslint-config` (TypeScript) to `api/` only, through `pnpm --filter @sk/api lint`.
  - `neon.ts` is ignored, because the Neon CLI scaffolded it in its own format.
  - ESLint 9 takes its config from the working directory. The root `pnpm lint:zones` does not use this file and still applies only the layer zones to `api/src`.
  - No root gate and no CI runs the api style lint yet.
  - antfu forbids top-level await, so `main.ts` wraps startup in `main()`.
- Docs:
  - The back-end table in `docs/development-rules/tech-stack.md` gets a State column and rows for config, logging, local services and lint.
  - `backend/data-jobs-security.md` and `backend/api-contract.md` get "Built:" pointers to the new code.
- Tests: 24 `[E1.8]` tests in 4 files under `api/test/`, in the root Vitest `node` project, so `pnpm test` runs them.
  - `platform/config.test.ts` (9): defaults, blank values, each role, a missing value, several bad variables at once, the port range, and a secret that is not printed.
  - `platform/logger.test.ts` (1): redaction.
  - `platform/http/app.test.ts` (9): healthz; the request id generated, echoed, replaced and logged; and the 404, validation, malformed JSON and 500 problems.
  - `main.test.ts` (5): starts the real `src/main.ts` for each `ROLE`, checks that SIGTERM and SIGINT give exit code 0, and that a bad value and a missing value give exit code 1.

Dependencies added to `api/package.json`. Versions match `spikes/` where it already used them.

- Runtime: `hono` ^4.13.13, `@hono/node-server` ^2.1.5, `@hono/zod-openapi` ^1.6.3, `zod` ^4.6.7, `pino` ^10.4.0.
- Dev: `typescript` 5.9.3, `@types/node` 22.20.4, `tsx` ^4.23.15, `eslint` 9.39.5, `@antfu/eslint-config` ^7.7.3. The last two are the front-end's versions.
- `pnpm why zod` in `api/` shows one zod (4.6.7).

Docs consulted:

- Context7: Hono v4.13 (`requestId`, the route helper `routePath`, graceful shutdown on Node), the `@hono/zod-openapi` README (`defaultHook`), pino v10.1 (redaction), Zod 4.6 (`z.url({ protocol })`, `prettifyError`). I wrote my own formatter instead of using `prettifyError`, so the format is fixed and holds only path and message.
- Installed source: the Hono `requestId` regex, and the `HTTPException(415)` that `@hono/zod-openapi` 1.6.3 throws for a wrong content type on a required body.
- Web: Docker Hub on the Postgres 18 `PGDATA` and volume change, and reports that MinIO stopped publishing community images in October 2025 (Docker Hub `minio/minio` is reported to fail to pull, and the repository is archived).
- `docker image inspect`: Mailpit's built-in `/mailpit readyz` healthcheck.

Places where the result differs from the architecture doc, the spikes or the brief:

- Architecture 4.2 puts the config at `api/src/config.ts`. Section 4.1 and the brief put config in `platform/`, and I used `api/src/platform/config.ts`. A file at `api/src/config.ts` would also sit outside every boundary zone.
- Architecture section 11 says local storage is MinIO, but MinIO no longer publishes images. Compose uses the owner's GHCR copy of the last community release, which has the same image ID as `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`. An anonymous pull returned 200. It is a personal registry, so the owner should confirm it.
- SP2 says `postgres:18`. I pinned `18.6`, the version Neon runs, so local matches Neon and the image does not move under us.
- The `@hono/zod-openapi` README example returns 422 for validation. I kept 400, the library's own default and what SP1 used.
- RFC 9457 recommends absolute URIs for `type`. The architecture names bare codes (`departure-sold-out`), which are relative URI references: allowed, but not recommended. I followed the architecture (see open questions).

## Output

Gates, from the worktree root:

```
$ pnpm typecheck
api typecheck: Done / packages/domain typecheck: Done / spikes typecheck: Done / front-end typecheck: Done   (exit 0)
$ pnpm lint:zones
(no output, exit 0)
$ pnpm test
 Test Files  16 passed (16)
      Tests  281 passed (281)
$ pnpm build
api build$ tsc -p tsconfig.build.json / api build: Done ... front-end build: Done   (exit 0)
$ pnpm --filter @sk/api lint
(no output, exit 0)
$ node scripts/trace.mjs docs/development-plan/delivery-plan.md
E1.8 tests=19 status=Backlog
error: Verified or Done stories without a test: E1.1      (exit 1, unchanged from main)
```

The trace counts the 19 test titles that carry the tag directly. Two `it.each` titles expand to 5 tests at run time, which makes 24.

Mutation checks. Each was reverted, and all 24 tests pass again afterwards.

```
# 1. config accepts any URL protocol (protocol: /^[a-z]+$/)
x [E1.8] rejects a DATABASE_URL that is not postgres without printing the value
x [E1.8] a bad env value stops startup with exit code 1 and a message that names the variable but not the value
Tests  2 failed | 12 passed (14)

# 2. the message appends the raw value: `${issue.message} (got ${value})`
x [E1.8] reports a missing DATABASE_URL as required
x [E1.8] rejects a DATABASE_URL that is not postgres without printing the value
x [E1.8] a bad env value stops startup ... names the variable but not the value
AssertionError: expected 'Invalid environment, the service did ...' not to contain 's3cret-pw'
Tests  3 failed | 11 passed (14)

# 3. blank values are kept instead of treated as unset
x [E1.8] defaults ROLE to all, PORT to 3000 and LOG_LEVEL to info, and treats blank values as unset
Tests  1 failed | 8 passed (9)
```

Live check 1: compose, `pnpm dev`, curl. `api/.env.local` was a copy of `.env.example`. The shell had no `DATABASE_URL`, so the startup proves the env file was read.

```
$ docker compose up -d --wait        (13 s)
SERVICE    IMAGE                                                  STATUS                   PORTS
mailpit    axllent/mailpit:v1.31.6                                Up 2 seconds (healthy)   127.0.0.1:1025->1025/tcp, 127.0.0.1:8025->8025/tcp
minio      ghcr.io/xzneozx96/minio:RELEASE.2025-09-07T16-13-09Z   Up 2 seconds (healthy)   127.0.0.1:9100->9000/tcp
postgres   postgres:18.6                                          Up 2 seconds (healthy)   127.0.0.1:5433->5432/tcp
$ docker compose exec postgres psql -U postgres -d swiss_keepsakes -Atc "select version(); show data_directory;"
PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) on x86_64-pc-linux-gnu ...
/var/lib/postgresql/18/docker
minio-1  | WARN: Detected default credentials 'minioadmin:minioadmin', we recommend that you change these values ...

$ pnpm dev
> pnpm --filter @sk/api dev
> tsx watch --env-file-if-exists=.env.local src/main.ts
{"level":30,"time":...,"pid":293474,"hostname":"...","port":3000,"msg":"api listening"}
{"level":30,...,"msg":"worker started"}
{"level":30,...,"role":"all","msg":"started"}

$ curl -i http://127.0.0.1:3000/healthz
HTTP/1.1 200 OK
content-type: application/json
x-request-id: 8620f13b-0bd0-42c6-8aa2-d99c3a813e3b

{"status":"ok"}

$ curl -i -H "X-Request-Id: owner-check-42" http://127.0.0.1:3000/healthz
HTTP/1.1 200 OK
content-type: application/json
x-request-id: owner-check-42

{"status":"ok"}

$ curl -i -H "X-Request-Id: bad id;<x>" http://127.0.0.1:3000/healthz      (unsafe id is replaced)
x-request-id: 891e6aba-7205-4a61-8a28-2703eec40ee7

$ curl -i -H "X-Request-Id: req-404-demo" http://127.0.0.1:3000/api/stores/lucerne
HTTP/1.1 404 Not Found
content-type: application/problem+json
x-request-id: req-404-demo

{"type":"not-found","status":404,"title":"Not found","instance":"/api/stores/lucerne","requestId":"req-404-demo"}

dev log, same requests:
{"level":30,...,"requestId":"owner-check-42","method":"GET","route":"/healthz","status":200,"ms":0,"msg":"request"}
{"level":30,...,"requestId":"req-404-demo","method":"GET","route":"/*","status":404,"ms":0,"msg":"request"}
```

The skeleton has no route that takes input, so the validation problem was shown on a scratch script that is not committed. It runs the real `createApp()` and `startHttpServer()` on port 3001 and adds one zod-openapi probe route with a required JSON body.

```
$ curl -i -X POST -H 'Content-Type: application/json' -d '{"departureId":"","seats":"two"}' http://127.0.0.1:3001/api/probe/holds
HTTP/1.1 400 Bad Request
content-type: application/problem+json
x-request-id: fa8ae094-863f-41ad-99ad-f68223490a49

{"type":"validation-failed","status":400,"title":"The request is not valid","errors":[{"in":"json","path":"departureId","message":"Too small: expected string to have >=1 characters"},{"in":"json","path":"seats","message":"Invalid input: expected number, received string"}],"instance":"/api/probe/holds","requestId":"fa8ae094-863f-41ad-99ad-f68223490a49"}

$ curl -i -X POST -H 'Content-Type: application/json' -d '{"departureId":' http://127.0.0.1:3001/api/probe/holds
HTTP/1.1 400 Bad Request
content-type: application/problem+json
x-request-id: 5173e8d0-2604-4c46-a285-9cbdc5613da1

{"type":"about:blank","status":400,"title":"Bad Request","instance":"/api/probe/holds","requestId":"5173e8d0-2604-4c46-a285-9cbdc5613da1"}

$ curl -i -X POST -H 'Content-Type: application/json' -d '{"departureId":"dep-1","seats":2}' http://127.0.0.1:3001/api/probe/holds
HTTP/1.1 201 Created
```

A shell variable overrides the env file. With `ROLE=all` in `api/.env.local`, `ROLE=api pnpm dev` started only the API:

```
{"level":30,...,"port":3000,"msg":"api listening"}
{"level":30,...,"role":"api","msg":"started"}
```

Ctrl-C on `pnpm dev` (SIGINT to its process group):

```
{"level":30,...,"signal":"SIGINT","msg":"shutting down"}
{"level":30,...,"msg":"worker stopped"}
{"level":30,...,"msg":"stopped"}
 ELIFECYCLE  Command failed.        (pnpm's usual line for a child ended by Ctrl-C)
$ ps ... | grep -E "pnpm dev|tsx|main.ts"   -> no dev processes left
$ ss -ltn | grep :3000                       -> port 3000 free
```

Live check 2: a bad value and a missing value.

```
$ DATABASE_URL="mysql://admin:s3cret-pw@db.example/sk" ROLE=api pnpm --filter @sk/api start
> node dist/main.js
Invalid environment, the service did not start:
  DATABASE_URL: Expected a postgres:// or postgresql:// URL
Values are never printed.
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @sk/api@0.0.0 start: `node dist/main.js`
Exit status 1
exit code: 1
occurrences of s3cret-pw in output: 0

$ ROLE=api pnpm --filter @sk/api start            (DATABASE_URL unset)
Invalid environment, the service did not start:
  DATABASE_URL: Required
Values are never printed.
exit code: 1

$ ROLE=both PORT=eighty DATABASE_URL=postgres://postgres@127.0.0.1:5433/swiss_keepsakes node api/dist/main.js
Invalid environment, the service did not start:
  ROLE: Invalid option: expected one of "api"|"worker"|"all"
  PORT: Invalid input: expected number, received NaN
Values are never printed.
exit code: 1
```

Under `pnpm dev`, the same bad value prints the same message and the app process exits. `tsx watch` stays up waiting for a file change, so `pnpm dev` itself does not exit. That is normal watch-mode behaviour. `pnpm start` and production exit 1.

Live checks 3 and 4: each `ROLE` from the build, then SIGTERM.

```
===== ROLE=api
listening on 3000: 1   healthz: 200   exit code: 0
{"port":3000,"msg":"api listening"} {"role":"api","msg":"started"} {"route":"/healthz","status":200,"msg":"request"} {"signal":"SIGTERM","msg":"shutting down"} {"msg":"stopped"}
===== ROLE=worker
listening on 3000: 0   healthz: 000   exit code: 0
{"msg":"worker started"} {"role":"worker","msg":"started"} {"signal":"SIGTERM","msg":"shutting down"} {"msg":"worker stopped"} {"msg":"stopped"}
===== ROLE=all
listening on 3000: 1   healthz: 200   exit code: 0
{"port":3000,"msg":"api listening"} {"msg":"worker started"} {"role":"all","msg":"started"} ... {"msg":"worker stopped"} {"msg":"stopped"}

SIGTERM with an idle keep-alive client connected:
established connections to 3000: 1
server exit code: 0 after 10 ms with an idle keep-alive connection open
```

Cleanup:

```
$ docker compose down -v
swiss-keepsakes containers left: 0, volumes left: 0
ports 3000 3001 5433 9100 1025 8025 free, no stray processes
```

## Not verified

- No database connection. `DATABASE_URL` is only checked to be a postgres URL. `/healthz` does not check the database or pg-boss. Both come with E1.9.
- `pnpm dev` against the Neon development branch (`neon env pull` into `api/.env.local`). I used only the compose Postgres URL and did not touch the Neon credentials.
- MinIO buckets (`uploads`, `media`) are not created, and the config has no S3 or SMTP variables. The storage and mail stories add them. The MinIO image comes from a personal GHCR mirror, as noted above.
- The 10-second shutdown timeout never fired. No test holds a request open past it.
- `tsx watch` restarting on a file change while requests are in flight.
- Redaction covers the listed keys at the top level and one level down only, for example not `req.headers.authorization`.
- No container image of the API, no Fly config and no SPA fallback. Other stories own them.
- The api style lint is not part of any root script or CI.
- The front-end gates were not run separately because `front-end/` is unchanged. The root `pnpm typecheck`, `pnpm test` and `pnpm build` cover it.
- `node scripts/trace.mjs` exits 1 because of E1.1, unchanged from `main`.

Open questions for the owner:

- Is the GHCR MinIO mirror acceptable for a client project? The alternatives are Chainguard's free `minio` image, or another S3 server such as SeaweedFS or Garage.
- Should problem `type` values stay bare codes, as the architecture says, or become absolute URIs, as RFC 9457 recommends? Changing later also means changing the front-end map.
- Should `/healthz` stay out of the request log? Fly health checks will add a line every few seconds per machine.

## Review fixes

An independent Opus review of f023673 found 0 Critical, 1 High, 3 Medium and 10 Low. The fixes are in commits d9da054 to 28e6ebc. Some Output and What changed sections above describe the code before these fixes. Where they differ, this section wins.

- H1. The 500 path logged the raw error, and pino copies every enumerable error property, so a Drizzle or pg error could put an email or engraving text in the logs. The `err` serializer is now an allow-list (type, code, constraint, table, stack frames without message lines), applied to `cause` up to 3 deep. The 500 test throws a pg-style error with an enumerable `detail` and a `params:` message, and asserts none of the personal data is logged.
- M1. The request log uses `routePath(c)`, so it holds the route pattern and a catch-all registered later does not hide it. A test on `/partner/{token}` asserts the pattern is logged and the token is not.
- M2. An `HTTPException` keeps its response headers (`Retry-After`, `WWW-Authenticate`). A 5xx one is logged at error level with its cause.
- M3. `main().catch`, `uncaughtException` and `unhandledRejection` log a fatal line through pino, run the shutdown and exit 1. A stop that rejects no longer skips the remaining stops.
- L1. New `HOST` config (default 0.0.0.0, 127.0.0.1 in `api/.env.example`), passed to the server.
- L2. Redaction covers more key names, one and two levels down, and arrays. Three or more levels deep is not covered, and `data-jobs-security.md` says so.
- L4. Stops run in start order, so the HTTP server stops before the worker.
- L8, L9. The MinIO image is pinned by digest (amd64 only). The Postgres healthcheck uses `pg_isready -h 127.0.0.1`.
- L7. The "Design, not built" lines are replaced where code now exists, and the stale package rows are fixed.
- Nits. `PORT` forms such as `0x1F90` and `1e3` and a `DATABASE_URL` without a host are rejected, and `api/package.json` has `engines.node >=22.12`.

Evidence: `pnpm typecheck`, `pnpm lint:zones`, `pnpm --filter @sk/api lint` and `pnpm build` pass. `pnpm test` reports 302 passed, 45 of them tagged `[E1.8]`. The process tests ran 3 times without a flake. The worker reverted each of 11 mutants and all 45 `[E1.8]` tests passed afterwards. Live runs showed the API on `127.0.0.1:3000`, a `/partner/:token` route in the log with the token absent, `Retry-After: 30` on a 429 problem response, an `EADDRINUSE` startup failure that exits 1, and a crash path that logs a level 60 line and exits 1 without the email.

Decided and left alone: the request id policy (a client can still choose `X-Request-Id`, to decide before E1.9 writes it into `audit_log`), the raw path in the problem `instance`, the layer zones in `api/eslint.config.mjs`, and pino itself (the owner approved it).

Not verified after the fixes:

- Intermediate commits were not run one by one, only HEAD.
- MinIO was not pulled by digest from an empty cache. The registry serves the digest anonymously (HTTP 200).
- Two log-redaction gaps are documented but not enforced. An `Error` logged under a key other than `err` still serializes its enumerable fields, and `logger.error(error)` as the first argument puts `error.message` into `msg`. A lint rule could enforce both.
- `docs/development-rules/README.md` still describes `backend/` as "Design, not built".

## Update after owner review

The owner pointed out that object storage is Neon Object Storage (D14, SP5), so MinIO was removed from `docker-compose.yml`, along with its port 9100, its volume and its image from the owner's registry. Wherever this report mentions MinIO, that service no longer exists. Compose now holds Postgres 18.6 and Mailpit. Local storage work will use the `development` branch's `uploads` and `media` buckets from `neon env pull`. The architecture document was brought in line: section 11 (storage and database rows), 4.2 (`config.ts` sits in `platform/`, as the 4.1 table says) and 4.1 (the layer rule names `eslint-plugin-boundaries`, which E1.7 uses).
