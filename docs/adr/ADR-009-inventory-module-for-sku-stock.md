# ADR-009: Give SKU stock and holds to one inventory module

Status: accepted
Date: 2026-10-26
Source: AD-10
Applies to: `api/src/modules/inventory/`, `api/src/modules/orders/`, `api/src/modules/catalog/`, `packages/domain/src/catalog/stock.ts`, `packages/domain/src/orders/`

No new dependency, vendor or paid service. This changes the ownership in `docs/architecture/backend.md` section 4 and the locking SQL in section 6.1, and it replaces the booking seat hold (D7, section 6.3) for Phase 1.

## Context
A Victorinox SKU is size, theme (design) and colour (Q14). Stock is per SKU. A SKU with zero available stock cannot be selected (AC52, AC53). The merchant sets stock for each SKU at any time (§7.2). The invariant is: available = on hand minus held, never below zero, even when two people accept the last unit at once (AC05).

backend.md splits that invariant. `catalog.product_variants` holds `stock_on_hand`, `orders.stock_holds` holds the holds, and the acceptance SQL in `orders` locks rows in `catalog` (section 6.1). That reads another module's table, which section 4 forbids. The prototype's variant is a size only, labelled by text, with one `stock` number.

New lifecycle rules change who accepts and when. An order is accepted automatically, with a hold, when every line has stock and the preparation time fits the requested hour (G2). A cash order for a guide's group skips the payment step: preparation starts at acceptance, the order does not time out for lack of payment, and the guide's recorded amount counts at once (G1, AC65). Deposit and pay-later are gone (O28), and engraving is gone (Q23).

## Decision
We will add an `inventory` module that owns stock items and holds, and we will keep sizes, colours and designs in `catalog`.

- **SKU.** The `catalog` module owns the SKU definition: design (theme), size and colour as structured attributes with ids, price, and publication. A SKU has one id. The prototype's text labels become derived display names.
- **Stock.** `inventory` owns `stock items` (one per SKU id: units on hand) and `stock holds` (state `held`, `issued` or `released`), and an adjustment history. No other module writes them.
- **Operations.** `inventory/index.ts` exports `reserve(tx, orderId, lines)`, `release(tx, orderId)`, `issue(tx, orderId)`, `setOnHand(tx, sku, quantity, reason, actor)` and `availability(skuIds)`. `reserve` locks the stock rows in id order, as the current SQL does, and returns the short lines if any are short.
- **Set stock.** The merchant may set on hand to any value not below the units currently held. Below that, the call is refused and names the held quantity.
- **Auto-accept.** The `orders` use case that creates an order calls the pure policy "can accept now" (stock, preparation time, store open). On the partner path, preparation time is measured against the handover occurrence time (gate G6). If yes, it calls `reserve` in the same transaction and moves the order to `accepted` or `preparing`. If no, the order waits in `requested` for manual accept.
- **Cash path.** An order marked for guide cash goes from acceptance to `preparing` with no payment deadline job (the same branch as backend.md's pay-later policy, now with a guide cash method on `money`). The guide's recorded amount creates an external collection entry that counts at once. Reconciling it against what the merchant received is O34.
- **Handover** calls `issue`, which lowers on hand. **Cancel or reject** calls `release`. **Refund** never returns stock (PRD §6.2).
- **Reads.** The public product API merges catalog data with `availability`. A SKU with zero available stock is returned as unavailable.

## Consequences
- One module enforces the invariant, and `orders` no longer reads `catalog` tables.
- `orders` depends on `inventory` through its `index.ts`, in the same transaction. The module split costs one more schema and port.
- Booking seat holds are not built in Phase 1, so `inventory` holds only stock.
- Availability is not part of the cached server-rendered text. The product page loads it from the product detail route (ADR-001), so a stock change shows at once for a visitor on that page (AC53).
- Migration moves `stock_on_hand` and `stock_holds` out of `catalog` and `orders`. Nothing is live yet, so no data is lost.
- The colour and size lists are undefined (O26). The model stores them as ids so the lists can be merchant-managed or fixed later.

## Assumptions
- Stock is counted per SKU, not per batch or location.
- One merchant holds physical stock in Phase 1. A second merchant's stock is separate by store scope (D9).
- Auto-accept needs a defined preparation time and store open hours, both owner values (O22). Without them every order waits for manual accept.
- If stock is later shared across merchants or locations, this model needs review.

## Considered options
- **A. New `inventory` module (chosen).** The invariant has one owner. Cost: one more module and one more cross-module call.
- **B. Keep stock in `catalog` and holds in `orders`.** No new module, but the invariant spans two owners and the acceptance SQL reads another module's table. Rejected as the drift risk the module rules were written to stop.
- **C. Put stock and holds in `orders`.** One owner, but the merchant's stock editing then lives in the orders module, and a second order-like consumer (a future pre-order for limited editions) would reach into it.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
