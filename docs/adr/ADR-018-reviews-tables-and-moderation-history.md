# ADR-018: Keep two review tables with one moderation history that sets the visible state

Status: accepted
Date: 2026-10-26
Source: DM-8, amended by gate G11
Applies to: `api/src/modules/reviews/`, `api/src/modules/content/`, `api/src/modules/orders/`, `api/migrations/`, `packages/domain/src/reviews/`

No new dependency, vendor or paid service. It gives ADR-008 its tables. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-8. Legal questions (PRD O33) can still change columns.

**Amended 2026-10-27 (G11).** Guest reviews of places are removed. `reviews.place_reviews`, its `place_type` copy and its moderation target are gone, so there are two target tables and the history names its target through two keys. Story comments and product ratings are unchanged. The merchant's own reviews of places stay as stories of kind `editorial_review` (ADR-015). Removed text stays below, marked. The `reviews` migration is not built yet, so the change needs no drop.

## Context
ADR-008 puts place reviews, story comments and product ratings in one `reviews` module with one moderation rule. G11 removed the place reviews. A review is visible at once. The merchant hides and unhides, nobody deletes, and each hide stores who, when and an optional reason (AC47, AC69). Account deletion must anonymise the author without a foreign key to Better Auth's `user` row. *Removed by G11: a place review named a place of type sight, restaurant or accommodation.* A comment has one level of replies, and the shop can reply as staff. A rating belongs to one product in one completed order.

## Decision
We will use two target tables and one history table. *Before G11 there were three, with `place_reviews`.*

- `reviews.story_comments` and `reviews.product_ratings` each hold the author's guest-profile id (plain value), a display-name snapshot, the text in the language it was written, a rating where relevant, and `state` (`visible` or `hidden`).
- `reviews.moderation_events` is append-only. A row has `action` (`hide` or `unhide`), the staff user id, an optional reason and the time. It names its target through two nullable foreign keys, and a CHECK requires exactly one. A trigger on insert sets the target's `state`, so the state and the history cannot disagree. It locks the target row first and stamps the event time afterwards, so two events on one review carry times in the order they changed the state. A direct write to `state` is refused.
- *Removed by G11.* A place review stored `place_type` and a CHECK limited it to `sight`, `restaurant` and `accommodation`. The type itself is gone (ADR-015, ADR-029).
- A reply names its parent through a composite key that forces the parent to be a root comment of the same story. The generated columns that do this are explained in the DDL comments.
- A rating is unique per `(author, order, product)`. That the order is complete is checked by the use case through `orders/index.ts`.
- Rows are never deleted. A trigger refuses `DELETE`. Erasure replaces the display-name snapshot and, if the lawyer requires it, the text (O33).
- Rate limiting counts a guest's recent rows by index. No extra table.

## Consequences
- One history table and two real foreign keys give referential integrity that a polymorphic target would lose.
- Counts and averages read visible rows by story or product with a partial index.
- Adding a third kind of guest content means a third nullable key and a wider CHECK.
- Refusing a hide on a product rating until O33 is decided stays in the use case, because the database cannot know the pending decision.

## Assumptions
- A rating scale from 1 to 5 serves product ratings (O25 proposal).
- Text length is capped at 4000 characters until O25 sets a limit.
- Display names are snapshots, not read from the profile at display time.

## Considered options
- **One table for all kinds with a `kind` column.** Fewer tables, and no foreign key to the target. Rejected.
- **A polymorphic target (`target_kind`, `target_id`) in the history.** Simple, no integrity. Rejected.
- **State derived from the latest event.** No duplicate state, and every read needs a lateral join. Rejected for the read cost.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-27 amended (gate G11): place reviews removed
