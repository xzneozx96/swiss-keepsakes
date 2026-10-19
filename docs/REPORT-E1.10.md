# E1.10 API contract package and diff gate

## What changed

Data shapes (`packages/api-contract/src/`, plain `zod` only)
- `problemSchema` is the RFC 9457 body: `type`, `status` (integer 400 to 599), `title`, `instance`, `requestId`, and optional `errors` (`in`, `path`, `message`) and `checks` (record of `ok` or `failed`). `type` is an enum of the codes the API sends today: `about:blank`, `not-found`, `validation-failed`, `internal-error`, `unhealthy`, `idempotency-key-required`, `idempotency-key-reused`, `idempotency-key-in-use`. `.meta({ id: 'Problem' })` makes it one named component in the document.
- `healthSchema` is `{ status: 'ok' }`, component `Health`.
- `Problem` is `z.infer<typeof problemSchema>`. No shape is written twice.
- `createApiClient(baseUrl)` in `src/client.ts` is `openapi-fetch`'s `createClient<paths>`. It is written by hand because the build deletes and rewrites `generated/`, so a hand-written file there would be lost, and the gate would flag it. Auth headers go on later through `client.use(middleware)`.

The API uses the contract
- `api/src/platform/http/app.ts`: the `/healthz` route uses `healthSchema` for 200 and declares 503 as `application/problem+json` with `problemSchema`.
- `api/src/platform/http/problem.ts`: the hand-written `Problem` interface is gone. `problem()` takes the contract's shape and returns `c.json(body, status, { 'Content-Type': 'application/problem+json' })`, a typed response. Same bytes and headers as before. The reason: once every response of a zod-openapi route declares content, its handler may not return a plain `Response`. Now the compiler rejects a problem whose status the route does not declare, and `problem()` rejects a `type` outside the enum.

Generation (one function for the build and the gate)
- `api/scripts/contract.ts`: `generateContract()` builds `createApp()` with a silent logger and a stub health check, calls `getOpenAPI31Document`, sorts every object key by code unit, and returns `openapi.json` (2 spaces, newline at the end) and `schema.ts` (`openapi-typescript` with `alphabetize`, plus a do-not-edit header and `/* eslint-disable */`). No timestamps, no versions.
- `api/scripts/build-contract.ts` empties `packages/api-contract/generated/` and writes both files. Root `pnpm contract:build` runs it (about 2 s).
- The generator lives in `api/` because it needs `createApp()`, and the contract may not import the API.

The gate (`api/test/contract.test.ts`, runs in root `pnpm test`)
- Rebuilds both files in memory. Fails when `generated/` holds a different set of files, or when a file differs, with the message "packages/api-contract/generated/<file> differs from a fresh build. Run `pnpm contract:build` and commit the result" plus a line diff.
- The client against the real `createApp()` on port 0 over HTTP: `GET /healthz` gives `data` typed `{ status: 'ok' } | undefined`, checked with `expectTypeOf`. A stubbed failing check gives a 503 whose `error` is typed as the Zod `Problem`, which also proves that the generated type equals `z.infer`. A 404 on an unknown path (raw `fetch`, because the path is not in `paths`) parses with `problemSchema` without losing a field.
- `api/test/platform/http/app.test.ts`: the `validation-failed`, `about:blank`, `not-found`, `internal-error` and `unhealthy` problems each parse with `problemSchema` and come back unchanged, so the server sends no undeclared field.

Running the package on plain Node
- `node api/dist/main.js` cannot load a `.ts` export (`ERR_UNKNOWN_FILE_EXTENSION` on Node 22.15). E1.8 avoided this by not importing `@sk/domain`.
- The contract builds with `tsc` to `dist/`. Its exports map is `{ "sk-compiled": "./dist/src/index.js", "default": "./src/index.ts" }`.
- Only `pnpm --filter @sk/api start` passes `node --conditions=sk-compiled`. tsc, tsx (`pnpm dev`, the process tests), Vitest and Vite read the source, with no flag and no build.
- Root `pnpm build` builds the contract before the API (pnpm topological order).
- The release command `dist/platform/db/migrate.js` does not import the contract and needs no flag.

