# ADR-018: Keep three review tables with one moderation history that sets the visible state

Status: accepted
Date: 2026-10-26
Source: DM-8
Applies to: `api/src/modules/reviews/`, `api/src/modules/content/`, `api/src/modules/orders/`, `api/migrations/`, `packages/domain/src/reviews/`

No new dependency, vendor or paid service. It gives ADR-008 its tables. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-8. Legal questions (PRD O33) can still change columns.

## Context
ADR-008 puts place reviews, story comments and product ratings in one `reviews` module with one moderation rule. A review is visible at once. The merchant hides and unhides, nobody deletes, and each hide stores who, when and an optional reason (AC47, AC69). Account deletion must anonymise the author without a foreign key to Better Auth's `user` row. A place review names a place of type sight, restaurant or accommodation. A comment has one level of replies, and the shop can reply as staff. A rating belongs to one product in one completed order.

## Decision
We will use three target tables and one history table.

- `reviews.place_reviews`, `reviews.story_comments` and `reviews.product_ratings` each hold the author's guest-profile id (plain value), a display-name snapshot, the text in the language it was written, a rating where relevant, and `state` (`visible` or `hidden`).
- `reviews.moderation_events` is append-only. A row has `action` (`hide` or `unhide`), the staff user id, an optional reason and the time. It names its target through three nullable foreign keys, and a CHECK requires exactly one. A trigger on insert sets the target's `state`, so the state and the history cannot disagree. It locks the target row first and stamps the event time afterwards, so two events on one review carry times in the order they changed the state. A direct write to `state` is refused.
- A place review stores `place_type` and a CHECK limits it to `sight`, `restaurant` and `accommodation`. The use case reads the type from `content/index.ts` when it inserts. Place type is immutable (ADR-015), so a correct copy stays correct. The database proves the value, and only the use case proves that it copied the real type.
- A reply names its parent through a composite key that forces the parent to be a root comment of the same story. The generated columns that do this are explained in the DDL comments.
- A rating is unique per `(author, order, product)`. That the order is complete is checked by the use case through `orders/index.ts`.
- Rows are never deleted. A trigger refuses `DELETE`. Erasure replaces the display-name snapshot and, if the lawyer requires it, the text (O33).
- Rate limiting counts a guest's recent rows by index. No extra table.

## Consequences
- One history table and three real foreign keys give referential integrity that a polymorphic target would lose.
- Counts and averages read visible rows by place or product with a partial index.
- Adding a fourth kind of guest content means a fourth nullable key and a wider CHECK.
- Refusing a hide on a product rating until O33 is decided stays in the use case, because the database cannot know the pending decision.

## Assumptions
- One rating scale from 1 to 5 serves place reviews and product ratings (O25 proposal).
- Text length is capped at 4000 characters until O25 sets a limit.
- A guest may write more than one review of the same place. If the owner wants one, add `UNIQUE (place_id, author_guest_id)`.
- Display names are snapshots, not read from the profile at display time.

## Considered options
- **One table for all three kinds with a `kind` column.** Fewer tables, and no foreign key to the target. Rejected.
- **A polymorphic target (`target_kind`, `target_id`) in the history.** Simple, no integrity. Rejected.
- **State derived from the latest event.** No duplicate state, and every read needs a lateral join. Rejected for the read cost.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
