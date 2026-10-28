# Home design: C01 "A local friend's briefing"

- Status: **design approved** on 2026-10-28 (chat approval of the lab page `/lab/home` after eight design rounds). It replaces the interest-organised home of `docs/decisions/2026-10-28-home-by-interests.md`.
- Screen: C01, the guest home at `/$lang` (route `_guest/index.tsx`). Slice S2, Track 1, story E4.13.
- Read first: `docs/decisions/2026-10-28-home-local-briefing.md` (what was approved, what was rejected, the open points), PRD §3.3 and AC95, `docs/ux/search-design.md` (the search the hero opens), `docs/ux/pins-design.md` (the map the food section embeds), `docs/ux/onboarding-design.md` (where the answers come from).
- Visual reference: the lab page `/lab/home` (run the front end and open it). **The lab is a design reference, not product code.** It uses mock data and local state, and it stands in for some product pieces. Do not copy it. Build the screen in the product with the rules below.
- Lab files, under `front-end/src/features/lab/`: `home-v9-phone.tsx` (the page), `home-v9-data.ts` (copy, order rules and lab content), `home-v9-must.tsx`, `home-v9-routes.tsx`, `home-v9-food.tsx` with `home-v9-food-map.tsx` and `home-v9-guest-map.tsx`, `home-v9-events.tsx`, `home-v9-parts.tsx`, `home-v9-pin-icon.tsx`, `home-sky-hero.tsx`, `home-victorinox.tsx` and `home-search.tsx`. The tests are `front-end/tests/lab-home-v9.test.ts` and `lab-home-v9-options.test.tsx`.

## 1. The page

The page follows a first-time visitor's first day in Lucerne. The order is fixed for every visitor. The onboarding answers change only the order of cards inside the sections marked "orders" below. Nothing is hidden, and nothing above the services row depends on the answers. Section titles are the same for every visitor. The page is about 6.4 phone screens long.

| # | Title (EN) | Description under the title | What shows | Rules |
| --- | --- | --- | --- | --- |
| 1 | No title (hero) | None | The shipped "Sky fade" hero: logo, greeting "Grüezi and welcome!", the line "Make yourself at home. I'll show you the Luzerne I love.", the Chapel Bridge photo, and a search pill | The pill opens the approved search (C24, `docs/ux/search-design.md`). Does not depend on the answers |
| 2 | First time in Lucerne? | "We've pinned the places we'd show a friend, so you can see the whole old town before you take a step." | A static aerial at 3:2 with the curated photo pins, and an "Open the map" button. The whole aerial is one button | No card box: the heading starts right under the search pill, so pill, words and map hang from the photo as one column. The map is a picture, not a live map. It opens the Map tab |
| 3 | Sorted before you unpack | "The small things that make a first day easy, and where to find them." | Six tiles in a 3-column grid: Drinking water, Free toilets, SIM and Wi-Fi, Trains, buses, boats, Luggage lockers, Cash and cards | A tile opens a map of only the places of that service, with a numbered list under it and directions for each place (Open in Google Maps). Every tile has at least one place. The toilet tile shows a "WC" text mark, because the icon set has no toilet icon |
| 4 | See these first | "The sights a first visit is built around, and the best hour for each." | A rail of postcards, 300 px wide, 4:5: the photo, the name, one local tip, and a "The story behind it" pill when a story is published | Orders by the visitor's interests. The sort pill sits under this heading ("Sort for my trip", or "Sorted for … · Change") and is the only personalisation signal on the page. It opens the sheet where the visitor changes the answers. The pill shows a language tag when the story is not in the visitor's language. A postcard opens the map card of the place |
| 5 | Walk it the way we would | "Routes we take our own friends on, free to follow at your own pace." | A rail of cards in the look of the shipped home's tour rail: 4:3 photo, title in serif, duration, "start to finish" | No price, no booking, no departure, no "From the story" line. Orders by stay length: a short stay or no answer shows walks first, a multi-day stay shows day trips first. A card opens the route's free information page |
| 6 | Eat and drink like a local | "The places we go back to, morning to night." | The approved guest map of `/lab/pins` (option B "Cards") inside the section: categories, list, photo pins, clusters, the card row and the place sheet | Filtered to food and drink on load, the other categories one tap away. No link out. See section 4 for gestures and loading. Orders by the visitor's interests |
| 7 | While you're in town | "Lucerne keeps a busy calendar. Here's what falls in the coming weeks." | "This week": the ink-poster card. "Coming up": a timeline | This week: the photo fills the card (the must-visit postcard style), a soft dark gradient, the date as an outlined number, white type. One event fills the width. Two or more become a carousel with the next card peeking. Coming up: italic month markers, at most 3 events, no photos. "See all on the map" sits inside the timeline block, shows no count and opens an events-only map. It shows only when more than 3 events are ahead |
| 8 | No title (ending) | None | The shipped Victorinox showcase with prices hidden, then a thin connecting thread with the line "There's still more of Lucerne to see first.", then the shipped advice banner | Showcase and banner unchanged. The thread drops from the lake-blue showcase and ends in a red dot above the banner |

