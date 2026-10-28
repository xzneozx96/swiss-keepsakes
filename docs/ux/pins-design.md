# Map and pins design: N02, N03, N16 and N17

- Status: **design approved** on 2026-10-28 (chat approval of the lab page `/lab/pins` as it opens). The seven differences from the original PRD v3 were settled the same day and the PRD now matches (section 5). One is still open: whether the map credits may be folded.
- Screens: N02 guest map, N03 pin card, N16 merchant pins list, N17 merchant pin editor. Slice S4, Track 1, stories E4.2, E4.6 and E4.7. N23 (categories) and N18 (media library) are **not designed yet**.
- Read first: `docs/decisions/2026-10-28-pins-and-map-design.md` (what was approved and the open differences), `docs/decisions/2026-10-27-map-pins-and-events.md` (the pin model), PRD §11.1 and AC42, AC62, AC63, AC64, AC67, AC68, AC79, AC85 to AC90, `docs/adr/ADR-006-browser-personalisation-and-map-data.md`, `ADR-029-one-pin-model-with-optional-dates.md`, `ADR-030-merchant-edited-map-and-blog-categories.md`.
- Visual reference: the lab page `/lab/pins` (run the front end and open `/lab/pins`). The files are in section 8. **The lab is a design reference, not product code.** It keeps state in React, uses mock data, draws the merchant dashboard in an iframe and builds some pieces only to fit its phone frame. Do not copy it. Build the screens in the product with the rules in section 6.
- Copy source (EN and DE): `front-end/src/features/lab/pins-merchant-copy.ts` for the merchant screens and the `copy` constants in `front-end/src/features/lab/map-guest-data.ts` for the guest screens. The German has not been reviewed by the merchant.

## 1. What the lab page shows

`/lab/pins` puts the merchant dashboard (N16 list, N17 editor) on the left and the guest's Map tab (N02, N03) on the right, on **one shared list of pins**. An edit in the editor shows on the guest phone as you type. Save, hide or delete and the guest map changes. The page has controls for the editor structure, the list state, a pin scenario, the dashboard width and language, and the guest map option, state, language, visitor answers and content case. The page opens on: editor structure **S**, guest map option **B**. Those are the approved designs. The other options are kept for reference (section 9).

The tour route map panel on the same page shows the tour detail's route on the same flat map style and credits, so the two maps look alike.

## 2. Guest map (N02) and pin card (N03): option B "Cards"

### Layout in the guest shell

- The map fills the screen between the top edge and the guest tab bar (68 px). The tab bar has **Map in the slot that Tours had**. No onboarding UI shows on this screen (N01 opens at the first Explore opening, `docs/ux/onboarding-design.md`).
- Flat map: MapLibre with the tour map's aerial style made flat (swisstopo SWISSIMAGE photos with OpenFreeMap names, no terrain, no sky, no tilt, no rotation). Decision G11.
- **Top controls**, floating over the map: a **Categories** button (filter icon, shows "Categories" or the number chosen) and a **Map | List** switch.
- **Pins** are photo pins. Close pins merge into a photo cluster that zooms in on tap. Pins are real buttons in the tab order, with `aria-pressed` and a 44 px hit area.
- **Card row.** When a pin is open, a row of place cards (311 px wide, 8 px apart) sits above the tab bar and swipes in step with the pins. Swiping to a card opens its pin; tapping a pin slides its card to the middle and moves focus to the card title. The row holds only the places the filter keeps.
- **Credits** sit just under the top buttons while the card row is up, and bottom-left above the tab bar otherwise. Option B uses the folded form (see section 5, point 5).
- **Status layer** over the map for loading, empty and failed (section 2, "States").

### Categories filter

- The Categories button opens the app's sheet. It lists the **top-level** map categories as checkboxes, with **Select all**, **Deselect all** and **Clear filter**. A parent covers pins tagged only with one of its sub-categories.
- While a category is chosen the **map dims** the pins outside it, and the list and the card row **hold only the chosen places**. A pin in two categories counts under both. This replaced the PRD's original chip rail (section 5, point 3).
- Use the app's existing selection controls and selected pattern for the checkboxes, not a new style.

### Ranking and prominence

- Pins are ranked by `rankItems` (PRD §3.2 and ADR-006) from the visitor's stay tag and interests. Ranking changes order and prominence only. **No pin is hidden by ranking.** The lab has a switch for "visitor answers": none, short-stay plus food, multi-day plus history.
- A pin is on the guest map only when it is **published, has a location and its last date has not passed** (end of that day in Europe/Zurich, or its end time). The lab's helper is `isOnMap` in `map-guest-data.ts`; build the rule once in `packages/domain` and use it for the map list and for the dashboard's "ended" state.

### Pin card (N03)

The card body is shared by the card row and the details sheet. Every optional field can be missing, and the card must work with all of them missing and all present. No price anywhere (AC42).

