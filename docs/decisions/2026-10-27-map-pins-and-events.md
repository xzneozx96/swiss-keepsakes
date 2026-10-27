# Map pins, local events and categories

- Date: 2026-10-27
- Status: approved by the owner on 2026-10-27
- Changes: `docs/PRD/Swiss_keepsakes_PRD.md` §2, §11.1, §11.2, §11.4, §11.5, §15, gate G8, O23; the data model, ADRs, screens and plan rows listed under "What this changes"
- Source: the owner's content list (four groups, 27.10.2026) and the brainstorm of the same day

## Intent

The map is the main screen of the product (PRD §11.1). The owner wants it to be a curated local guide to Lucerne: the places a local friend would point a visitor to. That covers sights on a walk, photo spots, bakeries and pubs, free toilets and drinking water, markets, free concerts and meetups.

Most of these places have no story behind them. Today the PRD and the database refuse to publish a sight or restaurant pin without a main story (AC43). That rule would force a full article for every bakery before it can appear on the map. The owner removes it: a pin stands on its own, and a story is an optional extra.

## Goals

- The merchant can pin any place or event on the map, with or without a story.
- A visitor taps a pin and gets a useful card: photo, the merchant's tip, hours, address, and a button that opens directions in the phone's own map app.
- Visitors pick a category chip on the map. The chip highlights that category and dims the other pins. The merchant creates and edits the categories.
- Events such as markets and concerts show on the map as soon as they are published, with their next date, and disappear after their last date without the merchant doing anything.
- The map looks like the current tour-detail map, but flat: swisstopo aerial photos with names on top.

## Non-goals

- Guest reviews of places. They are dropped (see "Decisions").
- Pages for places or events that search engines index. Stories carry all of the search traffic.
- Tickets, sign-ups or capacity for events.
- Reminders that an event's dates are getting old.
- Events that repeat every year on their own. The owner has no such event.
- Paid (affiliate) links and their label. They wait until the first paid link exists.
- Tips that have no fixed location (free tourist card, cheap tickets) as map items. They become stories.

## Anti-goals

- A visitor edits, saves or shares pins of their own. Only the merchant edits pins. This is not Wanderlog for visitors.
- The site asks for the visitor's location or draws a route (G9 stays).
- The map shows a price anywhere (Q24, AC54 stay).
- A dated event that has ended stays on the map.

## Constraints

- E2.5 (merged) built `content.places` with a fixed `type`, the story-required CHECK and the pin triggers in `api/migrations/0008_content.sql`. The change needs a new migration, not an edit of 0008. Nothing reads the table in production yet, and the content API (E2.6) is not built.
- MapLibre is already a dependency. No new map library is added.
- Pins: up to a few hundred (data-model sizing, ADR-006). One list response and one map layer handle that.
- Every visible text exists in EN and DE, with the language notice when one is missing (AC64).

## Approaches

| Approach | What it means | Trade-off |
|---|---|---|
| **A. One kind of pin with an optional schedule (chosen)** | One table, one editor, one map card. Any pin can carry weekly hours and, optionally, dates. A pin with dates hides itself after the last one | Builds everything once. If events later need their own features, the shared form grows, and events can be split out then |
| B. Places and events as two entities | Two tables, two editors, two cards, and the map merges two lists | Clean if they drift apart, but builds almost everything twice for one difference (the dates) |
| C. Events always belong to a place | An event needs a place to exist | Contradicts the owner: events have their own location. Ruled out |

Why A: once reviews and pages were dropped, a place and an event differ only in the dates. Some real items are both. The flea market has weekly hours and could be filed as either. With A, the merchant fills one form and adds dates only when something ends. The merchant screen still offers **Add place** and **Add event** as two ways into that form.

## Research notes

- **Event schedules.** schema.org models a repeating event as a `Schedule` with `byDay` and an active date range, and a one-off event as plain start and end dates. Weekly hours plus optional dates covers both. https://schema.org/Schedule, https://schema.org/eventSchedule
- **Map pins.** One symbol or circle layer from one data source scales into the thousands. HTML markers are fine below about 100. Category chips are a layer style change (highlight and dim), not a reload. https://docs.mapbox.com/help/ja/dive-deeper/markers-vs-layers/ (Mapbox docs; MapLibre shares the model)
- **swisstopo terms.** Federal geoservices are free and need no registration. The fair-use benchmark is a web app averaging 20,000 users a day. The source must be credited ("© swisstopo"). https://www.geo.admin.ch/en/general-terms-of-use-fsdi. ADR-006 records SWISSIMAGE as open data with commercial use allowed. The Light Base Map's listing on opendata.swiss says "commercial with permission", which is one reason the aerial style was preferred.
- **OpenFreeMap terms.** Commercial use: "Yes." No limits on views, no key. Credit for OpenFreeMap, OpenMapTiles and OpenStreetMap is required, and MapLibre adds it automatically. https://openfreemap.org/
- **Codebase.** The tour-detail map style is `front-end/src/features/tours/map/aerial-style.ts`: SWISSIMAGE photos, AWS Terrarium 3D terrain, and OpenFreeMap text layers. The plan already shares one map component between the map and the tour route map (E4.6).

