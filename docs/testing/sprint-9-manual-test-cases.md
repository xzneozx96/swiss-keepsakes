# Sprint 9 manual test cases

- **Sprint:** 9 (release 2a, the guest view)
- **Stories covered:** E4.5 onboarding, E4.4 stories (list, page, filter, keepsake cards), E4.13 home, map parameters and the map category icon, E4.14 search, E6.4 keepsake list, product page and pickup in the add sheet, the demo tour pages' keepsake block (T-TOUR-KEEPSAKES).
- **What to test:** each story's branch (`xzneozx96/s9-e4.5`, `s9-e4.4`, `s9-e4.13`, `s9-e4.14`, `s9-e6.4`), or local main once the merged PRs are on it.
- **Written:** 2026-11-04. Format: `docs/development-rules/shared/manual-test-cases.md`.
- **Why manual:** no worker ran a browser this sprint, and component and server-HTML tests replace the Playwright proofs (gate G-S9-D-PROOF). These 120 cases are the browser proof. 35 are P1.

## Before you start

1. **Run the app.** From `api/` run `pnpm dev`. From `front-end/` run `pnpm dev`. Use the dev Neon database. Do not print or share the database URL.
2. **Seed and migration, already done on dev.** `pnpm db:seed:story-keepsakes` (five story-to-keepsake links, add only) and migration `0026_map_category_icon` are applied to dev. If a case finds no icon column or no keepsake card on a story, ask the developer before you fail the case. The five Victorinox keepsakes (`swiss-tool-spirit-x-plus`, `swisschamp`, `explorer`, `swiss-army-7-alox`, `classic-sd`), the curated places and the three demo tours (`lucerne-the-things-that-remain`, `pilatus-above-the-city`, `rigi-from-lake-to-sky`) come from the earlier seeds. Do not delete them.
3. **A fresh guest profile.** Open a new private window, or a new browser profile, with no site data for the front-end address. That gives a guest with no answers, no saved language and no onboarding record. To reset one profile, clear site data for the address (browser settings, Site data). Onboarding answers live in the browser key `sk.onboarding`; clearing site data removes them.
4. **Accounts.** One browser profile per role: a guest (signed out), and a merchant or Owner who owns the seeded store (the demo owner account you normally test with). Owner cases that change data say so and say how to put it back.
5. **Language.** Cases use English. Use the language switch in the header only where a case says so, or open `/de/...` directly.
6. **Widths.** Test at 375 px (browser device toolbar) and on desktop at 1280 px. Each case names the width it needs. Real touch gestures (S9-HOME-17) need a real phone or a touch emulation that sends two-finger input.
7. **Devtools.** Some cases read the Network tab or block a request. In Chrome devtools, Network tab, right-click a request and choose Block request URL; remove the block afterwards.
8. **SQL.** Lookups use SELECT only; ask the developer for a read-only connection. For example `SELECT slug, name FROM content.map_categories ORDER BY position;` lists the map category slugs. Do not write to the database by hand.
9. **Case ids that did not follow the ticket ranges.** The ticket for T-E4.13d named S9-HOME-09 to 15, and T-E4.13e named S9-HOME-16 to 21; the showcase cases are S9-HOME-28 and 29, and the failed-read case is S9-HOME-30. The pickup cases keep the ticket ids S9-KEEP-10 to 14 and sit under their own heading; S9-KEEP-15 to 18 were added after the reports.

## The icon list to review (S9-ICON-01)

Eight groups, 78 keys. Each key is drawn with one `reicon-react` drawing (key = drawing). No worker saw a drawing, so this review is the only visual check.

- **Essentials:** toilet=Bath, water=Drop, wifi=Wifi, locker=Safe, cash=Banknote, bank=Bank, info=InfoCircle, emergency=Siren, pharmacy=Pill, hospital=Hospital, post=Mailbox.
- **Transport:** transport=Bus, train=Tram, boat=Ship, bicycle=Bicycle, scooter=Scooter, car=Car, airport=Plane, fuel=GasStation, parking=Parking, charging=EvCharge, taxi=Car3.
- **Food and drink:** restaurant=ForkKnife, cafe=Coffee, bar=Wineglass, brewery=Glass, bakery=Cookie, pizza=PizzaSlice, dessert=Donut, tea=TeaCup, market=Basket, supermarket=Cart.
- **Sights:** landmark=Building, church=Bell, castle=Castle, tower=Tower, bridge=Link, monument=Crown, museum=Courthouse, viewpoint=Telescope, square=Buildings, old-town=City, photo-spot=Camera, art=Palette, theatre=Masks, library=Library.
- **Shopping:** shop=Shop, souvenirs=Gift, watches=Watch, clothing=Tshirt, jewellery=GemSparkle, books=Book, bags=Bag.
- **Nature and outdoors:** mountain=ImageMountain, park=Leaf, tree=Tree, lake=Water, snow=Snowflake, sun=Sun, hiking=Hiking, cycling=Cycling, swimming=Swimming, campfire=Bonfire.
- **Events and leisure:** event=Calendar, festival=Confetti, concert=MusicNote, tickets=Ticket, fair=FerrisWheel, sport=Football, wellness=Meditation, family=Users, pets=Paw.
- **Travel and stay:** holiday=Suitcase, hotel=Bed, laundry=Washer, tour=Compass, route=Route, walk=Walk.

**Nearest-drawing picks to judge:** toilet=Bath (no WC drawing), church=Bell, bridge=Link, monument=Crown, museum=Courthouse, landmark=Building, taxi=Car3, square=Buildings.
**Old keys whose drawing changed from the 2026-11-02 set:** locker Cabinet to Safe, cash Money to Banknote, square Compass to Buildings, holiday Sun to Suitcase, bridge Route to Link, monument Award to Crown, museum Gallery to Courthouse, supermarket ShoppingCart to Cart.

## Summary