Rules that hold across the page:

- No price anywhere (AC54). No `CHF` in the server HTML.
- A count under five is never printed.
- Every photo must show what its title names. The lab keeps a list of photos it never uses large (`BAD_PHOTOS`: a vase, the town hall, a Grindelwald hut), and the hero photo is not reused below the hero.
- A map pin or a card thumbnail without a photo shows an icon for its kind, white on the Victorinox lake blue `#173f52`, never an initial. Kinds: pub or bar, café or bakery, restaurant, market, walk, photo spot, essential, event, and a plain pin for anything else.

## 2. Personalisation

| Answer | What it orders |
| --- | --- |
| Stay length (short stay, multi-day) | The routes: short stay or none, walks first. Multi-day, day trips first |
| Interests (one or more of the five) | The must-visits and the food places. A card with more of the visitor's interests goes first, then a card that fits the stay length, then the curated order. The sort is stable, so with no answers the curated order stays |
| Skipped or unanswered | The curated order everywhere. The sort pill reads "Sort for my trip" |

Nothing is hidden by an answer. The server renders the same HTML for everyone, and the client re-orders after load, so the order can change once. The first screen (hero, search, map invitation, services) never changes.

## 3. States

| State | Behaviour |
| --- | --- |
| Skipped | Curated order. The sort pill says "Sort for my trip" |
| Answered | Cards reordered as in section 2. The pill says "Sorted for {answers} · Change", and its text rises in when the answers change |
| Loading | Hero, map invitation and services show at once. The sections under them show a card skeleton until the lists arrive |
| Few items | A rail with one card still shows. The home does not pad it. The first-launch minimum is open point O35 |
| No events | The events section is not drawn at all. An event whose last date has passed never shows |
| One event this week | The poster fills the width |
| More than 3 events ahead | "See all on the map" shows inside the timeline. With 3 or fewer it does not show |
| Language fallback | Content missing in the visitor's language shows in the other language with a short tag and no machine translation (AC64). The lab shows the tag on the story pill |
| Map not near the viewport | A placeholder of the same height as the live map (548 px on the lab phone) sits where the map will be |

## 4. Build notes (E4.13)

- **Render.** SSR at `/$lang` with title, description, canonical and hreflang (ADR-001). The server order is the curated order. `/` redirects with a 302 (ADR-002).
- **The food map.** Reuse the E4.6 map component and the E4.7 card and sheet, not a second map. It loads MapLibre by dynamic `import()` and its CSS (AGENTS.md rule 9).
  - Mount it only when the section is within about 600 px of the viewport. Show a placeholder with the same height before, so the page does not jump. The lab uses an `IntersectionObserver`.
  - Use MapLibre's cooperative gestures: one finger scrolls the page (MapLibre shows its own "use two fingers" hint), two fingers move the map, and on a computer Ctrl or Cmd with the wheel zooms. The lab copies the map component to turn the option on, because the approved component takes no such option. In the product, add the option to the shared component. Pins, Categories, List and the cards stay ordinary taps.
  - The approved layout reserves the phone's 68 px tab bar at its foot. The lab draws the map 68 px taller than the frame and cuts the excess, so the card row sits at the frame's foot. Replace that with a prop on the shared component.
  - Filter to food and drink on load. The other categories stay one tap away.