## Decisions

All by the owner on 2026-10-27, except the ones marked "coordinator's call", which the owner can overturn while reading.

**Who edits.** Only the merchant (Owner or Manager) adds, moves, hides and deletes pins.

**Publishing.** Any pin can be published on its own. A main story link and an outbound link are optional on every pin. AC43's story requirement, the fixed place `type` and gate G8's four types go.

**One pin model.** A pin has:
- a title and a description (the merchant's tip), in EN and DE;
- one photo, shared by both languages, with alt text in EN and DE;
- a location, as coordinates and an address;
- map categories. Coordinator's call: none is required to publish. A pin with no category shows only under **All**;
- a stay tag and interests;
- weekly hours (optional);
- dates (optional, see below);
- a main story link (optional) and an outbound link (optional);
- a status: draft, published or hidden.

Draft pins can be deleted. Published pins can only be hidden (M6 and AC79 stay).

**Dates.**
- A published pin with dates shows from the moment it is published. The card shows the next date.
- The pin disappears after its last date.
- A pin without dates shows until the merchant hides it.
- Coordinator's call on the shape: a pin can have several date entries. Each entry is either one day with optional start and end times ("14 Nov, 19:30 to 21:00") or a range of days ("20 Nov to 23 Dec"). Weekly hours apply inside a range.

**The pin card.** Tapping a pin opens a card over the map with:
- the photo, the tip, the hours and the address;
- the next date, for a pin with dates;
- the main story link, if any;
- the other published stories that tag the pin (coordinator's call: kept from today's AC42, and `content.story_group_places` stays);
- the outbound link, if any;
- **Open in Google or Apple Maps**.

Handing directions to the phone's map app is within G9, because the site neither reads the visitor's location nor draws a route. A link of the form `/:lang/map?place=<slug>` opens the map with the card showing. Coordinator's call: links use the slug, so the `slug` column stays and shared links are readable.

**No pages for pins.** Places and events have no page of their own and are not in the sitemap. The planned place page (`/:lang/places/:slug`, E4.8) goes. Search (E4.14) still finds pins. A result opens the map link above.

**No guest reviews of places.** PRD §11.4, the place half of AC46 and AC48, AC49's reviews on hotel pages, `reviews.place_reviews`, E5.2 and the place half of E5.4 go. The merchant's own reviews of places stay as stories (editorial reviews), linked from the pin.

**Outbound links.** Any pin can have one outbound link, and every outbound link renders through one function (ADR-011 keeps that rule). For now every link is plain. A label for paid links ("partner link") and the affiliate fields wait until the first paid link exists. Because all links go through one function, adding them later changes no content. A hotel is a pin in a category such as "Stays", with nothing else special about it.

**Categories.** Two lists, both edited by the merchant like product categories: names in EN and DE, an order, and one level of sub-categories.
- Map categories tag pins. They are the chips on the map: a chip highlights its pins and dims the others, and no pin is hidden by a chip. Example: Walking sights, Photo spots, Local food and drink, Free essentials, Local activities.
- Blog categories tag stories. Example: Legends, Swiss history, Practical tips.

A pin can sit in several map categories (Zytturm is a walking sight and a photo spot), and it then shows under each chip.

**Interests stay.** The four fixed interests remain the onboarding answers and only change the order of items (§3.2). Categories highlight, and interests rank. The merchant tags both. Visitors see only the categories as filters.

**Tips without a location** become stories, usually in a "Practical tips" blog category.

**The map.** MapLibre, as today. Both the map and the tour route map use the tour-detail look: swisstopo SWISSIMAGE photos with OpenFreeMap names on top. Both are flat 2D, with no tilt and no 3D terrain. The AWS Terrarium source is removed. The map shows "© swisstopo" and the OpenFreeMap, OpenMapTiles and OpenStreetMap credit. This settles the tile part of O23.

## What this changes

**PRD**
- §2: remove "place type", "story pin" and "practical pin". Add "pin", "map category", "blog category" and "local event".
- §11.1: rewrite it with the decisions above.
- §11.2: stories get blog categories.
- §11.4: remove the section.
- §11.5: rewrite it. A hotel is a pin with an optional outbound link and optional editorial review. Paid links and their label come later. O33 stays open.
- §15: rewrite AC42, AC43, AC62, AC63 and AC68. Narrow AC46, AC48 and AC49 to story comments, or retire their place parts. Add new ACs:
  - a pin publishes without a story;
  - a dated pin shows before its first date and disappears after its last date;
  - categories can be created, renamed, reordered, and deleted only when unused;
  - a pin in two categories appears under both chips;
  - the directions button;
  - a `?place=` link opens the map with the card.
- Appendix A: record gate G8 as overturned by this record.
- O23: close the tile part. §18.2: add the change log.

**Data model** (`docs/specs/001-storytelling-pivot/data-model.md` and `er/`)
- `content.places`:
  - drop `type`;
  - drop the CHECKs `places_practical_no_story_check` and `places_pin_has_story_check`;
  - drop the unique key `places_id_type_key`;
  - drop the triggers `places_type_is_immutable`, `story_versions_keep_pin_story` and `story_versions_keep_pin_story_on_delete`, and `places_pin_has_published_story`;
  - add the address and hours.
- Drop the composite foreign keys on `(id, type)` from `story_groups` and `place_links`.
- Keep the other publish rules: fixed `first_published_at`, published story text kept once set, the delete guards and the TRUNCATE guards.
- New tables:
  - `content.place_dates`, for the date entries;
  - `content.map_categories` and `content.blog_categories`, shaped like `catalog.product_categories`;
  - `content.place_categories` and `content.story_categories`, the link tables.
- `content.place_links`: any pin can have one outbound link. Today's `kind`, `network` and `disclosure` fields wait for the first paid link.
- `content.story_groups`: drop `subject_place_type`. An editorial review can be about any pin.
- Remove `reviews.place_reviews` and its moderation target. Update DM-8 and the rows that name place reviews (around lines 169, 252 and 2070).
- DM-5: rewrite it so it keeps only the rules that stay.
- Migration: a new expand-and-contract migration after `0008_content` (it drops columns and triggers; the number is assigned when it is written, `00NN_content_pins`), plus the matching changes to `api/test/integration/content-schema.test.ts`.

**ADRs**
- Amend ADR-015. Do not supersede it. Remove the pin rule and the fixed type, and keep the other rules listed above.
- Amend these ADRs:
  - ADR-002, so places are no longer an indexable page type;
  - ADR-005, for the pin aggregate;
  - ADR-006, for map data with categories and dates, and the tile choice;
  - ADR-008 and ADR-018, so reviews no longer cover places;
  - ADR-011, so the link sits on any pin, with paid-link fields deferred.
- New: "Merchant-edited map and blog categories" and "One pin model with optional dates".

**Architecture.** Bring AD-6, AD-7, AD-12 and the route list into line. `/:lang/places/:slug` goes.

**Screens** (`docs/development-plan/screen-inventory.md`)
- N03: the pin card, with no review summary and no practical-pin variant.
- N04: the place page goes.
- N05: place reviews go.
- N17: the pin editor, with no type choice.

**Delivery plan**
- Change:
  - E2.6, for public reads of pins with categories and dates, hiding pins whose last date has passed;
  - E3.6, so the sitemap has no place pages;
  - E4.2, the pin editor with categories and dates;
  - E4.6, category chips and the flat aerial style;
  - E4.7, the pin card with directions;
  - E4.12, the tour map style;
  - E4.14, so results open the map link and no longer depend on E4.8;
  - E4.17, so the journeys drop the place page;
  - E9.8, launch content.
- Keep E8.9, the map report. It still counts pin opens and pin-to-story clicks.
- Remove E4.8 and E5.2. Narrow E5.4 to story comments. Update the sprint map row that schedules E4.8.
- Add a schema-change story and the category editor (two lists).

## Rulings after the review (2026-10-27)

Decided by the coordinator, except G11-R9, which the owner decided. They settle the data-model questions Q-5 (display name), Q-39, Q-40, Q-41 and Q-43.

- **R1.** A story comment shows its author as first name and initial ("Anna K.").
- **R2.** To publish a pin the merchant must give a title in at least one language, a location and a slug. Photo, address, categories, story, link, hours and dates are optional.
- **R3.** A `?place=` link to a hidden, expired or unknown pin opens the map normally with a short notice ("This place is no longer on the map").
- **R4.** Nothing protects a pin's main story. A story is unpublished or deleted under its own rules, and the pin card omits a story link with no published version. "A published version cannot move to another group" is a use case rule: the use case refuses the move.
- **R5.** A parent category chip also covers pins tagged only with its sub-categories. The read does it.
- **R6.** A date entry cannot cross midnight. For a late event the merchant leaves the end time empty, and the event stays visible to the end of that day.
- **R7.** The pin detail read stays `GET /api/public/places/:id`. ADR-030 is accepted.
- **R8.** The migration number is assigned when it is written (`00NN_content_pins`). Its kind is expand-and-contract, because it drops columns and triggers.
- **R9 (owner).** Category chips highlight the chosen category and dim the other pins. No pin is ever hidden by a chip (the owner's decision D7 stays, now for map categories). A pin in two categories is highlighted under both chips. A pin with no category is highlighted only under **All**.
- **R10.** A category name needs at least one of EN or DE, as for product categories (AC30). A category that has sub-categories or tagged items cannot be deleted.

## Left to the builder

- Whether the address and hours are columns or fields in the pin documents.
- How "after the last date" is computed: the end of that day, or the end time if one is set, in Europe/Zurich.
- The order of chips, and what an empty category shows.
- Clustering, only if the pin count makes the map unreadable.
- The flat style's exact label colours and zoom limits.

## Open questions

| # | Question | Who decides | Needed before |
|---|---|---|---|
| 1 | Is SWISSIMAGE commercial use confirmed in swisstopo's current dataset terms? Re-read them before launch, as ADR-006 says. | Developer | Launch (E9.4) |
| 2 | Paid links: when the first affiliate partner exists, how the label reads and where it shows (O33, O39). | Owner, lawyer | The first paid link |