| ID | Title | Story / AC | Priority | Result | Notes |
|---|---|---|---|---|---|
| S9-HOME-01 | A pin without a photo shows its category icon on the map | E4.13 (T-E4.13b) / AC95 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-02 | The home shows its blocks in the fixed order | E4.13 (T-E4.13c) / AC95 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-03 | A service tile opens the map with that category and at least one place | E4.13 (T-E4.13c) / AC95 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-04 | Show on the home switches a tile on and off | E4.13 (T-E4.13c) / AC95, gate G-S9-TILES | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-05 | A tile with no published place is hidden | E4.13 (T-E4.13c) / AC95, gate G-S9-EMPTY-TILE | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-06 | The home in German | E4.13 (T-E4.13c) / AC64 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-07 | View source of the home has the text, the tags and no price | E4.13 (T-E4.13c) / AC54, AC61 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-08 | The search pill and the advice banner | E4.13 (T-E4.13c) / AC95 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-09 | "See these first" and the routes show in the curated order with no answers | E4.13 (T-E4.13d) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-10 | Answering "A few days" swaps the routes and leaves the rest alone | E4.13 (T-E4.13d) / AC95 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-11 | An interest moves a postcard to the front and hides none | E4.13 (T-E4.13d) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-12 | The pill reopens the flow with the answers filled | E4.13 (T-E4.13d) / AC36 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-13 | A postcard, a story pill and a route card open their targets | E4.13 (T-E4.13d) / AC54 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-14 | The rails in German | E4.13 (T-E4.13d) / AC64 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-15 | View source has the postcard names and route titles | E4.13 (T-E4.13d) / AC61 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-16 | The food map mounts when it is near, with no page jump | E4.13 (T-E4.13e) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-17 | One finger scrolls the page, two fingers move the food map | E4.13 (T-E4.13e) / AC95 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-18 | The food map list holds Food and drink and the sheet reaches the others | E4.13 (T-E4.13e) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-19 | A food pin without a photo shows its icon in the card | E4.13 (T-E4.13e) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-20 | The food map in German, and a card's Google Maps link | E4.13 (T-E4.13e) / AC64 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-21 | Rename keeps the food section, delete removes it | E4.13 (T-E4.13e) / AC95, gate G-S9-D-SMALL (FOODCAT) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-22 | A dated pin shows as "This week" with no price | E4.13 (T-E4.13f) / AC54, gate G-S9-EVENTS | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-23 | A running event shows "Until <day>" | E4.13 (T-E4.13f) / gate G-S9-EVENTS | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-24 | Three later events are listed under "Coming up" | E4.13 (T-E4.13f) / gate G-S9-EVENTS | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-25 | A fourth later event adds "See all on the map" | E4.13 (T-E4.13f) / gate G-S9-EVENTS | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-26 | With no dated pin the section is not drawn | E4.13 (T-E4.13f) / gate G-S9-EVENTS | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-27 | An ended event is gone, and several "This week" events form a carousel | E4.13 (T-E4.13f) / AC54 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-28 | The Victorinox showcase keeps its shipped look with real keepsakes | E4.13 (T-E4.13d fix) / AC95, rule keep shipped components intact | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-29 | A sold-out keepsake is left out of the showcase | E4.13 (T-E4.13d fix) / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-HOME-30 | A failed read shows an error with retry in its own block | E4.13 (T-E4.13c, T-E4.13d) / AC-6 of both tickets | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-01 | A parent category slug filters the map to it and its sub-categories | E4.13 (T-MAP-PARAMS) / AC42 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-02 | A sub-category slug filters to that sub-category only | E4.13 (T-MAP-PARAMS) / AC42 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-03 | The dated parameter shows only pins with a next date | E4.13 (T-MAP-PARAMS) / AC42 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-04 | An unknown category slug shows every pin and a notice | E4.13 (T-MAP-PARAMS) / AC90 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-05 | A place link wins over the category | E4.13 (T-MAP-PARAMS) / AC90, gate G-S9-D-SMALL (MAPPARAMS) | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-06 | Clearing the filter removes the parameter and Back skips it | E4.13 (T-MAP-PARAMS) / AC93 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-07 | Category and dated together show the intersection | E4.13 (T-MAP-PARAMS) / AC42 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-MAP-08 | A place slug that does not exist shows a notice | E4.13 (T-MAP-PARAMS) / AC90 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ICON-01 | The icon list is complete and each icon is drawn | E4.13 (T-E4.13a) / AC95 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ICON-02 | Group headings and icon names in German | E4.13 (T-E4.13a) / AC64 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ICON-03 | Pick an icon and see it in the table | E4.13 (T-E4.13g) / AC95 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ICON-04 | None clears the icon | E4.13 (T-E4.13g) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ICON-05 | A blog category has no icon picker | E4.13 (T-E4.13g) / ADR-030 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ICON-06 | The picker works with the keyboard, at 375 px and in German | E4.13 (T-E4.13g) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ICON-07 | A cluster of pins shows icons or photos, no letter | E4.13 (T-E4.13b) / AC95 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-01 | A first visit at the home opens the flow | E4.5 (T-E4.5a) / AC36 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-02 | Skip on step 1 goes to step 2, Escape on step 2 keeps the stay | E4.5 (T-E4.5a) / AC36 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-03 | Answers survive a reload, and cleared data shows the flow again | E4.5 (T-E4.5a) / AC37 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-04 | The flow in German fits at 375 px | E4.5 (T-E4.5a) / AC36 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-05 | A story link first, then the Explore opening shows the flow | E4.5 (T-E4.5a) / AC24, AC91 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-06 | A signed-in merchant sees no flow and no Account row | E4.5 (T-E4.5a) / AC92 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-07 | "Your trip" opens change mode with the answers filled | E4.5 (T-E4.5a) / AC36 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-08 | "Forget my answers" clears and closes | E4.5 (T-E4.5a) / AC36 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-09 | Keyboard only, and reduced motion | E4.5 (T-E4.5a) / AC36 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-10 | A story link in a fresh profile shows the card after 10 seconds | E4.5 (T-E4.5b) / AC91 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-11 | Closing the card hides it for the visit | E4.5 (T-E4.5b) / AC91 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-12 | After hiding the card, Explore still opens the flow | E4.5 (T-E4.5b) / AC24 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-13 | "Personalize my visit" opens the flow, and the German card fits | E4.5 (T-E4.5b) / AC36 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-14 | "Just today" sinks multi-day pins in the map list | E4.5 (T-E4.5c) / AC44 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-15 | "A few days" and an interest put matching pins first | E4.5 (T-E4.5c) / AC38 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-16 | Every pin stays on the map, and the list and the card row agree | E4.5 (T-E4.5c) / AC93 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-17 | A partner QR or link to the home shows no flow and drops its marker | E4.5 (fix unit, decision 2026-11-04) / AC24, AC91 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-ONB-18 | A partner link to a story keeps its other query parts | E4.5 (fix unit) / AC91 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORIES-01 | Only categories that have a story are offered | E4.4 (T-E4.4e) / AC30, gate G-S9-STORY-FILTER | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORIES-02 | A parent includes its sub-categories' stories | E4.4 (T-E4.4e) / ADR-030 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORIES-03 | Back and a shared link keep the filter | E4.4 (T-E4.4e) / AC61 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORIES-04 | A wrong or unused slug shows every story | E4.4 (T-E4.4e) / AC30 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORIES-05 | The filter row in German | E4.4 (T-E4.4e) / AC64 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORIES-06 | After onboarding the filter and the order work together | E4.4 (T-E4.4e) / AC38 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORIES-07 | A failed category read keeps the list and drops the row | E4.4 (T-E4.4e) / AC30 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-01 | The stories list in English and German | E4.4 (T-E4.4b) / AC30, AC61 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-02 | A one-language story shows with a language tag | E4.4 (T-E4.4b) / AC64 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-03 | After onboarding the order changes and no story disappears | E4.4 (T-E4.4b) / AC38 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-04 | A story page has the full text, the details and a working contents list | E4.4 (T-E4.4c) / AC32 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-05 | A video loads only when played | E4.4 (T-E4.4c) / AC32 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-06 | The language switcher goes to the other language's slug | E4.4 (T-E4.4c) / AC64 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-07 | A story address in a language it lacks redirects to the existing version | E4.4 (T-E4.4c) / ADR-002 step 6, AC64 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-08 | View source of a story has the text and the tags | E4.4 (T-E4.4c) / AC61 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-09 | The sitemap lists the story pages per language | E4.4 (T-E4.4c) / AC61 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-10 | A story with seeded keepsake links shows cards without a price | E4.4 (T-E4.4d) / AC31, AC54 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-11 | An unpublished keepsake's card is gone | E4.4 (T-E4.4d) / AC54 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-12 | A keepsake with zero stock shows "Sold out" and still opens | E4.4 (T-E4.4d) / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-13 | A place tag opens the map with that place's card | E4.4 (T-E4.4d) / AC90 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-14 | A story with no keepsakes, related stories or places shows no empty heading | E4.4 (T-E4.4d) / AC33 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-15 | An unknown story address is a 404 | E4.4 (T-E4.4c) / AC61 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-STORY-16 | Related stories open in their own language | E4.4 (T-E4.4d) / AC33 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-01 | The list shows published keepsakes and no price | E6.4 (T-E6.4b) / AC54 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-02 | A sold-out keepsake says so and still opens | E6.4 (T-E6.4b) / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-03 | The list handles a failed read | E6.4 (T-E6.4b) / AC54 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-04 | The page text comes from the server and has no price | E6.4 (T-E6.4c) / AC54, AC61 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-05 | A sold-out size cannot be picked | E6.4 (T-E6.4c) / AC52, AC53 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-06 | A combination that is not sold cannot be reached | E6.4 (T-E6.4c) / AC52 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-07 | A variant photo moves to the front | E6.4 (T-E6.4c) / AC52 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-08 | No engraving, and a failed availability read | E6.4 (T-E6.4c) / AC55, AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-09 | An unknown keepsake is a 404, and a missing language redirects | E6.4 (T-E6.4c) / AC61, AC64, ADR-002 step 6 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-15 | The language notice shows only when the saved language has no version | E6.4 (T-E6.4c) / ADR-002 step 7, AC64 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-16 | The language switcher lands on the other slug | E6.4 (T-E6.4c) / AC64 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-10 | Only open days can be picked | E6.4 (T-E6.4d) / AC26, gate G-S9-PICKUP-SHEET | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-11 | A closed day explains itself | E6.4 (T-E6.4d) / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-12 | Changing the place keeps or clears the date | E6.4 (T-E6.4d) / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-13 | The fold-outs show the points and the choice | E6.4 (T-E6.4d) / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-14 | No points, a failed read, and no cart behaviour | E6.4 (T-E6.4d) / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-17 | The pickup sheet in German | E6.4 (T-E6.4d) / AC26, AC64 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-KEEP-18 | The earliest day is today only while the point is still open | E6.4 (T-E6.4d) / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-TOUR-01 | A demo tour page shows up to three real keepsakes, no price | T-TOUR-KEEPSAKES / AC31, AC54 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-TOUR-02 | A card opens its keepsake page | T-TOUR-KEEPSAKES / AC31 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-TOUR-03 | No published keepsake hides the block | T-TOUR-KEEPSAKES / edge case | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-TOUR-04 | A failed keepsake read hides the block | T-TOUR-KEEPSAKES / edge case | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-01 | Search opens from the home pill with five interest tiles | E4.14 (T-E4.14b) / AC94 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-02 | Search ignores accents | E4.14 (T-E4.14b) / AC94 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-03 | Each row type opens its page | E4.14 (T-E4.14b) / AC90, AC54 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-04 | An interest tile gives a chip and a count | E4.14 (T-E4.14b) / AC94 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-05 | A query with no match offers real names and the tiles | E4.14 (T-E4.14b) / AC94 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-06 | Search in German | E4.14 (T-E4.14b) / AC94, AC64 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-07 | Keyboard focus is visible on every control | E4.14 (T-E4.14b) / AC94 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-08 | The clear button empties the field | E4.14 (T-E4.14b) / AC94 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-09 | The search page is not indexed | E4.14 (T-E4.14b) / AC61 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-10 | A failed keepsake read still shows the other kinds | E4.14 (T-E4.14b) / AC94 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-11 | An unpublished keepsake and an ended event are not found | E4.14 (T-E4.14a) / AC54, AC94 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S9-SEARCH-12 | Reduced motion: the tiles do not scale on press | E4.14 (T-E4.14b) / AC94 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |

