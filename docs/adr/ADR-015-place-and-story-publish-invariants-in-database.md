# ADR-015: Enforce the pin, story and place rules in the database with CHECKs, two constraint triggers and an immutable place type

Status: accepted
Date: 2026-10-26
Source: DM-5
Applies to: `api/src/modules/content/`, `api/src/modules/reviews/`, `api/migrations/`, `packages/domain/src/content/`

No new dependency, vendor or paid service. This is the first use of database triggers for business rules in this repository (the only earlier rule is "no trigger for `updated_at`"). Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-5. It refines ADR-005.

## Context
ADR-005 says a story pin publishes only when its main story group has a published version (AC43), a practical place has no main story (AC62), and a place that was published or reviewed is hidden, never deleted. It also says publishing a pin and unpublishing its main story must lock the story group, "so AC43 holds under concurrency". PRD AC68 and AC62 say a practical place takes no review. The rule "published version exists" spans two tables, so a CHECK cannot hold it.

## Decision
We will enforce each rule at the lowest level that can express it.

- **Row-local rules are CHECKs.** A practical place has no main story. A published pin names a main story. A place is a draft exactly until it is first published (`status = 'draft'` iff `first_published_at IS NULL`).
- **The cross-row rule is two deferred constraint triggers that lock the story group row.** When a place is published or its main story changes, the trigger takes `FOR SHARE` on the story group and checks that a published version exists. When a story version leaves `published`, moves to another group or is deleted, the trigger takes `FOR UPDATE` on the group and checks that no published pin still depends on it. Both run at commit. The row lock makes a racing publish and unpublish serialize, and the second one to run sees the first one's result.
- **Place type never changes.** A trigger refuses an update of `type`. This keeps `reviews.place_reviews.place_type` (a CHECK-readable copy) true, which is how "a practical place has no reviews" reaches the database across modules (ADR-013).
- **Published rows are not deleted.** A place with `first_published_at` and a story version with published content cannot be deleted. A story group is held by its versions through `RESTRICT`.
- **`first_published_at` is fixed once set.** A trigger refuses any change of `first_published_at` that starts from a non-NULL value. Without it, a published place could be set back to `draft` with the column cleared, which passes the draft CHECK and then lifts the delete guard (AC79). The slug would be free again. Hiding a place leaves the column alone, so hiding is unaffected.
- **Published story text is kept once set.** A trigger refuses an update that clears `published` on a story version. Unpublishing sets `status = 'draft'` and keeps the document. Without it, clearing `published` would let a published version be deleted, and then its group (AC79).
- **TRUNCATE is refused on the tables the delete guards protect** (`content.places`, `content.story_versions`, `content.media_refs`), by a statement-level trigger that calls `platform.reject_change()`. TRUNCATE skips row triggers, so the guards would not hold. Postgres already refuses a plain TRUNCATE of `places` because of its foreign keys, so the trigger stops `TRUNCATE ... CASCADE`. Test resets use DELETE, or a reset of the Neon branch. This is the pattern for later schemas: any table guarded by row-level delete or append-only triggers also gets a `BEFORE TRUNCATE ... FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change()` trigger.
- An editorial review names a subject place of type sight, restaurant or accommodation, through a copy of the type that a composite key proves.
- The use case still checks the same rules first, to give the editor a clear message. The database is the backstop.

## Consequences
- AC43, AC62 and AC68 hold even if an application path forgets a check. Two sessions racing, in both orders, ended with exactly one winner, and the same test without the row lock let both commit (evidence in the data model, section 7).
- The error comes at commit for the trigger rules, so the use case must map `check_violation` with constraint names `places_pin_has_published_story` and `story_versions_keep_pin_story` to the editor message.
- Drizzle cannot declare constraint triggers. They live in hand-written SQL inside the migration, and a test must prove them against a real database.
- A wrong place type needs a new place. This is acceptable because places are cheap and hidden places keep their reviews.

## Assumptions
- Every write to `content.places` and `content.story_versions` goes through the content module, in the READ COMMITTED isolation that Neon uses by default.
- The number of pins and stories stays in the hundreds, so the trigger's two lookups are cheap.
- A merchant never needs to change a place's type after creation.
- A hidden place keeps its slug reserved, so a new place cannot reuse its address.

## Considered options
- **Application locks only.** The ADR-005 text. Works while every writer follows it, and gives no guard against a missed path. Kept as the first line, not the only one.
- **Denormalise `has_published_version` onto the story group** and CHECK against it. Needs the same trigger to keep the flag true, so it moves the problem. Rejected.
- **Allow the type to change and copy it again.** Risks a review on what is now a practical place. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-26 amended (gate G-E25-FIRSTPUB): first_published_at fixed once set
- 2026-10-26 amended (gates G-E25-STORYKEEP, G-E25-TRUNCATE): published story text kept once set; TRUNCATE refused on guarded tables
