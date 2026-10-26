# ADR-023: Store order lines as write-once snapshots and the order total as a price snapshot that the database checks

Status: accepted
Date: 2026-10-26
Source: DM-14, gate S3
Applies to: `api/src/modules/orders/`, `api/src/modules/money/`, `api/src/modules/partners/`, `packages/domain/src/orders/`, `api/migrations/`

No new dependency, vendor or paid service. It takes patterns from the Medusa 2 study (`docs/specs/001-storytelling-pivot/data-model.md`, section 9) and ties them to PRD 8, "price, order content, policy and commission rate stay as at order time". It does not model any ordering flow that the owner still has on hold.

## Context
An order line must show what the guest saw even after the merchant renames or reprices a SKU, so lists, partner reports and refunds read the same text and price for years (10-year retention, backend.md section 13). Medusa copies the line's title, variant title, SKU, option values and unit price onto the line, and keeps order totals in a summary with a display id and an end-state timestamp. backend.md D5 says balances and payment status are computed from the ledger and never stored.

## Decision
We will store snapshots and check them in the database.

- **Lines.** `orders.order_lines` holds `product_id`, `sku_code`, a localized `product_name`, `option_values` (a list of option and value text pairs, empty for a product with no options), an optional thumbnail media id, `quantity`, `unit_price_rappen` and a generated `line_total_rappen`. A line is written with its order and then never updated or deleted. A change is a new order, because Phase 1 has no item edit.
- **Total.** `orders.orders.total_rappen` is stored at creation. Two deferred constraint triggers check at commit that it equals the sum of the lines, so an order without lines or with a wrong total is refused. A trigger refuses any later change of the total. The total is a price snapshot. It is not a balance, so D5 stands, and what is paid or owed comes from the ledger.
- **Reference.** `ref` is generated as `SK-` plus `display_number`, an identity sequence.
- **End states.** `completed_at`, `cancelled_at` and `declined_at` each exist exactly when the status is that state, enforced by CHECKs.

## Consequences
- Reports, receipts and refunds read the order alone and do not depend on later catalog edits.
- The line columns are fixed. An item edit later needs versioned lines as in Medusa's order versioning, and a new ADR.
- The CHECKs on end-state timestamps break if an order may reopen (O10). The owner changes them then.
- The reference comes from one global sequence, so one merchant can infer another merchant's volume. The pilot has one merchant, and a per-store counter replaces the sequence when a second joins.
- The guest name and e-mail snapshot is settled by the owner (M8) and described in ADR-028.

## Assumptions
- Orders are created in one transaction with their lines, so the commit-time check can run.
- No order edits items, quantity or price in Phase 1.
- Money is integer Rappen in CHF (backend.md section 5, O01 open).
- Ten-year retention applies to order rows (backend.md section 13).

## Considered options
- **Read the live SKU for old orders.** No copy, and a rename or reprice rewrites history. Rejected.
- **A mutable total that application code keeps equal to the lines.** Works until one code path forgets. Rejected.
- **Store a computed balance on the order.** Contradicts D5. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
