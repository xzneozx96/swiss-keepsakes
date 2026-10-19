# SP4. Stripe sandbox behaviour

**Status: Ready, needs keys: STRIPE_SECRET_KEY (sandbox restricted key `rk_test_`), STRIPE_PUBLISHABLE_KEY (for the manual TWINT page).**

**Pass condition (architecture section 16).** Each observed and written down.

## What is ready

`spikes/sp4-stripe-sandbox/run.ts` observes `accounts.retrieveCurrent()` (`charges_enabled`, `twint_payments`), the payment method configurations (TWINT availability), the cancel of a PaymentIntent before and after success (documented error, code and message recorded), and a server-side TWINT confirm. `npm --prefix spikes run sp4:twint` serves a Payment Element page for the manual TWINT test. It was typechecked only. It never ran, because no key exists.

## Observed

Nothing yet. Expected from the docs, to confirm: cancelling a succeeded PaymentIntent returns an invalid-request error (F11); TWINT is CHF only, up to CHF 5,000, and the capability stays `pending` until the website shows the legal details (F9).

| Item | Result |
|---|---|
| Cancel after success | not run |
| TWINT in the Payment Element | not run |
| `charges_enabled` and `twint_payments` | not run |