## Home (HOME)

### S9-HOME-01 A pin without a photo shows its category icon on the map
- **Story / AC:** E4.13 (T-E4.13b) / AC95
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A published place with no photo whose category has an icon (use a category you set in S9-ICON-03), and one whose categories have no icon.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map` and find the place with no photo. | Its pin shows the category icon in white on lake blue, with no letter. |
| 2 | Find the place whose categories have no icon. | Its pin shows a plain pin icon, not a letter. |
| 3 | Tap the first pin. | Its card opens and the thumbnail slot shows the same icon. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-02 The home shows its blocks in the fixed order
- **Story / AC:** E4.13 (T-E4.13c) / AC95
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh guest profile (see Before you start), English.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en`. | The hero with a search pill shows first. |
| 2 | Scroll down. | In order: "First time in Lucerne?" with a map picture, "Sorted before you unpack" with tiles, "See these first", "Walk it the way we would", "Eat and drink like a local", "While you're in town" (only when a pin has a date), the Victorinox block with its thread line, then the advice banner. |
| 3 | Look for a price or a count. | No price and no number under five anywhere. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-03 A service tile opens the map with that category and at least one place
- **Story / AC:** E4.13 (T-E4.13c) / AC95
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** At least one category with Show on the home on and a published place.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en` and press a tile under "Sorted before you unpack". | The map opens at `/en/map?category=<slug>`. |
| 2 | Read the Categories button and the list. | The button reads "Categories (1)" and the list holds at least one place of that category. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-04 Show on the home switches a tile on and off
- **Story / AC:** E4.13 (T-E4.13c) / AC95, gate G-S9-TILES
- **Priority:** P2
- **Role and device:** Owner on desktop, then guest
- **Preconditions:** A category with Show on the home on and a published place; owner account.

| # | Step | Expected result |
|---|---|---|
| 1 | Dashboard, Categories, Map tab: open the category and turn Show on the home off, save. | The save succeeds. |
| 2 | Reload `/en` in the guest profile. | That tile is gone; the others stay. |
| 3 | Turn Show on the home on again, save, reload `/en`. | The tile is back in its position. |

- **Postconditions:** The tile is on again.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-05 A tile with no published place is hidden
- **Story / AC:** E4.13 (T-E4.13c) / AC95, gate G-S9-EMPTY-TILE
- **Priority:** P2
- **Role and device:** Owner on desktop, then guest
- **Preconditions:** A map category with Show on the home on and no published place (create a test category, then delete it at the end). Setup writes through the Categories screen, not SQL.

| # | Step | Expected result |
|---|---|---|
| 1 | Create the category with Show on the home on and no place. Reload `/en`. | No tile for it. |
| 2 | Turn Show on the home off for every other category, reload `/en`. | With no tile at all the heading "Sorted before you unpack" is gone too; the rest of the page is unchanged. |
| 3 | Restore the switches and delete the test category. | The tiles come back. |

- **Postconditions:** Switches restored, test category deleted.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-06 The home in German
- **Story / AC:** E4.13 (T-E4.13c) / AC64
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Fresh profile.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de`. | Headings, tiles and the map invitation are in German. |
| 2 | Find a tile whose category name exists only in English. | It shows the English name with a language tag. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-07 View source of the home has the text, the tags and no price
- **Story / AC:** E4.13 (T-E4.13c) / AC54, AC61
- **Priority:** P1
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en` and view the page source. | The title, description and canonical link are set; `hreflang` links for `en`, `de` and `x-default` are present. |
| 2 | Search the source for "CHF". | No match. |
| 3 | Search the source for a tile name and a postcard name. | Both are in the HTML, not added only by script. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-08 The search pill and the advice banner
- **Story / AC:** E4.13 (T-E4.13c) / AC95
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Press the search pill in the hero. | The search screen opens (S9-SEARCH-01). |
| 2 | Go back, scroll to the advice banner and press it. | The demo advice form opens. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-09 "See these first" and the routes show in the curated order with no answers
- **Story / AC:** E4.13 (T-E4.13d) / AC95
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Fresh profile, no answers; the three seeded tours exist.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en` and scroll to "See these first". | Postcards show in the curated order, with the pill "Sort for my trip" under the heading. |
| 2 | Scroll to "Walk it the way we would". | The short-stay tour comes first; no price. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-10 Answering "A few days" swaps the routes and leaves the rest alone
- **Story / AC:** E4.13 (T-E4.13d) / AC95
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Fresh profile on the home.

| # | Step | Expected result |
|---|---|---|
| 1 | In the onboarding flow choose "A few days", press Continue, then "Show my Lucerne". | The flow closes. |
| 2 | Read "Walk it the way we would". | The multi-day tours come first. |
| 3 | Look at the hero, the map invitation and the tiles. | Unchanged, same order as before the answer. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-11 An interest moves a postcard to the front and hides none
- **Story / AC:** E4.13 (T-E4.13d) / AC95
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Fresh profile; at least four must-visit places.

| # | Step | Expected result |
|---|---|---|
| 1 | Pick one interest in step 2 and finish the flow. | The postcard that matches the interest is first in "See these first". |
| 2 | Count the postcards. | The number is the same as before the answer. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-12 The pill reopens the flow with the answers filled
- **Story / AC:** E4.13 (T-E4.13d) / AC36
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Answers saved.

| # | Step | Expected result |
|---|---|---|
| 1 | Press the pill under "See these first". | The flow opens with the saved answers ticked. |
| 2 | Change an answer and save. | The pill reads "Sorted for ..." with a "Change" action. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-13 A postcard, a story pill and a route card open their targets
- **Story / AC:** E4.13 (T-E4.13d) / AC54
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Press a postcard. | The map opens with that place's card. |
| 2 | Go back and press "The story behind it" on a postcard. | The story page opens. |
| 3 | Go back and press a route card. | The existing tour page opens. |
| 4 | Read the three pages for "CHF". | None shown. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-14 The rails in German
- **Story / AC:** E4.13 (T-E4.13d) / AC64
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de` and scroll to the rails. | The headings are German. |
| 2 | Find an item that exists only in English. | It carries a language tag. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-15 View source has the postcard names and route titles
- **Story / AC:** E4.13 (T-E4.13d) / AC61
- **Priority:** P2
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en`, view the source. | The tile names, postcard names and route titles are in the HTML. |
| 2 | Search for "CHF". | No match. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-16 The food map mounts when it is near, with no page jump
- **Story / AC:** E4.13 (T-E4.13e) / AC95
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en` and scroll slowly toward "Eat and drink like a local". | A grey frame of the same height shows first. |
| 2 | Keep scrolling. | The map appears before the section reaches the screen and the page does not jump. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-17 One finger scrolls the page, two fingers move the food map
- **Story / AC:** E4.13 (T-E4.13e) / AC95
- **Priority:** P1
- **Role and device:** Guest, a real phone or touch device at 375 px
- **Preconditions:** A touch device. A mouse does not prove this.

| # | Step | Expected result |
|---|---|---|
| 1 | Drag one finger across the food map. | The page scrolls; the map does not move. |
| 2 | Drag with two fingers on the map. | The map pans. |
| 3 | On a computer, scroll the wheel over the map, then scroll with Ctrl or Cmd held. | The plain wheel scrolls the page; Ctrl or Cmd with the wheel zooms the map. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-18 The food map list holds Food and drink and the sheet reaches the others
- **Story / AC:** E4.13 (T-E4.13e) / AC95
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Categories on the food section. | Food and drink is ticked. |
| 2 | Choose Walks and apply. | The list changes to walks. |
| 3 | Press Clear. | The list returns to all places. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-19 A food pin without a photo shows its icon in the card
- **Story / AC:** E4.13 (T-E4.13e) / AC95
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A food place with no photo.

| # | Step | Expected result |
|---|---|---|
| 1 | Find that pin in the food map and open its card. | The thumbnail slot shows the category icon at the same height as a photo. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-20 The food map in German, and a card's Google Maps link
- **Story / AC:** E4.13 (T-E4.13e) / AC64
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de` and scroll to the food section. | Heading and text are German. |
| 2 | Open a card and press "Open in Google Maps". | Google Maps opens at the place. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-21 Rename keeps the food section, delete removes it
- **Story / AC:** E4.13 (T-E4.13e) / AC95, gate G-S9-D-SMALL (FOODCAT)
- **Priority:** P2
- **Role and device:** Owner on desktop, then guest
- **Preconditions:** A scratch copy of the dev data, or restore the name afterwards. Do not delete the real Food and drink category on shared dev data.

