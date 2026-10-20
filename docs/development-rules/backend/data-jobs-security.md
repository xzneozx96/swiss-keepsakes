# Data, jobs and security

**Mostly design.** Configuration and logging are built (E1.8), and so is the platform layer for data and jobs (E1.9). The first module, `notifications`, and its `sent_mail` table are built (E2.8). No business module exists yet. Source: `docs/architecture/backend.md` (the section is in brackets after each rule). Rules about money, Stripe holds and the commission ledger are specific to this product. They are in `docs/architecture/backend.md` sections 6 and 7 and are not repeated here.

## Data

- **Every tenant row has `store_id`.** Child rows use composite foreign keys `(store_id, parent_id)`, so a child cannot point at another store's parent. (D9)
- **Every repository function requires a `StoreScope` argument.** Row-level security arrives with the second merchant. (D9)
  - The one exception is the `notifications.sent_mail` repository (E2.8). It takes no `StoreScope`, because the mail job runs without an actor and finds the row by the mail id it carries. No route reads the table yet. The row keeps `store_id`. A read by store, such as a resend list (UX R13), takes a `StoreScope`.
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
- **Mail is a job** (section 8). Built (E2.8): a command calls the function `makeQueueMail` returns (`notifications/index.ts`) inside its `uow.run`. It writes the `notifications.sent_mail` row and the `mail` job, whose id is the mail id and the `Message-ID`'s local part. It refuses a `to` that is not one plain address. Job data holds ids, never a token. The one exception is the N01 sign-in code (E2.2). Its job holds the plain code, retries twice 20 seconds apart, is dropped after 5 minutes if unsent (the code's own lifetime) and is deleted 1 hour after it finishes, a job that fails for good has the code removed from it and from its dead-letter copy, and no log line carries job data. An invitation mail stores the invitation id, and the `InvitationLink` port builds the link when the mail is sent (architecture section 8). The worker retries a failed send 5 times with exponential backoff. An SMTP 5xx reply or a render error skips the retries. pg-boss then moves the job to `mail-failed`, whose handler marks the row failed and logs the `mail.failed` alert. A failed attempt throws only its error code and SMTP reply code, because pg-boss stores what the job throws. Runbook: `docs/ops/mail.md`.

## Configuration

- Configuration comes from environment variables, checked at startup against one Zod schema. The service refuses to start on a bad value. Secrets live in Fly secrets. (11)
  - Built: add a variable to the schema in `api/src/platform/config.ts` and to `api/.env.example`. The startup message names the variable and never prints its value. Tests: `api/test/platform/config.test.ts`.
  - `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` are required in every environment (E2.2), the secret at 32 characters or more. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` come as a pair. Without them the service starts and offers no Google sign-in. The release command (`db:migrate`) loads the same configuration, so it needs them too. With `NODE_ENV=production` the URL must be https. `BETTER_AUTH_TRUSTED_ORIGINS` is refused, because Better Auth reads it outside our schema and the only trusted origin is `BETTER_AUTH_URL`'s.
  - `SMTP_*` is all six variables or none (E2.8). A partial setting stops startup. With none, the service starts and warns, and mail fails and alerts until they are set, because no variable tells production from development.

## Security and privacy (both sides follow these)

- **The guest and staff session is an HttpOnly first-party cookie** that Better Auth sets, `SameSite=Lax`, and `Secure` on staging and production. The SPA holds no auth token, in memory or in `localStorage`. (D8, 13)
- **One rule checks `Origin` on every POST, PUT, PATCH and DELETE under `/api/`**, whatever its content type, `/api/auth/*` included, because a cookie session needs CSRF protection. `/webhooks/stripe` is excluded by name, because Stripe signs its events. Better Auth also checks `/api/auth/*` itself. (9, 13)
- **No table of ours has a foreign key to Better Auth's `user` row.** Guest-owned rows point at the guest profile, so deleting an account anonymises the profile and keeps the ledger. (5, 13)
- **`better-auth` stays at 1.7.7 or later**, and its security advisories are watched. (R13) Built (E2.2): `api/package.json` pins 1.7.11 exactly. Better Auth is `createAuth` in `api/src/platform/auth.ts`. It skips its origin and CSRF checks under `NODE_ENV=test`, so `createAuth` sets both checks on explicitly. The rate limiter reads the client address from `Fly-Client-IP` only.
- **The partner session cookie is `httpOnly` and `SameSite=Lax`**, scoped to `/partner` and `/api/partner`, with an `Origin` check on mutations. (13)
- **A Content Security Policy** protects the SPA. **Webhook signatures** are verified, plus the Stripe IP allow-list. No card data touches our servers. (13)
- **Logs are JSON** with request id, actor and store id. They never contain emails, phone numbers, tokens or engraving text. (13)
  - Built: inside a request, log through `c.get('logger')`, which carries the request id. The request line logs the route pattern, not the URL, because a path such as `/partner/{token}` holds a token. Log an error as `logger.error({ err }, 'message')`: the `err` serializer keeps only type, code, constraint, table and stack frames (and the same for `cause`), because messages and fields such as pg's `detail` quote guest data. Never pass the error as the first argument, since pino then copies its message into `msg`. Redaction in `api/src/platform/logger.ts` covers a fixed list of keys at the top level, one and two levels down, and in arrays of objects up to one level down. It is a safety net, not a licence to log personal data.
- **Analytics send no personal data.** Google Analytics loads only after cookie consent. Every money, status and source figure is SQL over our own tables. (D13)
- **Guests can export and delete their account.** Deletion anonymizes the profile, and ledger and order rows stay for 10 years for Swiss accounting retention. (13)
- **A dependency audit runs in CI.** (13)
  - Built: the `gates` job fails on a high or critical advisory in a production dependency (`pnpm audit --prod --audit-level=high`). Advisories in development dependencies only raise a warning. See `docs/ops/ci.md`.