- **Pin icons.** `PinIconFace` draws the kind icon for a pin without a photo, on pins, on clusters and on the card thumbnail. It lives in `home-v9-pin-icon.tsx` and the approved map file `map-guest-options.tsx` now imports it. Move it to a shared file. Add the icons to `front-end/src/components/icons.ts` as plain `export { X as YIcon } from "reicon-react"` lines (AGENTS.md rule 2).
- **Card heights.** In the card row every place card has the same height: the 84 px thumbnail slot is always present (an icon when there is no photo), the language notice joins the fact line, and the buttons sit at the foot. This also applies to the `/lab/pins` map (`docs/ux/pins-design.md`).
- **Service maps and the events map.** The lab draws a static aerial fitted to a few numbered points (`PointsMap`). In the product, open the shared map with only those pins. Directions are Open in Google Maps (AC89).
- **Search constants and first load.** Put any value the route's `validateSearch` reads in the feature's `lib/search-params.ts` (AGENTS.md rule 1). The German dictionary stays a lazy chunk (rule 6). Do not import maps or the calendar from the route file (rule 9).
- **No price.** The Victorinox showcase hides prices. The route cards have no price field.
- **Reduced motion.** No scale animation on tiles and cards, and no animated pill text.
- **Tests to write.** Playwright `[E4.13][AC24][AC54][AC95]` in EN and DE at 375 px, covering:
  - The section order is the same for an answered and an unanswered visitor.
  - Nothing above the services row changes with the answers.
  - Each service tile opens a map with at least one place.
  - A multi-day answer puts the day trips first, a short stay puts the walks first.
  - An interest answer moves its must-visit up and removes no card.
  - The food map is not mounted until the section nears the viewport, and the placeholder has the same height.
  - A pin without a photo shows an icon and no letter.
  - An ended event never shows, and more than 3 events show "See all on the map".
  - No `CHF`, and no number under five printed as a count.
  - The lab's unit tests in `front-end/tests/lab-home-v9.test.ts` are a source of cases.

## 5. Open points

These are the designer's unverified content and the merchant must confirm them (full list in `docs/decisions/2026-10-28-home-local-briefing.md`).

- Free toilet locations, which fountains are drinking water, SIM and Wi-Fi details, and market days.
- Event dates: the Blues Festival, the Christmas market and Fasnacht 2027.
- Addresses and coordinates of the lab food and drink places: Rathaus Brauerei, Mr. Pickwick Pub, Confiserie Bachmann, Wirtshaus Galliker, Café Heini, Neubad and the weekly market.
- Route legs (Pilatus via Kriens and the Dragon Ride) and walking minutes.
- Event photos that do not show the venue: the Blues Festival uses a Hofkirche photo, the Christmas market uses Hirschenplatz, and the flea market uses the Jesuit Church. Food places with no honest photo show the kind icon.
- German copy has not been reviewed. Only the English was reviewed.
- Page length, about 6.4 phone screens.
- Icons come straight from `reicon-react` in the lab and must go through `components/icons.ts`.
- Not tested: a real phone, a screen reader, reduced motion, and MapLibre's cooperative gestures on touch.
- The onboarding design (`docs/ux/onboarding-design.md`) names the sorted line "Newest first · Sort for my trip" after a skip. The home pill now reads "Sort for my trip". Align the two wordings when building E4.5.

## 6. Rejected

- The interest-organised home: V4 (the shipped style), V5 (travel rails), V6 (feature plus list), V7 (photo banners), V8 (lists keyed to a map), and the three shared map-section options.
- Within the briefing: must-visit options A and B, route tickets and other route cards, the food timeline, menu, signs, dish cards and pick-by-moment, the events day strip, weekend-first and the other highlight cards, and a merged Victorinox and advice ending.
