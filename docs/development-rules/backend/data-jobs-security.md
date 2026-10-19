# Data, jobs and security

**Mostly design.** Configuration and logging are built (E1.8), and so is the platform layer for data and jobs (E1.9). No module and no business table exists yet. Source: `docs/architecture/backend.md` (the section is in brackets after each rule). Rules about money, Stripe holds and the commission ledger are specific to this product. They are in `docs/architecture/backend.md` sections 6 and 7 and are not repeated here.

## Data

- **Every tenant row has `store_id`.** Child rows use composite foreign keys `(store_id, parent_id)`, so a child cannot point at another store's parent. (D9)
- **Every repository function requires a `StoreScope` argument.** Row-level security arrives with the second merchant. (D9)
- **Postgres row locks decide every seat and every unit of stock.** Nothing else holds a lock. (1)
- **Money history is append-only.** Balances and payment labels are computed from ledger rows and never stored. (D5)
- **One `audit_log` records every money and status change** with before, after, actor, reason and request id. (D10)
  - Built: call `audit.record(tx, entry)` (`api/src/platform/audit.ts`) inside the use case's `uow.run`. `requestId` is the server's id, `c.get('requestId')`, and `null` in a job. `at` comes from the `Clock`.
- **Migrations move forward only** and follow expand and contract, so the previous version keeps working during a deploy. They run as the release command before new machines take traffic. (11)
  - Built: change a `schema.ts`, run `pnpm --filter @sk/api db:generate`, and commit the SQL and `migrations/meta/`. Never edit a migration that has been applied. `db:migrate` (or `node dist/platform/db/migrate.js`) applies them and then pg-boss's schema. Running services start pg-boss with `migrate: false`.
- **Request handlers use the pooled connection.** pg-boss and migrations use the direct one. (D2)
  - Built: `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, the names `neon env pull` writes. `api/src/platform/db/client.ts`.
- **A use case never touches Drizzle.** It calls `uow.run(async (tx) => ...)` (`api/src/platform/db/unit-of-work.ts`) and passes `tx` to its ports. `uow.run` inside another `uow.run` throws: pass the outer `tx` instead. Its factory is generic over the transaction type, so tests can pass fakes. Read the time from the `Clock` port (`api/src/platform/clock.ts`), never `new Date()`. Tests use `api/test/support/manual-clock.ts`. (4.1)

## Jobs

- **pg-boss in the application database runs every timer and side effect.** (D4)
- **Create a job inside the business transaction** (`boss.send(..., { db: tx })`). There is no separate outbox table and no event bus. (D4)
  - Built: `jobs.send(tx, queue, data, { startAfter })` (`api/src/platform/jobs/queue.ts`). Every role starts pg-boss (`api/src/platform/jobs/boss.ts`), because sending needs a started instance. Only `worker` and `all` supervise. Create a queue with `boss.createQueue` at startup before the first send. Proof that a rollback leaves no job: `api/test/integration/unit-of-work.test.ts`.
- **Cross-module work that must be atomic is a direct call in the same transaction.** Only effects outside the system become jobs. (D4)

## Configuration

- Configuration comes from environment variables, checked at startup against one Zod schema. The service refuses to start on a bad value. Secrets live in Fly secrets. (11)
  - Built: add a variable to the schema in `api/src/platform/config.ts` and to `api/.env.example`. The startup message names the variable and never prints its value. Tests: `api/test/platform/config.test.ts`.

## Security and privacy (both sides follow these)

- **The SPA keeps the access token in memory.** Never in `localStorage`. (13)
- **The partner session cookie is `httpOnly` and `SameSite=Lax`**, scoped to `/partner` and `/api/partner`, with an `Origin` check on mutations. (13)
- **A Content Security Policy** protects the SPA. **Webhook signatures** are verified, plus the Stripe IP allow-list. No card data touches our servers. (13)
- **Logs are JSON** with request id, actor and store id. They never contain emails, phone numbers, tokens or engraving text. (13)
  - Built: inside a request, log through `c.get('logger')`, which carries the request id. The request line logs the route pattern, not the URL, because a path such as `/partner/{token}` holds a token. Log an error as `logger.error({ err }, 'message')`: the `err` serializer keeps only type, code, constraint, table and stack frames (and the same for `cause`), because messages and fields such as pg's `detail` quote guest data. Never pass the error as the first argument, since pino then copies its message into `msg`. Redaction in `api/src/platform/logger.ts` covers a fixed list of keys at the top level, one and two levels down, and in arrays of objects up to one level down. It is a safety net, not a licence to log personal data.
- **Analytics send no personal data.** Google Analytics loads only after cookie consent. Every money, status and source figure is SQL over our own tables. (D13)
- **Guests can export and delete their account.** Deletion anonymizes the profile, and ledger and order rows stay for 10 years for Swiss accounting retention. (13)
- **A dependency audit runs in CI.** (13)
