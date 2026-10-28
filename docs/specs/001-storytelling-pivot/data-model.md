---
status: accepted
accepted: 2026-10-26
amended: 2026-10-27 (gate G11, proposed until the owner approves the amended sections)
spec: docs/PRD/Swiss_keepsakes_PRD.md
architecture: docs/specs/001-storytelling-pivot/architecture.md
postgres: 18
sql_executed: yes (postgres:18-alpine in Docker, PostgreSQL 18.6, scratch database only)
---
# Data model: storytelling pivot

This document holds the PostgreSQL tables, constraints, indexes and migrations for PRD v3. The owner accepted it on 2026-10-26 (gate DESIGN). The ADRs it produces, ADR-013 to ADR-020, ADR-022 to ADR-023 and ADR-024 to ADR-025 and ADR-026 to ADR-028, are also `accepted`. The partner handover of `docs/decisions/2026-10-26-partner-handover.md` is modelled in DM-16 and DM-17. The owner's final data answers of 2026-10-26 (M1, M2, M3, M7 to M10 and C1) are applied: story links per group, a server cart, guest name and e-mail on orders, commission at completion, generic product options, and categories. Section 9 records what the model took from Medusa 2 and what it skipped.

**Amended 2026-10-27 (gate G11).** The owner's record `docs/decisions/2026-10-27-map-pins-and-events.md` replaces the typed place with one pin model. A pin has no `type`, publishes with or without a story, and can carry an address, weekly hours, dates and map categories. Stories get blog categories. Guest reviews of places are dropped. Every changed passage below says G11. Section 4 shows the target model. The built migration `api/migrations/0008_content.sql` still has the earlier shape, and section 6 lists the new migration that moves it to the target. ADR-029 records the pin model and ADR-015 and ADR-018 carry amendment notes.

The model follows the module ownership in `architecture.md` and the conventions of `docs/architecture/backend.md` section 5. Where the PRD, an ADR or the architecture disagree, the document says so in section 8 and keeps the DDL easy to switch.

## What exists today

Seven migrations are applied, `0000_platform` to `0006_timestamps`. The journal (`api/migrations/meta/_journal.json`) lists exactly these. They create three schemas.

| Schema | Tables |
|---|---|
| `platform` | `audit_log`, `idempotency_keys`, `webhook_events` |
| `notifications` | `sent_mail` |
| `identity` | `user`, `session`, `account`, `verification`, `rate_limit` (Better Auth), `guest_profiles`, `stores`, `store_memberships`, `store_invitations`, `platform_admins` |

No migration creates a catalog, order, booking, seat-hold, stock or tour table. The git history of every branch names one more file, an earlier `0001_identity.sql` that created only `platform_admins` and `store_memberships` and that the journal no longer lists. The backend.md section 5 tables for those modules are design only. No booking data sits in any database, so the dormant booking tables hold nothing to preserve or lose. The booking data that exists is the prototype seed in the browser (`front-end/src/features/tours/seed.ts`), which ADR-012 keeps compiled.

Accepted ADRs that constrain this work: none. `docs/adr/INDEX.md` lists ADR-001 to ADR-012 as `proposed`. This design reads ADR-002, 003, 004, 005, 007, 008, 009, 010, 011 and 012. Where it differs from one, section 8 says so.

The built `content` schema (`0008_content`, E2.5) has the typed place of the earlier design: `places.type`, the story-required CHECK, the pin triggers and the composite keys on `(id, type)`. G11 removes them in a new migration after `0008` (section 6). Nothing reads or writes the table yet, because the content API (E2.6) is not built.

## 1. Requirements and volumes

Nothing below is built, so "rows now" is zero for every new table. The 12-month figures are assumptions. The owner of each assumption is the product owner unless the table says otherwise.

| Entity | Rows now | Rows in 12 months | Growth driver | Notes |
|---|---|---|---|---|
| `content.media` | 0 | 600 to 1,500 | Photos in stories, places and routes, one PDF per tour | Prototype photos live in bundled assets |
| `content.story_groups` | 0 | 40 to 150 | Merchant writes stories and editorial reviews | The seed has about 21 versions, about 11 stories |
| `content.story_versions` | 0 | 80 to 300 | Two languages per group | One row per group and language |
| `content.places` | 0 | 100 to 500 | Merchant pins sights, food, free essentials and events (G11) | ADR-006 assumes hundreds. Each row is a pin of any kind |
| `content.place_dates` | 0 | 0 to 300 | Dated pins such as markets and concerts, one to several entries each (G11) | Ended entries stay until the merchant deletes them |
| `content.map_categories`, `content.blog_categories` | 0 | 5 to 40 and 5 to 30 | The merchant's two lists (G11) | One level of sub-categories |
| `content.place_categories`, `content.story_categories` | 0 | 150 to 1,500 and 50 to 300 | One to three map categories per pin, one to two blog categories per story (G11) | Link rows |
| `content.tours`, `tour_stops` | 0 | 3 to 11 tours, 30 to 120 stops | Merchant edits routes | The PRD says three seed tours, the client brief of October 2026 says 11 |
| `catalog.skus`, `inventory.stock_items` | 0 | 150 to 800 | 12 designs, 3 sizes, a few colours (O26) | One stock row per SKU, three option values per SKU |
| `catalog.product_options`, `product_option_values` | 0 | 3 options, 20 to 60 values for the one product | Merchant adds designs, sizes, colours | A second product line adds its own |
| `catalog.product_categories`, `product_category_links` | 0 | 0 to 30 | Tables only in Phase 1 | No screens |
| `orders.carts`, `cart_lines` | 0 | 3,000 to 20,000 carts, most anonymous and abandoned | Every visitor who adds a knife | A job deletes stale anonymous carts |
| `inventory.stock_holds` | 0 | 1,000 to 5,000 | One per order line | Rows stay as history |
| `orders.orders`, `order_lines` | 0 | 500 to 3,000 orders | Pilot and guide groups | Owner estimate needed |
| `reviews.*` | 0 | 500 to 5,000 | Guests after sign-in, on stories and products (G11 removed place reviews) | Spam raises it. The range is the earlier estimate, not re-estimated without place reviews |
| `partners.*` | 0 | 5 to 30 partners | The plan names about five guides at launch | |
| `orders.handovers`, `handover_occurrences` | 0 | 100 to 1,500 handovers, 1,000 to 20,000 meetings | One-off handovers per tour group, and one meeting a day for each hotel desk | Repeating rules create meetings ahead (assumption 6) |
| `orders.handover_proposals`, `handover_receipts` and items | 0 | 200 to 3,000 proposals, 1,000 to 20,000 receipt items | Two to four proposals per handover, one item per order | |
| `catalog.pickup_places`, `pickup_place_hours` | 0 | 3 to 20 places, 20 to 140 hours rows | Merchant's list | |
| `analytics.events` | 0 | 1 to 3 million | Thousands of events a day | Kept 14 months (O14 proposal) |
| `analytics.daily_counts` | 0 | 50,000 to 300,000 | One row per day and dimension combination | |

Access patterns. A rate is a peak and an average in requests per second. Every pattern is small, so latency is a ceiling and the main point is correctness of the write paths.

| Id | Access pattern | R/W | Peak / avg | Rows | Latency | Consistency |
|---|---|---|---|---|---|---|
| AP-1 | Find a published story version, pin, tour or product by language and slug (document and API). A `/:lang/map?place=<slug>` link finds a pin this way (G11) | R | 20 / 1 | 1 | 50 ms | A 60 s stale read is fine (D5) |
| AP-2 | List every published page for the sitemap and hreflang | R | 1 per minute | 300 to 1,000 | 200 ms | Stale allowed |
| AP-3 | All pins the public may see, for the map: published, and either without dates or with a date that has not ended. Each with its categories, address, hours and next date (G11) | R | 5 / 0.5 | up to 500 | 100 ms | Stale allowed. A pin disappears after its last date without a write |
| AP-4 | Pin card: the main story if it has a published version in the reader's language, then other published stories that mention the pin or review it, and the outbound link (G11) | R | 5 / 0.5 | up to 20 | 100 ms | Stale allowed |
| AP-5 | Story document: version, mentioned places, up to 6 keepsake links, up to 3 related stories | R | 10 / 1 | up to 15 | 100 ms | Stale allowed |
| AP-6 | Tour document: tour, stops in order, PDF media, up to 3 keepsake links | R | 5 / 0.5 | up to 40 | 100 ms | Stale allowed |
| AP-7 | Staff read and save a draft with `If-Match` | R/W | 1 / 0.1 | 1 | 200 ms | Reads its own write |
| AP-8 | Publish or unpublish a story version, pin or tour (G11: no pin rule) | W | 0.2 / 0.01 | few | 500 ms | Reads its own write |
| AP-9 | Visible comments of a story, and the rating summary of a product (G11: no place reviews) | R | 5 / 0.5 | 20 per page | 100 ms | Stale allowed |
| AP-10 | Post a comment or rating, after a count of the author's recent posts | W | 0.2 / 0.01 | 1 | 200 ms | Reads its own write |
| AP-11 | Merchant hides or unhides, and lists newest comments and ratings with hidden ones | R/W | 0.1 / 0.01 | 50 per page | 200 ms | Reads its own write |
| AP-12 | Product page: published SKUs of a product with price, and availability | R | 10 / 1 | up to 150 | 100 ms | A change shows within 60 s |
| AP-13 | Auto-accept an order: reserve stock for each line | W | 1 / 0.05 | 1 to 5 | 200 ms | Strict. Two orders never take the last unit |
| AP-14 | Release or issue the holds of an order | W | 0.5 / 0.02 | 1 to 5 | 200 ms | Strict |
| AP-15 | Merchant sets on-hand stock for a SKU | W | 0.1 / 0.01 | 1 | 200 ms | Strict |
| AP-16 | Stock and SKU list for the dashboard | R | 0.2 / 0.02 | up to 800 | 300 ms | Stale allowed |
| AP-17 | Insert a batch of anonymous events, and count an `order_submit` into the funnel | W | 10 / 0.5 | 1 to 20 | 100 ms | Best effort |
| AP-18 | Roll up one day of events, then delete events past retention | W | hourly job | up to 100,000 | minutes | Idempotent |
| AP-19 | Dashboard reads roll-ups | R | 0.1 / 0.01 | up to 2,000 | 300 ms | Stale allowed |
| AP-20 | Load a partner account by user id on a signed-in request | R | 2 / 0.1 | 1 | 20 ms | Strict, no cache |
| AP-21 | Create and accept a partner invitation | W | rare | 1 | 200 ms | Strict |
| AP-22 | Guide lists orders whose source is the guide | R | 0.5 / 0.05 | up to 200 | 200 ms | Reads its own write |
| AP-23 | Create an order with its lines, and accept it | W | 1 / 0.05 | 1 to 6 | 300 ms | Strict |
| AP-24 | Merchant calendar and work list by status and pickup time | R | 0.5 / 0.05 | up to 200 | 200 ms | Stale allowed |
| AP-25 | A guest lists their own orders | R | 1 / 0.1 | up to 50 | 100 ms | Reads its own write |
| AP-26 | The printed QR resolves a partner's meetings today that can still take an order | R | 5 / 0.3 | up to 5 | 50 ms | Strict, no cache |
| AP-27 | A handover link resolves one handover by its share code, on any day | R | 2 / 0.1 | 1 to 3 | 50 ms | Strict, no cache |
| AP-28 | Bind an order to a meeting at checkout, or move it to another meeting of the same partner | W | 1 / 0.05 | 1 | 200 ms | Strict. Never after the cut-off, never to a cancelled meeting |
| AP-29 | The partner's handover screen lists the orders of one meeting with status, guest name and payment state | R | 1 / 0.05 | up to 60 | 100 ms | Reads its own write |
| AP-30 | The merchant moves a meeting earlier and lists the orders that no longer fit | R/W | rare | up to 60 | 200 ms | Strict |
| AP-31 | A job closes meetings at their cut-off and cancels unpaid online orders bound to them | W | every minute | up to 50 | seconds | Idempotent, never touches cash orders |
| AP-32 | A job creates the next days' meetings of every repeating handover | W | daily | up to 30 | seconds | Idempotent |
| AP-33 | Propose, counter, accept and withdraw a handover time | W | rare | 1 to 2 | 200 ms | Strict. One open proposal at a time |
| AP-34 | The partner records a batch receipt for one meeting | W | 1 / 0.05 | up to 60 items | 300 ms | Strict. Ticked orders change status in the same statement |
| AP-35 | A no-show or a guest switch detaches an order from its meeting | W | rare | 1 | 200 ms | Strict |
| AP-36 | Add, change or remove a cart line, re-checking stock and price | W | 3 / 0.2 | 1 | 200 ms | Reads its own write |
| AP-37 | Load a cart by the id in the cookie | R | 5 / 0.3 | up to 10 lines | 50 ms | Reads its own write |
| AP-38 | Link an anonymous cart to a guest after sign-in | W | 0.3 / 0.02 | 1 | 100 ms | Strict |
| AP-39 | Complete a cart into one or several orders, safe to repeat | W | 1 / 0.05 | 1 to 4 orders | 500 ms | Strict. A second completion returns the same orders |
| AP-40 | A job deletes stale anonymous carts | W | hourly | up to 1,000 | seconds | Idempotent |
| AP-41 | A product page lists its options, values and SKUs, and the category tree | R | 10 / 1 | up to 150 | 100 ms | Stale allowed |
| AP-42 | Map category chips, blog category filter and the editor's tag pickers read the two category lists (G11) | R | 5 / 0.5 | up to 70 | 100 ms | Stale allowed |
| AP-43 | Merchant creates, renames, reorders and deletes map and blog categories. A delete works only on an unused category (G11) | W | rare | 1 | 200 ms | Strict |
| AP-44 | Merchant sets a pin's address, weekly hours, dates and map categories, and a story's blog categories. Structure is saved directly (G11) | W | 0.2 / 0.01 | up to 20 | 200 ms | Reads its own write |

Every read has a write that feeds it. AP-37 and AP-39 read what AP-36 and AP-38 write. AP-40 reads AP-36. AP-41 reads what the merchant writes to products, options and categories. AP-26 to AP-30 read what AP-28, AP-32 and AP-33 write. AP-29 reads what AP-34 and AP-35 write. AP-31 reads AP-33 and AP-28. AP-1 to AP-6 read what AP-7, AP-8 and AP-44 write. AP-42 reads what AP-43 writes, and AP-3 also reads the category links that AP-44 writes. AP-9 reads AP-10 and AP-11. AP-12, AP-16 read AP-15 and AP-13 to AP-14. AP-19 reads AP-18, which reads AP-17. AP-20 reads AP-21. AP-22, AP-24 and AP-25 read AP-23.

Assumptions, each with an owner:

