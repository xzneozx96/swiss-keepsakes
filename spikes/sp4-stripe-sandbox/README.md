# SP4. Stripe sandbox behaviour

**What it proves.** What Stripe returns for: cancelling a PaymentIntent after it succeeded, TWINT in the Payment Element, and `accounts.retrieveCurrent()` on the store's own account (`charges_enabled`, `twint_payments`).

**Pass condition (architecture section 16).** Each observed and written down.

## Run

```sh
npx tsx spikes/sp4-stripe-sandbox/run.ts      # automatable parts
npm --prefix spikes run sp4:twint             # manual: Payment Element page on http://127.0.0.1:4242
```

The script reads the account (`charges_enabled`, `payouts_enabled`, `twint_payments` capability status), lists the payment method configurations and the TWINT preference, cancels a PaymentIntent in `requires_payment_method` (allowed) and one that has succeeded (the documented error, recorded with its code and message), and tries a server-side TWINT confirm (expecting `requires_action` with a redirect). All observations are printed. It fails only on an unexpected result, such as a cancel that succeeds after success.

Manual part: open the page, pick TWINT in the Payment Element, follow Stripe's test redirect, and write the result and a screenshot into `docs/spikes/SP4.md`. TWINT needs the account's website to show company name, legal form, address, contact and CHF prices before the capability leaves `pending` (F9).

## Keys

`STRIPE_SECRET_KEY` (restricted, `rk_test_`: PaymentIntents write, PaymentMethodConfigurations read, Account read). `STRIPE_PUBLISHABLE_KEY` for the manual page.

## Vendor guidance applied

- `stripe-best-practices`: a restricted sandbox key, no `payment_method_types` anywhere (dynamic payment methods, `automatic_payment_methods`), the Payment Element with a PaymentIntent, latest SDK and API version (`stripe@23`, `2026-09-30.endive`).
- `stripe-docs`: TWINT page (CHF only, no manual capture, no Express Checkout Element), PaymentIntent cancel states (F11). `accounts.retrieveCurrent()` replaces `retrieve()` with no id in this SDK version, whose `retrieve` now needs an id or `null`.