Lint zone (`eslint.boundaries.mjs`)
- New element `api-contract` covers the whole package, because `src/client.ts` imports `../generated/schema.ts`.
- The contract may import only itself, `zod` and `openapi-fetch`. No core module, no other package, no other zone, no local file outside the zones.
- The domain, application files and ports files may not import the contract. Adapters and platform code may (architecture 4.1). Declaring the zone without the domain entry would have let the domain import the contract.
- Found while doing this: the plugin marks every external import `isUnknown: true` as well, so the contract's unknown-file selector is limited to `origin: 'local'`.
- Fixtures in `scripts/fixtures/boundaries/`, tests in `scripts/boundaries.test.mjs`.

Docs: `backend/api-contract.md` (Built: pointers for the schemas, the build, the gate, the client, the condition and the problem codes), `tech-stack.md` (API client, API contract and Repository rows), `shared/testing.md` (the contract gate), and `frontend/api-integration.md` (the client exists, TanStack Query is still not installed).

Dependencies added
- `packages/api-contract`: `openapi-fetch` ^0.17.0 and `zod` ^4.6.7 (runtime), `typescript` 5.9.3 (dev).
- `api`: `@sk/api-contract` workspace:* (runtime), `openapi-typescript` ^7.13.0 (dev). It brings `@redocly/openapi-core` and `supports-color`, and pnpm re-keyed the existing `debug@4.4.3` entries in the lockfile under that optional peer.
- Both versions are the current latest and were released on 11.02.2026. `pnpm why zod` shows one zod (4.6.7).

Docs consulted
- Context7 `/openapi-ts/openapi-typescript`: the Node API (`openapiTS(object)` returns an AST, then `astToString`), openapi-fetch `createClient`, `FetchResponse`, and the `Media` generic.
- Context7 `/websites/hono_dev`: the zod-openapi example.
- Installed source:
  - `@hono/zod-openapi` 1.6.3: `getOpenAPI31Document`, `RouteHandlerResponse`.
  - `@asteasolutions/zod-to-openapi` 9.1.0: the README section "Using zod's .meta". Its `sortObjectByKeys` uses `localeCompare`, which is why the generator sorts again by code unit.
  - Hono 4.13 `c.json` header merge.
  - `openapi-typescript` 7.13 options.
  - `eslint-plugin-boundaries` 6.0.2 and `@boundaries/elements` 2.0.1: dependency selectors, and `UNKNOWN_ELEMENT` on externals.
  - zod 4.6.7 `globalRegistry`: it lives on `globalThis` and overwrites a repeated id without throwing. `problemSchema.optional()` called twice next to zod-openapi does not throw either.

Where this differs from the architecture doc, the docs or the brief
- The brief put "route definitions" in `packages/api-contract/src/`. The `createRoute` routes stay in `api/`, as architecture 4.2 and 4.3 place them, because `createRoute` comes from `@hono/zod-openapi` and the contract zone excludes Hono. The document comes from the real app, so it describes what is served.
- The brief said the contract may import "only zod and itself". `client.ts` needs `openapi-fetch`, so the zone allows both. I also added the application and ports rules from architecture 4.1, which the brief did not ask for.
- The Hono docs import `z` from `@hono/zod-openapi` and call `.openapi('User')`. The contract uses plain `zod` with `.meta({ id })`, which zod-to-openapi 9 reads, so the front-end never pulls Hono in. The generated `$ref`s prove it works.
- D11 and section 11 say CI regenerates the client and fails on a diff. There is no CI yet. The gate is a Vitest test in `pnpm test`, and E1.13 runs it.
- E1.8's report showed `node api/dist/main.js`. That command now fails, and the start command needs `--conditions=sk-compiled` (see above).
- Compose ran as `docker compose -p sk-e1-10 -f docker-compose.yml -f <scratch override>`, Postgres only, on 127.0.0.1:5443, because another session's `sk-e1-9` Postgres holds 5433. The compose file is unchanged.

## Output

Gates on HEAD `bbac7ff`. `packages/api-contract/dist` and `api/dist` were deleted first, and `DATABASE_URL` was unset for every gate except `test:integration`.