| # | Step | Expected result |
|---|---|---|
| 1 | Rename the Food and drink category in Categories, save, reload `/en`. | The section still shows with the same pins (it finds the category by its slug). |
| 2 | On the scratch copy delete the category and reload `/en`. | The section is gone and no empty frame is left. |

- **Postconditions:** Name restored; deletion only on the scratch copy.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-22 A dated pin shows as "This week" with no price
- **Story / AC:** E4.13 (T-E4.13f) / AC54, gate G-S9-EVENTS
- **Priority:** P1
- **Role and device:** Owner on desktop, then guest
- **Preconditions:** Pin dates are set in Locations and events (owner screen).

| # | Step | Expected result |
|---|---|---|
| 1 | Give a pin a first day 3 days ahead; reload `/en`. | "While you're in town" shows "This week" with an ink-poster card at full width and no price. |
| 2 | Press the card. | The map opens on that place. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-23 A running event shows "Until <day>"
- **Story / AC:** E4.13 (T-E4.13f) / gate G-S9-EVENTS
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** A pin with dates that began yesterday and end tomorrow.

| # | Step | Expected result |
|---|---|---|
| 1 | Reload `/en`. | The event is under "This week" and its card shows today's date and "Until <day>". |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-24 Three later events are listed under "Coming up"
- **Story / AC:** E4.13 (T-E4.13f) / gate G-S9-EVENTS
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** Three pins with first days more than 7 days ahead.

| # | Step | Expected result |
|---|---|---|
| 1 | Reload `/en`. | "Coming up" lists the three in date order with month markers and no photos. |
| 2 | Look for "See all on the map". | Not shown (it shows only past three). |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-25 A fourth later event adds "See all on the map"
- **Story / AC:** E4.13 (T-E4.13f) / gate G-S9-EVENTS
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** S9-HOME-24 data plus a fourth later dated pin.

| # | Step | Expected result |
|---|---|---|
| 1 | Reload `/en`. | "See all on the map" shows after the three. |
| 2 | Press it. | The map opens at `/en/map?dated=1` and lists dated pins only. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-26 With no dated pin the section is not drawn
- **Story / AC:** E4.13 (T-E4.13f) / gate G-S9-EVENTS
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** A scratch copy, or clear the dates and restore them after.

| # | Step | Expected result |
|---|---|---|
| 1 | Remove every pin date; reload `/en`. | No "While you're in town" heading and no empty box. |

- **Postconditions:** Dates restored.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-27 An ended event is gone, and several "This week" events form a carousel
- **Story / AC:** E4.13 (T-E4.13f) / AC54
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** Two pins running this week and one pin whose last day is yesterday.

| # | Step | Expected result |
|---|---|---|
| 1 | Reload `/en`. | The ended event is not shown. |
| 2 | Look at "This week". | The two events form a carousel and the next card peeks at the right edge. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-28 The Victorinox showcase keeps its shipped look with real keepsakes
- **Story / AC:** E4.13 (T-E4.13d fix) / AC95, rule keep shipped components intact
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** The five seeded Victorinox keepsakes, all published.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en` and scroll to the Victorinox block. | The shipped showcase look shows: the connecting thread line, tiles with the knife art, no price. |
| 2 | Find a tile whose keepsake has no matching knife art. | The tile shows the keepsake's own cover photo, never an empty tile. |
| 3 | Press a tile. | The keepsake's real page opens in the card's own language. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-29 A sold-out keepsake is left out of the showcase
- **Story / AC:** E4.13 (T-E4.13d fix) / AC53
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** Set one keepsake to 0 stock in Inventory first.

| # | Step | Expected result |
|---|---|---|
| 1 | Reload `/en` and open the Victorinox block. | That keepsake is not in the showcase; the others are. |
| 2 | Open `/en/gifts`. | The keepsake is still on the list, marked "Sold out". |

- **Postconditions:** Restore the stock after the case.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-HOME-30 A failed read shows an error with retry in its own block
- **Story / AC:** E4.13 (T-E4.13c, T-E4.13d) / AC-6 of both tickets
- **Priority:** P2
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** Browser devtools, Network tab, request blocking.

| # | Step | Expected result |
|---|---|---|
| 1 | Block `/api/public/map` and reload `/en`. | The tiles, postcards, food map and events show an error with retry in their own blocks; the hero, the invitation and the ending still render. |
| 2 | Remove the block and press retry. | The blocks load. |
| 3 | Block `/api/public/keepsakes` and reload. | The Victorinox block shows an error; the other blocks are unchanged. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Map (MAP)

### S9-MAP-01 A parent category slug filters the map to it and its sub-categories
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC42
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A parent category with sub-categories that hold published places; its slug.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?category=<parent slug>`. | The Categories button reads "Categories (1)". |
| 2 | Read the list. | It holds the pins of the parent and its sub-categories; other pins are dimmed on the map. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-MAP-02 A sub-category slug filters to that sub-category only
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC42
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A sub-category slug.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?category=<sub-category slug>`. | Only that sub-category's pins are listed. |
| 2 | Open Categories. | The pill counts 1; the sheet lists top-level categories only, so no row is ticked for the sub-category. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-MAP-03 The dated parameter shows only pins with a next date
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC42
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** At least one dated and one undated pin.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?dated=1`. | The list and the card row hold only pins with a next date. |
| 2 | Read the screen-reader line (or the status text). | It says the map shows dated places. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-MAP-04 An unknown category slug shows every pin and a notice
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC90
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?category=nope`. | Every pin is listed. |
| 2 | Read the notice. | "That category is not on the map, so every place is shown". |
| 3 | Read the address. | It no longer has the `category` parameter. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-MAP-05 A place link wins over the category
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC90, gate G-S9-D-SMALL (MAPPARAMS)
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A pin not in the food category and the food category slug.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?place=<slug>&category=<food slug>`. | That pin's card is open. |
| 2 | Read the list. | It holds every pin; the category and dated filters are cleared. |
| 3 | Read the address. | It shows only `place`. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-MAP-06 Clearing the filter removes the parameter and Back skips it
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC93
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?category=<slug>`, open Categories, press Clear filter and apply. | The `category` parameter is gone from the address. |
| 2 | Press the browser Back button. | It leaves the map; it does not step through the filter. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-MAP-07 Category and dated together show the intersection
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC42
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A dated pin in a category and a dated pin outside it.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?category=<slug>&dated=1`. | Only dated pins of that category are listed. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-MAP-08 A place slug that does not exist shows a notice
- **Story / AC:** E4.13 (T-MAP-PARAMS) / AC90
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map?place=no-such-place`. | The map opens with no card, every pin is listed and a notice says the place was not found (the exact wording is not in the worker report; note it). |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Icons (ICON)

### S9-ICON-01 The icon list is complete and each icon is drawn
- **Story / AC:** E4.13 (T-E4.13a) / AC95
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** Needs S9-ICON-03 steps (the picker). The 78 keys and their drawings are in "The icon list to review" below.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Dashboard, Categories, Map tab, open a category. | The picker shows eight groups: Essentials, Transport, Food and drink, Sights, Shopping, Nature and outdoors, Events and leisure, Travel and stay. |
| 2 | Look at every icon. | None is blank, none is cut off, and each reads as its name at the size of a pin. |
| 3 | Compare with the swap list below. | Mark each swap you do not like in Notes (toilet, church, bridge, monument, museum, landmark, taxi, square). |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ICON-02 Group headings and icon names in German
- **Story / AC:** E4.13 (T-E4.13a) / AC64
- **Priority:** P2
- **Role and device:** Owner, desktop; language German
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Switch the dashboard to German and open the picker. | Every group heading is German. |
| 2 | Read the names of a few icons (for example Velo, Spital, Andenken). | They are German, none is an English key. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ICON-03 Pick an icon and see it in the table
- **Story / AC:** E4.13 (T-E4.13g) / AC95
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** A map category.

| # | Step | Expected result |
|---|---|---|
| 1 | Dashboard, Categories, Map tab: open a category. | The picker starts with None, then the eight groups with icons. |
| 2 | Pick Water and save. | The table shows the drop icon before the category name. |
| 3 | Reload the page. | The icon is still there. |

- **Postconditions:** The category has the Water icon.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ICON-04 None clears the icon
- **Story / AC:** E4.13 (T-E4.13g) / AC95
- **Priority:** P2
- **Role and device:** Owner, desktop and phone
- **Preconditions:** The category from S9-ICON-03.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the category, choose None and save. | The icon is gone from the table. |
| 2 | Open the category list on a 375 px phone. | The phone list and the phone page show no icon either. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ICON-05 A blog category has no icon picker
- **Story / AC:** E4.13 (T-E4.13g) / ADR-030
- **Priority:** P2
- **Role and device:** Owner, desktop
- **Preconditions:** A blog category.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Categories, the Blog tab, open a category. | There is no icon picker and no None choice. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ICON-06 The picker works with the keyboard, at 375 px and in German
- **Story / AC:** E4.13 (T-E4.13g) / AC95
- **Priority:** P2
- **Role and device:** Owner, keyboard only, then phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Tab into the picker and use the arrow keys inside one group. | Focus moves between icons of that group; the chosen icon is announced with its name. |
| 2 | Press Tab. | Focus goes to the next group. |
| 3 | Open the picker at 375 px. | No sideways scroll; each choice is about 44 px; the sheet scrolls. |
| 4 | Switch to German. | The names are German. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ICON-07 A cluster of pins shows icons or photos, no letter
- **Story / AC:** E4.13 (T-E4.13b) / AC95
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Several nearby pins, some without photos.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/map` and zoom out until pins cluster. | The cluster face shows the icons or photos of its first two members, no letter. |
| 2 | Zoom in and open a pin with no photo. | Its card thumbnail shows the icon. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Onboarding (ONB)