1. Product owner. Content stays in the hundreds of rows and orders stay in the low thousands in the first year.
2. Product owner. One merchant and one store hold all places in Phase 1 (G8; G11 removed G8's four place types, and this assumption stays).
3. Product owner and lawyer. Raw events keep 14 months (O14, ADR-007).
4. Product owner. The shop sells in CHF only (O01 is open).
5. Developer. Neon runs PostgreSQL 18 at READ COMMITTED, so `uuidv7()` is native and the lock rules in DM-6 apply as tested. DM-5 no longer has a lock rule (G11).
6. Developer and product owner. A job creates the meetings of a repeating handover 14 days ahead, so a handover link for day 3 and "roll to the next day" find a meeting. The 14 days are a guess.
7. Product owner and merchant. `closes_orders_at` is one cut-off per meeting, the meeting time minus the preparation time. The record defines "can still take the order" per order from its preparation time, and a product's `preparation_hours` can be NULL (O22), so the meeting cut-off approximates it. The use case sets it, and a null preparation time means the merchant sets it by hand.
8. Developer and product owner. Stale anonymous carts are deleted after 30 days without activity. The 30 days are a guess.

## 2. ER diagram

The diagrams are in `docs/specs/001-storytelling-pivot/er/README.md`. They are generated from the tested DDL in section 4, one per schema, and they draw every foreign key. The older diagram that sat here left out relationships, so it is removed.

## 3. Decisions

### DM-1 Repository conventions stay

Decision. Primary keys are `uuid DEFAULT uuidv7()`. Money is `bigint` Rappen, not `numeric` (the data-model skill suggests `numeric`, but backend.md section 5 fixes Rappen and the shared domain code uses it). `commission_rate` is a ratio, so it is `numeric(5,4)`. Enumerations are `text` with a named CHECK, as in `identity.stores`. Times are `timestamptz`. Localized text is `jsonb` shaped `{en?, de?}` for places, tours and products, and rows per language for stories. Every mutable table has `created_at` and `updated_at` (the `timestamps()` helper). Three groups differ. The append-only tables (`moderation_events`, `stock_adjustments`, `analytics.*`) keep their own event time or the hourly bucket. `partner_accounts` has `created_at` and `revoked_at`. The link tables (`story_group_places`, `story_keepsake_links`, `story_related`, `tour_keepsake_links`, `product_media`, and since G11 `place_categories`, `story_categories` and `place_dates`) and `media_refs` have neither column, because a use case replaces them as a set. The last group goes beyond the exceptions that backend.md section 5 lists, and approving this model accepts it.

Why. It is the existing code. Alternatives rejected. `bigint identity` keys (the repository uses UUIDv7), `numeric` money.

### DM-2 Plain ids across modules, composite keys inside one

Decision. Inside a module, a child carries `store_id` and a composite foreign key `(store_id, parent_id)` to a parent with `UNIQUE (store_id, id)`. Across modules, the column is a plain `uuid`. The use case checks the target through the other module's `index.ts`. Rows that others point at are never hard-deleted, and a `reporting` view lists orphans. Serves every pattern that crosses a module. ADR: ADR-013.

Why. A Drizzle foreign key imports the other module's schema, which the module rule forbids. The repository already stores `store_id` and user ids this way. Alternative rejected. Real cross-schema keys in hand-written SQL, which Drizzle would not track. This is a structure question, and section 8 returns it as a decision.

### DM-3 Published columns, one draft document, structure saved directly

Decision. Structure (coordinates, address, weekly hours, dates, categories, tags, main story, PDF, stops, links, prices) is saved straight into typed columns and child rows, so CHECKs and keys hold at all times. Text has `published jsonb` and `draft jsonb`. Publishing copies one to the other in one transaction and bumps `row_version`. Media used inside documents is listed in `content.media_refs`. A trigger refuses to retire a media row that a column or a document still uses, and the cover, PDF and stop-photo keys also carry the media kind, so an image cannot be a PDF. A concurrent save can still add a reference during a retire, which the grace period of ADR-004 covers. The database has no guard against a save that points a cover, a PDF or a stop photo at media that is already `retired` (gate G-E25-RETIREDMEDIA, 2026-10-26). **Requirement on E2.6:** the content use cases that set a cover, a PDF or a stop photo must refuse media whose status is `retired`. Keepsake photos (`catalog.product_media`) hold plain media ids, and the cleanup job asks `catalog` before it removes a file. Serves AP-1 to AP-8. ADR: ADR-014.

Why. Public reads need typed, indexed fields. The body changes shape often and cannot hold a key. Alternatives rejected. Revision rows, shadow tables, two jsonb documents with no typed columns, and drafting structure too (ADR-014 lists the reasons).

### DM-4 Slugs and page identity

Decision. A story version is the row `(group_id, language)` with `UNIQUE (language, slug)`. A place, tour or product has `slug jsonb` as `{en?, de?}` and a localized name with the same keys, enforced by CHECK. Uniqueness is a partial unique expression index per language. The slug can be set while drafting, and a collision then shows at once. It must be set to publish. A hidden place keeps its slug, and a slug value must be a non-empty string for each language key present. Serves AP-1 and AP-2. ADR: ADR-014.

Why. ADR-002 wants a slug unique per type and language across the platform. Per-language expression indexes need no side table. The query must use the same expression, `slug->>'en'`. Alternative rejected. A `page_slugs` side table, which adds a second row to keep in step with every publish. A third language needs one more index, which is a migration the owner approves anyway.

### DM-5 The publish and delete rules in the database

Decision (amended by G11, 2026-10-27). The pin rule is gone. AC43 is retired and AC62 and AC68 are rewritten as the pin publish rules, so a pin publishes with or without a main story. `content.places` has no `type`, no story-required CHECK, no constraint trigger that locks the story group, and no trigger that fixes the type. These rules stay:

- A place is a draft exactly until it is first published (CHECK `places_draft_means_unpublished_check`).
- A draft place can be deleted. A published place can only be hidden (owner M6, 2026-10-26), and a published story version cannot be deleted either.
- `first_published_at` cannot change once it is set (gate G-E25-FIRSTPUB, 2026-10-26), because clearing it would let a published place go back to draft and then be deleted (AC79).
- Once a story version's `published` text is set, it is kept (gate G-E25-STORYKEEP, 2026-10-26). Unpublishing sets `status = 'draft'` and keeps the document, because clearing `published` would let a published version be deleted, and then its group.
- TRUNCATE is refused on `content.places`, `content.story_versions` and `content.media_refs` (gate G-E25-TRUNCATE, 2026-10-26). TRUNCATE skips row triggers, so the delete guards would not hold. Postgres already refuses a plain TRUNCATE of `places` because of its foreign keys, so the trigger stops `TRUNCATE ... CASCADE`. Test resets use DELETE, or a reset of the Neon branch.

Tours have no delete guard, and this document does not decide one. An editorial review can name any pin as its subject, because `story_groups.subject_place_type` is gone. Serves AP-8. ADR: ADR-015 (amended) and ADR-029.

Two consequences of the removal.

- A pin can name a main story group that has no published version, and a published version can be unpublished while a pin names its group. The record drops the triggers that stopped both, and nothing protects a pin's main story any more (ruling G11-R4, 2026-10-27, Q-43 settled). A story is unpublished or deleted under its own rules, and the read for AP-4 shows the main story link only when the group has a published version in the reader's language, as `story_related_readable` does for related stories. The earlier use case rule that listed the blocking pins is dropped, so E2.6 takes no story-group lock for it.
- The sentence "a published version cannot move to another group" held only through the removed trigger. It is now a use case rule: the use case refuses the move, and the database no longer stops it.

Requirements on E2.6, from the E2.5 gates (2026-10-26) and G11:

- Refuse `retired` media when a use case sets a cover, a PDF or a stop photo (DM-3).
- Read pins for the public through `content.public_pins` (DM-21), so the rule "hidden after the last date" has one definition.
- The use case no longer checks a pin story rule. It still maps `restrict_violation` and `check_violation` from the remaining guards to editor messages.

Why. With the pin rule gone, no rule spans two rows except the delete guards, and each guard reads only its own row. A CHECK or a row trigger is enough, and the lock rules of the earlier design (`FOR SHARE` on publish, `FOR UPDATE` on unpublish) have nothing to protect. The earlier decision and its race test remain in ADR-015's history. Alternative rejected. Keeping the pin rule for pins that choose a story: it would make the "pin without a story" the exception and keep the triggers for little gain, and the record says a story is an optional extra.

### DM-6 Stock counters guarded by a CHECK

Decision. `inventory.stock_items` holds `on_hand` and `held` with `CHECK (held <= on_hand)`. A trigger on every insert and update of `stock_holds` moves the counters and writes an adjustment row when a hold is issued, and a second trigger refuses a direct write to `held`. The hold rows are the source of truth. Serves AP-13 to AP-16. ADR: ADR-016.

Why. AC05 becomes one constraint that no code path can bypass. Alternative rejected. The sum of holds under a row lock, which is correct only while every writer follows the rule.

### DM-7 Generic product options, and one SKU per combination of option values

Decision. `catalog.product_options` (per product, localized name, position) and `catalog.product_option_values` (localized label, position, optional colour swatch) replace the earlier size, theme and colour tables (owner M9). A SKU is a row in `catalog.skus` and takes exactly one value of each option of its product through `catalog.sku_option_values`. The key `(sku_id, option_id)` allows one value per option. A composite key proves that the value belongs to that option and that the option belongs to the SKU's own product. A product may have no options and then has exactly one SKU. At commit, `catalog.sync_sku_combination` counts the SKU's values against the product's options, refuses a SKU with a missing option, and stores `combination_key`, the option and value ids in option order. `UNIQUE (product_id, combination_key)` makes each combination unique per product. Adding an option to a product that has SKUs rechecks every SKU, and the product row is locked so a new option and a new SKU cannot both pass the count. Victorinox is one product with the options Size, Theme and Colour. Stock, holds, prices, `sku_code` and order lines stay keyed on the SKU, and an order line keeps the chosen options as a snapshot. Serves AP-12, AP-23 and AP-41. ADR: ADR-017 (revised) and ADR-027.

Why. Medusa models options per product and links a variant to option values (section 9). The key gives the database the uniqueness that the three fixed columns gave, and the commit-time count gives the "every option has a value" rule. Alternatives rejected. A jsonb map of options on the SKU, which has no key to the values. A unique index over a trigger-less expression, which cannot join the option rows. The combination key is written by a deferred trigger, so it is NULL between the insert and the commit, and the unique index ignores NULLs. A drift query (`combination_key IS NULL`) can list a SKU that escaped the trigger.

### DM-8 Two review tables, one history

Decision (amended by G11, 2026-10-27). `story_comments` and `product_ratings` hold the content and the visible state. `moderation_events` is append-only, names its target through two nullable keys with an exactly-one CHECK, and a trigger sets the target's state (a direct write to `state` is refused). The trigger locks the target row before it stamps the event time, so two events on one comment or rating carry times in the order they changed the state. Nothing is deleted. `reviews.place_reviews`, its `place_type` copy and its moderation target are removed, because guests no longer review places. The merchant's own reviews of places stay as stories of kind `editorial_review` (DM-5). Serves AP-9 to AP-11. ADR: ADR-018 (amended).

Why. One moderation rule and real foreign keys. The rule "no review on a practical place" and the type copy it needed are gone with the type. Alternatives rejected. A polymorphic target and state derived from the latest event.

### DM-9 Partner accounts only through an invitation

Decision. `partners.partner_invitations` and `partners.partner_accounts` carry the link. An account row has a composite key to an invitation for the same partner, one invitation yields one account, and an insert trigger requires that the invitation is accepted, not revoked and not expired. The account has `revoked_at` so a partner can lose access, and it cannot be edited or deleted. An accepted invitation cannot be un-accepted. The e-mail match stays in the accept use case, because the user's e-mail lives in `identity`. `identity` is not changed. Serves AP-20 and AP-21. ADR: ADR-019.

Why. Gate D1 allows a partner role only by invitation, and the key makes a self sign-up unable to reach it. Alternative rejected. A `partner` role on `identity.store_invitations`, which takes a lock on a live table and mixes two kinds of invitation. Section 6 keeps its lock and rollback written down. Section 8 returns the choice as a decision.

### DM-10 Analytics table with no identifier and an hourly time

Decision. `analytics.events` has no column for any identity and no foreign key. Its key is `(session_id, seq)`, with no surrogate id, so insert order tells nothing. Time is `bucket_hour`, a timestamp cut to the hour. Every categorical column has a closed CHECK, and a shape CHECK ties each event name to the content it may carry. `order_submit` is never stored. `analytics.record_order_submit` adds one to two counters in `daily_funnels` for the day, the session's referrer class and its segment, and keeps nothing about the session or the order. A product view names its product (owner M5, 2026-10-26). Roll-ups hold counts. Serves AP-17 to AP-19. ADR: ADR-020.

Why. A join needs a key, and an exact time is a key. Gates D2 and G4 say events never join to orders below aggregate counts, so the log holds no order row, no order time and no order-submit row, and the key carries no surrogate id. The owner decided on 2026-10-26 (M5) to keep the product id in product views, and that purchases stay counted per day and are never stored per session. One inference path remains and the owner accepted it. A reader who knows an order's products and its hour can guess which session viewed the product that was later bought, most easily in a quiet hour of the pilot. No stored row links a session to an order. A day's funnel count can also be 1, which is a count, as the gates allow. Section 8 asks whether the dashboard hides small counts. This note refines ADR-007 for the data model only. The architect owns ADR-007, and ADR-020 carries the same note. Alternatives rejected. A timestamp to the second, hashed session ids.

### DM-11 Order columns the pivot changes

Decision. `orders.orders` gets `payment_route` (`online` or `partner_cash`), `accepted_mode` (`auto` or `manual`), and `partner_id` (fixed at creation, and a trigger refuses a change, as it does for `guest_id` and `total_rappen`). CHECKs state AC65: a guide-cash order has a partner as its source and never a payment deadline. The value is `partner_cash` and not guide cash, because the record lets every partner, hotels included, take cash (Q10). The deposit, pay-later and cancellation-cutoff columns, and `trip`, are not created (PRD 6.2, G5, O28, O29). The nullable seam `group_ref` and the order columns `arrival_at`, `departure_at` and `delivery_at` of the earlier version are removed, because the partner handover answers G6 (DM-16, DM-17). Each time change writes `platform.audit_log` with before and after. The snapshot, total and timestamp changes from the Medusa study are in DM-14. Serves AP-22 to AP-25. No ADR.

Why. G6 is answered, so the group times belong to the handover and its meetings, where the guide and the merchant agree them, and not to each order. This supersedes the earlier decision 5 (nullable arrival and departure columns). The remaining orders, money and commission columns stay as backend.md section 5 defines them, and the money module records cash as a `partner_cash` method.

### DM-12 What the pivot retires or keeps dormant

Decision. Section 6 gives every backend.md section 5 table a status. A future booking module attaches to a tour by `tour_id`, a plain id of `content.tours`, so `content.tours` needs no change when booking returns. No booking table is created now. No access pattern depends on it. No ADR, because ADR-012 already records the hiding.

Why. Nothing exists to migrate, and a table with no reader would only drift.

### DM-13 Triggers and functions are hand-written SQL

Decision. Drizzle has no declaration for triggers or trigger functions, and I did not check that it expresses every other form the DDL uses (the deferrable unique key, the generated columns inside foreign keys, the `IS TRUE` CHECKs). The migration author writes those parts as custom SQL (`drizzle-kit generate --custom`), and each trigger has a test that runs against a real database. The `schema.ts` files declare the same tables and CHECKs so the types stay in step. Serves AP-8, AP-13, AP-14 and AP-11. Pattern for every later schema (gate G-E25-TRUNCATE): any table guarded by a row-level delete or append-only trigger also gets a `BEFORE TRUNCATE ... FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change()` trigger, because TRUNCATE skips row triggers. Section 4 holds only the `content` ones so far, and the later schemas must add theirs. No ADR, since ADR-015 and ADR-016 name the triggers.

### DM-14 Order lines are snapshots, the total is a snapshot, and end states carry a timestamp

Decision. An order line is written once with its order and holds what the guest saw. It has `product_id`, `sku_code`, a localized `product_name`, `option_values` (size, theme and colour with code and label), an optional thumbnail id, the quantity and the unit price, and a generated `line_total_rappen`. `orders.orders.total_rappen` is stored, and two deferred constraint triggers check at commit that it equals the sum of the lines, so an order with no lines or a wrong total is refused. The total and the lines never change afterwards. The reference `ref` is generated from one identity sequence as `SK-` plus `display_number`. Completed, cancelled and declined each have their own timestamp, and a CHECK ties the timestamp to the status. Serves AP-23 to AP-25. ADR: ADR-023.

Why. Medusa copies the title, the variant title and option values, the SKU and the unit price onto the line, and keeps order totals in a summary (section 9). The prototype and backend.md already say price and policy stay as at order time (PRD 8). The stored total is a price snapshot and is not a balance, so backend.md D5 still holds: payment status and money owed come from the ledger. The status and timestamp CHECKs break if an order may ever reopen (O10), and the owner must change them then. A global sequence reveals order volume, which the pilot accepts and a second merchant would revisit. Alternatives rejected. Reading the live SKU for old orders (a rename or reprice would rewrite history), and a mutable total that application code keeps equal to the lines.

### DM-15 Stock stays keyed by SKU, purchasing policies stay out

Decision. The Medusa study changes no stock table. `inventory.stock_items` stays one row per SKU, with no separate inventory item, no location level and no kit quantity. The SKU gets no `manage_inventory` or `allow_backorder` column. Serves AP-13 to AP-16, AP-23. ADR: ADR-022 (revised).

Why. The PRD sells knives only, from one stock place. The later limited-edition pre-order (Q23) is the natural home of `allow_backorder`, and it cannot coexist with `CHECK (held <= on_hand)`. ADR-022 records the path. The cart is a server table since owner M7 (DM-18), and a cart line does not hold stock.

### DM-16 The handover is modelled in the orders schema: handover, meeting, proposal

Decision. Four tables carry the agreement. `orders.handovers` is the record: partner, pickup point, kind (`one_off` or `repeating`), state, a share code for the group-chat link, the daily rule of a repeating handover, who created it, and when it was agreed. `orders.handover_occurrences` is one dated meeting: the time, the order cut-off `closes_orders_at`, optional group arrival and leaving times, and a state of `scheduled`, `done` or `cancelled`. A one-off handover has exactly one meeting, and a repeating one has at most one a day, by the generated Zurich date. `orders.handover_proposals` is the agree step and the later time changes that need the other side. It has one open proposal per handover and one per meeting, and an answered proposal is never edited. `catalog.pickup_places` and `pickup_place_hours` hold the merchant's list that self-collect orders and handovers share. Handover state moves only along the allowed paths, and the partner and kind of a handover never change. `row_version` on the handover and the meeting lets two editors use `If-Match`. Serves AP-26, AP-27, AP-30 to AP-33. ADR: ADR-024.

Why. The record keeps one partner, one pickup point and one time per meeting, and it says each order points to one meeting. With the tables in the `orders` schema, a composite key can force an order's partner to equal its meeting's partner, and the binding check can lock the meeting row in the order's own transaction. The record leaves the module choice to the builder, so section 8 returns it as a decision. The database cannot tell an earlier move from a later one by actor, so the use case decides which change needs a proposal. A change of place is a new handover. Alternatives rejected. A separate `handovers` module or a `partners` home, which turn the partner key and the binding lock into cross-module rules that depend on the open M3 answer. A `visit` entity of the earlier design, which a hotel desk does not fit.

### DM-17 Binding an order to a meeting, partner-path statuses, cancellation and no-show

Decision. `orders.orders.handover_occurrence_id` binds an order to one meeting, with a composite key `(store_id, handover_occurrence_id, partner_id)`, so the meeting must belong to the order's own partner. A CHECK requires a partner whenever an order is bound, because a NULL partner would skip the key. A deferred constraint trigger checks at commit that the meeting is `scheduled`, its handover is `agreed` and the cut-off is still ahead, and it locks the meeting row, so a merchant who moves the cut-off or cancels the meeting at the same moment is serialized with the order. The same check runs when a partner moves an order to another meeting. An order bound to a meeting has no pickup place or time of its own. A self-collect order has both, and a guest who switches away from a handover sets them. The statuses `on_the_way_to_partner` and `with_partner` exist only on a bound order, and `handed_over` is Delivered and carries `delivered_at`. Commission waits for `completed` (DM-19). A batch receipt (`handover_receipts` and `handover_receipt_items`) lists the orders due. A ticked item moves its order to With partner in the same statement, an unticked one stays on its way, and a second receipt can take a late bag. On a no-show the order leaves the meeting, returns to `ready` at the shop, and keeps its partner, with `returned_at` and `returned_from_occurrence_id` recording where it came from. A cancelled order has a reason. A cash order can never carry the reasons `payment_overdue` or `unpaid_handover_closed`, and `unpaid_handover_closed` needs a bound meeting. A meeting that has orders can still be cancelled, because the record leaves that open. Serves AP-28, AP-29, AP-31, AP-34, AP-35. ADR: ADR-025.

Why. This puts the record's rules where a missed code path cannot skip them. The database proves the partner match, the open meeting, the status shapes, the cash exemption and the receipt effect. It does not prove that an order is unpaid, because payments are a ledger fact in the money module, and the cancel job checks it. The record decides commission at Delivered, and the owner then decided (C1) that commission waits until the order is fully paid, so the trigger point is `completed_at` (DM-19). The two commit-time triggers on the order path (the binding check and the receipt update) are business-rule triggers, which the owner approved with M3. Alternatives rejected. A status-only rule with no key (a stale link could attach a guest to a stranger's group), and a per-order cut-off column (the record's rule is per order, but product preparation hours can be NULL, see assumption 7).

### DM-18 A server cart that can complete into several orders

Decision. `orders.carts` and `orders.cart_lines` hold the checkout cart (owner M7). The cart id lives in a cookie. A cart can be anonymous (`guest_id` NULL) and is linked to a guest once, and the guest, the link time and the attributed partner never change after that. A line holds a SKU id (a plain value), a quantity, the unit price seen at the last check, and a destination, which is either a handover meeting or a pickup place with a time, plus a payment route. The same SKU can sit in two lines only for different destinations or routes. The use case re-checks stock and price at every change and again at completion. A cart line holds no stock. Stock is held only when an order is accepted (ADR-009). A cart completes into one or several orders, one for each destination and payment route. `orders.orders.cart_id` and `cart_split_key` record which orders a cart produced. `UNIQUE (cart_id, cart_split_key)` makes a repeated completion unable to make a second order, and a composite key `(store_id, cart_id, guest_id)` forces the order's guest to equal the cart's guest, so an anonymous cart cannot produce an order. Two commit-time triggers tie the pair together: an order from a cart exists only if the cart ends the transaction `completed`, and a completed cart has at least one order. A completed cart is closed, so its lines cannot be added, changed or deleted, and the cart row is locked in share mode, so a line change and the completion of the same cart are serialized. A job deletes anonymous open carts with no activity for 30 days, and their lines cascade. Serves AP-36 to AP-40. ADR: ADR-026.

Why. Medusa keeps a cart that holds line items and completes into an order (section 9). Our cart differs in two ways. It completes into several orders, because PRD 8.1 splits one cart by pickup time and place and a handover meeting is part of that key. And it does not reserve stock, because the lifecycle holds stock at acceptance (G2). The use case must lock the cart row first, then read its lines, then create the orders. The database stops a line from changing after completion and a second completion from making a second order, and it does not read the lines for the use case. Alternatives rejected. A browser-held cart (the earlier recommendation, replaced by the owner's answer), and holding stock in the cart, which would tie up stock for visitors who never order.

### DM-19 The guest name and e-mail on an order, and commission at completion

Decision. Each order stores `guest_name` and `guest_email` as they were at order time (owner M8). Erasure clears both and sets `guest_erased_at`, and nothing else may change them: a trigger refuses any edit, and a CHECK requires either both present or both cleared. The lawyer's answer on O33 can still change what stays. Commission is recorded only when the order is fully paid (owner C1, PRD AC09). The model therefore uses `completed_at`, which means delivered and fully paid, as the trigger point. A delivered order that is not fully paid stays `handed_over`, and the view `orders.commission_ready` lists only completed orders with a partner. The database proves that a completed order was delivered. That it was paid in full is a ledger fact, and the money use case completes the order. Serves AP-22, AP-29. ADR: ADR-028.

Why. The partner's handover screen shows the guest's name, and a snapshot lets partner queries read `orders` alone. The e-mail snapshot lets staff write to a guest after the profile changes. AC09 says an order delivered but unpaid, or paid but not delivered, is not complete and records no commission. Alternatives rejected. Recording at Delivered whatever the payment, which the owner declined.

### DM-20 Product categories as tables only

Decision. `catalog.product_categories` is a tree per store (localized name, slug, parent, position) and `catalog.product_category_links` links a product to its categories (owner M10). A category cannot be its own parent or its own ancestor, and a trigger checks that on insert and on a change of parent. A category with children or links cannot be deleted. There are no screens in Phase 1. Serves AP-41. No ADR.

Why. The owner wants the tables now so a second product line does not need a schema change. The cycle check does not lock the tree, so two concurrent moves that each look safe could make a loop. That is not tested.

### DM-21 One pin model: no type, an address, weekly hours, dates and a plain link (G11)

Decision. Every pin is a row of `content.places`, and the model has no place type (ADR-029). A pin needs a title in at least one language, a location and a slug to publish (ruling G11-R2). Photo, address, categories, story, link, hours and dates are optional. These are the choices that the record left to the builder, and each is a judgment call that the owner can overturn.

- **Address.** One `address text` column, shared by both languages and optional. A viewpoint or a bench has no address, and directions use the coordinates. It is not required to publish (ruling G11-R2, Q-41 settled), so neither the editor nor the database asks for it.
- **Weekly hours.** One `weekly_hours jsonb` column that holds an array of spans, each `{"day": 1, "opens": "08:00", "closes": "18:00"}`. Day 1 is Monday and day 7 is Sunday. `closes` may be `24:00`, so a pub that closes at midnight needs no second row. A span cannot cross midnight, as with `catalog.pickup_place_hours` (Q-33). A function `content.valid_weekly_hours` checks the shape in a CHECK. `pickup_place_hours` is a table because the orders module reads it to validate pickup times. Pin hours differ. The card only displays them, no query filters or joins on them, and a pin has none to about ten spans. A jsonb column keeps the pin one row and AP-3 one read. Alternative rejected. A `place_hours` child table, which adds a table and a join to every map read for no query that needs it. If a later "open now" filter appears, a generated table or index follows then.
- **Dates.** A table `content.place_dates` with one row per entry. An entry is one day (`first_day = last_day`) with optional `start_time` and `end_time`, or a range of days with no times. Weekly hours apply inside a range. A pin can have several entries and overlaps are not refused. A generated column `ends_at` holds the moment the entry ends in Europe/Zurich: the end time on that day if one is set, otherwise the start of the next day. The date table is a table and not a jsonb array because AP-3 compares `ends_at` with `now()` and the index `place_dates_place_end_idx` serves it, and because CHECKs can hold the shape.
- **After the last date.** The view `content.public_pins` is the one definition of what the public sees. A pin shows when it is published and either has no entries or has an entry with `ends_at > now()`. It carries the earliest such entry as the next date, and an entry that is running now counts as the next date. Nothing changes the pin's status, so no job is needed, the delete guard and the slug are untouched, and a new entry brings a pin back. A hidden pin is never in the view.
- **End after midnight.** An entry requires `end_time > start_time`, so a concert that runs past midnight takes no end time, and the pin stays visible to the end of that day (ruling G11-R6, Q-39 settled). The editor says so beside the end-time field.
- **Link.** `content.place_links` keeps one row per pin, for any pin, with `url` and the optional per-language `url_by_language`. The columns `kind`, `network` and `disclosure` and the `place_type` key are dropped, because the record defers paid links and the label. Columns that nothing writes carry CHECKs that nothing tests, and adding `kind text NOT NULL DEFAULT 'direct'` later is a metadata-only change on PostgreSQL 18. ADR-011's single renderer is unaffected. The drop makes ADR-011's field list outdated, and ADR-011 is amended in this change.
- **Editorial review.** `story_groups.subject_place_id` may name any pin. The `subject_place_type` column, its CHECK and its composite key are dropped.

Serves AP-3, AP-4, AP-44. ADR: ADR-029.

Why. The record found that a place and an event differ only in the dates, so one table carries both and the dates are an optional child table. Alternatives rejected. Two entities (a table and an editor for events). Events under places, which contradicts the owner, because an event has its own location. A job that sets `status = 'hidden'` after the last date, which leaves a stale pin for up to one job interval and mixes the merchant's hide with the clock.

### DM-22 Map categories and blog categories (G11)

Decision. Two tables in the shape of `catalog.product_categories` (DM-20): `content.map_categories` for pins and `content.blog_categories` for stories. Each has a localized `name`, a `slug` that is unique per store, a `position` and an optional `parent_id`. The record allows one level of sub-categories, so a generated pair of columns and a composite foreign key force the parent to be a root, the same device as the replies of `story_comments`. That makes a cycle impossible and needs no trigger, unlike the product tree. `name` needs at least one of `en` and `de`, as `product_categories` does, because AC64 shows a language notice for a missing language. The link tables `content.place_categories` and `content.story_categories` hold `(place_id | group_id, category_id)` and have no position. The story link sits on the story group, so both languages share the categories, as the keepsake links do.

A category with children or links cannot be deleted (G11-R10). The parent key and the category key of each link table are `ON DELETE RESTRICT`, so "delete only when unused" is a constraint. A link row goes with its pin or story (`ON DELETE CASCADE`), and a draft pin can be deleted. A pin with no category is valid and shows only under **All**. Serves AP-3, AP-42 to AP-44. ADR: ADR-030.

Why. The merchant already knows the product category editor, and one shape means one editor component. Two tables and not one with a `kind` column, so a pin can never get a blog category and a foreign key proves it. Alternative rejected. One table with a `kind` column, which needs a trigger or a composite key to keep the two lists apart. A parent category chip also covers the pins tagged only with its children (ruling G11-R5, Q-40 settled): that is a read rule and not a constraint, and the read adds the child ids to each pin's category ids. A name needs at least one of EN and DE (R10, as AC30 for product categories).

### Module ownership cross-check

Each table sits in the schema that `architecture.md` assigns to the module.

| Module (architecture.md) | Schema | Tables in this model |
|---|---|---|
| content | `content` | `media`, `media_refs`, `story_groups`, `story_versions`, `story_group_places`, `story_keepsake_links`, `story_related`, `story_categories`, `places`, `place_dates`, `place_links`, `place_categories`, `map_categories`, `blog_categories`, `tours`, `tour_stops`, `tour_keepsake_links` |
| catalog | `catalog` | `products`, `product_media`, `product_options`, `product_option_values`, `skus`, `sku_option_values`, `product_categories`, `product_category_links`, `pickup_places`, `pickup_place_hours` |
| inventory | `inventory` | `stock_items`, `stock_holds`, `stock_adjustments` |
| reviews | `reviews` | `story_comments`, `product_ratings`, `moderation_events` |
| partners | `partners` | `partners`, `partner_invitations`, `partner_accounts` |
| orders | `orders` | `orders`, `order_lines` (DM-14), `handovers`, `handover_occurrences`, `handover_proposals`, `handover_receipts`, `handover_receipt_items` (DM-16, DM-17), `carts`, `cart_lines` (DM-18) |
| analytics | `analytics` | `events`, `daily_counts`, `daily_funnels` |
| identity | `identity` | No change |
| money, requests, notifications, reporting | | No new table. Section 6 lists the column changes |

Two points differ from the architecture's wording. It lists the guide sign-in link under both `identity` and `partners`, and this model puts it in `partners` (DM-9). It says `catalog` owns "design" as a SKU attribute, and this model names the three lists `sizes`, `themes` and `colours`.

## 4. DDL

The statements below ran top to bottom on an empty scratch database and, separately, on top of migrations 0000 to 0006 (section 7). `platform` already exists, so only its five new functions appear. The DDL is the proposal. It is not a migration file. Since G11 it shows the target model: the `content` and `reviews` parts follow the record of 2026-10-27, and the built `0008_content.sql` still has the earlier shape until the migration of section 6 runs.

```sql
-- Shared helpers (schema platform already exists since migration 0000_platform)
CREATE FUNCTION platform.reject_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on %.% is refused: the table is append-only', TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END $$;

-- The four fixed interest codes (PRD 3.3). A change needs a release, so it is one function to replace.
CREATE FUNCTION platform.valid_interests(codes text[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT codes IS NOT NULL AND codes <@ ARRAY['history-culture','food-drink','lake-mountains','shopping-keepsakes']::text[] $$;

-- A slug map is {en?, de?} with at least one key. Each key present must hold a lower-case slug string.
CREATE FUNCTION platform.valid_slug_map(slugs jsonb) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT jsonb_typeof(slugs) = 'object'
        AND slugs ?| ARRAY['en','de']
        AND (slugs - 'en' - 'de') = '{}'::jsonb
        AND (NOT slugs ? 'en' OR (jsonb_typeof(slugs->'en') = 'string' AND slugs->>'en' ~ '^[a-z0-9]+(-[a-z0-9]+)*$'))
        AND (NOT slugs ? 'de' OR (jsonb_typeof(slugs->'de') = 'string' AND slugs->>'de' ~ '^[a-z0-9]+(-[a-z0-9]+)*$')) $$;

-- A column that another trigger maintains. A direct write runs this trigger at depth 1 and is refused;
-- the maintaining trigger writes at depth 2.
CREATE FUNCTION platform.require_trigger_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'a column of %.% is maintained by a trigger and cannot be written directly', TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;

-- A column that never changes after insert. The column name is the trigger argument.
CREATE FUNCTION platform.reject_column_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'column % of %.% cannot change after insert', TG_ARGV[0], TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END $$;

-- ===================================================================== content
CREATE SCHEMA content;

CREATE TABLE content.media (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  kind            text NOT NULL,
  storage_key     text NOT NULL,
  content_type    text NOT NULL,
  byte_size       bigint NOT NULL,
  sha256          text NOT NULL,
  width           integer,
  height          integer,
  duration_seconds integer,
  alt             jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'processing',
  retired_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_storage_key_key UNIQUE (storage_key),
  CONSTRAINT media_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT media_store_id_kind_key UNIQUE (store_id, id, kind),
  CONSTRAINT media_kind_check CHECK (kind IN ('image', 'audio', 'pdf')),
  CONSTRAINT media_status_check CHECK (status IN ('processing', 'ready', 'retired')),
  CONSTRAINT media_retired_check CHECK ((status = 'retired') = (retired_at IS NOT NULL)),
  CONSTRAINT media_byte_size_check CHECK (byte_size > 0),
  CONSTRAINT media_sha256_check CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT media_dimensions_check CHECK ((width IS NULL) = (height IS NULL) AND (kind = 'image' OR width IS NULL))
);

CREATE TABLE content.story_groups (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id         uuid NOT NULL,
  kind             text NOT NULL,
  subject_place_id uuid,
  stay_tag         text NOT NULL DEFAULT 'both',
  interests        text[] NOT NULL DEFAULT '{}',
  row_version      integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_groups_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT story_groups_kind_check CHECK (kind IN ('story', 'editorial_review')),
  CONSTRAINT story_groups_subject_check CHECK ((kind = 'editorial_review') = (subject_place_id IS NOT NULL)),
  -- G11: an editorial review is about any pin
  CONSTRAINT story_groups_stay_tag_check CHECK (stay_tag IN ('short_stay', 'multi_day', 'both')),
  CONSTRAINT story_groups_interests_check CHECK (platform.valid_interests(interests))
);

-- G11: weekly opening hours of a pin. day 1 is Monday. A span does not cross midnight, and closes may be 24:00.
CREATE FUNCTION content.valid_weekly_hours(h jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(h) = 'array' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(h) e
    WHERE NOT coalesce(
      jsonb_typeof(e) = 'object' AND (e - 'day' - 'opens' - 'closes') = '{}'::jsonb
      AND jsonb_typeof(e->'day') = 'number' AND (e->>'day') ~ '^[1-7]$'
      AND jsonb_typeof(e->'opens') = 'string' AND (e->>'opens') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND jsonb_typeof(e->'closes') = 'string' AND (e->>'closes') ~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
      AND (e->>'opens') < (e->>'closes'), false));
$$;

-- Amended 2026-10-28: a pin has a main photo and optional more photos (a carousel in the pin
-- details sheet). This table keeps the one cover; an ordered table for the extra photos is
-- designed in E4.2 (ADR-029, docs/ux/pins-design.md).
CREATE TABLE content.places (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id            uuid NOT NULL,
  status              text NOT NULL DEFAULT 'draft',
  slug                jsonb,
  latitude            double precision,
  longitude           double precision,
  address             text,
  weekly_hours        jsonb NOT NULL DEFAULT '[]',
  stay_tag            text NOT NULL DEFAULT 'both',
  interests           text[] NOT NULL DEFAULT '{}',
  main_story_group_id uuid,
  cover_media_id      uuid,
  cover_media_kind    text GENERATED ALWAYS AS (CASE WHEN cover_media_id IS NULL THEN NULL ELSE 'image' END) STORED,
  published           jsonb,
  draft               jsonb,
  first_published_at  timestamptz,
  row_version         integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT places_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT places_status_check CHECK (status IN ('draft', 'published', 'hidden')),
  CONSTRAINT places_stay_tag_check CHECK (stay_tag IN ('short_stay', 'multi_day', 'both')),
  CONSTRAINT places_interests_check CHECK (platform.valid_interests(interests)),
  CONSTRAINT places_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT places_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  -- a place is a draft exactly until it is first published; after that it is published or hidden
  CONSTRAINT places_draft_means_unpublished_check CHECK ((status = 'draft') = (first_published_at IS NULL)),
  -- G11: no story is required to publish, and the main story is optional on every pin
  CONSTRAINT places_address_check CHECK (address IS NULL OR (btrim(address) <> '' AND length(address) <= 300)),
  CONSTRAINT places_weekly_hours_check CHECK (content.valid_weekly_hours(weekly_hours)),
  -- IS TRUE matters: a NULL inside a CHECK passes, so a missing key must count as false
  CONSTRAINT places_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND platform.valid_slug_map(slug)
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND jsonb_typeof(published->'name') = 'object'
    AND ((published->'name') ? 'en') = (slug ? 'en')
    AND ((published->'name') ? 'de') = (slug ? 'de')) IS TRUE),
  CONSTRAINT places_slug_shape_check CHECK (slug IS NULL OR platform.valid_slug_map(slug)),
  CONSTRAINT places_main_story_fkey FOREIGN KEY (store_id, main_story_group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT places_cover_media_fkey FOREIGN KEY (store_id, cover_media_id, cover_media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT
);

ALTER TABLE content.story_groups
  ADD CONSTRAINT story_groups_subject_place_fkey FOREIGN KEY (store_id, subject_place_id)
  REFERENCES content.places (store_id, id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE content.story_versions (
  group_id     uuid NOT NULL,
  language     text NOT NULL,
  store_id     uuid NOT NULL,
  status       text NOT NULL DEFAULT 'draft',
  slug         text,
  published    jsonb,
  published_at timestamptz,
  draft        jsonb,
  row_version  integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_versions_pkey PRIMARY KEY (group_id, language),
  CONSTRAINT story_versions_store_group_language_key UNIQUE (store_id, group_id, language),
  -- ADR-002: a slug is unique per language across the platform; NULL until the first publish
  CONSTRAINT story_versions_language_slug_key UNIQUE (language, slug),
  CONSTRAINT story_versions_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT story_versions_language_check CHECK (language IN ('en', 'de')),
  CONSTRAINT story_versions_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT story_versions_slug_check CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- ADR-002: a version exists in a language only when published with its required fields
  CONSTRAINT story_versions_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND published_at IS NOT NULL
    AND jsonb_typeof(published->'title') = 'string' AND jsonb_typeof(published->'sections') = 'array') IS TRUE)
);

CREATE TABLE content.story_group_places (
  group_id uuid NOT NULL,
  place_id uuid NOT NULL,
  store_id uuid NOT NULL,
  position integer NOT NULL,
  CONSTRAINT story_group_places_pkey PRIMARY KEY (group_id, place_id),
  CONSTRAINT story_group_places_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_group_places_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT story_group_places_position_check CHECK (position >= 1)
);

-- Up to 6 keepsakes per story group, in the merchant's order, shared by both languages (owner M1, 2026-10-26).
-- product_id is a catalog id (plain value).
CREATE TABLE content.story_keepsake_links (
  group_id   uuid NOT NULL,
  store_id   uuid NOT NULL,
  position   integer NOT NULL,
  product_id uuid NOT NULL,
  CONSTRAINT story_keepsake_links_pkey PRIMARY KEY (group_id, position),
  CONSTRAINT story_keepsake_links_product_key UNIQUE (group_id, product_id),
  CONSTRAINT story_keepsake_links_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_keepsake_links_position_check CHECK (position BETWEEN 1 AND 6)
);

-- Up to 3 "More to discover" stories per story group, shared by both languages (owner M1). A reader sees a link
-- only when the target has a published version in the reader's own language (view below).
CREATE TABLE content.story_related (
  group_id         uuid NOT NULL,
  store_id         uuid NOT NULL,
  position         integer NOT NULL,
  related_group_id uuid NOT NULL,
  CONSTRAINT story_related_pkey PRIMARY KEY (group_id, position),
  CONSTRAINT story_related_target_key UNIQUE (group_id, related_group_id),
  CONSTRAINT story_related_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_related_target_fkey FOREIGN KEY (store_id, related_group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT story_related_position_check CHECK (position BETWEEN 1 AND 3),
  CONSTRAINT story_related_not_self_check CHECK (related_group_id <> group_id)
);
CREATE VIEW content.story_related_readable AS
  SELECT r.group_id, src.language, r.position, r.related_group_id, tgt.slug AS related_slug
    FROM content.story_related r
    JOIN content.story_versions src ON src.group_id = r.group_id AND src.status = 'published'
    JOIN content.story_versions tgt ON tgt.group_id = r.related_group_id AND tgt.language = src.language AND tgt.status = 'published';

-- ADR-011, G11: one plain outbound link per pin. kind, network and disclosure wait for the first paid link.
CREATE TABLE content.place_links (
  place_id        uuid PRIMARY KEY,
  store_id        uuid NOT NULL,
  url             text NOT NULL,
  url_by_language jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_links_store_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT place_links_url_check CHECK (url ~ '^https://'),
  CONSTRAINT place_links_overrides_check CHECK (jsonb_typeof(url_by_language) = 'object' AND (url_by_language - 'en' - 'de') = '{}'::jsonb
    AND coalesce(url_by_language->>'en', 'https://') ~ '^https://' AND coalesce(url_by_language->>'de', 'https://') ~ '^https://')
);

-- G11: dates of a pin. An entry is one day with optional times, or a range of days with no times.
-- ends_at is when the entry ends in Europe/Zurich: the end time, or the start of the next day. A pin with entries
-- is public only while one of them has not ended (view content.public_pins).
CREATE TABLE content.place_dates (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  place_id   uuid NOT NULL,
  store_id   uuid NOT NULL,
  first_day  date NOT NULL,
  last_day   date NOT NULL,
  start_time time,
  end_time   time,
  ends_at    timestamptz GENERATED ALWAYS AS (((last_day + COALESCE(end_time, TIME '24:00')) AT TIME ZONE 'Europe/Zurich')) STORED,
  CONSTRAINT place_dates_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT place_dates_days_check CHECK (last_day >= first_day),
  CONSTRAINT place_dates_times_check CHECK ((start_time IS NULL AND end_time IS NULL) OR first_day = last_day),
  CONSTRAINT place_dates_end_needs_start_check CHECK (end_time IS NULL OR start_time IS NOT NULL),
  CONSTRAINT place_dates_end_after_start_check CHECK (end_time IS NULL OR end_time > start_time)
);

-- G11: map categories tag pins, blog categories tag stories. One level of parent, in the shape of catalog.product_categories.
-- The generated pair and the composite key force the parent to be a root (the device of story_comments replies).
CREATE TABLE content.map_categories (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  name        jsonb NOT NULL,
  slug        text NOT NULL,
  parent_id   uuid,
  is_child    boolean GENERATED ALWAYS AS (parent_id IS NOT NULL) STORED,
  parent_must_be_root boolean GENERATED ALWAYS AS (CASE WHEN parent_id IS NULL THEN NULL ELSE false END) STORED,
  position    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT map_categories_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT map_categories_level_key UNIQUE (store_id, id, is_child),
  CONSTRAINT map_categories_store_slug_key UNIQUE (store_id, slug),
  CONSTRAINT map_categories_parent_fkey FOREIGN KEY (store_id, parent_id, parent_must_be_root)
    REFERENCES content.map_categories (store_id, id, is_child) ON DELETE RESTRICT,
  CONSTRAINT map_categories_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT map_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT map_categories_not_own_parent_check CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT map_categories_position_check CHECK (position >= 1)
);
CREATE TABLE content.blog_categories (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  name        jsonb NOT NULL,
  slug        text NOT NULL,
  parent_id   uuid,
  is_child    boolean GENERATED ALWAYS AS (parent_id IS NOT NULL) STORED,
  parent_must_be_root boolean GENERATED ALWAYS AS (CASE WHEN parent_id IS NULL THEN NULL ELSE false END) STORED,
  position    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_categories_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT blog_categories_level_key UNIQUE (store_id, id, is_child),
  CONSTRAINT blog_categories_store_slug_key UNIQUE (store_id, slug),
  CONSTRAINT blog_categories_parent_fkey FOREIGN KEY (store_id, parent_id, parent_must_be_root)
    REFERENCES content.blog_categories (store_id, id, is_child) ON DELETE RESTRICT,
  CONSTRAINT blog_categories_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT blog_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blog_categories_not_own_parent_check CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT blog_categories_position_check CHECK (position >= 1)
);
CREATE TABLE content.place_categories (
  place_id    uuid NOT NULL,
  category_id uuid NOT NULL,
  store_id    uuid NOT NULL,
  CONSTRAINT place_categories_pkey PRIMARY KEY (place_id, category_id),
  CONSTRAINT place_categories_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT place_categories_category_fkey FOREIGN KEY (store_id, category_id)
    REFERENCES content.map_categories (store_id, id) ON DELETE RESTRICT
);
CREATE TABLE content.story_categories (
  group_id    uuid NOT NULL,
  category_id uuid NOT NULL,
  store_id    uuid NOT NULL,
  CONSTRAINT story_categories_pkey PRIMARY KEY (group_id, category_id),
  CONSTRAINT story_categories_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_categories_category_fkey FOREIGN KEY (store_id, category_id)
    REFERENCES content.blog_categories (store_id, id) ON DELETE RESTRICT
);

CREATE TABLE content.tours (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  status          text NOT NULL DEFAULT 'draft',
  slug            jsonb,
  stay_tag        text NOT NULL DEFAULT 'both',
  interests       text[] NOT NULL DEFAULT '{}',
  duration_minutes integer,
  cover_media_id  uuid,
  cover_media_kind text GENERATED ALWAYS AS (CASE WHEN cover_media_id IS NULL THEN NULL ELSE 'image' END) STORED,
  pdf_media_id    uuid,
  pdf_media_kind  text GENERATED ALWAYS AS (CASE WHEN pdf_media_id IS NULL THEN NULL ELSE 'pdf' END) STORED,
  published       jsonb,
  draft           jsonb,
  row_version     integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tours_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT tours_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT tours_stay_tag_check CHECK (stay_tag IN ('short_stay', 'multi_day', 'both')),
  CONSTRAINT tours_interests_check CHECK (platform.valid_interests(interests)),
  CONSTRAINT tours_duration_check CHECK (duration_minutes > 0),
  CONSTRAINT tours_slug_shape_check CHECK (slug IS NULL OR platform.valid_slug_map(slug)),
  -- AC51: exactly one PDF, required to publish; one column cannot hold two
  CONSTRAINT tours_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND pdf_media_id IS NOT NULL
    AND jsonb_typeof(published->'title') = 'object'
    AND ((published->'title') ? 'en') = (slug ? 'en')
    AND ((published->'title') ? 'de') = (slug ? 'de')) IS TRUE),
  CONSTRAINT tours_cover_media_fkey FOREIGN KEY (store_id, cover_media_id, cover_media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT,
  CONSTRAINT tours_pdf_media_fkey FOREIGN KEY (store_id, pdf_media_id, pdf_media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT
);

-- A route stop is a value object with its own coordinates. place_id is an optional "read more" link.
CREATE TABLE content.tour_stops (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  tour_id            uuid NOT NULL,
  store_id           uuid NOT NULL,
  position           integer NOT NULL,
  latitude           double precision NOT NULL,
  longitude          double precision NOT NULL,
  content            jsonb NOT NULL,
  minutes_from_start integer,
  media_id           uuid,
  media_kind         text GENERATED ALWAYS AS (CASE WHEN media_id IS NULL THEN NULL ELSE 'image' END) STORED,
  place_id           uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tour_stops_position_key UNIQUE (tour_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT tour_stops_tour_fkey FOREIGN KEY (store_id, tour_id)
    REFERENCES content.tours (store_id, id) ON DELETE CASCADE,
  CONSTRAINT tour_stops_media_fkey FOREIGN KEY (store_id, media_id, media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT,
  CONSTRAINT tour_stops_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT tour_stops_position_check CHECK (position >= 1),
  CONSTRAINT tour_stops_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT tour_stops_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT tour_stops_minutes_check CHECK (minutes_from_start >= 0)
);

-- Up to 3 keepsakes per tour (PRD 7.3 adopts the prototype's cap)
CREATE TABLE content.tour_keepsake_links (
  tour_id    uuid NOT NULL,
  store_id   uuid NOT NULL,
  position   integer NOT NULL,
  product_id uuid NOT NULL,
  CONSTRAINT tour_keepsake_links_pkey PRIMARY KEY (tour_id, position),
  CONSTRAINT tour_keepsake_links_product_key UNIQUE (tour_id, product_id),
  CONSTRAINT tour_keepsake_links_tour_fkey FOREIGN KEY (store_id, tour_id)
    REFERENCES content.tours (store_id, id) ON DELETE CASCADE,
  CONSTRAINT tour_keepsake_links_position_check CHECK (position BETWEEN 1 AND 3)
);

-- Media referenced from inside story, place and tour documents (jsonb cannot hold a foreign key).
CREATE TABLE content.media_refs (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id       uuid NOT NULL,
  media_id       uuid NOT NULL,
  owner_kind     text NOT NULL,
  owner_id       uuid NOT NULL,
  owner_language text,
  slot           text NOT NULL,
  CONSTRAINT media_refs_owner_key UNIQUE NULLS NOT DISTINCT (media_id, owner_kind, owner_id, owner_language, slot),
  CONSTRAINT media_refs_media_fkey FOREIGN KEY (store_id, media_id)
    REFERENCES content.media (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT media_refs_owner_kind_check CHECK (owner_kind IN ('story_version', 'place', 'tour')),
  CONSTRAINT media_refs_slot_check CHECK (slot IN ('draft', 'published')),
  CONSTRAINT media_refs_language_check CHECK ((owner_kind = 'story_version') = (owner_language IS NOT NULL))
);

-- Triggers: invariants that span rows. Row-local parts are CHECKs above.
CREATE FUNCTION content.reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'a published or hidden % cannot be deleted; hide it instead', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END $$;

CREATE TRIGGER places_keep_once_published BEFORE DELETE ON content.places
  FOR EACH ROW WHEN (OLD.first_published_at IS NOT NULL) EXECUTE FUNCTION content.reject_delete();
CREATE TRIGGER story_versions_keep_once_published BEFORE DELETE ON content.story_versions
  FOR EACH ROW WHEN (OLD.published IS NOT NULL) EXECUTE FUNCTION content.reject_delete();
-- AC79: delete is refused while published is set, so the text is kept once set. Unpublish means status = 'draft'; the document stays.
CREATE TRIGGER story_versions_published_is_kept BEFORE UPDATE OF published ON content.story_versions
  FOR EACH ROW WHEN (OLD.published IS NOT NULL AND NEW.published IS NULL) EXECUTE FUNCTION platform.reject_column_change('published');

-- AC79: first_published_at is what holds a place against deletion, so it is fixed once set.
-- Without this, a published place could be put back to draft with the column cleared, then deleted.
CREATE TRIGGER places_first_published_is_fixed BEFORE UPDATE OF first_published_at ON content.places
  FOR EACH ROW WHEN (OLD.first_published_at IS NOT NULL AND NEW.first_published_at IS DISTINCT FROM OLD.first_published_at) EXECUTE FUNCTION platform.reject_column_change('first_published_at');
-- AC79: TRUNCATE skips row triggers, so the delete guards would not hold. Refuse it on the tables they protect.
CREATE TRIGGER places_no_truncate BEFORE TRUNCATE ON content.places
  FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change();
CREATE TRIGGER story_versions_no_truncate BEFORE TRUNCATE ON content.story_versions
  FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change();
CREATE TRIGGER media_refs_no_truncate BEFORE TRUNCATE ON content.media_refs
  FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change();

-- A media row cannot be retired while a column or a document still uses it. A save that adds a reference at the
-- same moment can still slip past, which the grace period of ADR-004 covers.
CREATE FUNCTION content.reject_retire_if_used() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM content.media_refs r WHERE r.media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.places p WHERE p.cover_media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.tours t WHERE t.cover_media_id = NEW.id OR t.pdf_media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.tour_stops s WHERE s.media_id = NEW.id) THEN
    RAISE EXCEPTION 'media % is still used and cannot be retired', NEW.id USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER media_not_retired_while_used BEFORE UPDATE OF status ON content.media
  FOR EACH ROW WHEN (NEW.status = 'retired' AND OLD.status <> 'retired') EXECUTE FUNCTION content.reject_retire_if_used();

-- Pin card (AP-4): main story first, then every other story that mentions the pin or reviews it.
-- A story that is both the main story and listed on the pin appears once, at rank 0. The read keeps only groups
-- that have a published version in the reader's language (G11: a main story may have none).
CREATE VIEW content.place_story_links AS
  SELECT u.place_id, u.group_id, min(u.rank) AS rank FROM (
    SELECT p.id AS place_id, p.main_story_group_id AS group_id, 0 AS rank
      FROM content.places p WHERE p.main_story_group_id IS NOT NULL
    UNION
    SELECT g.place_id, g.group_id, 1 FROM content.story_group_places g
    UNION
    SELECT s.subject_place_id, s.id, 1 FROM content.story_groups s WHERE s.subject_place_id IS NOT NULL
  ) u GROUP BY u.place_id, u.group_id;

-- G11, AP-3: what the public sees. The rule "hidden after the last date" lives here once. Nothing changes a pin's status.
CREATE VIEW content.public_pins AS
  SELECT p.id, p.store_id, p.slug, p.latitude, p.longitude, p.address, p.weekly_hours, p.published,
         p.cover_media_id, p.main_story_group_id, p.stay_tag, p.interests,
         n.first_day AS next_first_day, n.last_day AS next_last_day, n.start_time AS next_start_time, n.end_time AS next_end_time
    FROM content.places p
    LEFT JOIN LATERAL (
      SELECT d.first_day, d.last_day, d.start_time, d.end_time FROM content.place_dates d
       WHERE d.place_id = p.id AND d.ends_at > now()
       ORDER BY d.first_day, d.start_time NULLS FIRST LIMIT 1) n ON true
   WHERE p.status = 'published'
     AND (n.first_day IS NOT NULL OR NOT EXISTS (SELECT 1 FROM content.place_dates d WHERE d.place_id = p.id));

-- ===================================================================== catalog (Victorinox SKUs only)
CREATE SCHEMA catalog;

CREATE TABLE catalog.products (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id          uuid NOT NULL,
  status            text NOT NULL DEFAULT 'draft',
  slug              jsonb,
  published         jsonb,
  draft             jsonb,
  preparation_hours integer,  -- NULL means every order waits for a manual accept (ADR-009, O22)
  commission_rate   numeric(5,4) NOT NULL DEFAULT 0,
  row_version       integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT products_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT products_slug_shape_check CHECK (slug IS NULL OR platform.valid_slug_map(slug)),
  CONSTRAINT products_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND jsonb_typeof(published->'name') = 'object'
    AND ((published->'name') ? 'en') = (slug ? 'en')
    AND ((published->'name') ? 'de') = (slug ? 'de')) IS TRUE),
  CONSTRAINT products_preparation_check CHECK (preparation_hours > 0),
  CONSTRAINT products_commission_check CHECK (commission_rate BETWEEN 0 AND 1)
);

-- Generic options (owner M9, Medusa-style). A product has options such as Size, Theme and Colour, each with values.
-- A SKU takes exactly one value of each option of its product. A product may have no options and then one SKU.
CREATE TABLE catalog.product_options (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  product_id  uuid NOT NULL,
  name        jsonb NOT NULL,
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_options_product_id_key UNIQUE (product_id, id),
  CONSTRAINT product_options_position_key UNIQUE (product_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT product_options_product_fkey FOREIGN KEY (store_id, product_id)
    REFERENCES catalog.products (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_options_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT product_options_position_check CHECK (position >= 1)
);
CREATE TABLE catalog.product_option_values (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  product_id  uuid NOT NULL,
  option_id   uuid NOT NULL,
  label       jsonb NOT NULL,
  swatch      text,
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_option_values_link_key UNIQUE (product_id, option_id, id),
  CONSTRAINT product_option_values_position_key UNIQUE (option_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT product_option_values_option_fkey FOREIGN KEY (product_id, option_id)
    REFERENCES catalog.product_options (product_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_option_values_store_fkey FOREIGN KEY (store_id, product_id)
    REFERENCES catalog.products (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_option_values_label_check CHECK (jsonb_typeof(label) = 'object' AND label ?| ARRAY['en', 'de']),
  CONSTRAINT product_option_values_swatch_check CHECK (swatch IS NULL OR swatch ~ '^#[0-9a-f]{6}$'),
  CONSTRAINT product_option_values_position_check CHECK (position >= 1)
);

-- A SKU row exists only for a combination that is sold. Prices are integer Rappen (backend.md section 5).
-- combination_key is computed from the SKU's option values by sync_sku_combination at commit.
CREATE TABLE catalog.skus (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  sku_code        text NOT NULL,
  product_id      uuid NOT NULL,
  combination_key text,
  price_rappen    bigint NOT NULL,
  status          text NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skus_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT skus_product_id_key UNIQUE (product_id, id),
  CONSTRAINT skus_store_sku_code_key UNIQUE (store_id, sku_code),
  CONSTRAINT skus_sku_code_check CHECK (sku_code ~ '^[A-Za-z0-9]+([-_.][A-Za-z0-9]+)*$'),
  -- one SKU per combination of option values in a product (a product with no options has one SKU)
  CONSTRAINT skus_combination_key UNIQUE (product_id, combination_key),
  CONSTRAINT skus_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT skus_price_check CHECK (price_rappen > 0),
  CONSTRAINT skus_product_fkey FOREIGN KEY (store_id, product_id) REFERENCES catalog.products (store_id, id) ON DELETE RESTRICT
);
CREATE TABLE catalog.sku_option_values (
  sku_id     uuid NOT NULL,
  option_id  uuid NOT NULL,
  value_id   uuid NOT NULL,
  product_id uuid NOT NULL,
  store_id   uuid NOT NULL,
  -- one value of each option, never two
  CONSTRAINT sku_option_values_pkey PRIMARY KEY (sku_id, option_id),
  CONSTRAINT sku_option_values_sku_fkey FOREIGN KEY (product_id, sku_id)
    REFERENCES catalog.skus (product_id, id) ON DELETE CASCADE,
  -- the value belongs to that option, and the option to the SKU's own product
  CONSTRAINT sku_option_values_value_fkey FOREIGN KEY (product_id, option_id, value_id)
    REFERENCES catalog.product_option_values (product_id, option_id, id) ON DELETE RESTRICT
);

-- At commit a SKU must have exactly one value for every option of its product, and its combination key is stored.
-- The product row is locked, so a new option and a new SKU cannot both slip past the count.
CREATE FUNCTION catalog.sync_sku_combination(p_sku uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  pid  uuid;
  need integer;
  have integer;
  ckey text;
BEGIN
  SELECT s.product_id INTO pid FROM catalog.skus s WHERE s.id = p_sku;
  IF pid IS NULL THEN RETURN; END IF;
  PERFORM 1 FROM catalog.products p WHERE p.id = pid FOR SHARE;
  SELECT count(*) INTO need FROM catalog.product_options o WHERE o.product_id = pid;
  SELECT count(*), coalesce(string_agg(v.option_id::text || ':' || v.value_id::text, ',' ORDER BY v.option_id), '')
    INTO have, ckey FROM catalog.sku_option_values v WHERE v.sku_id = p_sku;
  IF have <> need THEN
    RAISE EXCEPTION 'sku % has % option values, its product has % options', p_sku, have, need
      USING ERRCODE = 'check_violation', CONSTRAINT = 'skus_complete_options';
  END IF;
  UPDATE catalog.skus SET combination_key = ckey WHERE id = p_sku AND combination_key IS DISTINCT FROM ckey;
END $$;
CREATE FUNCTION catalog.sku_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'skus' THEN PERFORM catalog.sync_sku_combination(NEW.id);
  ELSIF TG_OP = 'DELETE' THEN PERFORM catalog.sync_sku_combination(OLD.sku_id);
  ELSE PERFORM catalog.sync_sku_combination(NEW.sku_id);
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER skus_options_complete AFTER INSERT ON catalog.skus
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.sku_trigger();
CREATE CONSTRAINT TRIGGER sku_option_values_complete AFTER INSERT OR UPDATE OR DELETE ON catalog.sku_option_values
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.sku_trigger();
-- Adding or removing an option of a product that has SKUs rechecks every SKU of that product.
CREATE FUNCTION catalog.product_option_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid; sid uuid;
BEGIN
  pid := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;
  PERFORM 1 FROM catalog.products p WHERE p.id = pid FOR UPDATE;
  FOR sid IN SELECT s.id FROM catalog.skus s WHERE s.product_id = pid LOOP
    PERFORM catalog.sync_sku_combination(sid);
  END LOOP;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER product_options_recheck_skus AFTER INSERT OR DELETE ON catalog.product_options
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.product_option_trigger();

-- Categories (owner M10): a tree per store, tables only in Phase 1.
CREATE TABLE catalog.product_categories (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  name        jsonb NOT NULL,
  slug        text NOT NULL,
  parent_id   uuid,
  position    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_categories_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT product_categories_store_slug_key UNIQUE (store_id, slug),
  CONSTRAINT product_categories_parent_fkey FOREIGN KEY (store_id, parent_id)
    REFERENCES catalog.product_categories (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_categories_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT product_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT product_categories_not_own_parent_check CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT product_categories_position_check CHECK (position >= 1)
);
CREATE FUNCTION catalog.assert_category_tree() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND EXISTS (
       WITH RECURSIVE up AS (
         SELECT c.id, c.parent_id FROM catalog.product_categories c WHERE c.id = NEW.parent_id
         UNION ALL
         SELECT c.id, c.parent_id FROM catalog.product_categories c JOIN up ON c.id = up.parent_id)
       SELECT 1 FROM up WHERE up.id = NEW.id) THEN
    RAISE EXCEPTION 'category % would become its own ancestor', NEW.id USING ERRCODE = 'check_violation', CONSTRAINT = 'product_categories_no_cycle';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_categories_no_cycle BEFORE INSERT OR UPDATE OF parent_id ON catalog.product_categories
  FOR EACH ROW EXECUTE FUNCTION catalog.assert_category_tree();
CREATE TABLE catalog.product_category_links (
  product_id  uuid NOT NULL,
  category_id uuid NOT NULL,
  store_id    uuid NOT NULL,
  position    integer NOT NULL DEFAULT 1,
  CONSTRAINT product_category_links_pkey PRIMARY KEY (product_id, category_id),
  CONSTRAINT product_category_links_product_fkey FOREIGN KEY (store_id, product_id)
    REFERENCES catalog.products (store_id, id) ON DELETE CASCADE,
  CONSTRAINT product_category_links_category_fkey FOREIGN KEY (store_id, category_id)
    REFERENCES catalog.product_categories (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_category_links_position_check CHECK (position >= 1)
);

CREATE TABLE catalog.product_media (
  product_id uuid NOT NULL, store_id uuid NOT NULL, position integer NOT NULL, media_id uuid NOT NULL,
  CONSTRAINT product_media_pkey PRIMARY KEY (product_id, position),
  CONSTRAINT product_media_product_fkey FOREIGN KEY (store_id, product_id) REFERENCES catalog.products (store_id, id) ON DELETE CASCADE,
  CONSTRAINT product_media_position_check CHECK (position >= 1)
);

-- Pickup points (the PickupPlace of the prototype, screen M12). Self-collect orders and handovers use the same list.
-- Hours are local Europe/Zurich times of day. A span that crosses midnight is two rows.
CREATE TABLE catalog.pickup_places (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id     uuid NOT NULL,
  name         jsonb NOT NULL,
  address      jsonb NOT NULL,
  instructions jsonb,
  position     integer NOT NULL DEFAULT 1,
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pickup_places_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT pickup_places_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT pickup_places_address_check CHECK (jsonb_typeof(address) = 'object' AND address ?| ARRAY['en', 'de'])
);
CREATE TABLE catalog.pickup_place_hours (
  place_id uuid NOT NULL,
  store_id uuid NOT NULL,
  weekday  smallint NOT NULL,
  opens    time NOT NULL,
  closes   time NOT NULL,
  CONSTRAINT pickup_place_hours_pkey PRIMARY KEY (place_id, weekday, opens),
  CONSTRAINT pickup_place_hours_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES catalog.pickup_places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT pickup_place_hours_weekday_check CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT pickup_place_hours_span_check CHECK (opens < closes)
);

-- ===================================================================== inventory
CREATE SCHEMA inventory;

CREATE TABLE inventory.stock_items (
  sku_id      uuid PRIMARY KEY,
  store_id    uuid NOT NULL,
  on_hand     integer NOT NULL DEFAULT 0,
  held        integer NOT NULL DEFAULT 0,
  row_version integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_items_store_sku_key UNIQUE (store_id, sku_id),
  CONSTRAINT stock_items_on_hand_check CHECK (on_hand >= 0),
  CONSTRAINT stock_items_held_check CHECK (held >= 0),
  -- AC05: available stock (on_hand - held) is never negative, whatever the application does
  CONSTRAINT stock_items_held_within_on_hand CHECK (held <= on_hand)
);

CREATE TABLE inventory.stock_holds (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id      uuid NOT NULL,
  sku_id        uuid NOT NULL,
  order_id      uuid NOT NULL,
  order_line_id uuid NOT NULL,
  quantity      integer NOT NULL,
  state         text NOT NULL DEFAULT 'held',
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_holds_order_line_key UNIQUE (order_line_id),
  CONSTRAINT stock_holds_quantity_check CHECK (quantity > 0),
  CONSTRAINT stock_holds_state_check CHECK (state IN ('held', 'issued', 'released')),
  CONSTRAINT stock_holds_resolved_check CHECK ((state = 'held') = (resolved_at IS NULL)),
  CONSTRAINT stock_holds_item_fkey FOREIGN KEY (store_id, sku_id)
    REFERENCES inventory.stock_items (store_id, sku_id) ON DELETE RESTRICT
);

CREATE TABLE inventory.stock_adjustments (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  sku_id          uuid NOT NULL,
  kind            text NOT NULL,
  delta           integer NOT NULL,
  on_hand_before  integer NOT NULL,
  on_hand_after   integer NOT NULL,
  reason          text,
  actor_user_id   uuid,
  order_id        uuid,
  at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_adjustments_kind_check CHECK (kind IN ('set', 'issue')),
  CONSTRAINT stock_adjustments_arithmetic_check CHECK (on_hand_after = on_hand_before + delta AND on_hand_after >= 0),
  CONSTRAINT stock_adjustments_who_check CHECK ((kind = 'set' AND actor_user_id IS NOT NULL) OR (kind = 'issue' AND order_id IS NOT NULL)),
  CONSTRAINT stock_adjustments_item_fkey FOREIGN KEY (store_id, sku_id)
    REFERENCES inventory.stock_items (store_id, sku_id) ON DELETE RESTRICT
);
CREATE TRIGGER stock_adjustments_append_only BEFORE UPDATE OR DELETE ON inventory.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();
CREATE TRIGGER stock_holds_never_deleted BEFORE DELETE ON inventory.stock_holds
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();

-- The hold rows are the source of truth. This trigger keeps stock_items.held and on_hand in step,
-- so the CHECK above is the oversell guard. The row update takes the stock row lock; callers insert
-- the lines of one order in sku_id order to avoid deadlocks.
CREATE FUNCTION inventory.apply_hold_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE before_on_hand integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'held' THEN
      RAISE EXCEPTION 'a hold starts as held' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE inventory.stock_items SET held = held + NEW.quantity, updated_at = now() WHERE sku_id = NEW.sku_id;
  ELSE
    IF OLD.state <> 'held' OR NEW.sku_id <> OLD.sku_id OR NEW.quantity <> OLD.quantity THEN
      RAISE EXCEPTION 'a resolved hold, its sku and its quantity cannot change' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.state = 'released' THEN
      UPDATE inventory.stock_items SET held = held - OLD.quantity, updated_at = now() WHERE sku_id = OLD.sku_id;
    ELSIF NEW.state = 'issued' THEN
      UPDATE inventory.stock_items SET held = held - OLD.quantity, on_hand = on_hand - OLD.quantity, updated_at = now()
        WHERE sku_id = OLD.sku_id RETURNING on_hand + OLD.quantity INTO before_on_hand;
      INSERT INTO inventory.stock_adjustments (store_id, sku_id, kind, delta, on_hand_before, on_hand_after, order_id)
        VALUES (OLD.store_id, OLD.sku_id, 'issue', -OLD.quantity, before_on_hand, before_on_hand - OLD.quantity, OLD.order_id);
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER stock_holds_apply AFTER INSERT OR UPDATE ON inventory.stock_holds
  FOR EACH ROW EXECUTE FUNCTION inventory.apply_hold_change();

CREATE TRIGGER stock_items_held_by_trigger_only BEFORE UPDATE OF held ON inventory.stock_items
  FOR EACH ROW WHEN (OLD.held IS DISTINCT FROM NEW.held) EXECUTE FUNCTION platform.require_trigger_context();

-- ===================================================================== reviews
CREATE SCHEMA reviews;

CREATE TABLE reviews.story_comments (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  story_group_id  uuid NOT NULL,
  parent_id       uuid,
  is_reply        boolean GENERATED ALWAYS AS (parent_id IS NOT NULL) STORED,
  parent_must_be_root boolean GENERATED ALWAYS AS (CASE WHEN parent_id IS NULL THEN NULL ELSE false END) STORED,
  author_kind     text NOT NULL,
  author_guest_id uuid,
  staff_user_id   uuid,
  author_name     text NOT NULL,
  body            text NOT NULL,
  state           text NOT NULL DEFAULT 'visible',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_comments_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT story_comments_reply_shape_key UNIQUE (id, story_group_id, is_reply),
  -- one level of replies, and a reply stays under a comment of the same story
  CONSTRAINT story_comments_parent_fkey FOREIGN KEY (parent_id, story_group_id, parent_must_be_root)
    REFERENCES reviews.story_comments (id, story_group_id, is_reply),
  CONSTRAINT story_comments_author_check CHECK (
    (author_kind = 'guest' AND author_guest_id IS NOT NULL AND staff_user_id IS NULL)
    OR (author_kind = 'staff' AND staff_user_id IS NOT NULL AND author_guest_id IS NULL)),
  CONSTRAINT story_comments_body_check CHECK (btrim(body) <> '' AND length(body) <= 4000),
  CONSTRAINT story_comments_name_check CHECK (btrim(author_name) <> ''),
  CONSTRAINT story_comments_state_check CHECK (state IN ('visible', 'hidden'))
);

CREATE TABLE reviews.product_ratings (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  product_id      uuid NOT NULL,
  order_id        uuid NOT NULL,
  author_guest_id uuid NOT NULL,
  author_name     text NOT NULL,
  rating          smallint NOT NULL,
  body            text,
  state           text NOT NULL DEFAULT 'visible',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_ratings_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT product_ratings_one_per_order_key UNIQUE (author_guest_id, order_id, product_id),
  CONSTRAINT product_ratings_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT product_ratings_body_check CHECK (body IS NULL OR length(body) <= 4000),
  CONSTRAINT product_ratings_name_check CHECK (btrim(author_name) <> ''),
  CONSTRAINT product_ratings_state_check CHECK (state IN ('visible', 'hidden'))
);

CREATE TABLE reviews.moderation_events (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id          uuid NOT NULL,
  story_comment_id  uuid,
  product_rating_id uuid,
  action            text NOT NULL,
  actor_user_id     uuid NOT NULL,
  reason            text,
  at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT moderation_events_one_target_check CHECK (num_nonnulls(story_comment_id, product_rating_id) = 1),
  CONSTRAINT moderation_events_action_check CHECK (action IN ('hide', 'unhide')),
  CONSTRAINT moderation_events_story_comment_fkey FOREIGN KEY (store_id, story_comment_id)
    REFERENCES reviews.story_comments (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT moderation_events_product_rating_fkey FOREIGN KEY (store_id, product_rating_id)
    REFERENCES reviews.product_ratings (store_id, id) ON DELETE RESTRICT
);
CREATE TRIGGER moderation_events_append_only BEFORE UPDATE OR DELETE ON reviews.moderation_events
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();
-- Nobody deletes a comment or rating through the database either (AC47, AC69).
CREATE TRIGGER story_comments_never_deleted BEFORE DELETE ON reviews.story_comments
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();
CREATE TRIGGER product_ratings_never_deleted BEFORE DELETE ON reviews.product_ratings
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();

-- A hide or unhide event sets the target's state first, which locks the target row, and only then stamps the
-- time. Two events on one review therefore carry times in the order in which they changed the state.
CREATE FUNCTION reviews.apply_moderation_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_state text := CASE NEW.action WHEN 'hide' THEN 'hidden' ELSE 'visible' END;
BEGIN
  IF NEW.story_comment_id IS NOT NULL THEN
    UPDATE reviews.story_comments SET state = target_state, updated_at = now() WHERE id = NEW.story_comment_id;
  ELSE
    UPDATE reviews.product_ratings SET state = target_state, updated_at = now() WHERE id = NEW.product_rating_id;
  END IF;
  NEW.at := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER moderation_events_apply BEFORE INSERT ON reviews.moderation_events
  FOR EACH ROW EXECUTE FUNCTION reviews.apply_moderation_event();
CREATE TRIGGER story_comments_state_by_trigger_only BEFORE UPDATE OF state ON reviews.story_comments
  FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state) EXECUTE FUNCTION platform.require_trigger_context();
CREATE TRIGGER product_ratings_state_by_trigger_only BEFORE UPDATE OF state ON reviews.product_ratings
  FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state) EXECUTE FUNCTION platform.require_trigger_context();

-- ===================================================================== partners (changes for guide accounts)
CREATE SCHEMA partners;

CREATE TABLE partners.partners (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id             uuid NOT NULL,
  kind                 text NOT NULL,
  name                 text NOT NULL,
  code                 text NOT NULL,
  email                text NOT NULL,
  report_token_hash    text,
  report_token_version integer NOT NULL DEFAULT 1,
  archived_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partners_code_key UNIQUE (code),
  CONSTRAINT partners_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT partners_kind_check CHECK (kind IN ('guide', 'hotel', 'other')),
  CONSTRAINT partners_name_check CHECK (btrim(name) <> ''),
  CONSTRAINT partners_email_check CHECK (email = lower(btrim(email)) AND email <> ''),
  CONSTRAINT partners_code_check CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE partners.partner_invitations (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  partner_id  uuid NOT NULL,
  email       text NOT NULL,
  token_hash  text,
  expires_at  timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at  timestamptz,
  invited_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_invitations_token_hash_key UNIQUE (token_hash),
  CONSTRAINT partner_invitations_link_key UNIQUE (id, store_id, partner_id),
  CONSTRAINT partner_invitations_partner_fkey FOREIGN KEY (store_id, partner_id)
    REFERENCES partners.partners (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT partner_invitations_email_check CHECK (email = lower(btrim(email)) AND email <> ''),
  CONSTRAINT partner_invitations_outcome_check CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);
CREATE UNIQUE INDEX partner_invitations_one_open_idx ON partners.partner_invitations (partner_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- The only place a user id is tied to a partner. A row needs an invitation for the same partner, so a
-- self sign-up cannot become a partner. user_id is a plain value (no foreign key to Better Auth).
CREATE TABLE partners.partner_accounts (
  partner_id    uuid PRIMARY KEY,
  store_id      uuid NOT NULL,
  user_id       uuid NOT NULL,
  invitation_id uuid NOT NULL,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_accounts_invitation_key UNIQUE (invitation_id),
  CONSTRAINT partner_accounts_user_store_key UNIQUE (user_id, store_id),
  CONSTRAINT partner_accounts_invitation_fkey FOREIGN KEY (invitation_id, store_id, partner_id)
    REFERENCES partners.partner_invitations (id, store_id, partner_id) ON DELETE RESTRICT
);

-- An account needs an invitation that is accepted, not revoked and not expired at the moment of insert.
CREATE FUNCTION partners.assert_invitation_accepted() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners.partner_invitations i
                  WHERE i.id = NEW.invitation_id AND i.accepted_at IS NOT NULL AND i.revoked_at IS NULL
                    AND i.accepted_at <= i.expires_at) THEN
    RAISE EXCEPTION 'invitation % is not an accepted, open invitation', NEW.invitation_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'partner_accounts_invitation_accepted';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER partner_accounts_invitation_accepted BEFORE INSERT ON partners.partner_accounts
  FOR EACH ROW EXECUTE FUNCTION partners.assert_invitation_accepted();

-- An account is not edited or deleted. Access ends through revoked_at.
CREATE TRIGGER partner_accounts_never_deleted BEFORE DELETE ON partners.partner_accounts
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();
CREATE TRIGGER partner_accounts_user_is_fixed BEFORE UPDATE OF user_id ON partners.partner_accounts
  FOR EACH ROW WHEN (OLD.user_id IS DISTINCT FROM NEW.user_id) EXECUTE FUNCTION platform.reject_column_change('user_id');
-- An accepted invitation stays accepted, so an account never loses the invitation that backs it.
CREATE TRIGGER partner_invitations_acceptance_is_fixed BEFORE UPDATE OF accepted_at ON partners.partner_invitations
  FOR EACH ROW WHEN (OLD.accepted_at IS NOT NULL AND OLD.accepted_at IS DISTINCT FROM NEW.accepted_at)
  EXECUTE FUNCTION platform.reject_column_change('accepted_at');

-- ===================================================================== orders (orders, handovers, receipts)
CREATE SCHEMA orders;

-- A handover is the agreement that a partner meets the merchant's staff at a pickup point (decision record
-- 2026-10-26, gate G6). pickup_place_id and partner_id are plain ids of other modules (ADR-013).
CREATE TABLE orders.handovers (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id         uuid NOT NULL,
  partner_id       uuid NOT NULL,
  pickup_place_id  uuid NOT NULL,
  kind             text NOT NULL,
  state            text NOT NULL DEFAULT 'proposed',
  share_code       text NOT NULL,
  local_time       time,
  rule_starts_on   date,
  rule_ends_on     date,
  created_by_kind  text NOT NULL,
  created_by_user  uuid NOT NULL,
  agreed_at        timestamptz,
  row_version      integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handovers_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT handovers_link_key UNIQUE (store_id, id, partner_id, kind),
  CONSTRAINT handovers_share_code_key UNIQUE (share_code),
  CONSTRAINT handovers_share_code_check CHECK (share_code ~ '^[a-z0-9]{8,12}$'),
  CONSTRAINT handovers_kind_check CHECK (kind IN ('one_off', 'repeating')),
  CONSTRAINT handovers_state_check CHECK (
    (kind = 'one_off' AND state IN ('proposed', 'agreed', 'done', 'cancelled'))
    OR (kind = 'repeating' AND state IN ('proposed', 'agreed', 'paused', 'ended', 'cancelled'))),
  CONSTRAINT handovers_created_by_check CHECK (created_by_kind IN ('partner', 'merchant')),
  -- the agree step: a proposal has no agreement time, every agreed state has one
  CONSTRAINT handovers_agreed_check CHECK (
    (state = 'proposed' AND agreed_at IS NULL)
    OR state = 'cancelled'
    OR (state IN ('agreed', 'done', 'paused', 'ended') AND agreed_at IS NOT NULL)),
  -- a one-off handover has its time on its single occurrence. A repeating one has a daily rule.
  CONSTRAINT handovers_rule_check CHECK (
    (kind = 'one_off' AND local_time IS NULL AND rule_starts_on IS NULL AND rule_ends_on IS NULL)
    OR (kind = 'repeating'
        AND (state NOT IN ('agreed', 'paused', 'ended') OR (local_time IS NOT NULL AND rule_starts_on IS NOT NULL))
        AND (rule_ends_on IS NULL OR rule_starts_on IS NULL OR rule_ends_on >= rule_starts_on)))
);

-- One row per dated meeting. A one-off handover has exactly one. A repeating handover has one per day
-- that the use case creates ahead of time (the generation horizon is an assumption, DM-16).
CREATE TABLE orders.handover_occurrences (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id         uuid NOT NULL,
  handover_id      uuid NOT NULL,
  partner_id       uuid NOT NULL,
  handover_kind    text NOT NULL,
  occurs_at        timestamptz NOT NULL,
  occurrence_date  date GENERATED ALWAYS AS ((occurs_at AT TIME ZONE 'Europe/Zurich')::date) STORED,
  closes_orders_at timestamptz NOT NULL,
  group_arrival_at timestamptz,
  group_leaving_at timestamptz,
  state            text NOT NULL DEFAULT 'scheduled',
  done_at          timestamptz,
  cancelled_at     timestamptz,
  row_version      integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handover_occurrences_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT handover_occurrences_partner_key UNIQUE (store_id, id, partner_id),
  CONSTRAINT handover_occurrences_handover_key UNIQUE (id, handover_id),
  CONSTRAINT handover_occurrences_day_key UNIQUE (handover_id, occurrence_date),
  CONSTRAINT handover_occurrences_handover_fkey FOREIGN KEY (store_id, handover_id, partner_id, handover_kind)
    REFERENCES orders.handovers (store_id, id, partner_id, kind) ON DELETE RESTRICT,
  CONSTRAINT handover_occurrences_state_check CHECK (state IN ('scheduled', 'done', 'cancelled')),
  CONSTRAINT handover_occurrences_state_time_check CHECK (
    (state = 'done') = (done_at IS NOT NULL) AND (state = 'cancelled') = (cancelled_at IS NOT NULL)),
  CONSTRAINT handover_occurrences_cutoff_check CHECK (closes_orders_at <= occurs_at),
  CONSTRAINT handover_occurrences_group_times_check CHECK (group_arrival_at IS NULL OR group_leaving_at IS NULL OR group_arrival_at <= group_leaving_at)
);
-- A one-off handover has exactly one occurrence.
CREATE UNIQUE INDEX handover_occurrences_one_off_idx ON orders.handover_occurrences (handover_id) WHERE handover_kind = 'one_off';

-- The agree step and every later time change that needs the other side. A partner moving later, and a merchant
-- moving a time, are direct updates with an audit_log row. The database cannot tell earlier from later by actor,
-- so the use case decides which change needs a proposal.
CREATE TABLE orders.handover_proposals (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id          uuid NOT NULL,
  handover_id       uuid NOT NULL,
  occurrence_id     uuid,
  proposed_by_kind  text NOT NULL,
  proposed_by_user  uuid NOT NULL,
  starts_at         timestamptz,
  local_time        time,
  group_arrival_at  timestamptz,
  group_leaving_at  timestamptz,
  status            text NOT NULL DEFAULT 'open',
  responded_at      timestamptz,
  responded_by_user uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handover_proposals_handover_fkey FOREIGN KEY (store_id, handover_id)
    REFERENCES orders.handovers (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT handover_proposals_occurrence_fkey FOREIGN KEY (occurrence_id, handover_id)
    REFERENCES orders.handover_occurrences (id, handover_id) ON DELETE RESTRICT,
  CONSTRAINT handover_proposals_by_check CHECK (proposed_by_kind IN ('partner', 'merchant')),
  CONSTRAINT handover_proposals_status_check CHECK (status IN ('open', 'accepted', 'countered', 'withdrawn', 'expired')),
  CONSTRAINT handover_proposals_responded_check CHECK ((status = 'open') = (responded_at IS NULL)),
  -- a proposal is a point in time, or a daily time for a repeating rule, and never both
  CONSTRAINT handover_proposals_what_check CHECK (num_nonnulls(starts_at, local_time) = 1),
  CONSTRAINT handover_proposals_one_day_check CHECK (occurrence_id IS NULL OR starts_at IS NOT NULL),
  CONSTRAINT handover_proposals_group_times_check CHECK (group_arrival_at IS NULL OR group_leaving_at IS NULL OR group_arrival_at <= group_leaving_at)
);
-- A job sets 'expired' when the merchant has not answered by the meeting time minus preparation time (PRD AC77).
-- One open proposal per handover, and one per occurrence, so two writers cannot both be waiting on each other.
CREATE UNIQUE INDEX handover_proposals_one_open_per_handover_idx ON orders.handover_proposals (handover_id)
  WHERE status = 'open' AND occurrence_id IS NULL;
CREATE UNIQUE INDEX handover_proposals_one_open_per_occurrence_idx ON orders.handover_proposals (occurrence_id)
  WHERE status = 'open' AND occurrence_id IS NOT NULL;

CREATE FUNCTION orders.assert_handover_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (
    (NEW.state = OLD.state)
    OR (OLD.state = 'proposed' AND NEW.state IN ('agreed', 'cancelled'))
    OR (NEW.kind = 'one_off' AND OLD.state = 'agreed' AND NEW.state IN ('done', 'cancelled'))
    OR (NEW.kind = 'repeating' AND OLD.state = 'agreed' AND NEW.state IN ('paused', 'ended', 'cancelled'))
    OR (NEW.kind = 'repeating' AND OLD.state = 'paused' AND NEW.state IN ('agreed', 'ended', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'handover % cannot go from % to %', OLD.id, OLD.state, NEW.state USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER handovers_state_transition BEFORE UPDATE OF state ON orders.handovers
  FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state) EXECUTE FUNCTION orders.assert_handover_transition();
CREATE TRIGGER handovers_partner_is_fixed BEFORE UPDATE OF partner_id, kind ON orders.handovers
  FOR EACH ROW WHEN (OLD.partner_id IS DISTINCT FROM NEW.partner_id OR OLD.kind IS DISTINCT FROM NEW.kind)
  EXECUTE FUNCTION platform.reject_column_change('partner_id or kind');

-- An open proposal is answered once. A reader of a second answer sees the first, because the row lock makes the
-- second writer wait and then fail this check.
CREATE FUNCTION orders.assert_proposal_open() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'proposal % was already answered as %', OLD.id, OLD.status USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.starts_at, NEW.local_time, NEW.proposed_by_kind, NEW.handover_id, NEW.occurrence_id)
     IS DISTINCT FROM (OLD.starts_at, OLD.local_time, OLD.proposed_by_kind, OLD.handover_id, OLD.occurrence_id) THEN
    RAISE EXCEPTION 'a proposal cannot be edited, answer it or make a new one' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER handover_proposals_answer_once BEFORE UPDATE ON orders.handover_proposals
  FOR EACH ROW EXECUTE FUNCTION orders.assert_proposal_open();
CREATE TRIGGER handover_proposals_never_deleted BEFORE DELETE ON orders.handover_proposals
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();

-- The checkout cart (owner M7, Medusa-style). The cart id lives in a cookie. An anonymous cart has no guest and
-- can be linked to a guest once. One cart completes into one or several orders, split by the destination of its
-- lines. A cart line holds no stock: stock is held only when an order is accepted (ADR-009). Stock and price are
-- re-checked by the use case at every change and again at completion.
CREATE TABLE orders.carts (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id         uuid NOT NULL,
  guest_id         uuid,
  linked_at        timestamptz,
  partner_id       uuid,
  language         text NOT NULL,
  status           text NOT NULL DEFAULT 'open',
  completed_at     timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  row_version      integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carts_store_id_id_key UNIQUE (store_id, id),
  -- an order made from a cart carries the cart's own guest, and the key cannot match an anonymous cart
  CONSTRAINT carts_guest_key UNIQUE (store_id, id, guest_id),
  CONSTRAINT carts_language_check CHECK (language IN ('en', 'de')),
  CONSTRAINT carts_status_check CHECK (status IN ('open', 'completed')),
  CONSTRAINT carts_linked_check CHECK ((guest_id IS NULL) = (linked_at IS NULL)),
  CONSTRAINT carts_completed_check CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CONSTRAINT carts_completed_needs_guest_check CHECK (status <> 'completed' OR guest_id IS NOT NULL)
);
CREATE TRIGGER carts_guest_is_set_once BEFORE UPDATE OF guest_id ON orders.carts
  FOR EACH ROW WHEN (OLD.guest_id IS NOT NULL AND OLD.guest_id IS DISTINCT FROM NEW.guest_id)
  EXECUTE FUNCTION platform.reject_column_change('guest_id');
CREATE TRIGGER carts_partner_is_set_once BEFORE UPDATE OF partner_id ON orders.carts
  FOR EACH ROW WHEN (OLD.partner_id IS NOT NULL AND OLD.partner_id IS DISTINCT FROM NEW.partner_id)
  EXECUTE FUNCTION platform.reject_column_change('partner_id');

CREATE TABLE orders.cart_lines (
  id                     uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id               uuid NOT NULL,
  cart_id                uuid NOT NULL,
  sku_id                 uuid NOT NULL,
  quantity               integer NOT NULL,
  unit_price_rappen      bigint NOT NULL,
  handover_occurrence_id uuid,
  pickup_place_id        uuid,
  pickup_at              timestamptz,
  payment_route          text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  -- the same SKU can sit in two lines only when the destination or the payment route differs
  CONSTRAINT cart_lines_destination_key UNIQUE NULLS NOT DISTINCT
    (cart_id, sku_id, handover_occurrence_id, pickup_place_id, pickup_at, payment_route),
  CONSTRAINT cart_lines_cart_fkey FOREIGN KEY (store_id, cart_id) REFERENCES orders.carts (store_id, id) ON DELETE CASCADE,
  CONSTRAINT cart_lines_occurrence_fkey FOREIGN KEY (store_id, handover_occurrence_id)
    REFERENCES orders.handover_occurrences (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT cart_lines_quantity_check CHECK (quantity > 0),
  CONSTRAINT cart_lines_price_check CHECK (unit_price_rappen > 0),
  CONSTRAINT cart_lines_payment_route_check CHECK (payment_route IN ('online', 'partner_cash')),
  -- a line has no destination yet, or a handover meeting, or a pickup place and time
  CONSTRAINT cart_lines_destination_check CHECK (
    (handover_occurrence_id IS NULL AND pickup_place_id IS NULL AND pickup_at IS NULL)
    OR (handover_occurrence_id IS NOT NULL AND pickup_place_id IS NULL AND pickup_at IS NULL)
    OR (handover_occurrence_id IS NULL AND pickup_place_id IS NOT NULL AND pickup_at IS NOT NULL))
);
-- A completed cart is closed. The cart row is locked in share mode, so a line change and the completion of the
-- same cart are serialized.
CREATE FUNCTION orders.assert_cart_open() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cart_status text; target uuid;
BEGIN
  target := CASE WHEN TG_OP = 'DELETE' THEN OLD.cart_id ELSE NEW.cart_id END;
  SELECT c.status INTO cart_status FROM orders.carts c WHERE c.id = target FOR SHARE;
  IF cart_status = 'completed' THEN
    RAISE EXCEPTION 'cart % is completed and its lines cannot change', target USING ERRCODE = 'check_violation', CONSTRAINT = 'cart_lines_cart_open';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER cart_lines_cart_open BEFORE INSERT OR UPDATE OR DELETE ON orders.cart_lines
  FOR EACH ROW EXECUTE FUNCTION orders.assert_cart_open();

CREATE TABLE orders.orders (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id             uuid NOT NULL,
  -- The guest-facing reference comes from one sequence (Medusa's display id). The number reveals order volume,
  -- which is acceptable in the pilot and worth revisiting when a second merchant joins.
  display_number       bigint GENERATED ALWAYS AS IDENTITY,
  ref                  text GENERATED ALWAYS AS ('SK-' || display_number) STORED,
  guest_id             uuid NOT NULL,
  -- Name and e-mail of the guest at order time (owner M8). Erasure clears both and sets guest_erased_at.
  -- The lawyer's answer on O33 can still change what stays.
  guest_name           text,
  guest_email          text,
  guest_erased_at      timestamptz,
  cart_id              uuid,
  cart_split_key       text,
  language             text NOT NULL,
  status               text NOT NULL DEFAULT 'requested',
  payment_route        text NOT NULL DEFAULT 'online',
  -- The partner is fixed when the guest orders and stays through a move, a guest self-collect and a no-show return.
  partner_id           uuid,
  -- The handover meeting this order is bound to. NULL means the guest collects at a pickup point.
  handover_occurrence_id uuid,
  returned_from_occurrence_id uuid,
  returned_at          timestamptz,
  pickup_place_id      uuid,
  pickup_at            timestamptz,
  -- A price snapshot at order time, not a balance. Balances still come from the ledger (backend.md D5).
  total_rappen         bigint NOT NULL,
  accepted_mode        text,
  accepted_at          timestamptz,
  first_payment_due_at timestamptz,
  delivered_at         timestamptz,
  completed_at         timestamptz,
  completed_by         uuid,
  cancelled_at         timestamptz,
  cancelled_reason     text,
  declined_at          timestamptz,
  row_version          integer NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_store_ref_key UNIQUE (store_id, ref),
  CONSTRAINT orders_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT orders_language_check CHECK (language IN ('en', 'de')),
  CONSTRAINT orders_status_check CHECK (status IN ('requested', 'accepted', 'preparing', 'ready', 'on_the_way_to_partner', 'with_partner', 'handed_over', 'completed', 'declined', 'cancelled')),
  CONSTRAINT orders_payment_route_check CHECK (payment_route IN ('online', 'partner_cash')),
  CONSTRAINT orders_total_check CHECK (total_rappen > 0),
  CONSTRAINT orders_guest_snapshot_check CHECK ((
      (guest_erased_at IS NULL AND guest_name IS NOT NULL AND btrim(guest_name) <> ''
        AND guest_email IS NOT NULL AND guest_email = lower(btrim(guest_email)) AND guest_email ~ '^[^@[:space:]]+@[^@[:space:]]+$')
      OR (guest_erased_at IS NOT NULL AND guest_name IS NULL AND guest_email IS NULL)) IS TRUE),
  -- the orders of one cart are told apart by their split key, so completing twice cannot make a second order
  CONSTRAINT orders_cart_split_key CHECK ((cart_id IS NULL) = (cart_split_key IS NULL)),
  CONSTRAINT orders_cart_split_unique UNIQUE (cart_id, cart_split_key),
  CONSTRAINT orders_cart_fkey FOREIGN KEY (store_id, cart_id, guest_id) REFERENCES orders.carts (store_id, id, guest_id) ON DELETE RESTRICT,
  CONSTRAINT orders_accepted_mode_check CHECK (accepted_mode IN ('auto', 'manual')),
  CONSTRAINT orders_accepted_pair_check CHECK ((accepted_mode IS NULL) = (accepted_at IS NULL)),
  CONSTRAINT orders_accepted_status_check CHECK (status NOT IN ('accepted', 'preparing', 'ready', 'on_the_way_to_partner', 'with_partner', 'handed_over', 'completed') OR accepted_at IS NOT NULL),
  -- Each end state has its timestamp, and only that state has it. These break if an order may ever reopen (O10).
  CONSTRAINT orders_completed_check CHECK ((status = 'completed') = (completed_at IS NOT NULL) AND (completed_by IS NULL OR completed_at IS NOT NULL)),
  CONSTRAINT orders_declined_check CHECK ((status = 'declined') = (declined_at IS NOT NULL)),
  CONSTRAINT orders_cancelled_check CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL) AND (status = 'cancelled') = (cancelled_reason IS NOT NULL)),
  CONSTRAINT orders_cancelled_reason_check CHECK (cancelled_reason IN ('guest', 'merchant', 'payment_overdue', 'unpaid_handover_closed')),
  -- A cash order is never cancelled for non-payment. An unpaid online order is cancelled at the close of its handover.
  -- That the order is unpaid is a ledger fact, and the cancel job checks it.
  CONSTRAINT orders_cash_never_unpaid_cancelled_check CHECK (
    cancelled_reason IS NULL OR cancelled_reason NOT IN ('payment_overdue', 'unpaid_handover_closed') OR payment_route = 'online'),
  CONSTRAINT orders_handover_close_reason_check CHECK (cancelled_reason IS DISTINCT FROM 'unpaid_handover_closed' OR handover_occurrence_id IS NOT NULL),
  -- Delivered (handed_over) is not the commission moment. Commission is recorded when the order completes, which
  -- means delivered and fully paid (PRD AC09, owner C1). Only a delivered order has the timestamp.
  CONSTRAINT orders_delivered_check CHECK ((status IN ('handed_over', 'completed')) = (delivered_at IS NOT NULL)),
  -- AC65: a guide-cash order has a partner as its source and never a payment deadline
  CONSTRAINT orders_partner_cash_check CHECK (payment_route = 'online' OR (partner_id IS NOT NULL AND first_payment_due_at IS NULL)),
  -- The partner-path states exist only while the order is bound to a handover.
  CONSTRAINT orders_partner_path_status_check CHECK (status NOT IN ('on_the_way_to_partner', 'with_partner') OR handover_occurrence_id IS NOT NULL),
  -- A NULL partner would skip the key below (MATCH SIMPLE), so a bound order must name its partner.
  CONSTRAINT orders_handover_needs_partner_check CHECK (handover_occurrence_id IS NULL OR partner_id IS NOT NULL),
  CONSTRAINT orders_return_needs_partner_check CHECK (returned_from_occurrence_id IS NULL OR partner_id IS NOT NULL),
  -- Place and time of a partner-path order come from the handover. A guest who collects names a place and a time.
  -- A no-show order is back at the shop and may wait for the merchant and the guest to agree the time.
  CONSTRAINT orders_pickup_shape_check CHECK (
    (handover_occurrence_id IS NOT NULL AND pickup_place_id IS NULL AND pickup_at IS NULL)
    OR (handover_occurrence_id IS NULL AND (returned_at IS NOT NULL OR (pickup_place_id IS NOT NULL AND pickup_at IS NOT NULL)))),
  CONSTRAINT orders_return_check CHECK ((returned_at IS NULL) = (returned_from_occurrence_id IS NULL) AND (returned_at IS NULL OR handover_occurrence_id IS NULL)),
  -- The occurrence must belong to the order's own partner (and store). The key is skipped when the id is NULL.
  CONSTRAINT orders_handover_fkey FOREIGN KEY (store_id, handover_occurrence_id, partner_id)
    REFERENCES orders.handover_occurrences (store_id, id, partner_id) ON DELETE RESTRICT,
  CONSTRAINT orders_returned_from_fkey FOREIGN KEY (store_id, returned_from_occurrence_id, partner_id)
    REFERENCES orders.handover_occurrences (store_id, id, partner_id) ON DELETE RESTRICT
);

-- AC58: a guide sees only orders whose source is the guide, so the source never changes after the order exists.
-- The same holds for the guest and for the price snapshot.
CREATE TRIGGER orders_partner_is_fixed BEFORE UPDATE OF partner_id ON orders.orders
  FOR EACH ROW WHEN (OLD.partner_id IS DISTINCT FROM NEW.partner_id) EXECUTE FUNCTION platform.reject_column_change('partner_id');
CREATE TRIGGER orders_guest_is_fixed BEFORE UPDATE OF guest_id ON orders.orders
  FOR EACH ROW WHEN (OLD.guest_id IS DISTINCT FROM NEW.guest_id) EXECUTE FUNCTION platform.reject_column_change('guest_id');
CREATE TRIGGER orders_total_is_fixed BEFORE UPDATE OF total_rappen ON orders.orders
  FOR EACH ROW WHEN (OLD.total_rappen IS DISTINCT FROM NEW.total_rappen) EXECUTE FUNCTION platform.reject_column_change('total_rappen');

-- The snapshot is written once. Erasure may clear it, and nothing else may change it.
CREATE FUNCTION orders.assert_guest_snapshot_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (OLD.guest_erased_at IS NULL AND NEW.guest_erased_at IS NOT NULL AND NEW.guest_name IS NULL AND NEW.guest_email IS NULL) THEN
    RAISE EXCEPTION 'the guest snapshot of order % can only be erased, not edited', OLD.id USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_guest_snapshot_erase_only BEFORE UPDATE OF guest_name, guest_email, guest_erased_at ON orders.orders
  FOR EACH ROW WHEN (OLD.guest_name IS DISTINCT FROM NEW.guest_name OR OLD.guest_email IS DISTINCT FROM NEW.guest_email
                     OR OLD.guest_erased_at IS DISTINCT FROM NEW.guest_erased_at)
  EXECUTE FUNCTION orders.assert_guest_snapshot_change();

-- An order from a cart exists only if the cart ends the transaction completed, and a completed cart has an order.
CREATE FUNCTION orders.assert_cart_completed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF NOT EXISTS (SELECT 1 FROM orders.carts c WHERE c.id = NEW.cart_id AND c.status = 'completed') THEN
      RAISE EXCEPTION 'order % comes from cart %, which is not completed', NEW.id, NEW.cart_id
        USING ERRCODE = 'check_violation', CONSTRAINT = 'orders_cart_completed';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM orders.orders o WHERE o.cart_id = NEW.id) THEN
    RAISE EXCEPTION 'cart % is completed and has produced no order', NEW.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'carts_have_orders';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER orders_cart_completed AFTER INSERT ON orders.orders
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.cart_id IS NOT NULL) EXECUTE FUNCTION orders.assert_cart_completed();
CREATE CONSTRAINT TRIGGER carts_have_orders AFTER UPDATE OF status ON orders.carts
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.status = 'completed') EXECUTE FUNCTION orders.assert_cart_completed();

-- Binding an order to a meeting, at order time or when the partner moves it. At commit the occurrence must be
-- scheduled, its handover agreed, and its order cut-off still ahead. The check locks the occurrence row, so a
-- merchant who moves the cut-off or cancels the meeting at the same moment is serialized with the order.
-- It uses the wall clock and not the transaction start, because the lock wait can be long.
CREATE FUNCTION orders.assert_handover_open() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM orders.handover_occurrences o WHERE o.id = NEW.handover_occurrence_id FOR SHARE;
  IF NOT EXISTS (SELECT 1 FROM orders.handover_occurrences o JOIN orders.handovers h ON h.id = o.handover_id
                  WHERE o.id = NEW.handover_occurrence_id AND o.state = 'scheduled' AND h.state = 'agreed'
                    AND clock_timestamp() < o.closes_orders_at) THEN
    RAISE EXCEPTION 'order % cannot be bound to handover meeting %: it is not open for orders', NEW.id, NEW.handover_occurrence_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'orders_handover_open';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER orders_handover_open_on_insert AFTER INSERT ON orders.orders
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.handover_occurrence_id IS NOT NULL)
  EXECUTE FUNCTION orders.assert_handover_open();
CREATE CONSTRAINT TRIGGER orders_handover_open_on_move AFTER UPDATE OF handover_occurrence_id ON orders.orders
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (NEW.handover_occurrence_id IS NOT NULL AND OLD.handover_occurrence_id IS DISTINCT FROM NEW.handover_occurrence_id)
  EXECUTE FUNCTION orders.assert_handover_open();

-- A line is a snapshot of what the guest saw (the pattern of Medusa's line item). It is written once, with its order.
-- Phase 1 has no item edit, so a change is a new order. A later edit needs versioned lines.
CREATE TABLE orders.order_lines (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id            uuid NOT NULL,
  order_id            uuid NOT NULL,
  sku_id              uuid NOT NULL,
  product_id          uuid NOT NULL,
  sku_code            text NOT NULL,
  product_name        jsonb NOT NULL,
  option_values       jsonb NOT NULL,
  thumbnail_media_id  uuid,
  quantity            integer NOT NULL,
  unit_price_rappen   bigint NOT NULL,
  line_total_rappen   bigint GENERATED ALWAYS AS (quantity * unit_price_rappen) STORED,
  commission_rate     numeric(5,4) NOT NULL DEFAULT 0,
  basis_components    jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_lines_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT order_lines_order_fkey FOREIGN KEY (store_id, order_id) REFERENCES orders.orders (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT order_lines_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_lines_price_check CHECK (unit_price_rappen > 0),
  CONSTRAINT order_lines_commission_check CHECK (commission_rate BETWEEN 0 AND 1),
  CONSTRAINT order_lines_product_name_check CHECK (jsonb_typeof(product_name) = 'object' AND product_name ?| ARRAY['en', 'de']),
  -- the options and values the guest chose, as a list of {option, value} text pairs, empty for a product with no options
  CONSTRAINT order_lines_option_values_check CHECK (jsonb_typeof(option_values) = 'array')
);
CREATE TRIGGER order_lines_write_once BEFORE UPDATE OR DELETE ON orders.order_lines
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();

-- The stored total equals the sum of the lines. Both tables check it at commit, so an order and its lines
-- are written in one transaction, and an order without lines is refused.
CREATE FUNCTION orders.assert_total_matches_lines() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target  uuid;
  matches boolean;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN target := NEW.id; ELSE target := NEW.order_id; END IF;
  SELECT o.total_rappen = coalesce((SELECT sum(l.line_total_rappen) FROM orders.order_lines l WHERE l.order_id = o.id), 0)
    INTO matches FROM orders.orders o WHERE o.id = target;
  IF NOT coalesce(matches, false) THEN
    RAISE EXCEPTION 'order % total does not equal the sum of its lines', target
      USING ERRCODE = 'check_violation', CONSTRAINT = 'orders_total_matches_lines';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER orders_total_matches_lines AFTER INSERT ON orders.orders
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orders.assert_total_matches_lines();
CREATE CONSTRAINT TRIGGER order_lines_total_matches_order AFTER INSERT ON orders.order_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orders.assert_total_matches_lines();

-- The partner's batch receipt: one checklist per receipt, with a row for each order due. Ticked orders move to
-- With partner. Unticked orders stay On the way to partner and the merchant is alerted by a job.
CREATE TABLE orders.handover_receipts (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id          uuid NOT NULL,
  occurrence_id     uuid NOT NULL,
  partner_id        uuid NOT NULL,
  received_by_user  uuid NOT NULL,
  received_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handover_receipts_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT handover_receipts_occurrence_fkey FOREIGN KEY (store_id, occurrence_id, partner_id)
    REFERENCES orders.handover_occurrences (store_id, id, partner_id) ON DELETE RESTRICT
);
-- The item keys to the order alone. A no-show order was received, and it may later leave the meeting.
CREATE TABLE orders.handover_receipt_items (
  receipt_id uuid NOT NULL,
  order_id   uuid NOT NULL,
  store_id   uuid NOT NULL,
  received   boolean NOT NULL,
  CONSTRAINT handover_receipt_items_pkey PRIMARY KEY (receipt_id, order_id),
  CONSTRAINT handover_receipt_items_receipt_fkey FOREIGN KEY (store_id, receipt_id)
    REFERENCES orders.handover_receipts (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT handover_receipt_items_order_fkey FOREIGN KEY (store_id, order_id)
    REFERENCES orders.orders (store_id, id) ON DELETE RESTRICT
);
CREATE TRIGGER handover_receipts_append_only BEFORE UPDATE OR DELETE ON orders.handover_receipts
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();
CREATE TRIGGER handover_receipt_items_append_only BEFORE UPDATE OR DELETE ON orders.handover_receipt_items
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();

-- An item is valid only for an order that is bound to the receipt's meeting and on its way to the partner.
-- A ticked item moves the order to With partner in the same statement, so the checklist and the status agree.
CREATE FUNCTION orders.apply_receipt_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_occurrence uuid;
BEGIN
  SELECT r.occurrence_id INTO target_occurrence FROM orders.handover_receipts r WHERE r.id = NEW.receipt_id;
  IF NEW.received THEN
    UPDATE orders.orders SET status = 'with_partner', updated_at = now()
      WHERE id = NEW.order_id AND handover_occurrence_id = target_occurrence AND status = 'on_the_way_to_partner';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'order % is not on its way to the partner at this meeting', NEW.order_id USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM orders.orders o WHERE o.id = NEW.order_id AND o.handover_occurrence_id = target_occurrence
                     AND o.status = 'on_the_way_to_partner') THEN
    RAISE EXCEPTION 'order % is not on its way to the partner at this meeting', NEW.order_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER handover_receipt_items_apply BEFORE INSERT ON orders.handover_receipt_items
  FOR EACH ROW EXECUTE FUNCTION orders.apply_receipt_item();

-- Orders whose commission can be recorded: completed, so delivered and fully paid (owner C1), with a partner.
-- Money reads this and writes the commission entry once per line (AC10).
CREATE VIEW orders.commission_ready AS
  SELECT o.id AS order_id, o.store_id, o.partner_id, o.completed_at
    FROM orders.orders o WHERE o.status = 'completed' AND o.partner_id IS NOT NULL;

-- "Received 5 of 6" for the partner's screen and the merchant's alert.
CREATE VIEW orders.handover_receipt_counts AS
  SELECT r.id AS receipt_id, r.occurrence_id,
         count(*) FILTER (WHERE i.received) AS received_count, count(*) AS listed_count
    FROM orders.handover_receipts r JOIN orders.handover_receipt_items i ON i.receipt_id = r.id
   GROUP BY r.id, r.occurrence_id;

-- ===================================================================== analytics
CREATE SCHEMA analytics;

-- No account, order, partner, referral or visitor id; no IP, user agent, URL or path; time to the hour.
-- An order leaves no row here. record_order_submit() below counts it per day (gates D2 and G4, owner M5).
CREATE TABLE analytics.events (
  session_id     uuid NOT NULL,
  seq            smallint NOT NULL,
  bucket_hour    timestamptz NOT NULL,
  name           text NOT NULL,
  page_type      text,
  content_id     uuid,
  language       text NOT NULL,
  referrer_class text NOT NULL,
  segment        text,
  interests      text[] NOT NULL DEFAULT '{}',
  device_class   text NOT NULL,
  -- (session_id, seq) drops a retried batch and orders a session. There is no surrogate id, so insert order tells nothing.
  CONSTRAINT events_pkey PRIMARY KEY (session_id, seq),
  CONSTRAINT events_bucket_check CHECK (bucket_hour = date_trunc('hour', bucket_hour)),
  CONSTRAINT events_seq_check CHECK (seq >= 0),
  CONSTRAINT events_name_check CHECK (name IN ('page_view', 'pin_open', 'pin_to_story_click', 'story_view', 'product_view', 'outbound_click')),
  CONSTRAINT events_page_type_check CHECK (page_type IN ('home', 'stories', 'story', 'place', 'map', 'tours', 'tour', 'keepsakes', 'keepsake', 'other')),
  CONSTRAINT events_language_check CHECK (language IN ('en', 'de')),
  CONSTRAINT events_referrer_check CHECK (referrer_class IN ('search', 'partner', 'social', 'direct', 'other')),
  CONSTRAINT events_segment_check CHECK (segment IN ('short_stay', 'multi_day')),
  CONSTRAINT events_interests_check CHECK (platform.valid_interests(interests)),
  CONSTRAINT events_device_check CHECK (device_class IN ('phone', 'tablet', 'desktop', 'other')),
  -- which events carry which content (AC60). A product view names its product (owner M5, 2026-10-26).
  CONSTRAINT events_shape_check CHECK ((CASE name
    WHEN 'page_view'          THEN page_type IS NOT NULL AND (content_id IS NULL OR page_type IN ('story', 'place', 'tour', 'keepsake'))
    WHEN 'pin_open'           THEN page_type = 'place' AND content_id IS NOT NULL
    WHEN 'pin_to_story_click' THEN page_type = 'place' AND content_id IS NOT NULL
    WHEN 'outbound_click'     THEN page_type = 'place' AND content_id IS NOT NULL
    WHEN 'story_view'         THEN page_type = 'story' AND content_id IS NOT NULL
    WHEN 'product_view'       THEN page_type = 'keepsake' AND content_id IS NOT NULL
    END) IS TRUE)
);

CREATE TABLE analytics.daily_counts (
  day            date NOT NULL,
  name           text NOT NULL,
  page_type      text,
  content_id     uuid,
  language       text NOT NULL,
  referrer_class text NOT NULL,
  segment        text,
  device_class   text NOT NULL,
  events         bigint NOT NULL,
  sessions       bigint NOT NULL,
  CONSTRAINT daily_counts_key UNIQUE NULLS NOT DISTINCT (day, name, page_type, content_id, language, referrer_class, segment, device_class),
  CONSTRAINT daily_counts_name_check CHECK (name IN ('page_view', 'pin_open', 'pin_to_story_click', 'story_view', 'product_view', 'outbound_click')),
  CONSTRAINT daily_counts_totals_check CHECK (events >= sessions AND sessions >= 0)
);

-- SM-3. The roll-up job fills story_sessions and product_sessions from the raw events. record_order_submit()
-- fills the two order counters. All four are counts per day, referrer class and segment. No row says which
-- session or which order.
CREATE TABLE analytics.daily_funnels (
  day              date NOT NULL,
  referrer_class   text NOT NULL,
  segment          text,
  story_sessions   bigint NOT NULL DEFAULT 0,
  product_sessions bigint NOT NULL DEFAULT 0,
  order_submits    bigint NOT NULL DEFAULT 0,
  order_sessions   bigint NOT NULL DEFAULT 0,
  CONSTRAINT daily_funnels_key UNIQUE NULLS NOT DISTINCT (day, referrer_class, segment),
  CONSTRAINT daily_funnels_counts_check CHECK (story_sessions >= product_sessions AND product_sessions >= 0
    AND order_submits >= order_sessions AND order_sessions >= 0)
);

-- Count one order_submit. order_sessions counts a submit whose session read a story and then opened a product.
-- The session's own events give the referrer class and segment. The function stores nothing about the order.
CREATE FUNCTION analytics.record_order_submit(p_session uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  r_referrer text;
  r_segment  text;
  in_chain   integer;
  today      date := (now() AT TIME ZONE 'Europe/Zurich')::date;
BEGIN
  SELECT e.referrer_class, e.segment INTO r_referrer, r_segment
    FROM analytics.events e WHERE e.session_id = p_session ORDER BY e.seq LIMIT 1;
  IF r_referrer IS NULL THEN r_referrer := 'direct'; END IF;
  SELECT CASE WHEN EXISTS (
           SELECT 1 FROM analytics.events s JOIN analytics.events p ON p.session_id = s.session_id AND p.seq > s.seq
            WHERE s.session_id = p_session AND s.name = 'story_view' AND p.name = 'product_view')
         THEN 1 ELSE 0 END INTO in_chain;
  INSERT INTO analytics.daily_funnels AS f (day, referrer_class, segment, order_submits, order_sessions)
    VALUES (today, r_referrer, r_segment, 1, in_chain)
    ON CONFLICT (day, referrer_class, segment)
    DO UPDATE SET order_submits = f.order_submits + 1, order_sessions = f.order_sessions + in_chain;
END $$;

-- ===================================================================== indexes (see section 5)
CREATE INDEX media_refs_owner_idx ON content.media_refs (owner_kind, owner_id);
CREATE INDEX media_refs_media_fkey_idx ON content.media_refs (store_id, media_id);
CREATE UNIQUE INDEX places_slug_en_key ON content.places ((slug->>'en')) WHERE slug ? 'en';
CREATE UNIQUE INDEX places_slug_de_key ON content.places ((slug->>'de')) WHERE slug ? 'de';
CREATE INDEX places_main_story_idx ON content.places (store_id, main_story_group_id) WHERE main_story_group_id IS NOT NULL;
CREATE INDEX places_cover_media_idx ON content.places (store_id, cover_media_id) WHERE cover_media_id IS NOT NULL;
CREATE INDEX place_dates_place_end_idx ON content.place_dates (place_id, ends_at);
CREATE INDEX place_dates_store_place_idx ON content.place_dates (store_id, place_id);
CREATE INDEX map_categories_parent_idx ON content.map_categories (store_id, parent_id, position);
CREATE INDEX blog_categories_parent_idx ON content.blog_categories (store_id, parent_id, position);
CREATE INDEX place_categories_category_idx ON content.place_categories (store_id, category_id);
CREATE INDEX story_categories_category_idx ON content.story_categories (store_id, category_id);
CREATE INDEX story_groups_subject_idx ON content.story_groups (store_id, subject_place_id) WHERE subject_place_id IS NOT NULL;
CREATE INDEX story_versions_published_idx ON content.story_versions (language, published_at DESC) WHERE status = 'published';
CREATE INDEX story_group_places_place_idx ON content.story_group_places (store_id, place_id);
CREATE INDEX story_related_target_idx ON content.story_related (store_id, related_group_id);
CREATE UNIQUE INDEX tours_slug_en_key ON content.tours ((slug->>'en')) WHERE slug ? 'en';
CREATE UNIQUE INDEX tours_slug_de_key ON content.tours ((slug->>'de')) WHERE slug ? 'de';
CREATE INDEX tours_pdf_media_idx ON content.tours (store_id, pdf_media_id) WHERE pdf_media_id IS NOT NULL;
CREATE INDEX tours_cover_media_idx ON content.tours (store_id, cover_media_id) WHERE cover_media_id IS NOT NULL;
CREATE INDEX tour_stops_media_idx ON content.tour_stops (store_id, media_id) WHERE media_id IS NOT NULL;
CREATE INDEX tour_stops_place_idx ON content.tour_stops (store_id, place_id) WHERE place_id IS NOT NULL;
CREATE UNIQUE INDEX products_slug_en_key ON catalog.products ((slug->>'en')) WHERE slug ? 'en';
CREATE UNIQUE INDEX products_slug_de_key ON catalog.products ((slug->>'de')) WHERE slug ? 'de';
CREATE INDEX product_option_values_option_idx ON catalog.product_option_values (store_id, product_id);
CREATE INDEX sku_option_values_value_idx ON catalog.sku_option_values (product_id, option_id, value_id);
CREATE INDEX product_categories_parent_idx ON catalog.product_categories (store_id, parent_id, position);
CREATE INDEX product_category_links_category_idx ON catalog.product_category_links (store_id, category_id);
CREATE INDEX stock_holds_item_idx ON inventory.stock_holds (store_id, sku_id) WHERE state = 'held';
CREATE INDEX stock_holds_order_idx ON inventory.stock_holds (order_id);
CREATE INDEX stock_adjustments_item_idx ON inventory.stock_adjustments (store_id, sku_id, at DESC);
CREATE INDEX story_comments_story_idx ON reviews.story_comments (story_group_id, created_at) WHERE state = 'visible';
CREATE INDEX story_comments_author_idx ON reviews.story_comments (author_guest_id, created_at DESC) WHERE author_guest_id IS NOT NULL;
CREATE INDEX story_comments_parent_idx ON reviews.story_comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX product_ratings_product_idx ON reviews.product_ratings (product_id) WHERE state = 'visible';
CREATE INDEX moderation_events_story_comment_idx ON reviews.moderation_events (store_id, story_comment_id, at) WHERE story_comment_id IS NOT NULL;
CREATE INDEX moderation_events_product_rating_idx ON reviews.moderation_events (store_id, product_rating_id, at) WHERE product_rating_id IS NOT NULL;
CREATE INDEX partner_invitations_partner_idx ON partners.partner_invitations (store_id, partner_id);
CREATE INDEX handovers_partner_idx ON orders.handovers (store_id, partner_id, state);
CREATE INDEX handovers_place_idx ON orders.handovers (store_id, pickup_place_id);
CREATE INDEX handover_occurrences_partner_day_idx ON orders.handover_occurrences (partner_id, occurs_at) WHERE state = 'scheduled';
CREATE INDEX handover_occurrences_closing_idx ON orders.handover_occurrences (closes_orders_at) WHERE state = 'scheduled';
CREATE INDEX handover_proposals_handover_idx ON orders.handover_proposals (store_id, handover_id, created_at DESC);
CREATE INDEX handover_proposals_occurrence_idx ON orders.handover_proposals (occurrence_id) WHERE occurrence_id IS NOT NULL;
CREATE INDEX handover_receipts_occurrence_idx ON orders.handover_receipts (store_id, occurrence_id, partner_id);
CREATE INDEX handover_receipt_items_order_idx ON orders.handover_receipt_items (store_id, order_id);
CREATE INDEX orders_handover_idx ON orders.orders (store_id, handover_occurrence_id, status) WHERE handover_occurrence_id IS NOT NULL;
CREATE INDEX carts_stale_idx ON orders.carts (last_activity_at) WHERE status = 'open' AND guest_id IS NULL;
CREATE INDEX carts_guest_idx ON orders.carts (store_id, guest_id, last_activity_at DESC) WHERE guest_id IS NOT NULL;
CREATE INDEX cart_lines_cart_idx ON orders.cart_lines (store_id, cart_id);
CREATE INDEX cart_lines_occurrence_idx ON orders.cart_lines (store_id, handover_occurrence_id) WHERE handover_occurrence_id IS NOT NULL;
CREATE INDEX orders_cart_idx ON orders.orders (store_id, cart_id) WHERE cart_id IS NOT NULL;
CREATE INDEX orders_returned_from_idx ON orders.orders (store_id, returned_from_occurrence_id) WHERE returned_from_occurrence_id IS NOT NULL;
CREATE INDEX pickup_places_active_idx ON catalog.pickup_places (store_id, position) WHERE archived_at IS NULL;
CREATE INDEX orders_partner_idx ON orders.orders (store_id, partner_id, created_at DESC) WHERE partner_id IS NOT NULL;
CREATE INDEX orders_guest_idx ON orders.orders (guest_id, created_at DESC);
CREATE INDEX orders_status_pickup_idx ON orders.orders (store_id, status, pickup_at);
CREATE INDEX order_lines_order_idx ON orders.order_lines (store_id, order_id);
CREATE INDEX order_lines_sku_idx ON orders.order_lines (sku_id);
```

## 5. Index plan

Every primary key and unique constraint also makes an index. The table lists the ones that serve a pattern, then the foreign keys that have no index and why.

| Index | Columns and kind | Serves | Write cost accepted |
|---|---|---|---|
| `story_versions_language_slug_key` | unique `(language, slug)` | AP-1 | One entry per publish |
| `story_versions_published_idx` | `(language, published_at DESC)`, partial on published | AP-2, story list | Small, a few hundred rows |
| `places_slug_en_key`, `places_slug_de_key` | unique expression `(slug->>'en')`, partial where the key exists | AP-1 | One per language per place. Queries must use the same expression |
| `tours_slug_en_key`, `tours_slug_de_key`, `products_slug_en_key`, `products_slug_de_key` | same form | AP-1 | Same |
| `places_main_story_idx` | `(store_id, main_story_group_id)`, partial | AP-4, foreign key | None that matters |
| `story_groups_subject_idx` | `(store_id, subject_place_id)`, partial | AP-4 (editorial reviews of a pin) | None that matters |
| `story_group_places` primary key and `story_group_places_place_idx` | `(group_id, place_id)` and `(store_id, place_id)` | AP-4, AP-5 | Link rows rarely change |
| `story_keepsake_links` primary key | `(group_id, position)` | AP-5 | Caps the list at 6, shared by both languages (M1) |
| `story_related` primary key and `story_related_target_idx` | `(group_id, position)` and `(store_id, related_group_id)` | AP-5, foreign key. The view `story_related_readable` hides a link whose target has no published version in the reader's language | Caps the list at 3 |
| `place_dates_place_end_idx`, `place_dates_store_place_idx` | `(place_id, ends_at)`, `(store_id, place_id)` | AP-3 (the next date and the "not ended" test in `content.public_pins`), AP-44, the cascade foreign key (G11) | One per date entry, a few hundred rows |
| `map_categories_parent_idx`, `blog_categories_parent_idx` | `(store_id, parent_id, position)` | AP-42, AP-43, the parent key (G11) | Tens of rows |
| `place_categories` primary key and `place_categories_category_idx` | `(place_id, category_id)` and `(store_id, category_id)` | AP-3 (categories of a pin), AP-42 (a chip's pins), the `RESTRICT` check on a category delete (G11) | Link rows rarely change |
| `story_categories` primary key and `story_categories_category_idx` | `(group_id, category_id)` and `(store_id, category_id)` | AP-42, the `RESTRICT` check on a category delete (G11) | Link rows rarely change |
| `tour_stops_position_key` | unique `(tour_id, position)`, deferrable | AP-6, reordering in one transaction | Deferred check at commit |
| `tour_keepsake_links` primary key | `(tour_id, position)` | AP-6 | Caps the list at 3 |
| `media_refs_owner_key`, `media_refs_owner_idx`, `media_refs_media_fkey_idx` | unique `NULLS NOT DISTINCT`, `(owner_kind, owner_id)`, `(store_id, media_id)` | AP-7 (replace an owner's rows, check a retire) | Rows rewritten on each save |
| `places_cover_media_idx`, `tours_cover_media_idx`, `tours_pdf_media_idx`, `tour_stops_media_idx`, `tour_stops_place_idx` | partial `(store_id, <column>)` | AP-7, foreign keys with `RESTRICT` | None that matters |
| `skus_combination_key`, `skus_store_sku_code_key` | unique `(product_id, combination_key)`, unique `(store_id, sku_code)` | AP-12, AP-16 (find by code), the one-SKU-per-combination rule | One entry per SKU |
| `product_option_values_option_idx`, `sku_option_values_value_idx` | `(store_id, product_id)`, `(product_id, option_id, value_id)` | AP-41, the foreign key that stops a used value from being deleted | One per value, one per SKU option |
| `product_options_position_key`, `product_option_values_position_key` | unique `(product_id, position)`, unique `(option_id, position)`, deferrable | AP-41 (order of options and values), reordering in one transaction | Deferred check at commit |
| `product_categories_parent_idx`, `product_category_links_category_idx` | `(store_id, parent_id, position)`, `(store_id, category_id)` | AP-41 | Tables only in Phase 1 |
| `carts_stale_idx`, `carts_guest_idx` | `(last_activity_at)` partial on open anonymous carts, `(store_id, guest_id, last_activity_at DESC)` partial on linked carts | AP-40, AP-37 | One per cart |
| `cart_lines_cart_idx`, `cart_lines_occurrence_idx`, `cart_lines_destination_key` | `(store_id, cart_id)`, `(store_id, handover_occurrence_id)` partial, unique `NULLS NOT DISTINCT` over cart, SKU, destination and route | AP-36, AP-37, the foreign key | One per line |
| `orders_cart_idx`, `orders_cart_split_unique` | `(store_id, cart_id)` partial, unique `(cart_id, cart_split_key)` | AP-39 (which orders a cart produced, repeat completion) | One per order from a cart |
| `stock_items` primary key | `(sku_id)` | AP-13 to AP-16 | Updated on every hold |
| `stock_holds_item_idx` | `(store_id, sku_id)`, partial where `state = 'held'` | AP-16 (units held per SKU) | Smaller than a full index |
| `stock_holds_order_idx`, `stock_holds_order_line_key` | `(order_id)`, unique `(order_line_id)` | AP-14 | One per hold |
| `stock_adjustments_item_idx` | `(store_id, sku_id, at DESC)` | AP-16 (history) | Append only |
| `story_comments_author_idx` | `(author_guest_id, created_at DESC)` | AP-10 (the rate-limit count) | One per post |
| `story_comments_story_idx`, `story_comments_parent_idx` | `(story_group_id, created_at)` partial visible, `(parent_id)` | AP-9, foreign key | One per post |
| `product_ratings_product_idx`, `product_ratings_one_per_order_key` | `(product_id)` partial visible, unique `(author_guest_id, order_id, product_id)` | AP-9, AP-10 | One per rating |
| `moderation_events_*_idx` (two) | `(store_id, <target>_id, at)`, partial | AP-11 (history of one comment or rating) | Append only |
| `partner_invitations_one_open_idx`, `partner_invitations_token_hash_key`, `partner_invitations_partner_idx` | unique `(partner_id)` partial on open, unique `(token_hash)`, `(store_id, partner_id)` | AP-21 | Rare writes |
| `partner_accounts` primary key, `partner_accounts_user_store_key`, `partner_accounts_invitation_key` | `(partner_id)`, unique `(user_id, store_id)`, unique `(invitation_id)` | AP-20 (the user key leads with `user_id`), AP-21 | Rare writes |
| `orders_partner_idx` | `(store_id, partner_id, created_at DESC)`, partial | AP-22 | One per order |
| `orders_guest_idx` | `(guest_id, created_at DESC)` | AP-25 | One per order |
| `orders_status_pickup_idx` | `(store_id, status, pickup_at)` | AP-24 | Updated on status change |
| `orders_store_ref_key` | unique `(store_id, ref)` over the generated reference | AP-25, support lookup | One per order |
| `order_lines_order_idx`, `order_lines_sku_idx` | `(store_id, order_id)`, `(sku_id)` | AP-23, AP-16 (sold per SKU), the total check at commit | One per line |
| `handovers_share_code_key` | unique `(share_code)` | AP-27 | One per handover |
| `handovers_partner_idx` | `(store_id, partner_id, state)` | AP-26, AP-32 | One per handover |
| `handover_occurrences_partner_day_idx` | `(partner_id, occurs_at)`, partial on scheduled | AP-26 (today's meetings of a partner) | Leaves the index when done or cancelled |
| `handover_occurrences_closing_idx` | `(closes_orders_at)`, partial on scheduled | AP-31 (the close job) | Same |
| `handover_occurrences_day_key`, `handover_occurrences_one_off_idx` | unique `(handover_id, occurrence_date)`, unique `(handover_id)` where one-off | AP-32 (idempotent creation), AP-33 | One per meeting |
| `handover_proposals_one_open_per_handover_idx`, `handover_proposals_one_open_per_occurrence_idx` | partial unique on open proposals | AP-33 | Rare writes |
| `handover_proposals_handover_idx`, `handover_proposals_occurrence_idx` | `(store_id, handover_id, created_at DESC)`, `(occurrence_id)` partial | AP-33 (history), foreign key | Rare writes |
| `orders_handover_idx` | `(store_id, handover_occurrence_id, status)`, partial on bound orders | AP-29, AP-30, AP-31 | One per bound order |
| `orders_returned_from_idx` | `(store_id, returned_from_occurrence_id)`, partial | foreign key, AP-35 | Rare |
| `handover_receipts_occurrence_idx`, `handover_receipt_items_order_idx` | `(store_id, occurrence_id, partner_id)`, `(store_id, order_id)` | AP-34, foreign keys | Append only |
| `pickup_places_active_idx`, `pickup_place_hours` primary key | `(store_id, position)` partial on active, `(place_id, weekday, opens)` | AP-26, AP-27 (place and hours of a meeting), self-collect time check | Small |
| `events_pkey` | primary key `(session_id, seq)` | AP-17 (drops a retried batch), AP-18 (order in a session) | The main write cost of the log |
| `events_bucket_hour_idx` | `(bucket_hour)` | AP-18 (roll-up and retention) | One entry per event |
| `daily_counts_key`, `daily_funnels_key` | unique `NULLS NOT DISTINCT` over the dimensions | AP-19, the roll-up upsert, the `record_order_submit` upsert | Small |

Foreign keys with no index of their own, and why.

- `stock_holds_item_fkey` and `stock_adjustments_item_fkey`. Stock rows are never deleted, so the parent-side check never runs. The partial indexes above cover the reads.
- `moderation_events` keys to the two review tables. Comments and ratings are never deleted, so the check never runs. The partial history indexes cover the reads.
- `place_links_store_fkey`. The primary key on `place_id` serves it, and the table has at most one row per place.
- `media_refs_media_fkey` is covered by `media_refs_media_fkey_idx`. `skus_product_fkey` is covered by the leading column of `skus_combination_key`. `story_versions_group_fkey`, `story_keepsake_links_group_fkey`, `story_related_group_fkey`, `tour_stops_tour_fkey`, `tour_keepsake_links_tour_fkey`, `product_media_product_fkey` and `partner_invitations_partner_fkey` lead with columns of their table's key or of an index above.

No partitioning. The largest table, `analytics.events`, stays near 3 million rows in a year, far below the 100 million row threshold, and retention deletes by `bucket_hour`.

## 6. Migration and rollback plan

### What each backend.md table becomes

| Table in backend.md section 5 | Status in this plan |
|---|---|
| `stores`, `store_memberships`, `store_invitations`, `guest_profiles`, `platform_admins` | Built, unchanged |
| `pickup_places` | Created in `catalog` as the pickup point list of the handover record (name, address, instructions, weekly hours). `orders.pickup_place_id` and `handovers.pickup_place_id` hold its id as a plain value |
| `product_pickup_places` | Not built. The record has one list for every product, so the link table is not needed until a product needs its own places |
| `platform.audit_log`, `idempotency_keys`, `webhook_events`, `notifications.sent_mail` | Built, unchanged. `audit_log` also records publishes and guide updates |
| `subcategories` | Replaced by `catalog.product_categories`, a tree per store with a link table, tables only in Phase 1 (owner M10). The four fixed categories and merchant sub-categories of D17 stay retired |
| `products` | Created in `catalog`, narrowed. No payment or cancellation policy, no engraving, `preparation_hours` replaces `preparation_days` |
| `product_variants` | Replaced by `catalog.skus` with generic `product_options`, `product_option_values` and `sku_option_values` (owner M9), and `inventory.stock_items` |
| `tours` | Moved to `content.tours` as information only. The booking shape (`sections`, `age_bands`, `participant_fields`, `commission_rate`, `maintenance`) is not carried over |
| `tour_departures` | Dormant. Never created |
| `bookings` and seat holds (`hold_until`) | Dormant. Never created |
| `media` | Moved to `content.media` (ADR-004) |
| `reviews` | Moved to `reviews.story_comments` and `product_ratings`. Guest reviews of places are dropped (G11) |
| `articles`, `article_comments` | Replaced by `content.story_groups` and `story_versions`, and by `reviews.story_comments` |
| `orders`, `order_lines` | Created in `orders` with the pivot's columns (DM-11) and the snapshots and total of DM-14. `ref` is generated, and lines are write-once |
| `stock_holds` | Moved to `inventory.stock_holds` |
| `payment_attempts`, `ledger_entries`, `money_exceptions` | Not yet built. When built, `purpose = 'balance'` stays dormant and `method` gains `partner_cash` |
| `commission_entries`, `referral_visits`, `partner_sessions`, `partner_otps` | Not yet built. Unchanged by the pivot. `referral_visits.visitor_id` stays out of `analytics` |
| `partners` | Created in `partners` with `kind` and a registered email. The report-link columns stay as backend.md defines them |
| `advice_question_sets`, `advice_requests` | Unchanged |
| `private_tour_requests` | Dormant. Never created |

Dormant means the design stays in backend.md and no table exists. When booking returns, a `bookings` schema adds its tables with a plain `tour_id` to `content.tours`. The tour guide table needs no change.

### Steps

Every step except the G11 step is additive. No other step alters, locks or rewrites a live table, because the pivot's tables are new and the `platform`, `notifications` and `identity` tables are untouched (section 7 shows the schema dump before and after). The expand, migrate and contract phases therefore collapse. There is an expand for each new schema and one migrate step (the seed import). The contract of the pivot happens in code, where ADR-012 moves the booking screens. The G11 step is the exception: it changes tables that `0008_content` built, and it drops columns, constraints and triggers.

The numbers below are working names. Each migration takes the next free number when it is written, because other sessions add migrations to the same tree. Each migration starts with `SET lock_timeout = '3s'` so that a blocked statement fails and does not queue every query behind it.

| Step | Phase | SQL | Lock taken | Rollback |
|---|---|---|---|---|
| `0007_platform_helpers` | Expand | The five functions in `platform` | None on a table. A short catalog lock | `DROP FUNCTION`. After `0008`, drop with the schemas that use them |
| `0008_content` | Expand | Schema `content`: tables, deferred foreign key `story_groups_subject_place_fkey`, triggers, the `place_story_links` view, section 5 indexes | None on existing tables. New tables are empty | Development and staging: reset the Neon branch from its parent, which also clears Drizzle's applied-migration record, or write a down migration with `DROP SCHEMA content CASCADE` and delete the record. Production before real content: the same. Production after real content: irreversible, restore the Neon branch from before the step and replay |
| `0009_pin_model` (G11) | Expand and contract | The drop list and the additions below | `ACCESS EXCLUSIVE` on `content.places`, `story_groups`, `place_links` and `story_versions`, each for a catalog change only, under `lock_timeout = '3s'` | A down script re-creates the dropped objects from `0008_content.sql`. The values of `places.type`, `subject_place_type` and the paid-link columns would be lost, which is irreversible if rows hold them. None do today, and the first statement refuses to run if a paid link exists |
| `0010_catalog` | Expand | Schema `catalog`: products, options and values, SKUs and their option values, categories, `pickup_places` and `pickup_place_hours`, the combination-key triggers | As above | As above |
| `0011_inventory` | Expand | Schema `inventory`, the hold trigger | As above | As above |
| `0012_reviews` | Expand | Schema `reviews`: story comments, product ratings, the moderation history and its triggers. No place reviews table (G11, DM-8). This migration is unbuilt, so G11 changes its planned DDL and needs no drop | As above | As above |
| `0013_partners` | Expand | Schema `partners` (waits for the owner's decision on ADR-019) | As above | As above |
| `0014_analytics` | Expand | Schema `analytics` | As above | As above |
| `0015_orders` | Expand | Schema `orders`: orders and lines (DM-11, DM-14), handovers, meetings, proposals and receipts (DM-16, DM-17), carts and cart lines (DM-18), the guest snapshot (DM-19), the commit-time triggers, the receipt and commission views. Ships with the orders slice, and `money` columns follow in their own migration | As above | As above |
| Seed import (`db:seed`, a script, not a migration) | Migrate | Upsert the prototype's stories by `(language, slug)` and tours by `slug->>'en'`. Tours arrive as drafts with their stops, because no PDF exists yet, and the merchant uploads one before publishing. Places are not seeded from stops (ADR-005). SKUs wait for the colour list (O26) | Row locks on the rows it writes | Development and staging: `reset_from_parent` on the Neon branch. The seed writes no marker, so a selective undo is not offered |
| None after G11 | Contract | The G11 step above is the only step that drops anything, and the plan does not separate its contract | | |

Notes on the steps.

- Schema and data stay in separate steps, as the skill asks. The seed is idempotent and runs in one transaction. There are fewer than 500 rows, so no batching is needed.
- Each migration needs grants for the runtime role, which cannot run DDL (backend.md section 5). The role names are open (Q-14), so no grant is written here. Append-only tables also carry a trigger, so a missing grant is not a hole.
- Indexes are plain `CREATE INDEX`, inside the migration, because the tables are empty. The first index added to a populated table later uses `CREATE INDEX CONCURRENTLY` in its own migration, outside a transaction.
- Every constraint that Drizzle cannot express goes in the same migration as custom SQL (DM-13).
- The runtime must finish `0007` before `0008`, because CHECKs call the platform functions. The other schemas need no order between them, since no key crosses a schema (DM-2).
- Production data. The owner has said nothing is live (Q2). The "after real content" rollback row applies from the first real story onward.

### The G11 migration: pins without a type, dates, categories

Name. `0009_pin_model`, named by intent. It is the pin model change from G11, it takes number 0009 (the next free one after `0008_content`), and the later migrations in the plan moved up by one. It runs after `0008_content`.

Why one step with drops. The record's constraints say nothing reads `content.places` in production and the content API (E2.6) is not built, so no deployed code uses the dropped columns. The usual expand, migrate and contract split exists to keep old code working while new code rolls out, and no old code exists. The step is still guarded: it first refuses to run if `content.place_links` holds a paid link, the only data that would be lost with meaning. Rows in `places` and `story_groups` lose only the type copy, and the value is dead because the rules that used it go in the same step.

Order inside the step, because dependent objects must go first.

1. Drop the triggers `story_versions_keep_pin_story`, `story_versions_keep_pin_story_on_delete`, `places_pin_has_published_story` and `places_type_is_immutable`, then the functions `content.assert_published_pins_keep_story`, `content.assert_pin_has_published_story` and `content.reject_type_change`.
2. On `content.story_groups`, drop the constraints `story_groups_subject_type_fkey` and `story_groups_subject_type_check`, then the column `subject_place_type`.
3. On `content.place_links`, drop the constraints `place_links_place_fkey`, `place_links_type_check`, `place_links_kind_check` and `place_links_network_check`, then the columns `place_type`, `kind`, `network` and `disclosure`.
4. On `content.places`, drop `places_practical_no_story_check`, `places_pin_has_story_check`, `places_type_check` and the unique key `places_id_type_key` (steps 2 and 3 removed the keys that referenced it), then the column `type`.
5. Create `content.valid_weekly_hours`, add `address`, `weekly_hours` and their CHECKs to `content.places`.
6. Create `place_dates`, `map_categories`, `blog_categories`, `place_categories`, `story_categories`, the view `content.public_pins` and the six indexes of section 5.

Kept: `places_first_published_is_fixed`, `places_keep_once_published`, `story_versions_keep_once_published`, `story_versions_published_is_kept`, the three TRUNCATE guards and every delete guard.

Tests. `api/test/integration/content-schema.test.ts` changes with the migration.

- Remove or rewrite the tests that name the dropped objects: the helper `newPlace(store, type)` and its callers, `a practical place cannot name a main story` (`places_practical_no_story_check`), `[AC43] a story place cannot publish without a published main story, and a practical place can`, `[AC68] a place type cannot change after creation`, `an editorial review of a practical place is refused`, `an editorial review whose subject type does not match the place`, and the last-published-version tests that expect `story_versions_keep_pin_story`.
- Add tests for a pin that publishes with no story and no category, a date entry shape, `ends_at` in Europe/Zurich, `content.public_pins` before, during and after the last date, `valid_weekly_hours`, the one-level category parent, the `RESTRICT` deletes, and a pin with two categories.
- Update the lists that the test asserts: the expected index names (add the six, keep `places_main_story_idx`) and the expected table and view names (add the five tables and `public_pins`).
- Update the `reviews` expectations when `0012_reviews` is built, not in this migration.

The Drizzle `schema.ts` of the content module needs the same changes when E2.6 declares it.

### Step not chosen: a `partner` role on `identity.store_invitations`

If the owner prefers ADR-019's rejected option, the live-table change is:

1. `ALTER TABLE identity.store_invitations DROP CONSTRAINT store_invitations_role_check;` takes `ACCESS EXCLUSIVE` for the catalog change only.
2. `ADD CONSTRAINT store_invitations_role_check CHECK (role IN ('owner', 'manager', 'partner')) NOT VALID;` takes `ACCESS EXCLUSIVE` briefly and checks no rows.
3. `VALIDATE CONSTRAINT store_invitations_role_check;` takes `SHARE UPDATE EXCLUSIVE` and reads the table, which holds tens of rows.

Rollback restores the old constraint, and fails while any row has `role = 'partner'`. Revoke or delete those rows first. The two partial unique indexes on `role` do not change. A third one would be needed for partners, and the accept route would then have to avoid creating a store membership for them.

### Superseded: the visit entity

The earlier version of this plan carried an expand, migrate and contract change that moved `arrival_at`, `departure_at` and `group_ref` from the order to a visit entity once G6 was decided. The owner answered G6 with the partner handover (`docs/decisions/2026-10-26-partner-handover.md`). Those columns are not in the DDL any more, so nothing needs moving, and the handover tables are created with the orders schema in `0015_orders`. The earlier decision 5 is closed.

### When a handover rule changes later

A change to the daily rule of a repeating handover applies to meetings created afterwards. Existing meetings keep their time unless a one-day proposal changes them. This needs no migration. A change to the meeting horizon (assumption 6) is a job setting.

## 7. Validation

I ran the DDL on a scratch PostgreSQL 18.6 in a Docker container (`postgres:18-alpine`, started with `--rm` for this task and removed before reporting). It never touched a shared database. The scripts and the full output are in `.factory/runs/20261025-storytelling-pivot/data-model-checks/` (`run-all.sh`, `ddl.sql`, `tests.sql`, `results.txt`). They are test scripts, not migrations.

Checklist.

| Check | Result |
|---|---|
| Every entity has volumes, every access pattern has rate, latency and consistency | Done in section 1 |
| Every read has a feeding write and the reverse | Done in section 1, with one line of mapping |
| 3NF unless a decision justifies the departure | Departures are DM-3 (`published` and `draft` documents), DM-6 (the `held` counter), DM-8 (`state` beside its history) and the `story_comments` generated columns. Each names its pattern |
| Business rules are constraints where possible | See the rule table below. Rules that cannot be constraints are named in section 8 |
| Foreign keys indexed, every index serves a pattern | Section 5 |
| No type from "Types to avoid", money is not floating point, times are `timestamptz` | Money is `bigint` Rappen by the repository rule (DM-1). `character varying`, `timestamp`, `money` and `serial` are absent |
| No partitioning below the threshold | Section 5 |
| Each migration step has lock, batch size where relevant and rollback | Section 6 |
| DDL ran on a scratch database | Yes, results below |
| Every major decision has a `proposed` ADR | ADR-013 to ADR-020, and for G11 ADR-029 and ADR-030 |

Results. All of them came from the DDL in section 4.

1. The DDL applied without error on an empty database with only a `platform` schema.
2. A second database took migrations `0000` to `0006` first, then the DDL. A `pg_dump --schema-only` of `platform`, `identity` and `notifications` before and after differs only by five new functions (`reject_change`, `reject_column_change`, `require_trigger_context`, `valid_interests`, `valid_slug_map`), with no line removed. No existing table changed. The new schemas hold 33 tables.
3. (History, before G11.) 200 constraint checks ran, each with a statement that must fail or must pass. 200 passed and none failed. Two rounds found real defects, and the fixes are in the DDL above. First, a CHECK whose inner expression is NULL passes, so a published story with no `sections` key passed. The affected CHECKs now end in `IS TRUE`, which is a rule for every future jsonb CHECK. Second, the advisor pass found that the stock and pin triggers fired only on some columns, that a slug map accepted `{"en": null}`, that an analytics row could be ordered by its identity key, and that media could be retired while in use. Each now has a fix and a check.

| Rule | Mechanism | Test result |
|---|---|---|
| One SKU per combination of option values in a product | `skus_combination_key` and the commit-time count | Same values twice refused. Another colour accepted. A SKU missing an option, with no value at all, and with two values of one option refused. A value of another product refused. A new option on a product whose SKUs lack it refused. A product with no options takes one SKU and refuses a second. The key is stored at commit |
| Option values cannot disappear while used, colour swatches are colour codes | Foreign key, CHECK | Delete of a used value refused. A swatch that is not a hex code refused. Two options at one position refused |
| Category tree | CHECK, trigger, keys | Own parent, a loop, a slug used twice and a delete of a parent refused. Two links accepted. A link across stores refused |
| Server cart | Keys, CHECKs, triggers | A completed cart with no guest, a guest id with no link time, a line with two destinations and the same line twice refused. One cart completes into two orders, one per destination. The same split key again, an order from an open cart, a completed cart with no order, an order from an anonymous cart, a line added or removed after completion and a second guest refused. A stale anonymous cart is deleted with its lines |
| Guest snapshot on orders | CHECK, trigger | No snapshot, a bad e-mail, an edit and a half erasure refused. Erasure accepted |
| Commission waits for full payment (C1) | View, CHECK | A delivered order is not in `commission_ready`. After it completes it is, with its partner. Completion without delivery refused |
| Story links per group (M1) | Keys, view | Seventh keepsake, duplicate keepsake, a fourth related story and a self link refused. The English reader sees the related link and the German reader does not until the target has a German version, and the link disappears when the target is unpublished in the reader's language |
| SKU parts belong to the same store | Composite keys | Option from another store refused |
| Stock never negative, held within on hand | `stock_items_held_within_on_hand` | Hold of 4 on 3 units refused. A second hold of 2 after a hold of 2 on 3 units refused. Set on hand below held refused. Set to exactly held accepted |
| Handover and release | Hold trigger | After a hold of 2 on 3: on hand 3, held 2. After handover: on hand 1, held 0, one adjustment row. After a release of 5: on hand 5, held 0 |
| Resolved holds, adjustments and holds are fixed, `held` has one writer | Triggers | Edit, delete refused. A direct write to `held` refused. A quantity change on a held hold refused |
| A pin publishes without a story, a type or a category (G11, AC85) | The removal of the pin rule | Accepted. See result 9 |
| A pin's weekly hours have a valid shape (G11) | `places_weekly_hours_check` and `content.valid_weekly_hours` | Day 8, opens after closes, an object instead of an array, `8:00` and an extra key refused. `24:00` as closing time accepted. See result 9 |
| Published or hidden rows are not deleted | `reject_delete` and keys | Delete of a published place, of a published version, and of a group with versions refused. A draft place deleted |
| A published place cannot clear `first_published_at` and then be deleted | `places_first_published_is_fixed` | Setting `status = 'draft'` with the column cleared on a published place refused, so the delete guard holds. Hiding a place accepted. Test `[E2.5][AC79]` in `api/test/integration/content-schema.test.ts` |
| A story version keeps its published text once set | `story_versions_published_is_kept` | Setting `published` to NULL refused. Replacing the text accepted. `status = 'draft'` accepted, so the document stays. Delete of the version and of its group refused. Test `[E2.5][AC79] a published story version keeps its published text` in `api/test/integration/content-schema.test.ts` |
| TRUNCATE cannot skip the delete guards | `places_no_truncate`, `story_versions_no_truncate`, `media_refs_no_truncate` | `TRUNCATE ... CASCADE` on each of the three tables refused. Tests `[E2.5][AC79] TRUNCATE ... CASCADE on content.%s is refused by the trigger` (one per table) in `api/test/integration/content-schema.test.ts` |
| A story is listed once on a place sheet | View `place_story_links` | A story that is the main story and also linked on the place appears once, at rank 0. Test `[E2.5] place_story_links lists a main story that is also linked on the place once, at rank 0`, beside the test for rank 0 and rank 1 |
| One version per language, only `en` or `de` | Primary key, CHECK | Second `en` refused, `fr` refused |
| Slug unique per language | Unique key and expression indexes | Duplicate story slug and duplicate place slug refused |
| A version exists only with its required fields | `*_published_fields_check` | Published story without `sections` refused. Published tour without a PDF refused. Name and slug languages that differ refused |
| Lists capped, order unique | Position CHECKs and keys | Fourth tour keepsake and stop reordering behave as before |
| One plain outbound link on any pin (G11) | Primary key, `place_links_url_check` | A link on a pin accepted. A link that is not `https` refused. See result 9 |
| Dates of a pin (G11, AC86) | CHECKs, generated `ends_at`, view `content.public_pins` | A range with times, an end before the start, an end with no start and a last day before the first refused. A pin with no entries is public, a pin whose only entry ended is not, a pin with a future entry is public with that entry as the next date. See result 9 |
| Categories (G11, AC87, AC88) | Composite parent key, `RESTRICT` keys, unique slug | A child under a child, a duplicate slug and a category of another store refused. A parent with a child and a used category cannot be deleted. A pin takes two categories. See result 9 |
| Reorder tour stops in one transaction | Deferrable unique key | Swap accepted |
| A used media row cannot be retired, and kinds match | Trigger, kind in the keys | Retire of a tour's PDF refused. An image as a PDF and a PDF as a cover refused. An unused image retired |
| A slug value is a string | `valid_slug_map` | `{"en": null}` and `{"en": 5}` refused |
| An editorial review names any pin (G11) | `story_groups_subject_check`, foreign key | Accepted for a pin of any kind. See result 9 |
| Review visibility state, history, no delete | Events table, trigger, delete trigger | A hide set the state to hidden. A direct write of `state` refused. Delete of a review, of an event, and an edit of an event refused. Event with two targets or none refused. Two events carry times in the order of their effect |
| One level of replies, same story | Generated columns and a composite key | Reply to a reply refused. Reply under another story's comment refused |
| One rating per author, order and product | Unique key | Second rating refused |
| A partner account needs an accepted invitation of that partner | Composite key and an insert trigger | Account with no invitation, with an unaccepted one, and with a revoked one refused. With another partner's accepted invitation refused. Accepted with its own. A second open invitation refused |
| Guide-cash order has a guide and no deadline | `orders_partner_cash_check` | Refused without a guide, refused with a deadline, accepted otherwise |
| An accepted order has an accept time | `orders_accepted_status_check` | `preparing` without it refused |
| Events carry no identity and an hourly time, and no stored row links a session to an order | Table shape, `events_bucket_check`, `events_name_check`, `events_shape_check`, `record_order_submit` | Exact time refused. `order_submit` stored as an event refused. A product view without its product refused, and with it accepted (owner M5). `pin_open` without a place refused. Unknown name and interest refused. Retried batch refused. Three submits counted into the funnel (two daily rows, one chain), and no row holds a session or order |
| Handover record shape and path | CHECKs, transition trigger, fixed partner and kind | One-off with a daily time, repeating without its rule, proposed with an agreement time, agreed without one, paused one-off and capital share codes refused. Proposed to done, repeating to done and cancelled to agreed refused. Pause and resume accepted. A partner change refused |
| One meeting per one-off handover, one per day for a repeating one, a meeting under its own partner, cut-off before the time | Unique indexes, composite key, CHECKs | Second meeting, same day twice, another partner's handover, a cut-off after the time and an arrival after leaving refused. Another day accepted. The Zurich date of 23:30 UTC on 31 December is 1 January |
| One open proposal, answered once, never edited | Partial unique indexes, answer-once trigger | Two open for one handover, a time with a daily time, a one-day change without a time and another handover's meeting refused. A counter, an accept and a second answer behave as the record says |
| An order binds only to its own partner's open meeting | Composite key, NULL-partner CHECK, commit-time trigger | Bound with no partner, to another partner's meeting, after the cut-off, to a cancelled meeting and to a handover never agreed refused. Own open meeting accepted. A move to another meeting of the same partner accepted, to another partner's or a closed one refused |
| Partner-path statuses, pickup shape, no-show | CHECKs | `with_partner` with no meeting refused. A bound order with a pickup time refused. A self-collect order with no place or time refused. A guest switch to self-collect accepted. A detach with no place and no no-show refused. A no-show return keeps the partner. A return record without its origin refused |
| Cancellation reasons, cash never cancelled for non-payment | CHECKs | Cash cancelled as overdue or at the handover close refused. Cash cancelled by the merchant accepted. Online cancelled at the close accepted for a bound order and refused for a self-collect order. Cancelled with no reason refused |
| Cancelling a meeting that has orders | None (the record leaves it open) | Accepted, as the record's open question requires |
| Batch receipt moves orders and cannot be edited | Insert trigger, append-only triggers | 5 of 6 ticked: five With partner, one still on its way, the count view says 5/6. A late bag taken by a second receipt. An item for an order at another meeting, an order received twice and a receipt for the wrong partner refused. Edit and delete refused |
| The source partner, guest and total of an order do not change | `platform.reject_column_change` | Refused |
| An order's total equals its lines, lines are snapshots and write-once | Deferred constraint triggers, CHECKs, `reject_change` | A total that differs by one Rappen refused at commit. An order with no lines refused. A line with no option snapshot refused. Edit and delete of a line refused. A matching order accepted, with a generated `SK-` reference |
| End states carry their timestamp | CHECKs | `completed`, `cancelled` without the timestamp refused. `declined` with it accepted |
| A SKU code is unique per store | `skus_store_sku_code_key` | Duplicate refused |
| A partner account is not edited, deleted or left without an accepted invitation | Triggers | User edit, delete and un-accepting the invitation refused |

4. (History, before G11: the pin rule and its lock no longer exist.) Races. One session held the pin rule's lock for 3 seconds, and the other started 1 second later. In both orders, exactly one session committed and the other failed with the rule's message. Publish first: the unpublish failed, and the final state was place published, story published. Unpublish first: the publish failed, and the final state was place draft, story draft. A control run on the same DDL without the two row-lock statements let both sessions commit, and the final state was place published, story draft, which breaks AC43. The lock is what holds the rule. `run-all.sh` repeats all of this from a clean container.
5. Cart races. The cart completes first and a line is added second: the line fails with "is completed and its lines cannot change". A second completion of the same cart: the second session fails on `orders_cart_split_unique`, and one order exists. The same first race on the DDL without the cart row lock lets the line land on a completed cart, which breaks the rule.
6. Handover races, each pair started 1 second apart with the first session holding its lock for 3 seconds. The guest's order binds first and the merchant then moves the cut-off to the past: both commit, because the order was bound in time. The merchant moves the cut-off first and the order binds second: the order fails with `orders_handover_open`. The merchant cancels the meeting first and the order binds second: the order fails the same way. The merchant accepts a proposal while the partner counters it: the second answer fails with "was already answered as accepted", and the proposal ends as accepted. The same two order races on the DDL without the meeting's `FOR SHARE` lock let the order commit after the cut-off and after the cancellation, which breaks the rule.
7. A stock race. Two orders took the last unit, the second one started 1 second after the first. The second failed with `stock_items_held_within_on_hand`. The final state was one unit on hand, one held, one hold row.
8. The listing of `analytics` columns shows only the session id, `seq`, `bucket_hour`, event name, page type, content id, language, referrer class, segment, interests and device class on the log, and counts on the roll-ups. A catalog query found no foreign key into or out of the schema. The log has no surrogate id, the key is `(session_id, seq)`, and a product view names its product (owner M5). Order submits leave no raw row.
9. G11 run, 2026-10-27. I applied `0007_platform_helpers.sql` and `0008_content.sql` from the repository and then the G11 migration of section 6 on `postgres:18-alpine` (PostgreSQL 18, a throwaway container, removed afterwards, no shared database). The migration applied without error. I then ran the section 4 DDL on a second empty database with only the `platform` schema. It applied with zero errors and produced 48 base tables (17 in `content`, 3 in `reviews`) and 27 foreign keys in those two schemas. About 40 statements checked the rows named above, and each refusal came from the named constraint. I also checked that the four dropped triggers are gone, that the delete guards, `first_published_at` guard and TRUNCATE guard still refuse, that a draft pin's delete removes its dates and categories, that a hidden pin is not in `public_pins`, and that a moderation event with no target or with a place target is refused. The scripts are in the session scratchpad and are not committed. `api/test/integration/content-schema.test.ts` has not been changed or run.

Not verified.

- The G11 migration as a file, the matching change to `content-schema.test.ts`, the Drizzle `schema.ts`, and the G11 SQL against Neon or against a table that holds rows. Nothing was run against Neon.
- The Drizzle `schema.ts` and the generated migration. They do not exist yet, and DM-13 names what needs custom SQL.
- Query plans. The tables are empty, so `EXPLAIN` would say nothing. Section 5 relies on the volumes in section 1.
- Neon specifics (pooled connection, branch reset, point-in-time restore).
- Medusa's source beyond the pages named in section 9. I read the docs pages and two model files on GitHub, and I did not read workflow code. Where a Medusa behaviour is not on a page I read, section 9 says so.
- `record_order_submit` under concurrent calls. The upsert is one statement, and I ran it from one session only.
- Two concurrent moves in the category tree that together make a loop, and a new option added while a SKU is inserted in another session (the product row lock is designed for it and not raced).
- The handover races ran with two sessions each. A third writer, for example a partner moving an order while the merchant moves the cut-off and a guest orders, is not tested.
- Pickup times inside the pickup point's opening hours, which cross a module and an hours table. The use case checks them.
- A concurrent save that adds a media reference while the media row is retired. The grace period of ADR-004 is the only cover. A save that sets a cover, a PDF or a stop photo to media already `retired` has no database guard. E2.6 must refuse it (DM-3).
- Roles and grants. The scratch database used the superuser.
- Behaviour above READ COMMITTED, and the lock behaviour of the deferred triggers with more than two sessions.

Advisor pass. A `factory-advisor` read the first version against the PRD, the architecture, the ADRs and the gates and returned ten findings with the verdict "needs revision". This version answers each one. Nine changed the DDL, the ADRs or the text, and one was not taken. Two later changes came from the owner (M5, M6) and from the Medusa study (DM-14, DM-15), and the advisor reviewed that direction before the edits.

| Finding | Response |
|---|---|
| 1. Triggers skipped some updates | The hold trigger fires on every update. The pin trigger fires on a status change or a move to another group. Direct writes to `held` and `state` are refused |
| 2. Null slug passed | `valid_slug_map` requires a string for each key present |
| 3. D1 not enforced in the database | Composite key to the invitation, an insert trigger that requires an accepted, open invitation, `revoked_at`, and fixed accounts and acceptance. Only the e-mail match stays in the use case |
| 4. Analytics join paths | Key is `(session_id, seq)` and `order_submit` is counted and never stored. The owner then kept the product id in product views (M5) and accepted the residual guess in a quiet hour (DM-10) |
| 5. Media retire and kinds | Retire trigger, media kind in the cover, PDF and stop keys. `product_media` stays a plain id, as DM-3 says |
| 6. Hide and unhide race | The trigger locks the target, then stamps `clock_timestamp()` |
| 7. Contradictions not named | Added to section 8 (Q-17 to Q-19) and fixed in the DDL where cheap (subject type, partner id, product languages, link overrides) |
| 8. Place type copy | Stated in DM-8 and ADR-018 |
| 9. Plan gaps | Working numbers, Drizzle record on rollback, seed marker, tour PDFs, grants. The check scripts are now saved in `.factory/runs/20261025-storytelling-pivot/data-model-checks/` at the orchestrator's request |
| 10. Wording | Fixed |

All ten findings are answered.

## 8. Open questions and risks

### Decisions needed from the owner

The orchestrator forwards these. The DDL follows the recommendation in each case, and each is cheap to change now because no data exists.

1. **Settled by owner M1 (2026-10-26).** Related stories and keepsake links are set once per story group, shared by both languages. A reader lands on their own language version, and a link to a story with no published version in the reader's language is hidden. This reverses my earlier recommendation. The tables `story_keepsake_links` and `story_related` are keyed by group, and the view `story_related_readable` does the hiding.
2. **Settled by owner M2.** The guide's invitation and account link stay in their own tables in `partners` (ADR-019). This matches ADR-010.
3. **Settled by owner M3.** Modules reference each other by plain id, with composite keys only inside a module (ADR-013).
4. **Settled by owner M3.** The repository uses business-rule triggers for the invariants in ADR-015, 016, 018, 025 and 026, each with a database test.
5. Resolved by the owner. The earlier decision 5 (arrival and departure as nullable order columns) is replaced by the partner handover of `docs/decisions/2026-10-26-partner-handover.md`. DM-16 and DM-17 model it.
6. **Settled by owner M7.** The checkout cart is a server table, Medusa-style (DM-18, ADR-026). The cart id lives in a cookie, an anonymous cart can later be linked to a guest, stock and price are re-checked at each change and at completion, one cart can complete into several orders, completion is safe to repeat, and a job deletes stale anonymous carts. A cart line holds no stock. The earlier recommendation of a browser cart is replaced.
7. **Settled by owner M8.** Each order stores a snapshot of the guest's name and e-mail, overwritten on erasure (DM-19, ADR-028). The lawyer's answer on O33 can still change what stays.
8. **Settled by the owner as option A, handovers in the orders schema.** It matches the architect's ADR-010. The question was: which module owns the handover tables? The record leaves it to the builder. Options. A, the `orders` schema, as in the DDL (ADR-024). B, a new `handovers` module. C, the `partners` module. Recommendation A, because it lets a composite key force the order's partner to equal the meeting's partner, and lets the binding check lock the meeting in the order's own transaction. Both rules would become cross-module rules under B or C, and they depend on decision 3 (plain ids), which is still open with the owner. Decision 4 (business-rule triggers) also stays open, and this model adds two commit-time triggers to the order path, the binding check and the receipt update, in the same way. The two commit-time triggers on the order path stay under decision 4.
9. **Settled by owner G11 (2026-10-27).** One pin model replaces the typed place. The record `docs/decisions/2026-10-27-map-pins-and-events.md` removes the pin rule, the place type and guest reviews of places, and adds dates, categories, an address and weekly hours (DM-5, DM-8, DM-21, DM-22, ADR-029). The builder's choices (address and hours as columns, dates as a table, a plain link) are in DM-21 and can be overturned.
10. **Settled after the G11 review (2026-10-27).** ADR-002, ADR-003, ADR-005, ADR-006, ADR-008, ADR-011, ADR-013, ADR-014, ADR-015 and ADR-018 carry G11 amendment notes, and ADR-029 and ADR-030 are new. Rulings G11-R1 to G11-R10 in the decision record settle Q-5 (display name), Q-39, Q-40, Q-41 and Q-43: nothing protects a pin's main story.

### Open questions

| Id | Question | Owner | What it blocks |
|---|---|---|---|
| Q-1 | Settled by owner M9. Victorinox is one product with the options Size, Theme and Colour, and a second product line would be another product. | Settled | None |
| Q-2 | Settled by owner M9. A product may have no options, so no colour is forced. A SKU takes exactly one value of each option of its product. The colour list itself is still open (O26). | Settled, O26 open | The seed of option values |
| Q-3 | May a slug change after the first publish? A change breaks the old address and no redirect table exists. Recommendation: lock the slug after first publish and add redirects when a rename is needed. | Product owner | A rule in the use case, a possible `slug_redirects` table |
| Q-4 | A slug is checked for collision at publish, and the editor also checks while drafting. ADR-002 says "told at create time". Is a check at draft time enough? | Product owner | Nothing in the DDL |
| Q-5 | Review rules (O25). Edit and delete of one's own comment? Scale 1 to 5 for product ratings (G11 removed place reviews), text limit 4000, display-name format (settled by R1: first name and initial, "Anna K."), whether the text stays after erasure, whether the guest sees a hidden review (O33). | Product owner, lawyer | Erasure columns, the length CHECK |
| Q-6 | The hide of a product rating stays refused until O33. Only the use case enforces it. | Product owner, lawyer | Nothing in the DDL |
| Q-7 | Preparation hours and store opening hours (O22). `catalog.products.preparation_hours` is a placeholder. No table holds opening hours, and ADR-009 lists them as an auto-accept input. | Product owner, merchant | The auto-accept data (AP-23) |
| Q-8 | Analytics. Retention (14 months proposed), whether the dashboard hides a count below a threshold (a day's funnel count can be 1 in the pilot), and whether an in-memory session id needs consent (O14, O32). The owner accepted the product-id guess in a quiet hour on 2026-10-26 (M5). | Product owner, lawyer | Retention job, roll-up rules |
| Q-9 | Image variants. ADR-004 plans `sharp`. The model stores one row per upload and no variants. Recommendation: derive the variant key from the original key and a width, with no table. | Developer | Whether `media` needs a variants table |
| Q-10 | Currency (O01). No currency column exists, and every amount is CHF Rappen. | Product owner | A `currency` column |
| Q-11 | Server-side trip data (O29). `orders.trip` is not created. | Product owner | An analytics and order column |
| Q-12 | The guide's cash limits (O34). The database cannot cap a partner's cash at the open balance, because the amount sits in `money`. The use case does it. | Product owner | A money-side CHECK |
| Q-13 | A partner who works with several merchants (PRD 10.1). `partners.store_id` ties a partner to one store, so two merchants mean two partner rows. | Product owner | The `partners` key |
| Q-14 | Runtime role names and grants. The append-only tables rely on triggers, so a missing grant is not a hole. The grants themselves are not designed. | Developer | Each migration's `GRANT` lines |
| Q-15 | Several merchants share one public site, and slugs are unique across the platform (ADR-002). A second merchant meets collisions. | Product owner | A store segment in URLs |
| Q-16 | Untagged content counts as `both` (O25 proposal), and the DDL stores `both` as the default. If the owner wants untagged to differ, the column becomes nullable. | Product owner | `stay_tag` default |
| Q-17 | Closed by owner M6 on 2026-10-26. A draft place can be deleted and a published place can only be hidden, which the DDL already does. A tour has no delete guard, and that is not decided. | Product owner | Tours only |
| Q-18 | `pickup_places` and `product_pickup_places` are in backend.md section 5 and the architecture, and this model does not redefine them. `orders.pickup_place_id` points at them by plain id. | Developer | `0010_catalog`, orders |
| Q-19 | Seed tours have no PDF, so none can publish until the merchant uploads one (AC51). Is a draft tour at launch acceptable? | Product owner, merchant | Seed and launch content |
| Q-20 | The later limited-edition pre-order (Q23) needs `allow_backorder`. It cannot coexist with `CHECK (held <= on_hand)` as it stands. ADR-022 describes the change. | Product owner | The pre-order phase |
| Q-21 | `ref` comes from one global sequence. A second merchant would see the first merchant's volume in its own numbers. Use a per-store counter then. | Product owner | The multi-merchant phase |
| Q-22 | The status and timestamp CHECKs assume an order never reopens (O10). | Product owner | `orders_completed_check` and its siblings |

| Q-23 | Open. Cash the partner holds: does the app track what each partner owes the shop? Stays open as PRD O40 (moved out of scope on 2026-10-26). | Owner, later | A partner balance table, not built |
| Q-24 | Settled by gate D1, ADR-010 and ADR-019. Partners sign in with the existing flow and get the partner role through the merchant's invitation. | Settled | None |
| Q-25 | Settled by PRD AC77. A proposal the merchant does not answer takes no orders, the merchant gets a reminder, and at the meeting time minus preparation time the proposal expires and the partner is told. The DDL has the status `expired`, which a job sets. | Settled | None |
| Q-26 | Settled by PRD AC78. Every guest with an order is told at once and chooses self-collect or a full refund. The order keeps its partner. The model supports both choices (see the note below). | Settled | None |
| Q-27 | Open under PRD O36. Whether guests can cancel an order on the partner path (G5 removed the cutoff). | Owner, with the cancellation decision | The use of `cancelled_reason = 'guest'` on the partner path |
| Q-28 | Dropped by the owner. How Lucerne shops identify guides today. | Dropped | None |
| Q-29 | The record leaves to the builder the format of the order code and how the partner finds an order by it. The model uses `ref` (`SK-` and a number) and finds an order inside one meeting. A short code per meeting is a column added later. | Builder | A `handover_code` column |
| Q-30 | The record leaves to the builder how the QR picks between two meetings that are equally soon. `handover_occurrences_partner_day_idx` orders by time and does not break ties. | Builder | A tie rule in the query |
| Q-31 | A repeating handover is a daily rule. A weekday rule (for example weekdays only) is not modelled. | Product owner | `days_of_week` on the rule |
| Q-32 | The meeting cut-off is one value per meeting (assumption 7 in section 1). A per-order cut-off needs each product's preparation time, which can be NULL until O22. | Product owner and merchant | The cut-off rule |
| Q-33 | Pickup hours are weekly spans in local time and a span cannot cross midnight. Overlapping spans are not refused. | Product owner | `pickup_place_hours` |
| C-4 | Builder note. The statuses of the record map to our order statuses with two additions: `on_the_way_to_partner` and `with_partner`. `handed_over` is Delivered. `packages/domain/src/orders/transitions.ts` must follow. | Builder | The domain transition table |
| Q-34 | Stale anonymous carts are deleted after 30 days without activity. The 30 days are a guess. | Product owner | The job setting |
| Q-35 | The cart id in the cookie is a UUIDv7. It is hard to guess and it is not a secret, and a cart holds only SKU ids and quantities until it is linked. Whether a linked cart needs a second secret is not decided. | Developer, security | The cookie and the cart read route |
| Q-36 | A cart line stores the unit price seen at the last check. A price change between the check and completion is caught by the re-check, and what the guest is told is a screen decision. | Product owner | Checkout copy |
| Q-37 | Category slugs are unique per store and not per parent. Whether the same slug may repeat under different parents is not decided. | Product owner | `product_categories_store_slug_key` |
| Q-38 | The order guest e-mail snapshot is a personal-data copy. How long it stays after the 10-year order retention and what erasure must keep wait for O33. | Lawyer | `guest_erased_at` rules |
| Q-39 | Settled by ruling G11-R6 (2026-10-27). A date entry cannot cross midnight. For a late event leave the end time empty, and the pin stays visible to the end of that day. | Settled | None |
| Q-40 | Settled by ruling G11-R5 (2026-10-27). A parent map category chip also covers pins tagged only with its sub-categories, and the read does it. | Settled | None |
| Q-41 | Settled by ruling G11-R2 (2026-10-27). The address is optional. A pin needs a title in at least one language, a location and a slug to publish. | Settled | None |
| Q-42 | G11. A slug change breaks shared `?place=<slug>` links. Q-3 already recommends locking the slug after the first publish. G11 strengthens that recommendation. | Product owner | A rule in the use case |
| Q-43 | Settled by ruling G11-R4 (2026-10-27). Nothing protects a pin's main story. A story is unpublished or deleted under its own rules, and the pin card omits a story link that has no published version. "A published version cannot move to another group" is a use case rule. | Settled | None |

The owner approved the partner handover record on 2026-10-26 as the answer to gate G6, so the flow is modelled. The record's six open questions are Q-23 to Q-28 with their owners. The PRD of 2026-10-26 settles Q-24, Q-25 and Q-26, the owner dropped Q-28, and Q-23 (O40) and Q-27 (O36) stay open.

Q-26 check. The two choices of AC78 need no new column. A guest who self-collects takes the guest switch (a pickup place and time, no meeting, same partner), which the tests accept. A guest who takes the full refund has the order cancelled with `cancelled_reason = 'guest'`, and the order keeps `partner_id`, so no commission is recorded because the order is never delivered. The refund itself is a ledger entry in `money`. A self-collect order that the merchant marks Delivered keeps the original partner, so the commission goes to that partner.

### Risks

| Risk | Effect | Mitigation |
|---|---|---|
| A jsonb CHECK with a NULL inside passes | A published row without a required key | Every such CHECK ends in `IS TRUE`. The test list holds one case for each |
| Constraint triggers are hand-written SQL that Drizzle does not track | A later generated migration could drop or ignore them | Keep the SQL in custom migrations, and keep the database tests in the suite |
| Triggers fire at commit, so errors arrive late | The editor sees the error after the save | The use case checks first and maps the constraint names to messages |
| An hour holds one order in the pilot | A reader could guess which session viewed the product that was later bought (owner accepted, M5) | No stored row links a session to an order. Roll-ups only for dashboards, and the small-count question Q-8 |
| A SKU escapes the combination trigger | `combination_key` stays NULL and the unique key skips it | A drift query for `combination_key IS NULL` |
| A cart completes while its lines are being edited | An order misses a line | The use case locks the cart row first, then reads its lines. The database refuses a line change after completion |
| A plain id can dangle | A comment names a story that does not exist, or a rating a product | The use case checks, rows are never deleted, and an orphan view lists exceptions |
| Hidden places keep their slugs | A new place cannot reuse an address | Intended. Revisit with Q-3 |
| A pin's main story has no published version in the reader's language (G11) | The pin card would link to a missing page | The read for AP-4 shows the link only when a published version exists in the reader's language |
| A pin whose dates ended stays `published` (G11) | It keeps its slug and the delete guard, and appears again if a date is added | Intended. `content.public_pins` is the only public read, so no other query may list pins |
| The two category tables and ADR-030 are written in parallel (G11) | Column names may drift | The record says "shaped like `catalog.product_categories`". Reconcile with ADR-030 when both land |
| The prototype data does not seed places | The map starts empty until the merchant adds places | ADR-005 chose this. Merchant content entry comes first (PRD O35) |

## 9. Lessons from Medusa

Owner gate S3 (2026-10-26) says to write our own commerce logic and learn from Medusa 2's schema and business model. No Medusa package enters the repository. I read the Medusa documentation through the Context7 index of docs.medusajs.com on 2026-10-26, and two model files on GitHub. I did not read workflow source code. A claim that no page I read supports is marked "not verified".

Our shape, for the "why" column. One product line (Victorinox knives). A SKU takes one value of each option of its product (Victorinox has Size, Theme and Colour). Pickup and guide handover, no shipping. Stripe and a ledger for money. One store in the pilot and several merchants later, scoped by `store_id`.

| Medusa concept and source | What the source says | Decision | Why for our shape |
|---|---|---|---|
| Product, option, option value, variant ([product models](https://docs.medusajs.com/resources/references/product/models/index.html.md), [ProductVariant](https://docs.medusajs.com/resources/references/product/models/ProductVariant/index.html.md)) | A product has options with values. A variant links to option values. The variant has `sku`, `barcode`, weight and size fields, `variant_rank` and the two policy flags | Adopt (owner M9) | `product_options`, `product_option_values` and `sku_option_values` replace our fixed size, theme and colour tables. We add what I did not find in Medusa's pages, a database key: a SKU takes one value of each option, a value belongs to its option and its product, and `combination_key` is unique per product. We take `sku_code` and skip barcode and weight |
| `manage_inventory` and `allow_backorder` on the variant ([ProductVariant](https://docs.medusajs.com/resources/references/product/models/ProductVariant/index.html.md)) | Without `manage_inventory` the variant is always in stock. With `allow_backorder` it can be bought out of stock | Skip for now | PRD 7.2 says a zero-stock SKU cannot be selected. The later pre-order (Q23) needs `allow_backorder`, which cannot sit beside `CHECK (held <= on_hand)`. ADR-022 records the path |
| Inventory item linked to a variant, with a required quantity ([variant inventory](https://docs.medusajs.com/resources/commerce-modules/product/variant-inventory), [inventory kit input](https://docs.medusajs.com/resources/references/product/interfaces/product.CreateProductVariantInventoryKit/index.html.md)) | A variant can use several inventory items, each with `required_quantity`, which makes kits | Skip | PRD 4.2 removes boxes and bundles. One SKU counts one knife, so the stock row stays keyed by SKU |
| Inventory level per location with stocked, reserved and incoming quantity ([concepts](https://docs.medusajs.com/resources/commerce-modules/inventory/concepts), [model on GitHub](https://github.com/medusajs/medusa/blob/develop/packages/modules/inventory/src/models/inventory-level.ts)) | One level per item and location. The model file declares defaults and a unique index on item and location, and I saw no check that reserved stays within stocked | Adapt | `on_hand` and `held` are our stocked and reserved. We drop location and incoming, and we add `CHECK (held <= on_hand)`, so the database stops an oversell and not only the code |
| Reservation item ([concepts](https://docs.medusajs.com/resources/commerce-modules/inventory/concepts), [model on GitHub](https://github.com/medusajs/medusa/blob/develop/packages/modules/inventory/src/models/reservation-item.ts)) | A reservation has `line_item_id` (nullable), `quantity`, `allow_backorder`, `description`, `created_by` and `external_id` | Adapt | Our `stock_holds` ties to an order line and keeps resolved rows as history (`held`, `issued`, `released`). When Medusa deletes a reservation is not verified. We skip the nullable line id, because the handover flow reserves stock per order line and needs no manual reservation |
| Stock location and sales channel ([links page](https://docs.medusajs.com/resources/commerce-modules/stock-location/links-to-other-modules), [variant inventory](https://docs.medusajs.com/resources/commerce-modules/product/variant-inventory)) | A sales channel links to stock locations, and availability counts only stock at the channel's locations | Skip | One storefront. `store_id` scopes merchants. Our pickup place is where a guest collects, not where stock sits |
| Pricing: price set, price, min and max quantity tiers ([price rules](https://docs.medusajs.com/resources/commerce-modules/pricing/price-rules)) | Prices live outside the variant, with quantity tiers and rules | Skip | One CHF price per SKU (`price_rappen`). No tiers or lists in the PRD. A price table can be added beside the SKU when a discount arrives |
| Cart and line item ([cart models](https://docs.medusajs.com/resources/references/cart/models/index.html.md), [line item](https://docs.medusajs.com/resources/references/cart/interfaces/cart.CartLineItemDTO/index.html.md)) | A cart holds line items. A line copies title, variant title, SKU, option values, product fields and the unit price | Adopt the cart (owner M7), adapt the line | `orders.carts` and `cart_lines` are server tables (DM-18). A cart line keeps the SKU, quantity, the price seen and the destination. The order line, not the cart line, carries the snapshot of titles and options (DM-14) |
| Add to cart and completion ([addToCartWorkflow](https://docs.medusajs.com/resources/references/medusa-workflows/addToCartWorkflow), [confirmInventoryStep](https://docs.medusajs.com/resources/references/medusa-workflows/steps/confirmInventoryStep/index.html.md), [reserveInventoryStep](https://docs.medusajs.com/resources/references/medusa-workflows/steps/reserveInventoryStep/index.html.md), [createOrdersStep](https://docs.medusajs.com/resources/references/medusa-workflows/steps/createOrdersStep/index.html.md)) | Adding a variant checks stock. A reserve step takes inventory item, quantity and `allow_backorder`. An orders step creates the order. One cart id completes into one order, with a lock per cart ([pre-order tutorial](https://docs.medusajs.com/resources/how-to-tutorials/tutorials/preorder)). In which step stock is reserved is not verified | Adopt, with two differences | We re-check stock and price at each change and at completion, and make completion safe to repeat with a split key and a cart lock. One cart can complete into several orders, because PRD 8.1 splits by pickup time and place and a handover meeting. A cart line holds no stock, because our stock is held at acceptance |
| Order, summary, display id ([order models](https://docs.medusajs.com/resources/references/order/models/index.html.md), [OrderPreviewDTO](https://docs.medusajs.com/resources/references/order/interfaces/order.OrderPreviewDTO/index.html.md)) | An order has `display_id`, `status`, `canceled_at`, a summary of totals and separate payment and fulfillment statuses | Adopt in part | We store `total_rappen` as a price snapshot, generate `ref` from a sequence, and add end-state timestamps tied to the status (DM-14). Payment status stays computed from the ledger, which matches the separate payment status Medusa shows and backend.md D5 |
| Order versions, order change, change action ([versioning](https://docs.medusajs.com/resources/commerce-modules/order/order-versioning), [edit](https://docs.medusajs.com/resources/commerce-modules/order/edit)) | The line keeps original details. A versioned row holds quantity and price per version. A confirmed edit raises the order version | Skip | Phase 1 has no item edit, so a change is a new order. `platform.audit_log` records time and status changes. When item edits come, adopt versioned lines |
| Payment collection, session, payment ([workflow output](https://docs.medusajs.com/resources/references/medusa-workflows/refundPaymentAndRecreatePaymentSessionWorkflow/index.html.md), [payment flow](https://docs.medusajs.com/resources/commerce-modules/payment/payment-flow)) | A collection holds the amount, authorized, captured and refunded amounts and a status. A session authorizes with a provider | Skip | Our ledger derives these amounts from entries (D5) and records cash and external money, which a collection does not. `payment_attempts` plays the session. Revisit when the money module is designed |
| Fulfillment set, service zone, shipping option, fulfillment ([fulfillment models](https://docs.medusajs.com/resources/references/fulfillment/models/index.html.md)) | Shipping options belong to service zones. A fulfillment has `packed_at` and `shipped_at` | Skip | No shipping. The partner handover is modelled as handover and meeting tables with order statuses (DM-16, DM-17), and the packed and handed-over times are statuses and timestamps on the order |
| Product category and collection ([relations overview](https://docs.medusajs.com/resources/references/product/models/index.html.md)) | Categories form a tree. Collections group products | Adopt categories as tables only (owner M10), skip collections | `catalog.product_categories` and `product_category_links` with a cycle check. No screens in Phase 1. The four fixed categories of D17 stay retired |
| Soft delete, `metadata`, big-number columns ([order model fields](https://docs.medusajs.com/resources/references/order/interfaces/order.OrderPreviewDTO/index.html.md), [model files on GitHub](https://github.com/medusajs/medusa/tree/develop/packages/modules/inventory/src/models)) | Models carry `deleted_at` and a `metadata` bag. Amounts have a raw companion. The inventory indexes are partial on `deleted_at IS NULL` | Skip | We hide or archive with a status, keep a closed schema, and store money as `bigint` Rappen |

What this changed in the tables.

0. Owner answers of 2026-10-26 adopted the cart (M7), the generic options (M9) and the categories (M10). The numbered list below is the first study, and these three now sit on top of it.

1. `catalog.skus` has `sku_code`, unique per store.
2. `orders.order_lines` is a write-once snapshot: product id, SKU code, localized product name, option values, thumbnail id, quantity, unit price and a generated line total.
3. `orders.orders` has a stored `total_rappen` that a deferred trigger keeps equal to the lines, a generated `ref` from `display_number`, and `cancelled_at` and `declined_at` beside `completed_at`, each tied to its status.
4. No stock table changed. The study confirmed the one-row-per-SKU shape and the database CHECK, and ADR-022 records why the policy flags stay out.

What did not change, and why. No inventory item, location level or purchasing flag was added (ADR-022). The cart and the guest name and e-mail snapshot, which the first study left open as decisions 6 and 7, are now settled by the owner (M7, M8) and modelled in DM-18 and DM-19.