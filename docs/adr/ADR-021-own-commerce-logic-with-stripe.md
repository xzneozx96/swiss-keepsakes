# ADR-021: Build catalog, inventory, cart and order logic ourselves and use Stripe for payments, with no commerce engine

Status: accepted
Date: 2026-10-26
Source: AD-14, gates S3, M7, M9, M10
Applies to: `api/src/modules/catalog/`, `api/src/modules/inventory/`, `api/src/modules/orders/`, `api/src/modules/money/`, `packages/domain/src/catalog/`, `packages/domain/src/orders/`, `front-end/src/features/cart/`, `front-end/src/features/checkout/`

No new dependency, vendor or paid service. This confirms backend.md D18 ("No commerce engine") with new research, and keeps D6 and D7 (Stripe) for keepsake orders. The data model for these modules is written separately by the db-designer, starting at ADR-022.

## Context
The shop sells Victorinox knives only, with SKUs of size, theme and colour (PRD §7). The order lifecycle is not a standard checkout. A visitor requests an order for a pickup hour. The order is accepted by the system or by the merchant, stock is held at acceptance (G2), and payment follows online or as guide cash that counts at once (G1). Guides update times and amounts (§10.4), partners earn commission on completion, and the merchant marks completion by hand.

The owner asked whether a commerce engine should run this (gate S3). Research on 2026-10-26 (`research-stack.md`) found:
- **Shopify.** A SKU of three options fits (2,048 variants and 3 options per product). Customer data goes to Shopify International Ltd. in Ireland and may move to Canada, the US and subprocessors, with no EU residency commitment. Checkout stays on Shopify. Plans are priced in USD (Basic USD 25 a month, USD 19 yearly). No documentation was found for guide-collected cash or group orders.
- **Medusa 2** (2.22.1, open source). Custom order logic is native code. It adds a second backend with its own Postgres use, Redis, a server and a worker, a user system (the Auth module) and an admin, with 2 GB RAM or more.
- **WooCommerce.** WordPress 6.9+, PHP 8.3+ and MySQL 8.0+. Custom flows are plugin code.
- **Stripe alone.** TWINT works through the Payment Element for customers in Switzerland, in CHF, up to CHF 5,000 a payment. Manual capture is not supported for TWINT, and the Express Checkout Element does not support it. Refunds are available for 180 days. Onboarding needs a public site with a legal notice, and the capability stays `pending` until TWINT verifies it.

## Decision
We will build the catalog, inventory, cart and order logic in our own modules, and use Stripe (Payment Element with PaymentIntents) for payments, as backend.md D6 and D7 plan.

- Modules stay as in the spine: `catalog` (designs, generic product options, categories, SKUs, price), `inventory` (ADR-009), `orders` (lifecycle, auto-accept, cash path), `money` (payments, ledger, refunds).
- **Server cart (owner gate M7, 2026-10-26).** The cart lives on the server in `orders.carts` and `cart_lines`, with the cart id in a cookie, so it survives a device switch. Stock and price are re-checked on every change and at checkout. One cart completes into several orders, split by pickup hour and place (PRD §8.1). The cart cookie is read only by cart and checkout routes, never by the event route (ADR-007). The data model (ADR-026) keeps an anonymous cart with no guest id, links it when the visitor signs in, and deletes anonymous carts after 30 days without activity. PRD O41 stays open until the owner accepts that.
- **Generic options and categories (owner gates M9 and M10).** `catalog` models product options as generic option and option-value rows (as Medusa does), and keeps category tables for future product types. Phase 1 sells only Victorinox and has no category screen. The SKU of size, theme and colour is a SKU that takes one value of each option of its product, and the data model (ADR-027) enforces one SKU per combination.
- Each order keeps a snapshot of the guest's name and e-mail (gate M8), and commission is recorded when the order completes, which means delivered and fully paid (gate C1, ADR-028).
- Payment methods follow the Stripe account's settings. TWINT availability depends on the pilot merchant's account and legal notice (backend.md Q2, R2).
- **Reference study.** The owner told us to study Medusa 2's open-source schema and commerce model as a reference for ours: cart, order creation, products and variants, categories, inventory, and purchasing policies. The db-designer does that study and records what we take and what we leave. The server cart, generic options and category tables are adopted (gates M7, M9, M10). We copy no Medusa code and add no Medusa package.

## Consequences
- We own the order, stock and commission rules, which is what the PRD's lifecycle needs. We also own their tests and bugs.
- No second backend, user system or admin exists. The merchant uses our dashboard.
- Customer data stays in our Neon database in Frankfurt and in Stripe.
- Features a commerce engine gives for free (discount codes, tax rules, shipping rates, a product import) are not built in Phase 1. The PRD does not ask for them.
- The effort for catalog, cart and order logic stays in the delivery plan and is not reduced by this decision.

## Assumptions
- Phase 1 stays one merchant, one product group (knives), no shipping and no multi-merchant cart (PRD §4.1, §8.1).
- The auto-accept and guide cash paths (ADR-009) have no equivalent in a standard checkout. If the PRD drops them, the case for an engine becomes stronger.
- Stripe's TWINT limits (Switzerland, CHF, up to CHF 5,000, no manual capture) match the pilot's needs.
- Medusa's model is a useful reference and its licence permits reading it. The licence text was not read in this run.
- Prices for Shopify and Stripe fees can change. They were read from vendor pages on 2026-10-26, and the Shopify CHF price page returned 404.

## Considered options
- **A. Own logic plus Stripe (chosen, gate S3).** Fits the lifecycle, keeps data in our database, no new vendor. Cost: we build the shop logic.
- **B. Medusa 2.** Open source, a modelled catalog and order domain. It needs a second backend with Redis, its own user system and admin, and our lifecycle would still be custom code inside it. TWINT support in its Stripe provider was not documented. Rejected, kept as a schema reference.
- **C. Shopify.** Fast to start and fits the SKU shape. Customer data leaves the EU, checkout leaves our site, USD pricing, and custom states need workarounds. Rejected.
- **D. WooCommerce.** Adds WordPress, PHP and MySQL to the stack. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