| Field | Rule |
| --- | --- |
| Photo | Main photo. More photos appear as a carousel in the details sheet (section 5, point 2) |
| Title and tip | The merchant's text in the visitor's language |
| Hours | Weekly hours per weekday (several spans, or closed). For a pin with dates: the next date, or the range, with optional times, in Europe/Zurich |
| Address | Optional. The map button sits on the address row, and shows even without an address |
| Main story | A link, only when the story has a published version in the visitor's language |
| Other stories | The published stories that tag this pin, with reading time |
| Outbound link | Optional, one per pin |
| Directions | "Open in Google Maps": a link in a new tab, destination only. The note under it says "Opens Google Maps in a new tab. We never see where you are." The site never reads the visitor's location and draws no route (AC89, G9, AC67) |

- **Details sheet.** "Show more" opens the place in the app's `SheetFrame`, laid out like the tour stop sheet: photo carousel, tip, facts, with **Previous place** and **Next place**.
- Focus goes to the card title when a card opens. The sheet returns focus to where it was.

### States (all reachable from the lab's state switcher)

| State | Behaviour |
| --- | --- |
| Loading | The map shell and skeleton controls first, then the map with "Loading places…", then the pins |
| Loaded | Pins appear as soon as the map is drawn |
| Empty | No pins published: the map with a short message and a way to Explore |
| Failed | The pins could not load: a short message and **Try again** |
| Deep link `?place=<slug>` | The map opens with that pin's card already open (AC90) |
| Deep link to a hidden, expired or unknown pin | The map opens normally with the notice "This place is no longer on the map" (DE "Dieser Ort ist nicht mehr auf der Karte"). Applies to a hidden pin, a pin whose only date is over, and an unknown slug |
| Pin without the visitor's language | The available language shows with a short notice. No machine translation (AC64) |
| First visit | The same map, no onboarding UI |

### List alternative and accessibility

- The **Map | List** switch shows the same pins in ranked order with the same filter. A card opens the same details. This is the alternative for keyboard and screen-reader users (AC93).
- Pins are in the tab order. Minimum tap target 44 px. `prefers-reduced-motion` is respected (no smooth card scroll or animated entries).

## 3. Merchant pins list (N16)