### S9-ONB-01 A first visit at the home opens the flow
- **Story / AC:** E4.5 (T-E4.5a) / AC36
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh guest profile, English.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en` in the fresh profile. | A full-screen dialog opens with focus on "How long are you in Lucerne?". |
| 2 | Read the dialog. | Two choices: "Just today" and "A few days"; the progress reads "1 of 2"; the line "Your answers stay on this phone." shows. |
| 3 | Choose "A few days" and press Continue. | Step 2 "What would you like to see?" shows with focus on its heading. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-02 Skip on step 1 goes to step 2, Escape on step 2 keeps the stay
- **Story / AC:** E4.5 (T-E4.5a) / AC36
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile.

| # | Step | Expected result |
|---|---|---|
| 1 | On step 1 press Skip. | Step 2 shows with focus on its heading; no stay is saved (the next reload shows the flow again). |
| 2 | Reload, choose "Just today" and Continue, then press Escape on step 2. | The flow closes and does not return by itself. |
| 3 | Open the Account tab, then "Your trip". | "Just today" is shown as the saved stay. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-03 Answers survive a reload, and cleared data shows the flow again
- **Story / AC:** E4.5 (T-E4.5a) / AC37
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile; browser devtools.

| # | Step | Expected result |
|---|---|---|
| 1 | Answer both steps, press "Show my Lucerne" and reload. | No flow shows. |
| 2 | In devtools Network tab, filter on Fetch/XHR and answer again in change mode. | No request carries the answers. |
| 3 | Clear site data for the address and open `/en`. | The flow shows again. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-04 The flow in German fits at 375 px
- **Story / AC:** E4.5 (T-E4.5a) / AC36
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile, language German.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de`. | The flow shows in German; no text is cut off and nothing scrolls sideways at 375 px. |
| 2 | Go to step 2. | Five interest labels fit; the buttons stay visible. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-05 A story link first, then the Explore opening shows the flow
- **Story / AC:** E4.5 (T-E4.5a) / AC24, AC91
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a story address directly, for example `/en/stories/<slug>`. | The story shows at once; no full-screen flow. |
| 2 | Tap the Explore tab (the home) in the bottom bar. | The home opens and the flow shows now. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-06 A signed-in merchant sees no flow and no Account row
- **Story / AC:** E4.5 (T-E4.5a) / AC92
- **Priority:** P1
- **Role and device:** Merchant profile, phone 375 px
- **Preconditions:** A fresh browser profile signed in as a merchant.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en`. | No flow. |
| 2 | Open the Account tab. | No "Your trip" row. |
| 3 | Open a store screen and a story page. | No flow and no card on either. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-07 "Your trip" opens change mode with the answers filled
- **Story / AC:** E4.5 (T-E4.5a) / AC36
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Answers saved.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the Account tab and tap "Your trip". | The flow opens with the saved answers ticked. |
| 2 | Look for Skip. | Not shown. |
| 3 | Tap the other stay choice. | It saves at once. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-08 "Forget my answers" clears and closes
- **Story / AC:** E4.5 (T-E4.5a) / AC36
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Answers saved.

| # | Step | Expected result |
|---|---|---|
| 1 | Open "Your trip", go to step 2 and press "Forget my answers". | The flow closes. |
| 2 | Reload `/en`. | The answers are gone and the flow does not reopen by itself in the same visit; the Account row reads "Not set yet". |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-09 Keyboard only, and reduced motion
- **Story / AC:** E4.5 (T-E4.5a) / AC36
- **Priority:** P2
- **Role and device:** Guest, keyboard only; reduced motion on
- **Preconditions:** OS or browser setting "reduce motion" on.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the flow and press Tab repeatedly. | Focus wraps inside the dialog; the page behind cannot be reached. |
| 2 | Press Escape. | The flow closes and focus returns to the control that opened it (or the page). |
| 3 | Move between the steps. | No sliding or scaling animation. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-10 A story link in a fresh profile shows the card after 10 seconds
- **Story / AC:** E4.5 (T-E4.5b) / AC91
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a story address and watch a clock. | At 9 seconds no card shows. |
| 2 | Keep waiting. | At 10 seconds a floating card appears: "Find what you’ll love in Lucerne" with the button "Personalize my visit". It does not push the content down. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-11 Closing the card hides it for the visit
- **Story / AC:** E4.5 (T-E4.5b) / AC91
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** The card is showing.

| # | Step | Expected result |
|---|---|---|
| 1 | Press "Hide for now" (or Escape). | The card hides. |
| 2 | Open another story in the same visit. | No card. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-12 After hiding the card, Explore still opens the flow
- **Story / AC:** E4.5 (T-E4.5b) / AC24
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** The card was hidden (S9-ONB-11); no answers.

| # | Step | Expected result |
|---|---|---|
| 1 | Tap the Explore tab. | The full-screen flow opens; hiding the card was not a skip. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-13 "Personalize my visit" opens the flow, and the German card fits
- **Story / AC:** E4.5 (T-E4.5b) / AC36
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile on a story page; German as a second pass.

| # | Step | Expected result |
|---|---|---|
| 1 | Press "Personalize my visit" on the card. | The flow opens with focus on its heading. |
| 2 | Repeat on `/de/stories/<slug>`. | The German card text fits at 375 px without cut-off. |
| 3 | Open a keepsake page, the map and the home as a visitor with a deep link. | The card shows only on story pages. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-14 "Just today" sinks multi-day pins in the map list
- **Story / AC:** E4.5 (T-E4.5c) / AC44
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** At least one multi-day pin.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the onboarding, choose "Just today" and finish; open `/en/map`. | Multi-day pins sit lower in the list than the others. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-15 "A few days" and an interest put matching pins first
- **Story / AC:** E4.5 (T-E4.5c) / AC38
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Choose "A few days" and one interest; open `/en/map`. | Pins matching the interest come first in the list. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-16 Every pin stays on the map, and the list and the card row agree
- **Story / AC:** E4.5 (T-E4.5c) / AC93
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Answers saved.

| # | Step | Expected result |
|---|---|---|
| 1 | Count the pins on the map with and without answers (Forget my answers in between). | The count is the same. |
| 2 | Compare the List and the card row on the map. | Both show the same order. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-17 A partner QR or link to the home shows no flow and drops its marker
- **Story / AC:** E4.5 (fix unit, decision 2026-11-04) / AC24, AC91
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile; a partner link `/r/<code>` that points at the home (take one from the partner screen or ask the developer).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the partner link. | The home opens at once with no flow. |
| 2 | Read the address. | `via=partner` was removed after the page loaded; the address is `/en` (it is visible only on the redirect). |
| 3 | Tap the Explore tab. | The flow opens at this later Explore opening. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-ONB-18 A partner link to a story keeps its other query parts
- **Story / AC:** E4.5 (fix unit) / AC91
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A partner link to a story address that has `?a=1#top` or similar.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the link. | The story shows with no flow; `via=partner` is gone and the other parts of the address stay. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Stories (STORY and STORIES)