```
$ pnpm typecheck                -> exit 0
spikes typecheck: Done packages/api-contract typecheck: Done packages/domain typecheck: Done api typecheck: Done front-end typecheck: Done
$ pnpm lint:zones               -> exit 0 (no output)
$ pnpm --filter @sk/api lint    -> exit 0 (no output)
$ pnpm test                     -> exit 0
 Test Files  19 passed (19)
      Tests  329 passed (329)
$ pnpm build                    -> exit 0
packages/api-contract build: Done
api build: Done
front-end build: ✓ built in 33.45s
$ pnpm test:integration         (DATABASE_URL and DATABASE_URL_UNPOOLED on the sk-e1-10 Postgres) -> exit 0
 Test Files  5 passed (5)
      Tests  28 passed (28)
(0 sk_test_* databases left afterwards)
$ pnpm exec vitest run --project node -t "\[E1\.10\]"
 Test Files  3 passed | 14 skipped (17)
      Tests  18 passed | 298 skipped (316)
$ node scripts/trace.mjs docs/development-plan/delivery-plan.md
E1.8 tests=28 status=Backlog
E1.9 tests=30 status=Backlog
E1.10 tests=8 status=Backlog
error: Verified or Done stories without a test: E1.1      (unchanged from the base)
```

The trace counts the 8 titles that carry the tag directly. Three `it.each` titles expand to 18 `[E1.10]` tests at run time.

Gate mutations. Each one was reverted. Gate only, `-t "equal a fresh build"`:

```
G0 nothing changed                                      Tests  1 passed
G1 a route description changed in app.ts, not rebuilt   x  AssertionError: packages/api-contract/generated/openapi.json differs from a fresh build. Run `pnpm contract:build` and commit the result
   then pnpm contract:build                             Tests  1 passed  (openapi.json and schema.ts each 1 line changed)
G2 an optional field added to healthSchema, not rebuilt x  ...openapi.json differs from a fresh build...
   then pnpm contract:build                             Tests  1 passed
G3 schema.ts edited by hand                             x  ...schema.ts differs from a fresh build...
G4 openapi.json edited by hand (info.version)           x  ...openapi.json differs from a fresh build...
G5 an extra file generated/client.ts                    x  packages/api-contract/generated/ holds other files. Run `pnpm contract:build`: expected [ 'client.ts', 'openapi.json', …(1) ] to deeply equal [ 'openapi.json', 'schema.ts' ]
G6 generated/openapi.json deleted                       x  ...expected [ 'schema.ts' ] to deeply equal [ 'openapi.json', 'schema.ts' ]
after restore                                           Tests  1 passed
```

What the developer sees for G3:

```
AssertionError: packages/api-contract/generated/schema.ts differs from a fresh build. Run `pnpm contract:build` and commit the result: ...
- Expected
+ Received
@@ -50,11 +50,11 @@
          Health: {
              /** @enum {string} */
-             status: "ok";
+             status: "ok" | "degraded";
```

Determinism: the gate passed twice under `LC_ALL=de_CH.UTF-8 TZ=Pacific/Kiritimati` and once under `LC_ALL=tr_TR.UTF-8`. Node picked `de-CH` there, where `localeCompare` orders `_x,a,b,B,Z` and code-unit order is `B,Z,_x,a,b`.

Type checks: changing either `expectTypeOf` target (`'okay'`, or `Omit<Problem, 'checks'>`) gave 2 `tsc` errors. Reverted, 0.

Zone mutations, `scripts/boundaries.test.mjs` (27 tests). Each one was reverted.

```
Z1 domain disallow list without api-contract         x the domain importing the contract is one error
Z2 any external package allowed                      x the contract importing another package is one error
Z3 no external package allowed                       x [E1.7] every other fixture ... has zero errors, x [E1.10] ... zod, openapi-fetch ... have zero errors
Z4 application rule removed                          x an application file importing the contract is one error
Z5 ports list without api-contract                   x a ports file importing the contract is one error
Z6 element covers only src/                          x [E1.7] every other fixture ..., x [E1.10] ... generated/ ... have zero errors
Z7 the local-unknown entry removed                   x the contract importing a front-end path is one error
```

