# ADR-006: Keep onboarding answers in the browser, rank content on the client, and deliver map pins as one cached list

Status: accepted
Date: 2026-10-26
Source: AD-7
Applies to: `front-end/src/features/discovery/`, `front-end/src/features/tours/map/`, `front-end/src/features/content/`, `api/src/modules/content/`, `api/src/platform/http/`, `packages/domain/src/content/`

No new dependency, vendor or paid service for the personalisation and the pins list. The base map is settled by gate G11 (2026-10-27), which closes the tile part of O23 and replaces the earlier "decided later" (owner gate D4). The options table below is kept as the evidence behind it.

**Amended 2026-10-27 (G11).** `GET /api/public/map` returns published pins with their map categories and next date, and omits a pin whose last date has passed. Places are pins with no fixed type. The base map is one flat style shared by the map and the tour route map: MapLibre, swisstopo SWISSIMAGE photos, OpenFreeMap text layers, no tilt, no 3D terrain, and no AWS Terrarium source. The credits are "© swisstopo" and OpenFreeMap, OpenMapTiles and OpenStreetMap. Re-reading the SWISSIMAGE terms before launch stays an assumption (E9.4). Opening a pin shows the card, with a directions hand-off to the phone's map app (AC89), and `/:lang/map?place=<slug>` opens the map with that card (AC90). Category chips highlight the pins of the chosen category and dim the others on the client. No pin is hidden by a chip and nothing reloads (AC87, AC88, ADR-030). A `?place=` link to a hidden, expired or unknown pin opens the map normally with a short notice ("This place is no longer on the map", AC90).

**Amended 2026-10-28 (map design)** (`docs/decisions/2026-10-28-pins-and-map-design.md`). The card's directions action is one "Open in Google Maps" link, not a choice of Google or Apple Maps (AC89). The category filter is a Categories sheet and not a chip rail (ADR-030). A Map and List switch gives a list alternative (AC93). The map shows the four credits; folding them to one line needs the providers' terms checked first. Design: `docs/ux/pins-design.md`.

**Amended 2026-10-28** (`docs/decisions/2026-10-28-onboarding-full-screen.md`). The prompt has two forms, for guests only. A full-screen two-step flow shows on a guest's first visit when the visit began at the home with no partner QR or link and no search result (N01). On a deep link, a partner QR or link, or a search landing, only a small non-blocking prompt shows (N24), floating over the screen and never inserted into the content, and the full-screen flow shows at the first Explore opening of that visit, while the guest is unanswered. Closing the small prompt hides it for the visit and is not a skip. A skip inside the full-screen flow is permanent. The form is chosen from the entry of the current visit (first page, a partner QR or link in this visit, the search referrer), kept in memory or `sessionStorage` for that visit. It is not the 30-day attribution and not part of `sk.onboarding`. Both forms are client code after hydration, so the server HTML is the same for every visitor and crawler. Merchants, partners and Super Admins never see either form. The reopen entry sits on the Account tab and on the home line "Sorted for … Change", because the guest shell has no menu. The storage record, `rankItems` and the analytics rules do not change. The final designs of N01 and N24 are in `docs/ux/onboarding-design.md`.

**Amended 2026-10-28 (home map)** (`docs/decisions/2026-10-28-home-local-briefing.md`). The home (C01) has one live map: the food and drink section embeds the approved guest map, filtered to food and drink. It mounts only when the section nears the viewport, loads MapLibre by dynamic `import()`, and uses cooperative gestures (one finger scrolls the page, two fingers move the map). The map invitation at the top of the home stays a static image. The same pins list and visibility rule apply. Personalisation still only orders cards.

