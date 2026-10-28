# The home is "A local friend's briefing"

- Date: 2026-10-28
- Status: **approved on 2026-10-28** (approval given in chat by the person who made the request, after eight design rounds on the lab page `/lab/home`). It replaces the interest-organised home of `docs/decisions/2026-10-28-home-by-interests.md`.
- Changes: `docs/PRD/Swiss_keepsakes_PRD.md` (§3.3, §11.1, AC95, revision note 11), `docs/ux/home-design.md` (new), `docs/ux/search-design.md`, `docs/ux/pins-design.md`, `docs/adr/ADR-005`, `ADR-006`, `ADR-030`, `docs/development-plan/delivery-plan.md` (E4.2, E4.13), `docs/development-plan/screen-inventory.md` (S2, C01, Area 2, D12, D13)
- Source: the requester's approval of the lab page `/lab/home` on 28.10.2026
- Related: `docs/ux/home-design.md` (the full specification), `docs/decisions/2026-10-28-search-design.md`, `docs/decisions/2026-10-28-pins-and-map-design.md`

## Why

The interest-organised home showed the visitor a list of topics. The requester wanted a page that does what a local friend does for a first-time visitor: it handles the practical things first, then the sights, the free walks, the food, and what is on. Five interest-organised layouts (V4 to V8) were built and rejected before this one. They all sorted content by topic. None followed the order in which a visitor needs things on a first day in town.

## Decision

1. **One fixed page order for every visitor:** hero, map invitation, services, must-visits, routes, food map, events, ending. Nothing is hidden, and nothing above the services row depends on the onboarding answers.
2. **Hero.** The shipped "Sky fade" hero (logo, greeting, "Make yourself at home. I'll show you the Luzerne I love.", Chapel Bridge photo) with a search pill that opens the approved search (C24). This settles where search is entered.
3. **"First time in Lucerne?"** A map invitation that hangs from the search pill, with no card box: a static 3:2 aerial with the curated photo pins and an "Open the map" button.
4. **"Sorted before you unpack."** Six service tiles: drinking water, free toilets, SIM and Wi-Fi, trains, buses and boats, luggage lockers, cash and cards. A tile opens a map with only those places, a numbered list and directions.
5. **"See these first."** Must-visit postcards: photo, name, one local tip and a "The story behind it" pill when a story exists. The sort pill ("Sort for my trip", or "Sorted for … · Change" after the visitor answered) sits under this heading. It is the one personalisation signal on the page.
6. **"Walk it the way we would."** Free routes in the look of the shipped home's tour-card rail: photo, title, duration, start to finish. No price, no booking, no "From the story" line.
7. **"Eat and drink like a local."** The approved guest map from `/lab/pins` (option B: categories, list, photo pins, clusters, the card row and the place sheet), embedded in the section and filtered to food and drink on load. No link out. One finger scrolls the page, two fingers move the map. The map mounts only when the section is near the viewport, with a same-size placeholder before. MapLibre loads by dynamic `import()`.
8. **"While you're in town."** "This week" is the ink-poster card in the must-visit postcard style (photo filling the card, soft dark gradient, outlined date, white type), a carousel when more than one event falls in the week. "Coming up" is a timeline with italic month markers, at most three events and no photos. "See all on the map" sits inside the timeline block, shows no count and opens an events-only map.
9. **Ending.** The shipped Victorinox showcase with prices hidden, unchanged. Then a thin connecting thread with the line "There's still more of Lucerne to see first.". Then the shipped advice banner, unchanged.
10. **Personalisation only orders cards inside sections.** Stay length orders the routes (a short stay shows walks first, a multi-day stay shows day trips first). Interests order the must-visits and the food places. Nothing is hidden.
11. **Rules that hold across the page:** no price anywhere; a count under five is never printed; every photo must show what its title names; a pin without a photo shows an icon for its kind, white on the Victorinox lake blue `#173f52`, never the initial of its name.
12. **Exception to the static-map rule.** The earlier home plan had a static entry to the map and no live map on the home. This decision allows one live map, in the food section only. The map invitation at the top stays static.

## What it changes

- **Replaces** the home sections by interest, the default order, the no-overlap rule, the "Free and useful" section, the "More in Lucerne" strip and the kinds grouping on the home. See `docs/decisions/2026-10-28-home-by-interests.md` for what still stands from that record.
- **PRD:** §3.3 home paragraph and AC95 are rewritten, §11.1 replaces the `free` flag with a service type, a must-visit flag and a local tip. Revision note 11.
- **Approved guest map (`/lab/pins`):** two changes made at the requester's request the same day. A pin without a photo shows a kind icon, and every place card in the card row has the same height. See `docs/ux/pins-design.md`.
- **Search:** it is entered from the hero's search pill (`docs/ux/search-design.md`).
- **Plan:** E4.13 is rewritten around the eight blocks. E4.2 gets the new pin fields.
- **Inventory:** S2 is "Approved" with screens C01 and C24. D13 records this decision, and D12 is marked superseded.

