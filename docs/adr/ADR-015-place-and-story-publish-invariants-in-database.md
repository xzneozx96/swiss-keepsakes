# ADR-015: Enforce the place and story publish rules in the database with CHECKs and guard triggers

Status: accepted
Date: 2026-10-26
Source: DM-5, amended by gate G11
Applies to: `api/src/modules/content/`, `api/src/modules/reviews/`, `api/migrations/`, `packages/domain/src/content/`

No new dependency, vendor or paid service. This is the first use of database triggers for business rules in this repository (the only earlier rule is "no trigger for `updated_at`"). Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-5. It refines ADR-005.

**Amended 2026-10-27 (G11).** The pin rule and the fixed place type are removed. A pin publishes with or without a main story (AC85), and `content.places` has no `type`. The two constraint triggers, the row-local story CHECKs, the type-immutability trigger and the type copy on editorial reviews are gone. Every other rule below is unchanged: the draft CHECK, the delete guards, the fixed `first_published_at`, the kept published text and the TRUNCATE guards. The decision record is `docs/decisions/2026-10-27-map-pins-and-events.md` and the pin model is ADR-029. Text that G11 removed stays below, marked, so the history reads whole.

## Context
ADR-005 says a story pin publishes only when its main story group has a published version (AC43), a practical place has no main story (AC62), and a place that was published or reviewed is hidden, never deleted. It also says publishing a pin and unpublishing its main story must lock the story group, "so AC43 holds under concurrency". PRD AC68 and AC62 say a practical place takes no review. The rule "published version exists" spans two tables, so a CHECK cannot hold it.

## Decision
We will enforce each rule at the lowest level that can express it.

- **Row-local rules are CHECKs.** A place is a draft exactly until it is first published (`status = 'draft'` iff `first_published_at IS NULL`). *Removed by G11: a practical place has no main story, and a published pin names a main story.*
- *Removed by G11.* **The cross-row rule is two deferred constraint triggers that lock the story group row.** When a place is published or its main story changes, the trigger takes `FOR SHARE` on the story group and checks that a published version exists. When a story version leaves `published`, moves to another group or is deleted, the trigger takes `FOR UPDATE` on the group and checks that no published pin still depends on it. Both run at commit. The row lock makes a racing publish and unpublish serialize, and the second one to run sees the first one's result.
- *Removed by G11.* **Place type never changes.** A trigger refuses an update of `type`. This keeps `reviews.place_reviews.place_type` (a CHECK-readable copy) true, which is how "a practical place has no reviews" reaches the database across modules (ADR-013).
- **Published rows are not deleted.** A place with `first_published_at` and a story version with published content cannot be deleted. A story group is held by its versions through `RESTRICT`.
- **`first_published_at` is fixed once set.** A trigger refuses any change of `first_published_at` that starts from a non-NULL value. Without it, a published place could be set back to `draft` with the column cleared, which passes the draft CHECK and then lifts the delete guard (AC79). The slug would be free again. Hiding a place leaves the column alone, so hiding is unaffected.
- **Published story text is kept once set.** A trigger refuses an update that clears `published` on a story version. Unpublishing sets `status = 'draft'` and keeps the document. Without it, clearing `published` would let a published version be deleted, and then its group (AC79).
- **TRUNCATE is refused on the tables the delete guards protect** (`content.places`, `content.story_versions`, `content.media_refs`), by a statement-level trigger that calls `platform.reject_change()`. TRUNCATE skips row triggers, so the guards would not hold. Postgres already refuses a plain TRUNCATE of `places` because of its foreign keys, so the trigger stops `TRUNCATE ... CASCADE`. Test resets use DELETE, or a reset of the Neon branch. This is the pattern for later schemas: any table guarded by row-level delete or append-only triggers also gets a `BEFORE TRUNCATE ... FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change()` trigger.
- *Removed by G11.* An editorial review names a subject place of type sight, restaurant or accommodation, through a copy of the type that a composite key proves. An editorial review can now name any pin.
- The use case still checks the remaining rules first, to give the editor a clear message. The database is the backstop.

## Consequences
- AC79 holds even if an application path forgets a check: a published place and a published story version cannot be deleted, and their identifying columns and text cannot be cleared.
- After G11 no rule spans two rows except the delete guards, so the database needs no lock for publishing. The earlier race test and its constraint names (`places_pin_has_published_story`, `story_versions_keep_pin_story`) stay in the data model's history (section 7, result 4).
- A pin can name a main story that has no published version. The public read shows the story link only when a published version exists in the reader's language.
- Drizzle cannot declare the guard triggers. They live in hand-written SQL inside the migration, and a test must prove them against a real database. The G11 migration drops the pin triggers and keeps these.
- *Removed by G11:* a wrong place type needed a new place.

## Assumptions
- Every write to `content.places` and `content.story_versions` goes through the content module, in the READ COMMITTED isolation that Neon uses by default.
- The number of pins and stories stays in the hundreds, so the trigger's two lookups are cheap.
- A hidden place keeps its slug reserved, so a new place cannot reuse its address.

## Considered options
- **Application locks only.** The ADR-005 text. Works while every writer follows it, and gives no guard against a missed path. Kept as the first line, not the only one.
- **Denormalise `has_published_version` onto the story group** and CHECK against it. Needs the same trigger to keep the flag true, so it moves the problem. Rejected.
- **Allow the type to change and copy it again.** Risks a review on what is now a practical place. Rejected. The type itself is gone after G11.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-26 amended (gate G-E25-FIRSTPUB): first_published_at fixed once set
- 2026-10-26 amended (gates G-E25-STORYKEEP, G-E25-TRUNCATE): published story text kept once set; TRUNCATE refused on guarded tables
- 2026-10-27 amended (gate G11): pin rule, constraint triggers, fixed place type and the type copy on editorial reviews removed. Other rules unchanged
