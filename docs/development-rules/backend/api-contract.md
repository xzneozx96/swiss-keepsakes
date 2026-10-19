# API contract

**Mostly design.** The `OpenAPIHono` app and the problem details are built (E1.8), and so are the `Idempotency-Key` middleware and webhook deduplication (E1.9). The rest is not. Source: `docs/architecture/backend.md` D11, and sections 12 and 13. The front-end side of this contract is in `../frontend/api-integration.md`.

## Rules

- **REST with `@hono/zod-openapi`.** A route parses its request, calls a use case and maps the result. It holds no business logic. (D11)
- **The Zod schemas in `packages/api-contract` are the single source.** The generated client is committed under `packages/api-contract/generated/`. CI fails if it differs from a fresh build. (D11)
- **Errors are RFC 9457 problem details** with stable `type` codes. The front-end maps each `type` to translated copy. (D11)
  - Built: return `problem(c, { type, status, title })` from `api/src/platform/http/problem.ts`. It sends `application/problem+json` with `instance` (the path) and `requestId`. The codes in use are `not-found`, `validation-failed` (with an `errors` list of `in`, `path`, `message`), `internal-error`, `unhealthy` (503 from `/healthz`, with `checks`), `body-too-large` (413, over the 1 MiB limit `createApp` puts on `/api/*`) and the three idempotency codes below. Other `HTTPException`s become `about:blank` with the status text and keep the headers of their `res`, such as `Retry-After` or `WWW-Authenticate`. A 5xx one is logged with its `cause`. Never put an exception's message in the body. Tests: `api/test/platform/http/app.test.ts`.
- **Lists use cursor pagination.** (D11)
- **Merchant edits send `If-Match`.** (D11)
- **Every state-changing request carries an `Idempotency-Key`.** The server stores it with a hash of the request and replays the answer for 24 hours. A reused key with a different body returns 422. (D11)
  - Built: `idempotency({ db, clock, actorId })` in `api/src/platform/http/idempotency.ts`, not mounted yet. Mount it on `/api/*` after the auth middleware (E2.2), never on `/webhooks/*`. The key is claimed inside the command's first `uow.run`, so do the command's writes in a unit of work, run a command's units one after the other, never at once, and let `IdempotencyKeyTaken` propagate. A claim waits at most 5 s on another request's open transaction. Codes: `idempotency-key-required` (400), `idempotency-key-reused` (422), `idempotency-key-in-use` (409 with `Retry-After`). A replay carries `Idempotent-Replayed: true`, the exact body bytes, and only these stored headers: `Content-Type`, `Content-Language`, `Location`, `ETag`, `Cache-Control`. Tests: `api/test/integration/idempotency.test.ts`.
- **Webhooks keep the raw body**, because signature checks need it. They are deduplicated in `webhook_events`. (D1, 4.2)
  - Built: `createWebhookEvents(clock).record(tx, event)` (`api/src/platform/webhooks.ts`) returns `'duplicate'` for a repeated `(provider, event_id)`. Queue the `provider-event` job in the same transaction.
- **Permissions are checked per role and per store.** A store route returns 403 to a member of another store. A partner response never contains email, phone, address, engraving or notes. (12)
- **The API verifies a Bearer JWT on every request** against the identity provider's JWKS, and checks the issuer. (13)

## Not covered yet

Route naming, versioning and rate-limit numbers are not written. They are in `docs/architecture/backend.md` section 10, which this file does not copy.