One responsive design: a table on desktop and rows on phones (the dashboard's list pattern: `data-table`, `filter-bar`, `row-actions`).

- **Per pin:** title (with which languages exist), status, map categories, next date, stay tag, interests, main story (with a warning when the story has no published version) and last edited.
- **Status:** draft, published, hidden, and **ended**: published but past its last date, so it is no longer on the guests' map (AC86).
- **Filters:** status (including ended), category (including "no category"), stay tag, has dates, and search.
- **Actions:** edit, hide, unhide, delete. **Only a draft can be deleted.** A published pin can only be hidden (AC79).
- **Add place** and **Add event** are two ways into the same editor. Add event opens it with the dates section ready.
- **States:** normal (a list of pins), loading, empty (no pins yet) and no matches.

## 4. Merchant pin editor (N17): option S "Steps"

The editor uses the **tour editor's stepper** (M13, `features/merchant/products/components/step-shell.tsx`, `StepLayout`). From 1024 px the steps are a numbered column. On phones the header reads "Step 2 of 6" with an "All steps" sheet. Each step has a done, needs-attention or error mark.

| Step | Content |
| --- | --- |
| 1 Place on the map | A map picker on the guest map's flat style (a tap places the pin, the marker drags, the arrow keys nudge it about 5 m, or about 25 m with Shift), the slug (suggested from the title, editable, must be one no other pin uses; changing the slug of a published pin warns that links already shared will go to the map without the pin), and the optional address |
| 2 Text and photo | Title and tip in EN and DE with a completeness indicator per language, the photo and alt text in EN and DE |
| 3 Hours and dates | Weekly hours (per weekday, any number of spans, or closed) and optional date entries: one day with optional start and end times, or a range of days. An entry cannot cross midnight (for example 22:00 to 00:30 is an error); for a late event the end time stays empty. Times are Europe/Zurich. The step explains that the pin leaves the map after its last date |
| 4 Categories and tags | Map categories (multi-select with one level of sub-categories; none is required, and no category means it shows only under All), stay tag (short-stay, multi-day or both) and the four fixed interests |
| 5 Story and link | An optional main-story picker that shows which language versions are published, and one optional outbound link (a warning that changing it changes every page that shows the pin) |
| 6 Review and publish | Each step's facts with **Edit**, and the publish rules |

- **New pin:** walk the steps with **Next**; **Save draft** at any time. **Existing pin:** open any step and save from any step.
- **Publish rules** (AC68): a title in at least one language, a location and a slug. Everything else is optional. Publish is off until they hold, and the panel lists what is missing.
- **Lifecycle:** a draft can be deleted. A published pin can only be hidden, after a confirm. A hidden pin can be shown again.
- **Scenarios in the lab:** new place, new event, published pin, hidden pin, ended event, draft with errors (German title only, no location, a link another pin uses, a 22:00 to 00:30 entry and a link with a space).
- **Preview** in EN and DE: the editor has "Preview EN" and "Preview DE" actions, and the lab shows the guest phone beside the editor drawing the unsaved edits. In the product the preview is an `ssr:false` route (decision D6).
- Editor fields are bilingual and validated in the API as well as the UI (ADR-003).

## 5. Differences from the original PRD v3 (settled)

The design differed from PRD v3 in seven places. The requester decided them on 2026-10-28, and the PRD, ADRs and plan now say what the design shows. The table is in `docs/decisions/2026-10-28-pins-and-map-design.md`. In short:

1. **Directions** is one "Open in Google Maps" link. Decided: Google Maps only (PRD §11.1, AC89).
2. **Several photos** per pin: a main photo and more, shown as a carousel in the details sheet. Decided: yes. The data model and N18 need follow-up work in E4.2.
3. **A Categories sheet with checkboxes** replaces the chip rail. Decided: keep the sheet (AC88, ADR-030).
4. **A Map | List switch** is part of the screen (AC93).
5. **Credits folded** to one short line with an info button in option B. **Still open:** check the providers' terms (swisstopo, OpenFreeMap, OpenMapTiles, OpenStreetMap). If folding is not allowed, show all four always.
6. **The details sheet** with Previous and Next place is part of the screen.
7. **Shared component edits** made for the lab: optional `container` and `tightBottom` on `SheetFrame`, an optional `quietTitle` on `StepLayout`, and `OpenInMapsIcon` in `components/icons.ts`. Accepted. They are additive, so review them when building.

## 6. Build notes (E4.2, E4.6, E4.7)

- **Data:** one pin model (ADR-029). The merchant list and the guest map read the same pins. `GET /api/public/map` returns the published, placed, not-yet-ended pins in one cached list (ADR-006). A pin opens with `GET /api/public/places/{id}`.
- **MapLibre** and its CSS load by dynamic `import()` (AGENTS.md rule 9). The map and the tour route map share one style module. No terrain source.
- **Many pins.** The lab renders pins as HTML markers. Past about 100 pins move to one GeoJSON layer (note in `map-guest-map.tsx`).
- **Server HTML.** Pins have no page of their own and are not in the sitemap (ADR-002). The map page shell is server-rendered, the pins load in the browser.
- **Components:** HeroUI sheets and the app's existing selected-state pattern. Icons from `@/components/icons`.
- **Dates and hours** are stored per ADR-029 (Monday is 1, Europe/Zurich).
- **Per-frame work:** use refs or throttles for map and swipe updates, not `setState` per frame (AGENTS.md rule 3). The lab settles the open pin once per swipe.
- **Tests:** Playwright `[E4.2]`, `[E4.6]`, `[E4.7]` in EN and DE at 375 px. Cover: a pin in two categories, a pin with no category, a pin past its last date, a hidden pin deep link and its notice, a pin without the visitor's language, the empty and failed states, and the editor's publish rules and midnight rule.
- **The lab's unit test** `front-end/tests/lab-pins-guest-view.test.ts` documents the visibility rules (published, placed, last date). Reuse its cases in the real tests.

## 7. Open points

- The folded credits (section 5, point 5).
- N23 (category editor) and N18 (media library) are not designed. N18 is also where several photos per pin would be managed.
- **Not tested:** the lab page on a real phone, with a screen reader, and with reduced motion. I did not click through every lab state when writing this.
- German copy has not been reviewed by the merchant.
- The first-load cost of MapLibre and the photo pins has not been measured.

## 8. Lab files (visual reference)

All under `front-end/src/`:

- `routes/lab.pins.tsx`: the page (search parameters in `features/lab/pins-merchant-search-params.ts`).
- `features/lab/pins-lab.tsx`, `pins-lab-sync.ts`: the page layout, the shared pin list and the message sync between the dashboard frame and the phone.
- Merchant: `pins-merchant-app.tsx`, `pins-merchant-shell.tsx`, `pins-merchant-list.tsx` (N16), `pins-merchant-steps.tsx` (N17, option S), `pins-merchant-editor.tsx` and `pins-merchant-editor-state.ts`, `pins-merchant-fields.tsx`, `pins-merchant-schedule.tsx`, `pins-merchant-map-picker.tsx`, `pins-merchant-publish.tsx`, `pins-merchant-data.ts`, `pins-merchant-copy.ts`.
- Guest: `map-guest-lab.tsx` (the page's phone panel and the tour route panel), `map-guest-options.tsx` (`OptionCards` is the approved option B), `map-guest-card.tsx` (N03 card body), `map-guest-kit.tsx` (credits, list, states), `map-guest-map.tsx` (MapLibre), `map-guest-data.ts` (ranking, visibility, dates, hours, copy).
- Shared-component edits the lab needs: `components/sheet-frame.tsx`, `features/merchant/products/components/step-shell.tsx`, `components/icons.ts`.

## 9. Rejected options (still in the lab for reference)

- Guest map: W "Wanderlog", A "Sheet", C "Numbers".
- Merchant editor: A "One page with a section bar", B "Tabs and a save bar", C "Form and live guest card".
