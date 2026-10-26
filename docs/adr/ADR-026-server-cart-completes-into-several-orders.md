# ADR-026: Keep the checkout cart in the database, let one cart complete into several orders, and make completion safe to repeat

Status: accepted
Date: 2026-10-26
Source: DM-18, gate M7
Applies to: `api/src/modules/orders/`, `api/src/platform/http/`, `packages/domain/src/orders/group-cart.ts`, `front-end/src/features/cart/`, `front-end/src/features/checkout/`, `api/migrations/`

No new dependency, vendor or paid service. The owner decided on 2026-10-26 (M7) that the cart is a server table in the style of Medusa 2, which replaces the browser-held cart of ADR-021 and PRD 8.1 for the data model. ADR-021 is the architect's file and still says the cart stays in the browser. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-18, and the Medusa study in section 9.

## Context
Medusa stores a cart with line items and completes it into an order. Our checkout differs. One cart splits into several orders by pickup place and time or by handover meeting (PRD 8.1, the handover record), and a repeated completion must not make a second order. A visitor may add knives before signing in. Stock is held when an order is accepted (G2, ADR-009), and a cart must not tie up stock for visitors who never order.

## Decision
We will keep `orders.carts` and `orders.cart_lines`.

- **Cart.** The cart id lives in a cookie. `guest_id` is NULL for an anonymous cart, and it is set once, with `linked_at`, when the visitor signs in. The attributed partner is set once. A cart is `open` or `completed`.
- **Lines.** A line has a SKU id (a plain value), a quantity, the unit price seen at the last check, a destination (a handover meeting, or a pickup place and time, or none yet) and a payment route. The same SKU appears twice only for different destinations or routes. The use case re-checks stock and price at every change and again at completion. A line holds no stock.
- **Completion.** One transaction locks the cart row, reads its lines, creates one order for each destination and route, and sets the cart `completed`. `orders.orders.cart_id` and `cart_split_key` record which orders the cart produced, and `UNIQUE (cart_id, cart_split_key)` makes a repeated completion unable to create a second order. The use case catches the duplicate and returns the existing orders. A composite key `(store_id, cart_id, guest_id)` makes an order's guest equal to the cart's guest and refuses an anonymous cart.
- **Closing.** Two commit-time triggers tie the pair: an order from a cart exists only if the cart ends the transaction completed, and a completed cart has at least one order. A trigger on the lines takes the cart row in share mode and refuses a change to a completed cart, so a line change and a completion are serialized.
- **Cleanup.** A job deletes anonymous open carts with no activity for 30 days, and the lines go with them. A cart that produced orders cannot be deleted.

## Consequences
- A visitor keeps the cart across sign-in and across tabs, and the checkout can resume on another device once the cart is linked.
- The cart table takes a write on every change, so abandoned carts will be the largest table of the orders schema. The cleanup job keeps it small.
- The database stops a line from changing after completion and a second completion from making a second order. It does not read the lines for the use case, so the use case must lock the cart first, then read its lines, then create the orders.
- The cart id is not a secret. It is a UUIDv7 and it opens only SKU ids and quantities until the cart is linked (data model, Q-35).
- Stock and price shown in the cart can be stale until the next check.

## Assumptions
- Stale anonymous carts are safe to delete after 30 days.
- A guest must sign in to complete a cart (PRD 8.1), so a cart completes only when linked.
- The destination of a line is chosen before completion, and the handover binding is checked again when the order is created (ADR-025).
- One cart produces at most a handful of orders.

## Considered options
- **A browser cart that sends its lines at checkout.** Matches ADR-021 and needs no table. The owner chose a server cart (M7). Rejected.
- **Hold stock from the cart line.** Gives the guest a promise and ties up stock for abandoned carts. Rejected, because stock is held at acceptance.
- **One cart equals one order, as in Medusa.** Does not fit PRD 8.1. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
