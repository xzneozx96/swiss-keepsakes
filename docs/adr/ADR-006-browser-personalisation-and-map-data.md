# ADR-006: Keep onboarding answers in the browser, rank content on the client, and deliver map pins as one cached list

Status: accepted
Date: 2026-10-26
Source: AD-7
Applies to: `front-end/src/features/discovery/`, `front-end/src/features/tours/map/`, `front-end/src/features/content/`, `api/src/modules/content/`, `api/src/platform/http/`, `packages/domain/src/content/`

No new dependency, vendor or paid service for the personalisation and the pins list. The production base map tiles are decided later, with O23 (owner gate D4, 2026-10-26). The three options are compared in the table below.

## Context
Onboarding asks two questions: short-stay or multi-day, and one or more of four fixed interests. The answers stay on the visitor's device and are not linked to an account or an order (Q12, G4). Feeds and the map order by stay tag and interests and hide nothing (Q26, G3, AC38, AC44). Pages must be indexable and the same for every crawler (ADR-001). The map is the most important screen. The prototype map uses MapLibre GL 6 with swisstopo SWISSIMAGE tiles, AWS Terrarium elevation tiles and OpenFreeMap labels, all without a key.

## Decision
We will keep personalisation entirely in the browser.

- **Storage.** `localStorage` key `sk.onboarding` holds `{ v: 1, segment, interests[], answeredAt, dismissedAt }`. A dismissed prompt does not return on its own. The visitor reopens onboarding from the menu (orchestrator ruling, 2026-10-26). The visitor can change or clear it at any time. No cookie, no request header, no query parameter and no request body of any API route other than the event route (ADR-007) carries `segment` or `interests`. A contract test fails if the OpenAPI document gains such a field on another route.
- **Ordering.** One pure function `rankItems(items, prefs)` in `packages/domain/src/content/` implements the PRD §3.2 rule (stay-tag match, then interest count, then newest). The Explore list and the map use it. The AC38 fixture is its test.
- **Server output is not personalised.** API lists and server-rendered pages (ADR-001) use the default order (newest first) and carry the public tags (`stay`, `interests`, `publishedAt`) on every item.
- **Map pins.** `GET /api/public/map?lang={lang}` returns every published place in one compact response: id, type, coordinates, name in that language, stay tag, interests, whether it has a main story, the main story's slug in that language, and a photo key. It sends `ETag` and `max-age=30`. Opening a pin loads `GET /api/public/places/{id}` for the detail sheet. The browser clusters and filters. A pin never carries a price.
- **Map code.** MapLibre and its CSS load with a dynamic `import()`, as AGENTS.md rule 9 says.
- **Geolocation.** The SPA never calls the geolocation API (AC67).
- **Base map.** The production tile source is decided later, together with O23 (gate D4). The prototype style mixes three sources. The table below records what was found on 2026-10-26, so the owner can review it. Terms must be re-read before launch.
- **No price on the map or in pin data (gate D10).** `GET /api/public/map` and the place detail carry no price.

## Base map options

All three are free to use. None has an SLA. The style stays a configuration value, so one source can be replaced without code changes.

| Source | Used for | Cost | Licence and terms | Attribution | SLA | Trade-offs |
|---|---|---|---|---|---|---|
| swisstopo geoservices (SWISSIMAGE photo tiles) | Aerial photo base | Free | Open government data. Use, redistribution and commercial use are allowed. Geoservices need no registration. swisstopo may restrict access for excessive use. | A source reference is required, for example "©swisstopo". | None | Best Swiss imagery, official, no key. The abuse limit is not a number we know. A busy site could be throttled. |
| OpenFreeMap (labels, vector style) | Place names, roads | Free, donation-funded. Self-hosting is supported. | Open source. Commercial use is not stated in the pages read. Verify before launch. | "OpenFreeMap, © OpenMapTiles, data from OpenStreetMap" (MapLibre adds it automatically, per a secondary source) | None (a paid tier is only a possibility) | No key and no request limit stated. A single volunteer-run service is a single point of failure. Self-hosting removes that and adds work. |
| AWS Terrarium elevation tiles (`elevation-tiles-prod`) | Terrain relief | Free (AWS Open Data) | Mapzen terrain tiles. The registry names the Joerd attribution file as the licence. | Required. The exact wording was not retrieved. `aerial-style.ts` shows none today. | None | Needed only for 3D terrain. Dropping terrain removes this dependency. A replica exists in eu-central-1. |

A fourth path is a paid tile provider or tiles self-hosted on object storage. It is not evaluated here and would be a new vendor decision.

## Consequences
- The server never learns an individual's answers, so a leak or log cannot expose them.
- Reordering after first paint may move cards for a returning visitor. The list should reorder only on first render and on a preference change.
- One list response keeps the map simple. It stops working at around a thousand pins, because response size and client clustering cost grow. Viewport queries or vector tiles are the next step.
- Clearing browser data shows onboarding again (PRD §3.1). The reopen entry in the menu is part of the onboarding screen design.

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