Live check. Postgres `sk-e1-10` came up (healthy in 2.7 s), then `pnpm --filter @sk/api db:migrate` and `pnpm dev` (tsx, source, no flag):

```
{"worker":true,"msg":"jobs started"} {"address":"127.0.0.1","port":3000,"msg":"api listening"} {"role":"all","msg":"started"}

$ curl -i http://127.0.0.1:3000/healthz
HTTP/1.1 200 OK
content-type: application/json
x-request-id: 5fda4338-a280-48c9-b794-bb4a698bb7fe
{"status":"ok"}

$ curl -i http://127.0.0.1:3000/api/stores/lucerne
HTTP/1.1 404 Not Found
content-type: application/problem+json
x-request-id: fe80fad2-7a9a-4e30-b70c-162aae8c31e1
{"type":"not-found","status":404,"title":"Not found","instance":"/api/stores/lucerne","requestId":"fe80fad2-7a9a-4e30-b70c-162aae8c31e1"}

bodies checked with the compiled contract (safeParse, then deep-equal to the body):
healthSchema  on the 200: success=true, parse result equals body: true
problemSchema on the 404: success=true, parse result equals body: true
problemSchema on the 200 (negative control): success=false

createApiClient('http://127.0.0.1:3000').GET('/healthz')
-> 200 application/json   data: {"status":"ok"}  error: undefined
$ docker compose -p sk-e1-10 stop postgres
-> 503 application/problem+json   data: undefined
   error: {"type":"unhealthy","status":503,"title":"A dependency is not available","checks":{"database":"failed","jobs":"failed"},"instance":"/healthz","requestId":"43e20986-..."}
   problemSchema.safeParse(error).success=true    (curl body: parse result equals body: true)
$ docker compose -p sk-e1-10 start postgres
-> 200 application/json   data: {"status":"ok"}

Ctrl-C (SIGINT to the process group): shutting down, api stopped, jobs stopped, stopped. Port 3000 free.
```

The built API, after `pnpm build`:

```
$ node api/dist/main.js                       (no condition)
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for .../packages/api-contract/src/index.ts
exit 1
$ pnpm --filter @sk/api start
> node --conditions=sk-compiled dist/main.js
"jobs started" "api listening" "started"
GET /healthz -> 200 {"status":"ok"}  (healthSchema: equals body)
GET /api/stores/lucerne -> 404 application/problem+json  (problemSchema: equals body)
createApiClient GET /healthz -> 200 data {"status":"ok"}
SIGTERM: shutting down, api stopped, jobs stopped, stopped. Port 3000 free.
$ node api/dist/platform/db/migrate.js        (no condition) -> "migrations applied", exit 0
```

Front-end compiler options: a throwaway `front-end/src` file that imported `packages/api-contract/src/index.ts` and called `createApiClient('/').GET('/healthz')` passed `pnpm exec tsc --noEmit` (exit 0). The file was deleted.

Cleanup: `docker compose -p sk-e1-10 ... down -v`. No `sk-e1-10` container or volume is left, ports 3000 and 5443 are free, and no dev process is left. `sk-e1-9` was not touched.

## Not verified

- No CI runs the gate. E1.13 owns that. Its image must build the contract first (root `pnpm build` or `pnpm --filter @sk/api... build`) and pass `--conditions=sk-compiled` in its CMD.
- The front-end does not depend on `@sk/api-contract` yet. Only a relative import was type-checked, not a Vite build through the workspace package. In a Vite production build the `default` condition gives the `.ts` source, as for `@sk/domain`.
- No `.gitattributes`. A checkout that turns LF into CRLF (Windows with `core.autocrlf`) would make the gate fail on an unchanged file. Not tried on Windows.
- The document has no `/openapi.json` route and no Swagger UI. Nothing asked for them.
- Only `/healthz` is in `paths`. A 404 or a 500 on other paths is checked with `problemSchema`, not through the typed client.
- `problem()` accepts any `ContentfulStatusCode`. The contract's 400 to 599 range is checked only by the tests on the current problem paths.
- The code-unit sort makes no difference to today's document, because no object mixes key case. A mutation to `localeCompare` therefore passes today. It guards future keys.
- Intermediate commits were not run one by one, only HEAD.