**Amended 2026-10-28 (T-E2.12 ruling D-4).** Each item of `GET /api/public/map` carries exactly these fields and no others: `id`, `slug` (null when the pin has no slug in that language), `latitude`, `longitude`, `title`, `language`, `categoryIds` (the pin's categories plus their parents), `stayTag`, `interests`, `nextDate` (null for a pin without dates), `hasMainStory`, `mainStorySlug` and `photoKey`. It has no `requestedLanguage`, `fallback`, `availableLanguages`, `tip` or `publishedAt`, and no price. Tour guides have no `publishedAt` in public reads: the tour card carries `id`, `slug`, `title`, `stayTag`, `interests`, `durationMinutes` and `coverKey` with the language notice. This narrows "the public tags (`stay`, `interests`, `publishedAt`) on every item" in the decision below to the items that have a `publishedAt`. Coordinator ruling inside the approved design, 2026-10-28, built in E2.12 (`api/src/modules/content/application/read-map.ts`, `packages/api-contract/src/public.ts`).

## Context
Onboarding asks two questions: short-stay or multi-day, and one or more of five fixed interests (a fifth, `local-activities`, was added on 2026-10-28; `docs/decisions/2026-10-28-home-by-interests.md`). The answers stay on the visitor's device and are not linked to an account or an order (Q12, G4). Feeds and the map order by stay tag and interests and hide nothing (Q26, G3, AC38, AC44). Pages must be indexable and the same for every crawler (ADR-001). The map is the most important screen. The prototype map uses MapLibre GL 6 with swisstopo SWISSIMAGE tiles, AWS Terrarium elevation tiles and OpenFreeMap labels, all without a key. After G11 the terrain source goes.

## Decision
We will keep personalisation entirely in the browser.

- **Storage.** `localStorage` key `sk.onboarding` holds `{ v: 1, segment, interests[], answeredAt, dismissedAt }`. A dismissed prompt does not return on its own. The visitor reopens onboarding from the Account tab or the home line (orchestrator ruling, 2026-10-26; the place amended 2026-10-28). The visitor can change or clear it at any time. No cookie, no request header, no query parameter and no request body of any API route other than the event route (ADR-007) carries `segment` or `interests`. A contract test fails if the OpenAPI document gains such a field on another route.
- **Ordering.** One pure function `rankItems(items, prefs)` in `packages/domain/src/content/` implements the PRD §3.2 rule (stay-tag match, then interest count, then newest). The Explore list and the map use it. The AC38 fixture is its test.
- **Server output is not personalised.** API lists and server-rendered pages (ADR-001) use the default order (newest first) and carry the public tags (`stay`, `interests`, `publishedAt`) on every item.
- **Map pins.** `GET /api/public/map?lang={lang}` returns every published pin in one compact response: id, slug, coordinates, title in that language, map category ids, stay tag, interests, the next date for a pin with dates, whether it has a main story, the main story's slug in that language, and a photo key. A pin whose last date has passed is left out. The cut-off is the end of that day in Europe/Zurich, or the end time when one is set. It sends `ETag` and `max-age=30`. Opening a pin loads `GET /api/public/places/{id}` for the pin card. The browser clusters and styles pins by the chosen chip, and a parent category chip also covers pins tagged only with its sub-categories (the read adds them). A `?place=<slug>` that matches no published pin in the list opens the map with the notice "This place is no longer on the map". A pin never carries a price.
- **Map code.** MapLibre and its CSS load with a dynamic `import()`, as AGENTS.md rule 9 says.
- **Geolocation.** The SPA never calls the geolocation API (AC67).
- **Base map (amended).** The style is MapLibre with SWISSIMAGE photos and OpenFreeMap text layers, flat 2D. The AWS Terrarium source is removed, and so is terrain. The table below records what was found on 2026-10-26. Terms must be re-read before launch.
- **No price on the map or in pin data (gate D10).** `GET /api/public/map` and the pin detail carry no price.

## Base map options

All three are free to use. None has an SLA. The style stays a configuration value, so one source can be replaced without code changes.

| Source | Used for | Cost | Licence and terms | Attribution | SLA | Trade-offs |
|---|---|---|---|---|---|---|
| swisstopo geoservices (SWISSIMAGE photo tiles) | Aerial photo base | Free | Open government data. Use, redistribution and commercial use are allowed. Geoservices need no registration. swisstopo may restrict access for excessive use. | A source reference is required, for example "©swisstopo". | None | Best Swiss imagery, official, no key. The abuse limit is not a number we know. A busy site could be throttled. |
| OpenFreeMap (labels, vector style) | Place names, roads | Free, donation-funded. Self-hosting is supported. | Open source. Commercial use is not stated in the pages read. Verify before launch. | "OpenFreeMap, © OpenMapTiles, data from OpenStreetMap" (MapLibre adds it automatically, per a secondary source) | None (a paid tier is only a possibility) | No key and no request limit stated. A single volunteer-run service is a single point of failure. Self-hosting removes that and adds work. |
| AWS Terrarium elevation tiles (`elevation-tiles-prod`) | Terrain relief | Free (AWS Open Data) | Mapzen terrain tiles. The registry names the Joerd attribution file as the licence. | Required. The exact wording was not retrieved. `aerial-style.ts` shows none today. | None | Needed only for 3D terrain. G11 drops terrain and removes this dependency. A replica exists in eu-central-1. |

A fourth path is a paid tile provider or tiles self-hosted on object storage. It is not evaluated here and would be a new vendor decision.

## Consequences
- The server never learns an individual's answers, so a leak or log cannot expose them.
- Reordering after first paint may move cards for a returning visitor. The list should reorder only on first render and on a preference change.
- One list response keeps the map simple. It stops working at around a thousand pins, because response size and client clustering cost grow. Viewport queries or vector tiles are the next step.
- Clearing browser data shows onboarding again (PRD §3.1). The reopen entry (the Account tab and the home line) is part of the onboarding screen design.

## Assumptions
- The Phase 1 map has fewer than a few hundred pins (PRD §11.1: "selected" points).
- `localStorage` for a preference the visitor asked for is probably exempt from consent in the EU (WP29 opinion 04/2012) and needs notice in Switzerland (FMG Art. 45c). The Swiss point rests on secondary sources. O32 asks the lawyer. If consent is required, the same key moves behind the consent state.
- The visitor's device keeps `localStorage` between visits on mobile browsers that clear it after a period without use. Then onboarding appears again, which the PRD accepts.
- The map style stays a MapLibre style document that can point at another tile source by configuration.

## Considered options
- **A. Browser storage and client ranking (chosen).** Meets Q12 and G4 by construction. Cost: no server-side personalised HTML.
- **B. Preference cookie read by the server.** Allows personalised first paint. The cookie travels on every request and is easy to join with logs, and it weakens the "not stored by the system" claim. Rejected. The language cookie `sk_lang` of ADR-002 holds a language code only and is not an exception to this.
- **C. Server ranking with a stored profile.** Requires personal data storage, which Q12 forbids. Rejected.
- **Pins by viewport or vector tiles.** Not needed at this size. Revisit above about a thousand pins.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-27 amended (gate G11, `docs/decisions/2026-10-27-map-pins-and-events.md`)
- 2026-10-28 amended (`docs/decisions/2026-10-28-onboarding-full-screen.md`)
- 2026-10-28 amended (T-E2.12 ruling D-4): map item fields, no `publishedAt` on tour guides