### S9-STORIES-01 Only categories that have a story are offered
- **Story / AC:** E4.4 (T-E4.4e) / AC30, gate G-S9-STORY-FILTER
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A blog category with no published story exists (Dashboard, Categories, Blog tab).

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/stories`. | A chip row shows All first, then only categories with at least one story in this language. |
| 2 | Look for the empty category. | It is not in the row. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORIES-02 A parent includes its sub-categories' stories
- **Story / AC:** E4.4 (T-E4.4e) / ADR-030
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A parent category with a sub-category; a story tagged with the sub-category only.

| # | Step | Expected result |
|---|---|---|
| 1 | Choose the parent chip. | The sub-category's story shows and stories of other topics do not; the count line shows the new number. |
| 2 | Choose the sub-category chip. | Only the stories tagged with it show. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORIES-03 Back and a shared link keep the filter
- **Story / AC:** E4.4 (T-E4.4e) / AC61
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Choose a chip. | The address holds `?category=<slug>`. |
| 2 | Press the browser Back button. | All is selected and every story shows. |
| 3 | Open the address with `?category=<slug>` in a new tab; then view its source. | The filtered list shows at once; the source lists only those stories; the canonical link has no `category` parameter. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORIES-04 A wrong or unused slug shows every story
- **Story / AC:** E4.4 (T-E4.4e) / AC30
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/stories?category=no-such-topic`. | Every story shows, All is selected, the address is unchanged. |
| 2 | Open the same with the slug of a category that has no story. | The same. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORIES-05 The filter row in German
- **Story / AC:** E4.4 (T-E4.4e) / AC64
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de/stories`. | The first chip reads "Alle" and the category names are German (a category with no German name shows its English name). |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORIES-06 After onboarding the filter and the order work together
- **Story / AC:** E4.4 (T-E4.4e) / AC38
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Answers saved.

| # | Step | Expected result |
|---|---|---|
| 1 | Choose a chip on `/en/stories`. | Only that topic's stories show, in the order for your trip. |
| 2 | Change an answer through "Change". | The same stories stay; only the order may move. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORIES-07 A failed category read keeps the list and drops the row
- **Story / AC:** E4.4 (T-E4.4e) / AC30
- **Priority:** P3
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** Devtools request blocking.

| # | Step | Expected result |
|---|---|---|
| 1 | Block `/api/public/blog-categories` and reload `/en/stories`. | The stories show with no filter row and no error banner. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-01 The stories list in English and German
- **Story / AC:** E4.4 (T-E4.4b) / AC30, AC61
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** Published stories.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/stories`. | Cards show newest first, each with cover, title, excerpt and reading time. |
| 2 | Open `/de/stories`. | The same, with German text and German page labels. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-02 A one-language story shows with a language tag
- **Story / AC:** E4.4 (T-E4.4b) / AC64
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A published story with English only.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de/stories`. | The English-only story is listed with an EN tag. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-03 After onboarding the order changes and no story disappears
- **Story / AC:** E4.4 (T-E4.4b) / AC38
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A fresh profile.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/stories` and note the cards and their count. | Cards show newest first; the line reads "Newest first" with "Sort for my trip". |
| 2 | Answer the onboarding (a stay and an interest) and reopen the list. | Stories that match come first; the number of cards is the same; the line reads "Sorted for ..." with "Change". |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-04 A story page has the full text, the details and a working contents list
- **Story / AC:** E4.4 (T-E4.4c) / AC32
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A seeded story with at least two H2 headings.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the story in `/en/stories/<slug>` and in `/de/stories/<slug>`. | Full text, cover, author, date and reading time show in both. |
| 2 | Tap an entry in the contents list. | The page jumps to that heading. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-05 A video loads only when played
- **Story / AC:** E4.4 (T-E4.4c) / AC32
- **Priority:** P2
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** A story with a video. Ask the developer which seeded story has one, or add one in the story editor first. Devtools, Network tab.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the story and scroll to the video; look at the Network tab. | A neutral poster shows; no request to the video host. |
| 2 | Press play. | The video starts; now the request to the host appears. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-06 The language switcher goes to the other language's slug
- **Story / AC:** E4.4 (T-E4.4c) / AC64
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A published story whose English and German slugs differ.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the story in English and use the language switcher. | The address becomes `/de/stories/<german slug>` with German text. |
| 2 | Open a story that has one language only. | No switcher for the missing language. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-07 A story address in a language it lacks redirects to the existing version
- **Story / AC:** E4.4 (T-E4.4c) / ADR-002 step 6, AC64
- **Priority:** P1
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** A story with English only; devtools, Network tab. Ruling of 2026-11-04: a 302 to the existing version, not other-language text at the missing address.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de/stories/<english slug>` with Network open and Preserve log on. | The first response is status 302 and the browser lands on `/en/stories/<english slug>` with English text. |
| 2 | Set the saved language to German (language switch), then open the story. | The language notice shows on the landed page. |
| 3 | Set the saved language to English and open it again. | No language notice. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-08 View source of a story has the text and the tags
- **Story / AC:** E4.4 (T-E4.4c) / AC61
- **Priority:** P1
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** A seeded story.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the story and view the page source. | The full story text is in the HTML; canonical, `hreflang` (`en`, `de`, `x-default`) are set; there is no `noindex`. |
| 2 | Search the source for "CHF" and for comment text. | No match. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-09 The sitemap lists the story pages per language
- **Story / AC:** E4.4 (T-E4.4c) / AC61
- **Priority:** P2
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/sitemap.xml`. | Each published story is listed per language with its own slug; a story missing in a language is not listed for it. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-10 A story with seeded keepsake links shows cards without a price
- **Story / AC:** E4.4 (T-E4.4d) / AC31, AC54
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** `pnpm db:seed:story-keepsakes` already run on dev: the stories chapel-bridge (2 keepsakes), the-dying-lion (1) and weinmarkt (2) are linked.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the story chapel-bridge in English. | Keepsake cards show with name and photo, up to six. |
| 2 | Read the cards. | No price, no "CHF". |
| 3 | Tap a card. | `/en/gifts/<slug>` opens. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-11 An unpublished keepsake's card is gone
- **Story / AC:** E4.4 (T-E4.4d) / AC54
- **Priority:** P2
- **Role and device:** Owner on desktop, then guest
- **Preconditions:** The keepsake VICTORINOX-0.6223.G is linked to two stories. Use a scratch copy, or restore after.

| # | Step | Expected result |
|---|---|---|
| 1 | Set that keepsake to Draft or Archived in the keepsake editor. | The change saves. |
| 2 | Reload the story that linked it. | Its card is gone; the other cards stay. |

- **Postconditions:** Keepsake published again.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-12 A keepsake with zero stock shows "Sold out" and still opens
- **Story / AC:** E4.4 (T-E4.4d) / AC53
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** Set one linked keepsake to 0 stock in Inventory.

| # | Step | Expected result |
|---|---|---|
| 1 | Reload the story. | That card shows "Sold out". |
| 2 | Tap the card. | Its keepsake page opens. |

- **Postconditions:** Stock restored.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-13 A place tag opens the map with that place's card
- **Story / AC:** E4.4 (T-E4.4d) / AC90
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A story with a place tag.

| # | Step | Expected result |
|---|---|---|
| 1 | Tap a place tag on the story. | The map opens at `/en/map?place=<slug>` with the place's card open. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-14 A story with no keepsakes, related stories or places shows no empty heading
- **Story / AC:** E4.4 (T-E4.4d) / AC33
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A story with none of the three blocks (or one with only some).

| # | Step | Expected result |
|---|---|---|
| 1 | Open it. | The text shows; there is no heading and no empty box for a block that has nothing. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-15 An unknown story address is a 404
- **Story / AC:** E4.4 (T-E4.4c) / AC61
- **Priority:** P2
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** Devtools, Network tab.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/stories/no-such-story`. | The not-found page shows and the Network tab shows status 404 for the document. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-STORY-16 Related stories open in their own language
- **Story / AC:** E4.4 (T-E4.4d) / AC33
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A story with up to three related stories.

| # | Step | Expected result |
|---|---|---|
| 1 | Scroll to the related stories and tap one. | It opens directly at its own language slug, without a redirect hop. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Keepsakes (KEEP)

### S9-KEEP-01 The list shows published keepsakes and no price
- **Story / AC:** E6.4 (T-E6.4b) / AC54
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** One published keepsake and one draft.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/gifts`. | The banner "Keepsakes" shows; one card per published keepsake with photo and name; the draft is not listed. |
| 2 | Read every card and view the page source. | No "CHF", no amount, no stock number. |
| 3 | Open `/de/gifts`. | The banner reads "Andenken" and names are German. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-02 A sold-out keepsake says so and still opens
- **Story / AC:** E6.4 (T-E6.4b) / AC53
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** One keepsake at 0 stock.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/gifts`. | The keepsake with no units shows "Sold out". |
| 2 | Tap its card. | Its page opens at `/en/gifts/<slug>`. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-03 The list handles a failed read
- **Story / AC:** E6.4 (T-E6.4b) / AC54
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Stop the API and open `/en/gifts`. | An error message with a retry action shows; no old demo keepsake appears. |
| 2 | Start the API and press retry. | The cards appear. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-04 The page text comes from the server and has no price
- **Story / AC:** E6.4 (T-E6.4c) / AC54, AC61
- **Priority:** P1
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** A published keepsake.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a keepsake page and view the page source. | Name and description are in the source; no "CHF" and no `offers` in the JSON-LD; title, canonical and `hreflang` are set. |
| 2 | Wait one second on the page. | The price appears in the bottom bar after a short skeleton. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-05 A sold-out size cannot be picked
- **Story / AC:** E6.4 (T-E6.4c) / AC52, AC53
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A keepsake with sizes S and L, L at 0 units.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the add sheet and tap L. | L is disabled and shows a sold-out reason; the add button is disabled. |
| 2 | Tap S. | S is selected and its price shows in the bar. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-06 A combination that is not sold cannot be reached
- **Story / AC:** E6.4 (T-E6.4c) / AC52
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A keepsake sold as Red/S and Blue/L only.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the sheet and choose Red. | The other option moves to a sold combination; Blue/S cannot be reached and has no price. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-07 A variant photo moves to the front
- **Story / AC:** E6.4 (T-E6.4c) / AC52
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A variant with its own photo.

| # | Step | Expected result |
|---|---|---|
| 1 | Choose that variant in the sheet and close the sheet. | The gallery shows the variant's photo first. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-08 No engraving, and a failed availability read
- **Story / AC:** E6.4 (T-E6.4c) / AC55, AC53
- **Priority:** P2
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** Devtools request blocking.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a keepsake page and its sheet. | No engraving field or text in the highlights or the sheet. |
| 2 | Block `/api/public/keepsakes/<slug>/availability` and reload. | The text shows; the price area shows an error with retry; the add button is disabled. |
| 3 | Remove the block and press retry. | The price shows. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-09 An unknown keepsake is a 404, and a missing language redirects
- **Story / AC:** E6.4 (T-E6.4c) / AC61, AC64, ADR-002 step 6
- **Priority:** P2
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** A keepsake with English text only; devtools Network tab.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/gifts/no-such-keepsake`. | The not-found page shows and the document status is 404. |
| 2 | Open the English-only keepsake at `/de/gifts/<slug>`. | The first response is 302; the browser lands on `/en/gifts/<slug>` with English text; the page has no German alternate link. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-15 The language notice shows only when the saved language has no version
- **Story / AC:** E6.4 (T-E6.4c) / ADR-002 step 7, AC64
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** An English-only keepsake.

