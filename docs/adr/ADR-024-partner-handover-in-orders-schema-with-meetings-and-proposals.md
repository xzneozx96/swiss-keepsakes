# ADR-024: Model the partner handover in the orders schema as a handover, dated meetings and proposals

Status: accepted
Date: 2026-10-26
Source: DM-16, gate G6
Applies to: `api/src/modules/orders/`, `api/src/modules/catalog/`, `api/src/modules/partners/`, `packages/domain/src/orders/`, `api/migrations/`

No new dependency, vendor or paid service. It models `docs/decisions/2026-10-26-partner-handover.md`, which the owner approved on 2026-10-26 as the answer to gate G6. The record leaves the module choice to the builder, and this ADR proposes one. The owner settled the module choice as the orders schema and approved plain ids across modules and business-rule triggers (M3), on 2026-10-26. It replaces the nullable `group_ref`, `arrival_at` and `departure_at` order columns of the earlier data model, and it makes the `group_ref` seam in ADR-010 stale.

## Context
A partner agrees a pickup point and a time with the merchant. The merchant's staff or courier brings the orders there, and the partner hands them to guests. The record lists the parts: partner, pickup point, time (one-off or repeating every day), optional group arrival and leaving times, a state (proposed, agreed, done, cancelled) and who created it. The time is agreed through proposals, and it can change after agreement, for one day only on a repeating rule. Each order points to one dated meeting. The partner's printed QR looks at today's meetings only. A link fills in one handover on any day.

## Decision
We will keep five tables in the `orders` schema and the pickup list in `catalog`.

- **`handovers`.** One row per agreement. It has the partner and pickup point as plain ids, a `kind` of `one_off` or `repeating`, a `state`, a `share_code` for the link, the daily rule (`local_time`, `rule_starts_on`, `rule_ends_on`) for a repeating handover, who created it, and `agreed_at`. CHECKs tie the state to the kind and to `agreed_at`. A trigger allows only the paths of the record and refuses a change of partner or kind. A change of place is a new handover.
- **`handover_occurrences`.** One row per dated meeting, with `occurs_at`, the Zurich date generated from it, `closes_orders_at`, group times and a state of `scheduled`, `done` or `cancelled`. A one-off handover has one meeting. A repeating one has at most one a day. A time change or cancellation for one day touches one row.
- **`handover_proposals`.** The agree step and the later changes that need the other side. A proposal is a point in time or a daily time, with optional group times. There is at most one open proposal per handover and one per meeting. An answered proposal is never edited or answered again.
- **`handover_receipts` and `handover_receipt_items`** hold the partner's batch checklist (ADR-025).
- **`catalog.pickup_places` and `pickup_place_hours`** hold the merchant's list of pickup points with weekly local-time hours. Self-collect orders and handovers use the same list.
- A partner who moves a time later, and a merchant who moves a time, change the row directly and write `platform.audit_log`. Only the use case knows who is moving and whether a move is earlier.
- Both tables carry `row_version` for `If-Match`.

## Consequences
- An order can carry a composite key to its meeting that includes the partner (ADR-025), which a separate module could not offer without a cross-module rule.
- The orders module grows by five tables. A later split into a module is a schema move with no data change.
- The database does not tell an earlier move from a later one by actor, and it does not check pickup times against opening hours. The use case does.
- A meeting that has orders can be cancelled, and nothing moves or cancels those orders. The record leaves that open (data model, Q-26).
- `closes_orders_at` approximates the record's per-order preparation rule with one cut-off per meeting. The cut-off needs a preparation time that can be NULL until O22.

## Assumptions
- Meetings of a repeating handover are created 14 days ahead by a job. A link for day 3 and "roll to the next day" need a meeting to exist.
- A repeating handover is daily. A weekday rule is not modelled.
- One partner has one handover per agreement. Several partners at one pickup point are separate handovers.
- The business date is Europe/Zurich. A meeting that crosses midnight takes the date of its start in Zurich.
- Gate M3 stays answered in favour of plain ids across modules and business-rule triggers.

## Considered options
- **A separate `handovers` module.** Clear name, and the partner key and the binding lock become cross-module rules. Rejected for now.
- **Tables in `partners`.** The partner owns the agreement in spirit, and the merchant also edits it, and orders point into it. Rejected.
- **One row per handover with the time on it, and no meeting table.** A repeating rule then needs one order target per day anyway. Rejected.
- **A `visit` entity.** The earlier design. A hotel desk is not a visit, as the record says.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
