# ADR-028: Store the guest's name and e-mail on each order, and record commission when the order completes

Status: accepted
Date: 2026-10-26
Source: DM-19, gates M8 and C1
Applies to: `api/src/modules/orders/`, `api/src/modules/money/`, `api/src/modules/partners/`, `api/src/modules/identity/`, `packages/domain/src/orders/`, `api/migrations/`

No new dependency, vendor or paid service. The owner decided on 2026-10-26 that each order keeps a snapshot of the guest's name and e-mail (M8), and that commission is recorded only when the order is fully paid (C1, PRD AC09). The lawyer's answer on O33 can still change what stays after an erasure. It refines ADR-023 and ADR-025.

## Context
The partner's handover screen lists the guest's name, the order code, the items and the payment state for every order of a meeting, and a partner must see nothing more than the name (AC58). Staff write to the guest by e-mail, and the guest profile can change or be erased. Orders and ledger rows stay for ten years (backend.md section 13), while account deletion anonymises the profile. PRD AC09 says an order delivered but not fully paid, or fully paid but not delivered, is not complete and records no commission. The handover record recorded commission at Delivered.

## Decision
We will keep a snapshot on the order and use completion as the commission point.

- **Snapshot.** `orders.orders.guest_name` and `guest_email` hold the values at order time. A CHECK requires both present, with a trimmed non-blank name and a lower-case e-mail, or both NULL with `guest_erased_at` set. A trigger allows one change only, from present to erased, and refuses every edit and any restore. Partner queries read the name from the order and never from the identity module.
- **Commission.** The trigger point is `completed_at`, set when the order is delivered and fully paid. A delivered order that is not fully paid stays `handed_over`. The view `orders.commission_ready` lists completed orders with a partner, and `money` records one commission entry per line (AC10). The CHECK that ties `delivered_at` to `handed_over` and `completed` means a completed order was delivered. That it was paid in full is a ledger fact, and the money use case completes the order.
- **After a no-show.** The order keeps its partner. A merchant who marks it Delivered for a guest who collects at the shop completes it when it is paid, and the commission goes to that partner.

## Consequences
- The partner screen and the receipt checklist read `orders` alone, and erasure has one place to clear.
- The e-mail copy is personal data that lives as long as the order row unless erased. How long it stays waits for O33.
- A commission is later than Delivered whenever payment is later. The partner sees the order as delivered and the commission as waiting.
- The database cannot prove full payment. A defect in the money use case could complete an unpaid order.

## Assumptions
- The lawyer accepts a name and e-mail snapshot with erasure on request (O33).
- Orders are completed only by the money use case after it checks the ledger.
- A refund agreed after a no-show follows the record's partial-refund rule in `money`.
- The snapshot is taken from the signed-in guest at order creation.

## Considered options
- **No snapshot, join the profile.** Less personal data on orders, and the partner query reaches into identity. The owner chose the snapshot. Rejected.
- **Name only.** Smaller copy. The owner chose name and e-mail. Rejected.
- **Record commission at Delivered whatever the payment.** The owner declined (C1).

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
