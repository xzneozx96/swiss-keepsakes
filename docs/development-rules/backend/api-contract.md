# API contract

**Design, not built.** Source: `docs/architecture/backend.md` D11, and sections 12 and 13. The front-end side of this contract is in `../frontend/api-integration.md`.

## Rules

- **REST with `@hono/zod-openapi`.** A route parses its request, calls a use case and maps the result. It holds no business logic. (D11)
- **The Zod schemas in `packages/api-contract` are the single source.** The generated client is committed under `packages/api-contract/generated/`. CI fails if it differs from a fresh build. (D11)
- **Errors are RFC 9457 problem details** with stable `type` codes. The front-end maps each `type` to translated copy. (D11)
- **Lists use cursor pagination.** (D11)
- **Merchant edits send `If-Match`.** (D11)
- **Every state-changing request carries an `Idempotency-Key`.** The server stores it with a hash of the request and replays the answer for 24 hours. A reused key with a different body returns 422. (D11)
- **Webhooks keep the raw body**, because signature checks need it. They are deduplicated in `webhook_events`. (D1, 4.2)
- **Permissions are checked per role and per store.** A store route returns 403 to a member of another store. A partner response never contains email, phone, address, engraving or notes. (12)
- **The API verifies a Bearer JWT on every request** against the identity provider's JWKS, and checks the issuer. (13)

## Not covered yet

Route naming, versioning and rate-limit numbers are not written. They are in `docs/architecture/backend.md` section 10, which this file does not copy.