| # | Step | Expected result |
|---|---|---|
| 1 | Save German as your language, then open the English-only keepsake. | The English text shows with the language notice. |
| 2 | Save English as your language and open it again. | No notice. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-16 The language switcher lands on the other slug
- **Story / AC:** E6.4 (T-E6.4c) / AC64
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A keepsake with both languages and different slugs.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/gifts/<english slug>` and switch the language. | The address becomes `/de/gifts/<german slug>` with German text (one extra redirect step is normal). |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Pickup in the add sheet (KEEP-10 to 14, 17, 18)

### S9-KEEP-10 Only open days can be picked
- **Story / AC:** E6.4 (T-E6.4d) / AC26, gate G-S9-PICKUP-SHEET
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A published keepsake whose store has two active pickup points (one open Monday and Tuesday only, one open every day) and one archived point.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the keepsake and its add sheet. | A pickup place choice shows the active points; the archived one is absent. |
| 2 | Choose the Monday and Tuesday point. | A calendar shows; only Mondays and Tuesdays from the earliest day can be picked. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-11 A closed day explains itself
- **Story / AC:** E6.4 (T-E6.4d) / AC26
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** S9-KEEP-10 data.

| # | Step | Expected result |
|---|---|---|
| 1 | Tap a Wednesday in the calendar. | A message says the point is closed that day; nothing is selected. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-12 Changing the place keeps or clears the date
- **Story / AC:** E6.4 (T-E6.4d) / AC26
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** S9-KEEP-10 data.

| # | Step | Expected result |
|---|---|---|
| 1 | Pick a Monday at the Monday point, then choose the every-day point. | The Monday stays. |
| 2 | Choose the Monday and Tuesday point, pick a Tuesday, then choose a point closed on Tuesday. | The date is cleared and the date row asks for a day. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-13 The fold-outs show the points and the choice
- **Story / AC:** E6.4 (T-E6.4d) / AC26
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** S9-KEEP-10 data.

| # | Step | Expected result |
|---|---|---|
| 1 | Open "Pickup places". | Each point shows address, hours and instructions, and a "Get directions" link to its Google Maps address. |
| 2 | Choose a place and a date, close the sheet, open "Pickup date". | The same place and date show. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-14 No points, a failed read, and no cart behaviour
- **Story / AC:** E6.4 (T-E6.4d) / AC26
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A keepsake of a store with no active points.

| # | Step | Expected result |
|---|---|---|
| 1 | Open that keepsake. | No place or date choice; the fold-outs say "The shop has not set pickup points yet." |
| 2 | On a keepsake with points, stop the API after the page loaded and open the sheet. | The pickup area shows an error with retry; options and quantity still work. |
| 3 | Tap the add button. | Nothing new happens (no cart yet). |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-17 The pickup sheet in German
- **Story / AC:** E6.4 (T-E6.4d) / AC26, AC64
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** S9-KEEP-10 data; language German.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de/gifts/<slug>` and the sheet. | The place and date labels are German (the place label reads "Abholort"); the calendar weekdays and the closed-day message are German. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-KEEP-18 The earliest day is today only while the point is still open
- **Story / AC:** E6.4 (T-E6.4d) / AC26
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A point open today until a time you can pass; the clock is Europe/Zurich. Run before and after closing time, or ask the developer for a point whose hours end soon.

| # | Step | Expected result |
|---|---|---|
| 1 | Before closing time, choose the point. | Today can be picked. |
| 2 | After closing time, reload and choose the point. | Today cannot be picked; a message says today's hours are over and the next open day is the earliest. |
| 3 | Scroll the calendar forward. | It ends about 60 days ahead. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Tours (TOUR)

### S9-TOUR-01 A demo tour page shows up to three real keepsakes, no price
- **Story / AC:** T-TOUR-KEEPSAKES / AC31, AC54
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** At least 3 published keepsakes, one with no units. Demo tour slugs: lucerne-the-things-that-remain, pilatus-above-the-city, rigi-from-lake-to-sky.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a demo tour page and scroll to the keepsakes block. | The newest 3 published keepsakes show as cards; no "CHF" or amount. |
| 2 | Look at the keepsake with no units. | Its card says "Sold out". |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-TOUR-02 A card opens its keepsake page
- **Story / AC:** T-TOUR-KEEPSAKES / AC31
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** S9-TOUR-01 data.

| # | Step | Expected result |
|---|---|---|
| 1 | Tap a card in the block. | `/<lang>/gifts/<slug>` opens, not a 404. |
| 2 | Go back and tap the sold-out card. | Its page opens. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-TOUR-03 No published keepsake hides the block
- **Story / AC:** T-TOUR-KEEPSAKES / edge case
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A scratch database with no published keepsake. Do not unpublish the real ones.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a demo tour page. | The keepsakes block and its heading are not on the page; the rest is unchanged. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-TOUR-04 A failed keepsake read hides the block
- **Story / AC:** T-TOUR-KEEPSAKES / edge case
- **Priority:** P3
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** Devtools request blocking.

| # | Step | Expected result |
|---|---|---|
| 1 | Block `/api/public/keepsakes` and open a demo tour page. | The block is not drawn and no error shows; the rest of the page is unchanged. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Search (SEARCH)