## Data the build needs

Derived from the lab data file `front-end/src/features/lab/home-v9-data.ts`. The lab holds it as mock data. The product needs it as merchant data on pins and tours (story E4.2, E4.9 and E4.13 decide the exact model).

- **Service type on a pin.** One of water, toilets, connect (SIM and Wi-Fi), transport, lockers, cash. Each service pin has a note in EN and DE.
- **Must-visit flag and a local tip.** A flag marks a place as a must-visit. The tip is one line of local advice in EN and DE, separate from the pin's own tip if the merchant wants both.
- **Route stops with coordinates.** Each route stop has coordinates, and each leg records how it is travelled (on foot, boat, train, cable car). The lab route cards use only the first and last stop names, the duration and the kind (walk or day trip).
- **An optional photo per event.** The "This week" poster needs one. The lab falls back to an old-town square photo when an event has none, which is not honest for every event (see open points).
- **Food and drink kind for the icon.** Restaurant, café or bakery, pub or bar, market. In the lab the kind comes from the map category (a sub-category falls back to its parent), and the weekly market has a hard-coded override. The build needs a market sub-category or a kind field.
- **"What to order"** is not a field. The lab puts it inside the pin's tip (for example "Order the Chügelipastete"), so no new data is needed.
- **Icons.** `Glass`, `Coffee`, `ForkKnife`, `Basket`, `Walk`, `Camera`, `Drop`, `Ticket`, `MapPoint`, `Bus`, `Briefcase`, `Simcard` and `Wallet` are imported straight from `reicon-react` in the lab. The build adds them to `front-end/src/components/icons.ts` as plain re-exports (AGENTS.md rule 2). The toilet tile uses a "WC" text mark because the set has no toilet icon.

## Follow-up product work (not done here)

- A migration and API change for the service type, the must-visit flag and the local tip on pins (E4.2).
- Route stop coordinates and leg types on tours (E4.9). Free routes that are not tours (the lab's old-town walk) need a home in the data: a tour with no booking, or a route entity.
- Moving `PinIconFace` from `home-v9-pin-icon.tsx` to a shared file. The approved map file `map-guest-options.tsx` now imports it from the home file, which only works in the lab.
- The `free` flag and the fifth interest: see `docs/decisions/2026-10-28-home-by-interests.md`.
- Tests listed in `docs/ux/home-design.md`.

## Open points

Content the designer wrote that nobody has checked. The merchant must confirm each item before launch.

- **Free toilet locations.** Löwenplatz, Schwanenplatz and Kasernenplatz are lab guesses.
- **Which fountains are drinking water.** The Weinmarkt, Kapellplatz (Fritschi) and Bahnhofplatz fountains.
- **SIM and Wi-Fi details.** The SBB-FREE network, the SMS confirmation, the passport rule and the Pilatusstrasse phone shops.
- **Market days.** The weekly market on Tuesday and Saturday mornings.
- **Event dates.** The Blues Festival (9 to 14 November 2026), the Christmas market (3 to 23 December 2026) and Fasnacht 2027 (from 4 February 2027, 5 am).
- **Food and drink places.** Addresses and coordinates of Rathaus Brauerei, Mr. Pickwick Pub, Confiserie Bachmann, Wirtshaus Galliker, Café Heini, Neubad and the weekly market are estimates. Hours are missing.
- **Route legs.** The Pilatus route via Kriens and the Dragon Ride, and the Rigi route stops.
- **Walking minutes** on the service maps and routes.
- **Event photos that do not show the real venue.** The Blues Festival card uses a Hofkirche photo, the Christmas market uses Hirschenplatz, and the flea market uses the Jesuit Church.
- **Food places without honest photos.** They show the kind icon instead.
- **German copy.** Only the English text was reviewed.
- **Page length.** About 6.4 phone screens. Nobody has judged whether that is too long.
- **Icons** are imported straight from `reicon-react` in the lab and must go through `components/icons.ts`.
- **Not tested** on a real phone, with a screen reader or with reduced motion. MapLibre's cooperative gestures were not tried on a touch device.

## Rejected

- **The interest-organised home:** V4 (the shipped style), V5 (travel rails), V6 (feature plus list), V7 (photo banners), V8 (lists keyed to a map).
- **The three shared map-section options** for the home.
- **Within V9:**
  - Must-visits: options A and B.
  - Routes: route tickets and other route cards.
  - Food: timeline, menu, signs, dish cards and pick-by-moment.
  - Events: the day strip, weekend first and the other highlight cards.
  - A merged Victorinox and advice ending.
