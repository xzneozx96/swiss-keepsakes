# SP1. Hono, zod-openapi, raw-body Stripe signatures, SPA fallback

**Status: Answered (local).** The Stripe CLI round trip is open. Ready, needs keys: `STRIPE_SECRET_KEY` (sandbox restricted key `rk_test_`) and the `stripe` CLI (installed here as v1.31.0, but no sandbox key was available).

**Pass condition (architecture section 16).** A booking hold and a webhook round trip work locally with the Stripe CLI.

## What ran

`npx tsx spikes/sp1-hono-stripe/run.ts` on Node 22.15, `hono@4.13`, `@hono/node-server@2.1`, `@hono/zod-openapi@1.6`, `stripe@23.0.0` (API version `2026-09-30.endive`). The app listens on a random localhost port. Signatures use `stripe.webhooks.generateTestHeaderString` with a random fake secret generated per run, no Stripe account.

## Observed (local, 17 of 17 checks pass)

| Check | Result |
|---|---|
| `POST /api/holds` (zod-openapi route) | 201 with a `pending_payment` hold; a second hold for the same seat gets 409; an invalid body gets 400; `/api/openapi.json` lists the route |
| Webhook, valid signature, raw body | 200, the hold became `confirmed` |
| Webhook, one byte of the body changed | 400, rejected |
| Webhook, body parsed and re-serialised with different spacing | 400, rejected: only the raw bytes verify, so the route reads `c.req.text()` and no JSON middleware may run before it |
| Webhook signed with another secret / timestamp one hour old / no header | 400 each |
| Same event id sent twice | 200 both times, processed once |
| SPA | `/` serves `index.html`; `/stores/lucerne/booking/42` falls back to `index.html`; `/assets/app.js` is served as itself; `/assets/missing.js` is 404; `/api/nope` is 404 JSON |

Finding: `@hono/node-server` 2.x `serveStatic` takes `root` relative to the current working directory. The app converts its absolute SPA directory with `path.relative`. The fallback must exclude `/api/`, `/webhooks/` and any path with a file extension, or missing assets return HTML with status 200.

## Open

The Stripe CLI round trip (`stripe listen --forward-to`, a hold, a sandbox PaymentIntent carrying `hold_id`, the forwarded `payment_intent.succeeded` confirming the hold) is scripted but not run. The CLI log must be pasted here when it is.