### S9-SEARCH-01 Search opens from the home pill with five interest tiles
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en` and tap the search pill. | The search screen opens and the field has focus. |
| 2 | Read the screen. | "Browse by interest" shows five tiles: History and culture, Food and drink, Lake and mountains, Shopping and keepsakes, Local activities (full width). |
| 3 | Compare each tile photo with `docs/ux/search-design.md` section 3. | Every photo shows what its label names; the owner notes any mismatch. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-02 Search ignores accents
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** The Löwendenkmal pin exists.

| # | Step | Expected result |
|---|---|---|
| 1 | Type `lowen`. | Löwendenkmal appears with the kind label "Place". |
| 2 | Read the count line. | It reads "1 result for “lowen”". |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-03 Each row type opens its page
- **Story / AC:** E4.14 (T-E4.14b) / AC90, AC54
- **Priority:** P1
- **Role and device:** Guest, phone 375 px
- **Preconditions:** A word shared by several kinds, for example `lucerne`.

| # | Step | Expected result |
|---|---|---|
| 1 | Type `lucerne`. | A filter row shows All and each kind with counts; rows are ordered by match. |
| 2 | Tap a Place row. | `/en/map?place=<slug>` opens with the card. |
| 3 | Go back and tap a Story row, a Tour row and a Keepsake row. | The story page, `/en/tours/<slug>` and `/en/gifts/<slug>` open. |
| 4 | Read every row. | No "CHF" on any row. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-04 An interest tile gives a chip and a count
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Tap the tile "Food and drink". | The tiles are replaced by a chip and the line reads "<n> results in Food and drink". |
| 2 | Press the chip's x. | The tiles return. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-05 A query with no match offers real names and the tiles
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Type `zzzzq`. | "Nothing for “zzzzq” yet" shows with names that exist, the tiles and the advice banner. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-06 Search in German
- **Story / AC:** E4.14 (T-E4.14b) / AC94, AC64
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/de/search`. | The label and placeholder are German (Löwendenkmal, Bäckerei, Rigi), the heading is "Nach Interesse stöbern", and count lines read "Treffer". |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-07 Keyboard focus is visible on every control
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P3
- **Role and device:** Guest, keyboard only
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Tab through back, the field, the tiles and the rows. | Each control shows a visible focus ring. |
| 2 | Type a query and tab to a result, then press Enter. | The result opens. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-08 The clear button empties the field
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P3
- **Role and device:** Guest, phone 375 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Type text and tap the clear button. | The field empties and the tiles return; the tap target is about 44 px. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-09 The search page is not indexed
- **Story / AC:** E4.14 (T-E4.14b) / AC61
- **Priority:** P3
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** None.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/en/search` and view the source. | A `noindex` robots tag is present; no "CHF" in the HTML. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-10 A failed keepsake read still shows the other kinds
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P3
- **Role and device:** Guest, desktop 1280 px
- **Preconditions:** Devtools request blocking.

| # | Step | Expected result |
|---|---|---|
| 1 | Block `/api/public/keepsakes` and search `lucerne`. | Stories, places and tours still show, with a notice that keepsakes could not load. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-11 An unpublished keepsake and an ended event are not found
- **Story / AC:** E4.14 (T-E4.14a) / AC54, AC94
- **Priority:** P2
- **Role and device:** Owner, then guest
- **Preconditions:** A draft keepsake; use one you can set to Draft and back.

| # | Step | Expected result |
|---|---|---|
| 1 | Set a keepsake to Draft, then search for its name. | It is not in the results. |
| 2 | Publish it again and search. | It appears as a Keepsake row. |

- **Postconditions:** Keepsake published again.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S9-SEARCH-12 Reduced motion: the tiles do not scale on press
- **Story / AC:** E4.14 (T-E4.14b) / AC94
- **Priority:** P3
- **Role and device:** Guest, reduced motion on
- **Preconditions:** OS setting "reduce motion" on.

| # | Step | Expected result |
|---|---|---|
| 1 | Press and hold an interest tile. | No scale animation. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Coverage of the plan ACs

Each AC lists the cases that prove it in the browser. An AC with no case here is proved by the tests named in the story's tickets (component, server-HTML string and integration tests); the right-hand column says which.

| AC | Meaning | Cases | Otherwise proved by |
|---|---|---|---|
| AC24 | A visitor from a QR code sees content at once | S9-ONB-05, S9-ONB-12, S9-ONB-17 |  |
| AC26 | Pickup point hours and days in the sheet | S9-KEEP-10, S9-KEEP-11, S9-KEEP-12, S9-KEEP-13, S9-KEEP-14, S9-KEEP-17, S9-KEEP-18 | `keepsake-pickup-sheet.test.tsx`, `keepsake-pickup-days.test.ts`, `catalog-public-pickup-points.test.ts` |
| AC30 | Stories list and page content | S9-STORIES-01, S9-STORIES-04, S9-STORIES-07, S9-STORY-01 | `story-category-filter.test.tsx`, `stories-list` tests |
| AC31 | Keepsake cards on a story and on a tour page | S9-STORY-10, S9-TOUR-01, S9-TOUR-02 | `story-page-blocks.test.tsx`, `tour-keepsakes.test.tsx` |
| AC32 | Story page cover, contents list, video on play | S9-STORY-04, S9-STORY-05 | `guest-story-page.test.tsx` |
| AC33 | Related stories, places, no empty blocks | S9-STORY-14, S9-STORY-16 | `story-page-blocks.test.tsx` |
| AC36 | Onboarding flow, reopen and Forget | S9-HOME-12, S9-ONB-01, S9-ONB-02, S9-ONB-04, S9-ONB-07, S9-ONB-08, S9-ONB-09, S9-ONB-13 |  |
| AC37 | Answers stay in the browser | S9-ONB-03 | `onboarding-store.test.ts`, `onboarding-contract.test.ts` |
| AC38 | Ranking never hides an item | S9-ONB-15, S9-STORIES-06, S9-STORY-03 | `rank-items.test.ts` (AC38 fixture) |
| AC42 | Map category and dated filters | S9-MAP-01, S9-MAP-02, S9-MAP-03, S9-MAP-07 | `map-search-params.test.ts` |
| AC44 | A multi-day pin sinks for a short stay | S9-ONB-14 | `rank-items.test.ts`, `map-rank-pins.test.ts` |
| AC52 | Keepsake options and combinations | S9-KEEP-05, S9-KEEP-06, S9-KEEP-07 | `gift-variant-choice.test.ts` |
| AC53 | Sold out shown, stock | S9-HOME-29, S9-KEEP-02, S9-KEEP-05, S9-KEEP-08, S9-STORY-12 |  |
| AC54 | No price on guest pages | S9-HOME-07, S9-HOME-13, S9-HOME-22, S9-HOME-27, S9-KEEP-01, S9-KEEP-03, S9-KEEP-04, S9-SEARCH-03, S9-SEARCH-11, S9-STORY-10, S9-STORY-11, S9-TOUR-01 |  |
| AC55 | No engraving | S9-KEEP-08 | `keepsake-page-api.test.tsx` |
| AC61 | Server HTML, title, canonical, hreflang | S9-HOME-07, S9-HOME-15, S9-KEEP-04, S9-KEEP-09, S9-SEARCH-09, S9-STORIES-03, S9-STORY-01, S9-STORY-08, S9-STORY-09, S9-STORY-15 | server-HTML string tests in each route's test file |
| AC64 | Language fallback and German | S9-HOME-06, S9-HOME-14, S9-HOME-20, S9-ICON-02, S9-KEEP-09, S9-KEEP-15, S9-KEEP-16, S9-KEEP-17, S9-SEARCH-06, S9-STORIES-05, S9-STORY-02, S9-STORY-06, S9-STORY-07 |  |
| AC90 | A place link opens its card | S9-MAP-04, S9-MAP-05, S9-MAP-08, S9-SEARCH-03, S9-STORY-13 |  |
| AC91 | Story or search landing shows only the card | S9-ONB-05, S9-ONB-10, S9-ONB-11, S9-ONB-17, S9-ONB-18 |  |
| AC92 | Staff never see onboarding | S9-ONB-06 |  |
| AC93 | Map keeps every pin, Back behaviour | S9-MAP-06, S9-ONB-16 |  |
| AC94 | Search | S9-SEARCH-01, S9-SEARCH-02, S9-SEARCH-04, S9-SEARCH-05, S9-SEARCH-06, S9-SEARCH-07, S9-SEARCH-08, S9-SEARCH-10, S9-SEARCH-11, S9-SEARCH-12 |  |
| AC95 | Home order and tiles, icons | S9-HOME-01, S9-HOME-02, S9-HOME-03, S9-HOME-04, S9-HOME-05, S9-HOME-08, S9-HOME-09, S9-HOME-10, S9-HOME-11, S9-HOME-16, S9-HOME-17, S9-HOME-18, S9-HOME-19, S9-HOME-21, S9-HOME-28, S9-ICON-01, S9-ICON-03, S9-ICON-04, S9-ICON-06, S9-ICON-07 |  |

## Not verified by the workers

Only the browser shows these. Each case above that touches one says so; mark them as the cases that matter most when you sign off.

- **Real status codes.** The 302 of a missing language (S9-STORY-07, S9-KEEP-09) and the 404 of an unknown story or keepsake (S9-STORY-15, S9-KEEP-09). The workers tested the router, not a live server response.
- **Hydration.** Whether the server HTML and the first browser render agree, especially the home's blocks that read in the browser (food map, events), and the date split of events.
- **Touch gestures.** One finger scrolls and two fingers move the embedded map (S9-HOME-17), and the map mounting on scroll without a jump (S9-HOME-16).
- **Reduced motion.** The flow, the card and the tile press (S9-ONB-09, S9-SEARCH-12).
- **German strings.** Read by a native reader: the home events words (Diese Woche, Demnächst, Alle auf der Karte ansehen), the onboarding copy, the icon names, the pickup sheet and the search copy. The workers wrote some of them.
- **First-load size.** The home, story and onboarding budgets in `docs/development-rules/frontend/performance.md`. Ask the developer for a build report; no case measures it.
- **The icon drawings.** Whether each icon reads at pin size (S9-ICON-01).
- **Layout at 375 px.** Spacing, the 548 px food map frame, safe area, the aerial picture of "First time in Lucerne?" (do the five pins sit on the right buildings), the picker sheet scroll.
- **Known gap, not a case.** While the onboarding flow is open, a stay saved at Continue re-ranks the list behind the opaque backdrop; the design wants the order frozen until close. The guest cannot see it, so it is a follow-up (T-E4.5a report).

## Dropped cases

None. Every manual check named in a ticket or a report is a case above. Four tickets name none (T-RANK, T-E6.4a, T-E4.4a, T-E4.14a have no screen); their first visible effect sits in S9-ONB, S9-KEEP, S9-STORY and S9-SEARCH. Where a report changed a ticket the report wins: the missing-language story or keepsake redirects with a 302 (ADR-002 step 6, S9-STORY-07, S9-KEEP-09); the language notice follows step 7 (S9-KEEP-15); the pickup place and date are back in the add sheet (S9-KEEP-10 to 14); the partner link carries `via=partner` (S9-ONB-17); the Victorinox showcase keeps its shipped look (S9-HOME-28); the story list filter has its own cases (S9-STORIES-01 to 07).

