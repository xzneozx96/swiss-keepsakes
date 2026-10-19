# SP1. Hono, zod-openapi, raw-body Stripe signatures, SPA fallback

**What it proves.** Hono on `@hono/node-server` serves a zod-openapi hold endpoint, a Stripe webhook route that verifies the signature on the raw body, and a SPA with an index fallback.

**Pass condition (architecture section 16).** A booking hold and a webhook round trip work locally with the Stripe CLI.

## Run

```sh
npx tsx spikes/sp1-hono-stripe/run.ts
```

Local part (no account): 17 checks on a real server bound to a random port. Valid signature accepted, tampered body rejected, re-serialised body rejected, wrong secret, stale timestamp, missing header, replayed event id, hold creation and conflict, OpenAPI document, SPA index, deep link fallback, 404 for a missing asset and for unknown `/api` paths. Signatures come from `stripe.webhooks.generateTestHeaderString` with a fake local secret.

Stripe CLI part (needs a key): `stripe listen --print-secret` gives the CLI's webhook secret, `stripe listen --forward-to` forwards events to the local server, the script creates a hold, confirms a CHF PaymentIntent that carries `hold_id` in its metadata with `pm_card_visa`, and waits for `payment_intent.succeeded` to arrive, verify and confirm the hold. Needs the `stripe` CLI on PATH.

## Keys

`STRIPE_SECRET_KEY`: a sandbox restricted key (`rk_test_`, PaymentIntents write). Anything not starting with `rk_test_` is refused.

## Vendor guidance applied

- `stripe-best-practices`: restricted key, never an `sk_` key; no `payment_method_types` on the PaymentIntent (dynamic payment methods with `allow_redirects: 'never'` for the test card); webhooks treated as required, with fulfilment (the hold confirmation) driven by the verified webhook, not by the client; a sandbox, not live mode. The skill says to use `StripeClient`, but `stripe@23.0.0` exports no such class, so the script uses `new Stripe(key)` and the SDK's pinned API version (`2026-09-30.endive`, the skill's current version).
- `stripe-docs`: signature checking on the raw body, 5 minute default tolerance, event-id dedupe (F13).
