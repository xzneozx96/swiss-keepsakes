# ADR-016: Keep stock counters on the stock row, maintained by a hold trigger, with a CHECK that guards overselling

Status: accepted
Date: 2026-10-26
Source: DM-6
Applies to: `api/src/modules/inventory/`, `api/src/modules/orders/`, `packages/domain/src/catalog/stock.ts`, `api/migrations/`

No new dependency, vendor or paid service. It refines ADR-009 and replaces the stock SQL of `docs/architecture/backend.md` section 6.1. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-6.

## Context
ADR-009 puts SKU stock and holds in one `inventory` module. The invariant is available stock = on hand minus held, never below zero, even when two orders take the last unit (AC05). backend.md computes `held` as a sum over hold rows under a row lock. That rule lives only in application code, and nothing in the database stops a bug from overselling.

## Decision
We will store `on_hand` and `held` on `inventory.stock_items` with `CHECK (held <= on_hand)` and `CHECK (held >= 0)`.

- `inventory.stock_holds` rows are the source of truth. A trigger on every insert and update changes the counters in the same statement: a new hold adds to `held`, a release subtracts from `held`, and an issue subtracts from both `held` and `on_hand` and writes a `stock_adjustments` row.
- The counter update takes the stock row lock, and the CHECK makes the second of two racing holds fail. The use case maps constraint `stock_items_held_within_on_hand` to "short stock". Callers insert the lines of one order in `sku_id` order to avoid deadlocks.
- The merchant sets stock by updating `on_hand`. The CHECK refuses a value below the units held, as ADR-009 requires.
- A resolved hold, its SKU and its quantity cannot change. Holds and adjustments are never deleted. A second trigger refuses any direct write to `held`, so the hold trigger is its only writer.

## Consequences
- An oversell is impossible from any code path, and the proof is one constraint. Two sessions that held the last unit at the same time ended with one hold and one refusal.
- The counters duplicate information in the holds. The trigger keeps them equal, and a drift query (sum of `held` holds against `held`) can run as a check.
- One more trigger in the repository, written in SQL by hand because Drizzle cannot declare it.

## Assumptions
- Stock is counted per SKU, in whole units, in one place (ADR-009).
- Every change to holds goes through the `inventory` module, never through direct SQL.
- A refund never returns stock (PRD 6.2), so no code path increases `on_hand` except the merchant's set.
- Order volume stays low enough that one row lock per SKU per order is not a bottleneck.

## Considered options
- **Sum of holds under a row lock** (backend.md). No duplicated counter, but the guard lives only in code. Rejected.
- **Application updates both tables.** Same counters, no trigger. A missed update corrupts the stock. Rejected as the weaker form of the same design.
- **Serializable isolation.** Catches the race with retries, and adds retry code to every order path. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