Open questions for the owner
- `type` is a closed enum. A guest's tab still running an older SPA build would fail `problemSchema.parse` on a code added later. Should the client use `safeParse` and fall back to generic copy (E1.11 or E1.12), or should `type` be an open string in the client schema?
- May the contract import `packages/domain`, for example to reuse a status list in a schema? The zone forbids it today, as the brief asked.
- E1.11 and E1.12 probably edit the same rows in `tech-stack.md` and the same line in `frontend/api-integration.md`. Expect a small doc conflict on rebase.

## Follow-up: the compiled start (commit abdc0ab)

The owner's lead approved the `sk-compiled` condition and asked for proof that `pnpm --filter @sk/api build` followed by `node --conditions=sk-compiled api/dist/main.js` serves `/healthz`.

- Found: on a clean tree, `pnpm --filter @sk/api build` built only the API, so the compiled API imported a contract `dist/` that did not exist: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../api/node_modules/@sk/api-contract/dist/src/index.js' imported from .../api/dist/platform/http/app.js`.
- Fix: the API's build script is now `pnpm --filter @sk/api^... --if-present build && tsc -p tsconfig.build.json`. It builds every workspace package the API depends on first. A new package listed in `api/package.json` is picked up with no other change. Root `pnpm build` now compiles the contract twice, about 1 s each.
- `docs/development-rules/backend/architecture.md` has a new rule. A workspace package the API imports copies `packages/api-contract`: a `build` script into `dist/`, NodeNext with `.ts` relative imports, and each export as `{ "sk-compiled": "./dist/src/<entry>.js", "default": "./src/<entry>.ts" }`. Every production start, including the E1.13 image CMD, runs `node --conditions=sk-compiled api/dist/main.js`. `tech-stack.md` and `backend/api-contract.md` point to it.
- For `@sk/domain`: its relative imports have no extension (`export * from './format'`). To be compiled this way it needs `.ts` extensions and NodeNext. Its `./*` subpath export takes the same two conditions.

```
$ rm -rf packages/api-contract/dist api/dist
$ pnpm --filter @sk/api build
> pnpm --filter @sk/api^... --if-present build && tsc -p tsconfig.build.json
> @sk/api-contract@0.0.0 build .../packages/api-contract
> tsc -p tsconfig.build.json
exit 0
$ node --conditions=sk-compiled api/dist/main.js     (PORT=3010, compose Postgres sk-e1-10 on 5443)
{"worker":true,"msg":"jobs started"}
{"address":"127.0.0.1","port":3010,"msg":"api listening"}
{"role":"all","msg":"started"}
$ curl -i http://127.0.0.1:3010/healthz
HTTP/1.1 200 OK
content-type: application/json
{"status":"ok"}
$ curl -i http://127.0.0.1:3010/api/stores/lucerne
HTTP/1.1 404 Not Found
content-type: application/problem+json
{"type":"not-found","status":404,"title":"Not found","instance":"/api/stores/lucerne","requestId":"99c6a9b4-bea5-431b-8234-390e9d2a3a42"}
healthSchema.safeParse: success=true, parse result equals body: true
problemSchema.safeParse: success=true, parse result equals body: true
createApiClient GET /healthz -> 200 application/json  data: {"status":"ok"}
$ node --conditions=sk-compiled -e "import.meta.resolve('@sk/api-contract')"   (from api/)
@sk/api-contract -> file:///.../packages/api-contract/dist/src/index.js
SIGTERM: shutting down, api stopped, jobs stopped, stopped
$ pnpm build                         -> exit 0 (packages/api-contract, api, front-end: Done)
$ pnpm --filter "@sk/api..." build   -> exit 0
$ pnpm test                          -> 329 passed
$ pnpm --filter @sk/api lint         -> exit 0
```

The first start attempt on port 3000 failed with `EADDRINUSE`. Another process on this machine held the port at that moment, and it was free again a few seconds later. I moved to 3010 and did not touch the other process. Cleanup: `sk-e1-10` was taken down with `down -v` (0 containers, 0 volumes). Ports 3000, 3010 and 5443 are free.

Not verified: the E1.13 image itself, and `pnpm --filter @sk/api build` running inside a Docker build.
