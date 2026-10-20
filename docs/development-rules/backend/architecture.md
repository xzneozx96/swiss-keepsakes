# Back-end architecture

**Mostly design.** The platform layer is built (E1.8, E1.9). The first module, `identity`, holds its tables and the actor loader (E2.2). Source: `docs/architecture/backend.md` sections 4.1 to 4.3 (a proposal, pending owner review). Do not edit that file from here. If a rule below and the source disagree, the source wins, and this file needs fixing. Rules for the front-end are in `../frontend/`, and rules for both sides are in `../shared/`.

## Layers

The code follows clean architecture in four layers. Each layer imports only from the layers inside it.

| Layer | Where | May import |
| :-- | :-- | :-- |
| Domain | `packages/domain/src/<module>/` | Only `packages/domain` |
| Application | `api/src/modules/<module>/application/` | Domain, its own ports, other modules' `index.ts` |
| Adapters | `api/src/modules/<module>/adapters/` | Application, domain, `api/src/platform/`, `packages/api-contract` |
| Platform and composition | `api/src/platform/`, `api/src/main.ts` | Everything |

## Rules

- **A use case is a plain async function.** A factory takes its dependencies, as in `makeCreateHold({ uow, bookings, jobs, payments, clock })`. No classes and no dependency-injection container. `main.ts` is the only file that connects concrete adapters to use cases. (4.1)
- **Transactions are a port.** A use case calls `uow.run(async (tx) => ...)`. Repositories and the job queue take that `tx`. A use case never touches Drizzle. (4.1)
  - Built (E1.9): the platform adapters and their port shapes are `UnitOfWork<T>` (`api/src/platform/db/unit-of-work.ts`), `AuditLog<T>` (`audit.ts`), `JobQueue<T>` (`jobs/queue.ts`) and `Clock` (`clock.ts`). The lint zones forbid an application file to import `platform/`, so a module's `ports.ts` declares the same small shapes, and the platform adapters fit them structurally. Make the use-case factory generic over the transaction type, as in `makeRecordProbe` in `api/test/integration/unit-of-work.test.ts`.
- **Locking SQL stays in the repository**, in named functions such as `lockDepartureForHold`. The use case decides what to do and the repository decides how to lock. (4.1)
- **Modules talk through `index.ts` only.** No module imports another module's `application/` or `adapters/` files. (4.1)
- **Each module owns one Postgres schema.** No module reads another module's tables, and each command is one transaction. `reporting` is the one exception, because it owns views over other schemas. (section 4)
- **The domain is shared with the front-end.** See `../shared/domain-and-contract.md`. (4.1)
- **A workspace package that `api/` imports ships compiled JS for Node.** Plain Node cannot load `.ts`, so copy `packages/api-contract`: a `build` script (`tsc -p tsconfig.build.json` into `dist/`, NodeNext with `.ts` relative imports) and each export as `{ "sk-compiled": "./dist/src/<entry>.js", "default": "./src/<entry>.ts" }`. `pnpm --filter @sk/api build` builds the API's workspace dependencies first, and every production start of the API, including the E1.13 image CMD, runs `node --conditions=sk-compiled api/dist/main.js`. tsc, tsx, Vitest and Vite read the source through `default`. Do not rely on a missing flag to fail: Node 22.18 and later strip types by default, and a workspace package resolves to its real path outside `node_modules`, so without the flag Node runs the `.ts` source and says nothing (seen with `--experimental-strip-types` on Node 22.15). Set `erasableSyntaxOnly` in the package's `tsconfig.json`, so the source stays safe to strip. The repo targets Node 22 (`.nvmrc`, `engines`, CI).
  - `packages/domain` compiles only `src/identity` (`@sk/domain/identity`), because its other folders use extensionless relative imports that Node cannot load. Before `api/` imports another domain folder, give it `.ts` relative imports, add it to `tsconfig.build.json` and give its export an `sk-compiled` entry. The `[E2.2]` test in `api/test/compiled-imports.test.ts` fails on an `@sk/domain` import with no `sk-compiled` export. The root `Dockerfile` and `.dockerignore` copy each such package.

## Where things go (4.3)

| Concern | Location |
| :-- | :-- |
| Business rule | `packages/domain/src/<module>/` |
| Workflow that loads, decides and saves | `api/src/modules/<module>/application/<use-case>.ts` |
| SQL and Drizzle | `api/src/modules/<module>/adapters/*-repository.ts` and `schema.ts` |
| Request parsing and response shape | `packages/api-contract/src/` schemas, used by `adapters/routes.ts` |
| Talking to Stripe, the SMTP server or storage | A port in the owning module, an adapter in that module, a client in `api/src/platform/` |
| Audit, idempotency, webhook deduplication, rate limits | `api/src/platform/` |
| Configuration | `api/src/platform/config.ts`, one Zod schema over the environment |
| Wiring | `api/src/main.ts` only |

## Enforcing the layers

The zones use `eslint-plugin-boundaries`, the owner's standard (see `../frontend/linting.md`), and `docs/architecture/backend.md` 4.1 now says the same. They are in `eslint.boundaries.mjs` at the repository root, run by `pnpm lint:zones`, and tested by `scripts/boundaries.test.mjs`. The map below is the shape of the rules, not the full config.

```js
'boundaries/elements': [
  { type: 'domain', pattern: 'packages/domain/src/**' },
  { type: 'application', pattern: 'api/src/modules/*/application/**' },
  { type: 'adapters', pattern: 'api/src/modules/*/adapters/**' },
  { type: 'platform', pattern: 'api/src/platform/**' },
],
'boundaries/element-types': ['error', { default: 'allow', rules: [
  { from: 'domain', disallow: ['application', 'adapters', 'platform'] },
  { from: 'application', disallow: ['adapters', 'platform'] },
] }],
```

The "modules talk through `index.ts` only" rule needs its own entry-point rule. It is not mapped here.
