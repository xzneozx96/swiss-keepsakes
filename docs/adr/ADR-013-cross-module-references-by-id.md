# ADR-013: Reference other modules by plain id, and use composite foreign keys only inside a module

Status: accepted
Date: 2026-10-26
Source: DM-2
Applies to: `api/src/modules/*/adapters/schema.ts`, `api/migrations/`, `docs/specs/001-storytelling-pivot/data-model.md`

**Amended 2026-10-27 (G11).** The one cross-module copy the third bullet named, the place type on `reviews.place_reviews`, is removed with that table. The rule stays and the example is replaced.

No new dependency, vendor or paid service. The decision is the data-model counterpart of the module rule in `docs/architecture/backend.md` section 4 and the tenant rule D9. Design detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-2.

## Context
Each module owns one Postgres schema and may not read another module's tables. A Drizzle foreign key needs the other table's schema object, and importing it would break the rule that modules talk through `index.ts` only. The tenant rule D9 asks for composite keys `(store_id, parent_id)` so a child cannot point at another store's parent.

The code already holds cross-module links as plain values. `notifications.sent_mail.store_id` and `platform.audit_log.store_id` have no foreign key, and nor have `store_invitations.accepted_by` or `invited_by`. The pivot adds many such links: a review points at a place, a stock row at a SKU, an order line at a SKU, a story at a keepsake.

## Decision
We will keep the existing convention and extend it.

- Inside one module, every child row carries `store_id` and a composite foreign key `(store_id, parent_id)` to a parent that has `UNIQUE (store_id, id)`. Deletes are `RESTRICT` unless the child is a part of the parent, which then uses `CASCADE`.
- Across modules, a column holds the other module's id as a plain `uuid` with no foreign key. The use case checks the target through the other module's `index.ts` in the same transaction.
- Where a cross-module rule matters enough to enforce in the database, the owning table keeps a copy that a CHECK can read. The copy is safe only when the source column cannot change. No such copy exists after G11: `reviews.place_reviews.place_type` and `content.places.type` are gone (ADR-015, amended). `reviews.story_comments.story_group_id` is a live cross-module id, a plain `uuid` that the use case checks through the content `index.ts`.
- The rows that other modules point at are never deleted once used: places and story versions are hidden or unpublished, SKUs are archived, partners are archived. A dangling id therefore needs a code defect, and a `reporting` view lists orphans so a test or job can find one.

## Consequences
- Modules stay independent in code and in `schema.ts` imports. A module can be extracted later without touching constraints.
- The database does not stop a review from naming a place that does not exist. The use case and an orphan check do.
- Every module repeats `store_id` and carries composite keys, which makes the DDL longer and the key lists wider.

## Assumptions
- Rows that other modules reference are never hard-deleted after use. A purge job would break this and needs a new decision.
- One database serves all modules, so a join across schemas stays possible for `reporting`.
- The eslint boundary rule that forbids importing another module's adapters stays in force.

## Considered options
- **Real foreign keys across schemas.** Strong integrity, but each `schema.ts` imports the other module's tables, or the constraints live in hand-written SQL that Drizzle does not track. Rejected for now, and a cheap change later because the plain columns already hold the right ids.
- **No composite keys inside a module.** Shorter DDL, but a bug could link a story to another store's place. Rejected, D9 asks for the composite form.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-27 amended (gate G11, `docs/decisions/2026-10-27-map-pins-and-events.md`)
