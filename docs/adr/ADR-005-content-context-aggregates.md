# ADR-005: Make stories, places and tour guides aggregates of one store-owned content context

Status: accepted
Date: 2026-10-26
Source: AD-6
Applies to: `api/src/modules/content/`, `api/src/modules/catalog/`, `packages/domain/src/content/`, `packages/domain/src/bookings/`, `front-end/src/features/content/`, `front-end/src/features/tours/`

No new dependency, vendor or paid service. This decision changes the module ownership drawn in `docs/architecture/backend.md` section 4 (content, catalog) and replaces the four fixed categories of D17. The catalog keeps generic product options and category tables for future product types (owner gates M9 and M10), with no category screen in Phase 1 (ADR-021).

## Context
PRD v3 makes stories, places (four types), the map, and free tour information the core content. Places belong to the merchant's store (G8). A pin has at most one main story (Q15, Q18). A story can mention several places. Editorial reviews are stories tied to one place (§11.3). Tour routes are merchant-defined advice only and produce no pins (G9).

backend.md section 4 puts `tours` and `tour_departures` in `catalog`, and `articles` in `content` as one row per language. Tour information and tour booking share one `Tour` type in `packages/domain/src/bookings/types.ts`, and booking is now hidden (ADR-012). Two builders working from the PRD could model a pin's main story as a language version or as a group, or could give tour stops their own geometry or reference places.

## Decision
We will keep stories, places and tour guides in the `content` module and give each an explicit aggregate.

- **Story group.** A group holds the shared facts: store, kind (`story` or `editorial_review`), place references, stay tag, interests, and the keepsake and related-story links. These links are chosen once per group and shared by both languages (owner gate M1, 2026-10-26). A link to a story that has no version in the reader's language is hidden. Its language versions hold title, excerpt, author, intro, structured sections, cover, read time and publication state. A story group has no price. An editorial review has exactly one place.
- **Place.** Owned by a store. It has one type (`sight`, `restaurant`, `accommodation`, `practical`), coordinates, localized name and details, opening hours, address, stay tag, interests, publication, and an optional main story reference. An accommodation place may hold one outbound link (ADR-011).
- **Main story reference points at a story group, not a language version.** Each language resolves its own version, and ADR-002 handles a missing one.
- **Publish rules.** A story pin (`sight`, `restaurant`, `accommodation`) publishes only when its main story group has at least one published version (AC43). A `practical` place publishes without a story and has no main story (AC62). The last published version of a group that a published place uses as its main story cannot be unpublished or hidden while the place stays published. The editor lists the places that block it.
- **Tour guide.** A tour is information only: localized text, photos, duration, meeting point, free sections, tags, up to three linked keepsakes, exactly one PDF reference (ADR-004), and a route. The route is an ordered list of stops. A stop is a value object with its own coordinates, text and photo, an optional place reference for "read more", and minutes from the start. A route never creates or changes pins.
- **No price, departure, seat count or booking state** exists on a tour guide.
- **Mentions.** A story mentions places through place references. A place sheet lists its main story first, then other stories that reference it.
- **Tags.** Stay tag is `short_stay`, `multi_day` or `both`. Untagged is treated as `both` (O25 proposal). Interests are a subset of the four fixed codes in PRD §3.3. The old story categories (`eat`, `town`, `lake`, `craft`) are replaced by interests.
- **Concurrency.** Publishing a story pin and unpublishing the last version of its main story group both lock the story group row first, so one of them sees the other's result. A place's lifecycle states are `draft`, `published` and `hidden`. A place that has ever been published or reviewed is hidden, not deleted, and its reviews stay. A never-published draft may be deleted.
- Store scoping follows D9: every row has `store_id`, children use composite keys, and a story, a place and a keepsake link must belong to the same store.
- Other modules reference these aggregates by id only. `reviews` asks `content/index.ts` whether a place is reviewable.

## Consequences
- The `catalog` module no longer owns tours. It keeps the Victorinox keepsakes. `bookings` stays unbuilt.
- The three seed tours keep their stops as route stops. The migration creates no places from stops, so seed routes do not trip the AC43 rule.
- A stop and a place can describe the same landmark with two copies of the text. We accept this to keep routes independent of the publish rules.
- The db-designer decides tables. The aggregate boundary here fixes which rows change in one transaction: a group with its versions, a place with its link, a tour with its route and PDF reference.

## Assumptions
- One merchant owns all places in Phase 1. Places never belong to the platform (G8).
- A pin has at most one main story, and a story can be the main story of several pins. If the owner wants one story to be the main story of one pin only, add a unique rule.
- Route stops need no own publication state.
- The count of places stays in the hundreds, so listing all pins in one response is enough (ADR-006).

## Considered options
- **A. Group aggregate, route stops as value objects (chosen).** Matches the existing `Article` model and the seed tours, and the AC43 rule stays simple.
- **B. Route stops reference places only.** One source of coordinates. But a seed stop would have to become a place, and a sight place needs a main story to publish (AC43), so every seed stop would block. Rejected.
- **C. Keep language versions as the unit and point pins at a version.** Breaks when one language is unpublished, and hreflang cannot be derived. Rejected.
- **D. Separate `places` module.** A cleaner name, but place and story publish rules and tags change together, and two modules would need cross-module transactions on every publish. Not needed now.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
