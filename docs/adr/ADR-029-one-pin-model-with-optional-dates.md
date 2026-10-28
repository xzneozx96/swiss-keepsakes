# ADR-029: Keep one pin model with optional dates, so a place and an event are the same thing

Status: accepted
Date: 2026-10-27
Source: gate G11 (`docs/decisions/2026-10-27-map-pins-and-events.md`)
Applies to: `api/src/modules/content/`, `packages/domain/src/content/`, `packages/api-contract/`, `front-end/src/features/content/merchant/`, `front-end/src/features/tours/map/`, `api/migrations/`, `docs/specs/001-storytelling-pivot/data-model.md`

No new dependency, vendor or paid service. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, sections DM-5, DM-21 and DM-22. It amends ADR-005 (the content aggregates), ADR-015 and ADR-018 (the database rules and the review tables), and ADR-011 (the outbound link). The categories are ADR-030.

**Amended 2026-10-28** (`docs/decisions/2026-10-28-pins-and-map-design.md`). A pin has a main photo and optional more photos, shown as a carousel in the pin details sheet. The model below stores one cover (`cover_media_id`); the extra photos need an ordered child table, which E4.2 designs. The design is in `docs/ux/pins-design.md`.

## Context
The map is a curated local guide: sights on a walk, photo spots, bakeries, free toilets, markets and free concerts. Most of these places have no story. The built model (`api/migrations/0008_content.sql`) gives a place a fixed type and refuses to publish a sight or restaurant without a published main story (AC43). That would force an article for every bakery. Once guest reviews and place pages are dropped, a place and an event differ in one thing, the dates. A flea market has weekly hours and could be filed either way.

## Decision
We will keep one pin entity. Any pin can carry weekly hours and, optionally, dates.

- **One table.** Every pin is a row of `content.places`. It has no `type`. The merchant screen offers **Add place** and **Add event** as two ways into one form.
- **Publishing.** A pin publishes without a story and without a category. A pin needs a title in at least one language, a location and a slug; photo, address, hours, dates, the main story and the outbound link are optional (AC68, ruling G11-R2 in the decision record). AC43 is retired. AC62 and AC68 are rewritten for the pin model, not retired. Nothing protects a pin's main story, so a story is unpublished or deleted under its own rules. The delete rules stay: a draft can be deleted and a published pin can only be hidden (ADR-015).
- **Address and hours.** `address` is one optional text column shared by both languages. `weekly_hours` is a jsonb array of spans (`day` 1 to 7 with Monday as 1, `opens`, `closes`), checked by a function. The card only displays hours, and no query filters on them, so a child table would add a join to every map read. These two choices were left to the builder in the record.
- **Dates.** A table `content.place_dates` holds one row per entry. An entry is one day with optional start and end times, or a range of days with no times. A generated column `ends_at` holds the end in Europe/Zurich: the end time if set, otherwise the start of the next day. A pin with entries is public only while an entry has not ended. The view `content.public_pins` defines this once. The pin's status does not change, so no job runs and a new entry brings the pin back.
- **Link.** One plain outbound link per pin (ADR-011, amended). The `kind`, `network` and `disclosure` columns are dropped until the first paid link exists.
- **Editorial review.** A story of kind `editorial_review` can name any pin as its subject.
- **Reviews.** `reviews.place_reviews` is removed with its moderation target. Story comments and product ratings stay (ADR-018, amended).
- **Migration.** A new migration after `0008_content` drops the type, the pin CHECKs, the pin triggers and the type keys, and adds the columns, the tables and the view. It is not an edit of `0008`. The matching tests in `api/test/integration/content-schema.test.ts` change with it.

## Consequences
- The merchant fills one form, and the map has one list, one card and one layer. Events need no second implementation.
- A pin can name a main story that has no published version. The pin card shows the story link only when a published version exists in the reader's language.
- The database no longer proves that a pin has a story or that a type is right. The publish rules that remain are the delete guards and the fixed `first_published_at`.
- A public read of pins must go through `content.public_pins`. A query that reads `content.places` directly would show an ended event.
- If events later need their own features (tickets, repeats), the shared form grows, and events can be split out then. The dates table already holds the event-only data.
- The place table lost a column that the review tables copied, so the type-copy checks in ADR-015 and ADR-018 are gone.

## Assumptions
- Pins number in the hundreds (ADR-006), so one list response and one map layer handle them, and the date test per request is cheap.
- A pin has a few date entries at most, and an entry does not run past midnight. A concert that does leaves the end time empty (data model, Q-39).
- Every place the merchant lists is in Switzerland and Europe/Zurich is the right clock for every date.
- No paid link exists yet, and no row in `content.place_links` or `content.places` holds data that the migration would lose.
- Events that repeat every year on their own do not exist, so no recurrence rule is needed.

## Considered options
- **A. One pin model with an optional schedule (chosen).** One table, one editor, one card. It builds everything once, and the dates are an optional child table.
- **B. Places and events as two entities.** Two tables, two editors, two cards, and a map that merges two lists. It is clean if the two drift apart, but it builds almost everything twice for one difference. Rejected.
- **C. Events always belong to a place.** An event needs a place to exist. This contradicts the owner, because events have their own location. Rejected.

## History
- 2026-10-27 proposed
- 2026-10-27 accepted (gate G11)
