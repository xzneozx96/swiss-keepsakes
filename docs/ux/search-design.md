# Search design: C24 "One list"

- Status: **design approved** on 2026-10-28 (chat approval of search option S2 "One list" in the lab). The other lab option, S1 "Grouped", was rejected and removed.
- Screen: C24, the guest search at `/search` (route `_guest/search.tsx`). Slice S2, Track 1, story E4.14.
- Read first: `docs/decisions/2026-10-28-search-design.md` (what was approved and what changed from the PRD), PRD §11.1 (search sentence), §3.3 (the five fixed interests), AC54, AC90, AC94.
- Visual reference: the search part of the lab page `/lab/home` (run the front end and open it). The search screen is reached from the search pill in the hero of the approved home (`docs/ux/home-design.md`). **The lab is a design reference, not product code.** It uses mock data and local state. Do not copy it; build the screen in the product with the rules in section 4.
- Files: `front-end/src/features/lab/home-search.tsx` (`SearchMixed`, `InterestTiles`, `SearchFrame`, `NoResults`) and `front-end/src/features/lab/home-data.ts` (`searchHome`, `searchInterest`, `interestPhotos`, `INTERESTS`, the copy). The tests for the rules are in `front-end/tests/lab-home-shelves.test.ts`.

## 1. Screen and states

The screen fills the guest frame above the tab bar. A sticky top row holds a back button (44 px) and the search field, which is focused when the screen opens (as on a native search screen). The content sits under it with 16 px side padding.

| State | What shows |
| --- | --- |
| Empty field | A heading "Browse by interest" and the five fixed interests as tiles in a two-column grid (the fifth, Local activities, spans the full width). Each tile is a 4:3 photo with a dark gradient on its lower part and the label over it in the serif face (16 px). The photos must depict the label (section 3) |
| Interest tile chosen | A chip with the interest name and a clear button (44 px hit area) replaces the tiles. The list shows everything with that interest, and the count line reads "{n} results in {interest}". Clearing the chip returns to the tiles |
| Typing | Typing is immediate. The results follow a deferred copy so typing never stalls. A short "Searching…" skeleton shows while a slow answer is pending |
| Results | One list ordered by how well the title matches. Each row names its kind: **Place, Story, Tour or Keepsake**. A filter row (All plus each kind present, each with its count) appears only when more than one kind is present. The count line is a `role="status"` region. No price anywhere (AC54) |
| No results | Says so plainly ("Nothing for "{q}" yet"), suggests names that exist (for example Kapellbrücke, Weinmarkt), then shows the interest tiles and the trip-advice banner (`AdviceBanner`, unchanged) |

## 2. Matching and where a row goes

- Matching ignores accents ("lowen" finds Löwendenkmal) and covers both EN and DE text.
- Row targets: a **place** opens the map with its card, `/{lang}/map?place=<slug>` (AC90); a **story** opens `/{lang}/stories/<slug>`; a **tour** opens its free information page `/{lang}/tours/<slug>`; a **keepsake** opens `/{lang}/gifts/<slug>` (keepsake results arrive with E6.9).
- Search uses the same visibility rule as the map (`docs/ux/pins-design.md`): published pins with a location whose last date has not passed. The lab applies it by dropping ended pins before matching. Confirm hidden and draft pins are excluded in the build and test it.
- A tile lists everything with that interest across stories, places, tours and keepsakes. "Shopping and keepsakes" also lists the keepsakes.

## 3. Interest tiles

The five tiles use the fixed interest codes and labels of PRD §3.3, in this order.

| Interest | EN label | DE label | Photo key | Why it fits |
| --- | --- | --- | --- | --- |
| history-culture | History and culture | Geschichte und Kultur | `musegg-wall` | Medieval tower and city wall |
| food-drink | Food and drink | Essen und Trinken | `pralines` | Chocolates on a board, clearly food |
| lake-mountains | Lake and mountains | See und Berge | `lake-steamboat` | A paddle steamer on the lake with mountains |
| shopping-keepsakes | Shopping and keepsakes | Shopping und Andenken | `vx-chapel-bridge` | The shop's Lucerne knife |
| local-activities | Local activities | Lokale Aktivitäten | `lucerne-old-town` | People out in a lively old-town square. A photo tile like the others, full width but shorter. A photo of an actual event or market would fit better if the owner supplies one |

**Rule:** every tile photo must show what its label names. If no honest photo exists, use a typographic tile, never a mismatched photo. **Gaps the owner may want to fill:** a photo of an actual event or market for Local activities, a photo of local food (a bakery or a market stall) for Food and drink, and a shop or keepsake photo for Shopping.

## 4. Build notes (E4.14)

- The route renders in the browser only (`ssr:false`, ruling D1) and sends `noindex`.
- Data comes from the lists the app already has: the cached pins list, the stories list and the tours list (keepsakes later). Do not add a server search endpoint for this story. Build the accent-insensitive matcher once and test it (the lab's rules are a reference, not code to copy).
- The tiles need photo keys that exist in the media list. Tile photos are fixed in the code until the merchant can set them.
- The field label and placeholder are specific, not generic. Current wording (the home design round may refine it): label "Search sights, food, events, tours, stories and keepsakes" (DE "Sehenswertes, Essen, Anlässe, Touren, Geschichten und Andenken suchen"); placeholder "Lion Monument, bakery, Rigi…" (DE "Löwendenkmal, Bäckerei, Rigi"). Both fit a 375 px field. The German is a proposal for the merchant to review.
- The clear button of the HeroUI `SearchField` is 20 px. Make its hit area at least 44 px (the lab's interest chip already does).
- Respect `prefers-reduced-motion` (no scale animation on tiles). Keep the focus visible on tiles, chips and rows.
- Tests: Playwright `[E4.14][AC54][AC90][AC94]` in EN and DE at 375 px. Cover: the empty field shows five tiles with the exact labels; an accent-insensitive query; an interest tile lists its items; a place row opens the map card; a tour row opens its page; no `CHF` appears; a no-results query shows real suggestions.

## 5. Open points

- **Where search is entered.** Decided on 2026-10-28: the search pill in the hero of the approved home (C01, `docs/ux/home-design.md`). The lab page `/lab/home` shows it.
- **Tile photos.** The food and shopping photos are the best available, not ideal (section 3).
- **Match ordering.** The lab orders by how well the title matches. The exact scoring is a build decision and needs a test.
- **Keepsake results** wait for E6.9.
- Not tested in a real browser: the keyboard on a phone, a screen reader, reduced motion.

## 6. Rejected

- **S1 "Grouped":** results grouped into Places, Stories, Tours and Keepsakes (three per group, then "Show all"), with the home's needs as rows when the field is empty. Removed from the lab.
