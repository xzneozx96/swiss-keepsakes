# ADR-025: Bind an order to one meeting with a partner key and a commit-time check, and record receipt, no-show and cancellation in the order

Status: accepted
Date: 2026-10-26
Source: DM-17, gate G6
Applies to: `api/src/modules/orders/`, `api/src/modules/money/`, `api/src/modules/partners/`, `packages/domain/src/orders/transitions.ts`, `api/migrations/`

No new dependency, vendor or paid service. It models the order rules of `docs/decisions/2026-10-26-partner-handover.md`. It adds two commit-time triggers on the order path, which the owner approved with M3 (business-rule triggers). It refines ADR-023 for the order columns.

## Context
The record fixes the partner on the order when the guest orders. The partner keeps the order if it moves to another of the partner's handovers, or if the guest later collects at the shop. A QR or link fills in a meeting, and the guest confirms it before paying. An order is accepted by the system when stock and preparation time fit (G2). An online order still unpaid when the handover stops taking orders is cancelled, and a cash order is never cancelled for non-payment (G1). Partner-path orders move through Ordered, Preparing, On the way to partner, With partner and Delivered. The partner confirms receipt for the whole batch with a checklist. A guest who does not show up returns the order to the shop, where the guest collects it or a refund is agreed.

## Decision
We will keep the rules in the order and its keys.

- **Binding.** `orders.handover_occurrence_id` names one meeting, with a composite key `(store_id, handover_occurrence_id, partner_id)` to the meeting. The meeting must belong to the order's own partner. A CHECK requires a partner whenever an order is bound, because a NULL partner would skip the key.
- **Open for orders.** A deferred constraint trigger runs at order insert and when the partner moves an order. It locks the meeting row `FOR SHARE` and requires the meeting `scheduled`, the handover `agreed` and the wall clock before `closes_orders_at`. A merchant who moves the cut-off or cancels the meeting at the same time is serialized with the order, in both orders of arrival.
- **Place and time.** A bound order has no pickup place or time of its own. A self-collect order has both. A no-show order may lack them until the shop and the guest agree.
- **Statuses.** `on_the_way_to_partner` and `with_partner` exist only on a bound order. `handed_over` is Delivered and has `delivered_at`. Commission is recorded when the order completes, which means delivered and fully paid (owner C1, ADR-028).
- **Receipt.** An insert trigger on a receipt item requires the order to be bound to the receipt's meeting and on its way. A ticked item moves the order to `with_partner` in the same statement. An unticked item leaves it on its way, and a job alerts the merchant. A second receipt can take a late bag. Receipts are append-only.
- **No-show.** The order leaves the meeting, returns to `ready` at the shop, and keeps its partner. `returned_at` and `returned_from_occurrence_id` record where it came from, and they are set together.
- **Guest switch.** A guest who cannot make a new time sets a pickup place and time, leaves the meeting and keeps the partner. No return record is written.
- **Cancellation.** A cancelled order has a reason (`guest`, `merchant`, `payment_overdue` or `unpaid_handover_closed`). A cash order cannot carry the last two. `unpaid_handover_closed` needs a bound meeting. That the order is unpaid is a ledger fact, so the cancel job checks it.
- **Payment route.** The value for cash is `partner_cash`. The record lets every partner, hotels included, take cash.

## Consequences
- A stale QR or a shared link cannot attach a guest to a meeting that is closed, cancelled or another partner's, even if the use case has a defect. The database proves the partner match, the open meeting, the status shapes, the cash exemption and the receipt effect.
- The database does not prove that an online order is unpaid, because money is a separate module.
- Cancelling a meeting that has orders is allowed, and the record leaves the consequence open.
- Two more commit-time triggers join the order path (the binding check and the receipt update), and each needs a database test.
- The end-state timestamps and statuses assume an order never reopens (O10).

## Assumptions
- The partner's signed-in user is the actor of receipts, as ADR-010 and ADR-019 describe, and the use case checks that the user's partner owns the meeting.
- Neon runs at READ COMMITTED, where the lock wait followed by a fresh read gives the serialization shown in the tests.
- The preparation time for the cut-off comes from the merchant's setting (O22).
- A receipt item is recorded only for an order that the shop sent to this meeting.

## Considered options
- **Status rules in application code only.** Works while every writer follows them, and a missed path attaches a guest to the wrong group. Rejected.
- **A per-order cut-off column.** Matches the record's wording, and product preparation hours can be NULL (O22). Rejected for now.
- **Delete the binding on a no-show and also null the partner.** Loses the commission rule. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
