# Map kit design: one reusable map for pins and routes

- Status: **built 2026-10-30** (steps 1 to 9 of section 8, and the owner's additions below), after the owner **accepted** all 10 recommendations in section 10. Written 2026-10-30. Owner additions, same day: a blurred loading overlay on every map (A), compact map controls: a small zoom pill and round compass and fullscreen buttons with a 44 px hit area (B), the place editor review opens the story in a bottom sheet inside the phone (C), the pin card is the tour-style `MapCard` (D). Build started in the order of section 8.
- Owner request: put the tour route map's info card, its controls and its credits position on the pin map, and "create a reusable map component to display both pins and routes, reused among different screens".
- Read first: `AGENTS.md`, `docs/development-rules/frontend/heroui-and-styling.md` (reuse shared UI, matching skeletons), `components-and-hooks.md`, `docs/ux/pins-design.md`, ADR-006, ADR-030.
- Evidence: `.factory/runs/20261029-sprint7-release1/evidence/map-kit-tour-map-before.png` (the card, controls and credits the owner likes) and `map-kit-guest-map-before.png` (the pin map today, 390 px). Other sessions have uncommitted edits in `components/aerial-map/map-credits.tsx`, `features/map/components/map-screen.tsx`, `features/places/components/{map-picker,place-preview}.tsx` and new `components/map-controls.tsx`; the inventory reads the working tree as of this commit.

## 1. Inventory (MapLibre maps in `front-end/src`, outside `features/lab`)

| Screen (files) | Base and instance | Markers, selection | Route | Card | Controls | Credits | Loading, failed | Camera | Keyboard, phone or desktop |
|---|---|---|---|---|---|---|---|---|---|
| **Guest Map tab** (`features/map/components/map-screen, pin-map, pin-marker, place-card, status-layer, map-skeleton`) | `useAerialMap`: flat aerial, zoom 15.2, min 12, max 18.5, no controls | HTML markers portalled by React: photo pins (icon on `#173f52` without a photo), photo clusters worked out on `moveend`, dim = `opacity-40 saturate-0`, selected = accent ring and tail | none | `PlaceCardRow`: 311 px snap row above the tab bar, swipe selects, ✕, Esc closes. Thumb left (84 px), serif title, date, optional tip and chips, "Read the story". No nav buttons | HeroUI pills only: Categories (top-left), Map or List (top-right). No zoom, fullscreen or compass | `MapCredits` (React) bottom-left, top-left under the pills while a card is open | `MapLoadingVeil` + `MapControlsSkeleton`, "Loading places" pill, notice card for failed or empty, with Try again | `fitBounds` once for 2+ pins with insets (60 top, 64 or card height bottom); `easeTo` the selected pin, zoom 16 or more | Pins are buttons in rank order (`aria-pressed`, 44 px); focus goes to the card title and back to the pin; map `inert` in List view; live region. Phone-first, one layout |
| **Place editor preview** (`features/places/components/place-preview`) | `useAerialMap`, `interactive:false`, zoom 16 | `PinMap` with one selected pin, photo from the draft | none | `PlaceCardRow` with `extrasOf` (tip, category chips), `bottom=29` | none | `MapCredits` watching the phone frame, top-14 | `MapStatusLayer` (loading, failed with retry) | centred on the pin, never moves | Whole map `inert` except retry. Desktop editor only, in `IPhoneMockup`, lazy |
| **Place editor picker** (`features/places/components/map-picker`) | Its own init (a copy of `useAerialMap` without the draw state): `loadAerialStyle` then deletes `dem` and `sky`, min 12, max 19, compact attribution control | One draggable teardrop button; tap places it | none | none | none; `overlay` and bottom-left `children` slots, `controlsRef.recenter` | MapLibre compact attribution + `foldCreditsOnFirstTouch` | Plain "Loading map" text; failure calls `onFailed` (the step shows coordinate fields) | Starts on the pin (16.5) or Lucerne; `easeTo` if the pin leaves the view | Arrow keys nudge 5 m (Shift 25 m). Phone and desktop (`h-72 lg:h-96`) |
| **Tour route map** (`features/tours/map/tour-itinerary-map`) | `useAerialMap({terrain, lazy, resetKey})`: **3D** (pitch 55, bearing -25), cooperative gestures, MapLibre locale strings | 44 px numbered buttons (`.tour-map-marker`), imperative DOM; selected turns red | Halo + dashed red line (GeoJSON) | Inline in the file: eyebrow "Stop n · when", serif title, 2-line text, 76 px thumb right, ‹ n of m ›, "View more" opens `SheetFrame` | MapLibre `FullscreenControl` (pseudo) + `NavigationControl` top-right, CSS overrides (12 px radius, 44 px), an effect re-writes their labels; pills "Whole route" and "3D view" top-left | MapLibre compact attribution, bottom-right ⓘ, `foldCreditsOnFirstTouch` | Skeleton block and text, a "tiles loading" pill, error panel with Try again | `warmAerialTiles` then `flyTo` with offset for the card; "Whole route" `fitBounds`; Esc leaves fullscreen | Markers are buttons with `aria-pressed`; live region; frame `min(72svh,640px)`; fullscreen also works on iPhone |
| **Merchant itinerary editor** (`features/merchant/products/components/itinerary/itinerary-map, map-shared`) | A third copy of the init: `loadAerialStyle` (keeps the unused `dem`), pitch 0, no rotate, cooperative gestures, compact attribution | Same numbered buttons, draggable (`onMove`); "Drop a pin" then a tap adds a stop | Same halo and dashed line (`map-shared.addRoute`) | none (the list beside it is the card) | Zoom only (`showCompass:false`); "Drop a pin" button top-left | Compact attribution + `foldCreditsOnFirstTouch` | Spinner pill; alert with "Reload map" | Opens on the selected stop or fits the route; `flyTo` on select | Pins are buttons; dragging is pointer only (no key to move a pin; not verified whether the card fields cover it). Phone and desktop |

Shared infrastructure today (`components/aerial-map/`): `aerial-style.ts` (style, `warmAerialTiles`), `flat-style.ts`, `use-aerial-map.ts` (dynamic import, 16 s load timeout, 8 s draw timeout, `ResizeObserver`, lazy observer, `resetKey`, retry), `map-credits.tsx` (guest and preview), `fold-credits.ts` (the three MapLibre-attribution screens). `features/tours/map/aerial-style.ts` only re-exports the style for the picker, the itinerary editor and `routes/lab.map.tsx`. Not built yet but named in ADR-006: the home's food map (a sixth consumer: lazy, cooperative gestures, filtered pins).

What is shared today: only the guest map and the preview share parts. The tour, the itinerary editor and the picker each carry their own init, loading, failure and credits code.

## 2. ADRs and rules

- **ADR-006** (pins as one cached list, ranking on the client): no conflict. The kit takes pins as props, never fetches, and adds no ranking. It repeats the ADR's settled points: MapLibre and its CSS only by dynamic `import()`, flat photo style, never the geolocation API (AC67, so no `GeolocateControl`), four credits. The 2026-10-28 home-map amendment (lazy mount, cooperative gestures) is met by `lazy` and `cooperativeGestures`. **One tension:** the G11 amendment says the tour route map is flat too; it is still 3D until E4.12, so the kit keeps `mode="3d"` and E4.12 deletes it. `pins-design.md` §5 point 5 leaves the **folded credits open** (providers' terms unchecked); the owner now asks for the fold, so the check stays a launch task (Q9).
- **ADR-030** (merchant categories dim pins, never hide): no conflict. `PinLayer` has `dimmedIds`, no `hiddenIds`. The card row keeps holding only the chosen places.
- ADR-029 (one pin model, one card, one layer) supports one `MapCard`. ADR-001: the map route stays `ssr:true`: the server HTML holds the frame and the loading veil only, the instance starts in an effect. ADR-007 (`pin_open`): not wired in the front end yet; `onSelect` stays the single place a card opens.
- **Project rules:** reuse and never restyle HeroUI primitives in a feature (kit parts use `Button`, `ToggleButton`, `Tooltip`, `Skeleton`, `Spinner`, `Chip` as they are; the tooltip pattern is HeroUI's own, https://heroui.com/docs/react/components/tooltip, with `ToggleButton` for the 3D switch, https://heroui.com/docs/react/components/toggle-button); skeletons mirror the layout (the veil and the controls skeleton move into the kit, the tour's generic block goes); no feature import from `components/` (rule 5), so the pin look takes plain `MapPin` props; icons stay plain re-exports (rule 2); no `setState` per frame (rule 3: the compass needle turns by a ref on `rotate`).

## 3. Common practice

- **Composition (react-map-gl / `@vis.gl/react-maplibre`)**: a `Map` with `Source`, `Layer`, `Marker`, `Popup` and controls as children (https://visgl.github.io/react-maplibre/docs/api-reference/source, https://visgl.github.io/react-maplibre/docs/api-reference/navigation-control). The kit copies the shape, not the library.
- **MapLibre built-in controls**: `NavigationControl` (zoom and compass), `FullscreenControl` with `pseudo` for iPhone, `GeolocateControl`, compact `AttributionControl` (https://maplibre.org/maplibre-gl-js/docs/API/classes/NavigationControl/, https://maplibre.org/maplibre-gl-js/docs/API/classes/FullscreenControl/). They need label re-writing and CSS overrides to match our design; React buttons need neither.
- **Card carousel on a map**: Google Maps shows place details in a non-modal bottom sheet over a live map, and NN/g says to give it a Close button (https://www.nngroup.com/articles/bottom-sheet). Airbnb-style maps keep cards and markers in sync both ways (https://mapsemble.com/features/card-synchronization). Apple's HIG puts the legal link 10 pt above a card's resting position (https://developer.apple.com/design/human-interface-guidelines/maps), which is the rule for our credits.
- **Adopt `@vis.gl/react-maplibre`?** It is a new dependency (needs the owner's yes; peer `maplibre-gl >= 4`, v8.1 line supports our v6). It would replace about 150 lines of marker and layer glue, and `Marker` children are React portals as ours are. It would not replace what is ours: load, idle and draw timeouts, retry, `resetKey`, the lazy observer, tab order by rank, clustering, status layer. Gain small, new surface to learn, bundle cost not measured. **Recommendation: not now** (Q8). The kit's `MapView` plus children shape keeps a later swap mechanical.

## 4. Proposed module layout (`front-end/src/components/map/`)

```text
map-view.tsx       <MapView>, useMap(): owns the instance, frame, veil, failed notice, credits, fullscreen state
use-map-instance.ts  today's use-aerial-map.ts (renamed; keep `useAerialMap` as an alias for one step)
map-style.ts       aerial-style.ts + flat-style.ts, warmAerialTiles
map-status.tsx     MapStatusLayer, MapLoadingVeil, MapNotice (moved from features/map)
map-credits.tsx    MapCredits, ⓘ bottom-right, folds on the first touch (fold-credits.ts is deleted at the end)
map-controls.tsx   <MapControls>, <MapCorner>  (built on components/map-controls.tsx MapControlGroup/Button)
pin-layer.tsx      <PinLayer> + PhotoPin, PhotoCluster, NumberedPin, TeardropPin; lib/clusters.ts moves here
route-layer.tsx    <RouteLayer>
map-card.tsx       <MapCard>, <MapThumb>, <MapCardNav>, <MapCardRow>
map-messages.ts, map-messages.de.ts   keys keep their names (`map.credits`, `map.loadingMap`, ...)
map.css            .tour-map-marker rules (look unchanged), moved from tours/map/tour-itinerary-map.css
```

MapLibre stays behind the dynamic `import()` in `use-map-instance.ts`; every other kit file has only `import type`.

## 5. Props (signatures only)

```ts
type LngLat = [number, number]

interface MapViewProps {
  label: string                                   // the canvas's aria-label
  view: { center: LngLat, zoom: number, minZoom?: number, maxZoom?: number }
  mode?: 'flat' | '3d'                            // '3d' = tour only, until E4.12
  interactive?: boolean                           // false = the editor preview's picture
  cooperativeGestures?: boolean
  lazy?: boolean; resetKey?: unknown
  insets?: { top?: number, bottom?: number }      // space the overlays take: camera fits and credits stay clear of it
  status?: 'pins-loading' | 'empty' | 'failed'    // the screen's own states, over the map's own loading and failed
  onRetry?: () => void
  onFailed?: () => void                           // the map could not load (the picker swaps to fields)
  onMapClick?: (at: LngLat) => void
  handleRef?: Ref<MapHandle>                      // { map, focus(at, opts), fit(points, opts) }
  className?: string                              // the frame's size
  children?: ReactNode                            // layers and controls, drawn inside the frame
}
function useMap(): { map: Map | null, maplibre: MapLibre | null, state: 'loading' | 'ready' | 'error', drawn: boolean, insets: Insets, frameRef: RefObject<HTMLDivElement>, fullscreen: boolean, setFullscreen(on: boolean): void }

interface MapControlsProps { zoom?: boolean, fullscreen?: boolean, compass?: boolean | 'auto', top?: number, children?: ReactNode } // children: extra MapControlButtons
interface MapCornerProps { corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', children: ReactNode }  // pills ("Whole route", "Drop a pin")

interface MapPin { id: string, coordinates: LngLat, label: string }
interface PinLayerProps<P extends MapPin> {
  pins: P[]                                       // rank order = tab order
  selectedId?: string
  dimmedIds?: ReadonlySet<string>                 // dim, never hide (ADR-030)
  renderPin: (pin: P, state: { selected: boolean, dimmed: boolean, select: () => void }) => ReactNode
  renderCluster?: (members: P[], zoomIn: () => void) => ReactNode   // omit = no clustering
  draggable?: boolean; onMove?: (id: string, at: LngLat) => void
  fit?: 'first-load' | false
  onSelect: (id: string) => void
}
interface RouteLayerProps { coordinates: LngLat[] }   // halo + dashed red line, re-added on a new map

interface MapCardProps {
  id: string; title: string; titleLang?: string
  eyebrow?: string; text?: string; textLang?: string   // text clamps to 2 lines
  thumb: ReactNode                                      // <MapThumb src? icon?>: photo over an icon face
  nav?: { index: number, count: number, onStep: (delta: 1 | -1) => void }   // ‹ n of m ›
  action?: ReactNode                                    // "View more" Button or "Read the story" Link
  onClose?: () => void
}
interface MapCardRowProps<T> { items: T[], selectedId: string, renderCard: (item: T, index: number) => ReactNode, bottom?: number, onSelect: (id: string) => void, onClose: () => void }
```

`MapView` is the only part that owns the MapLibre instance. Layers read it through `useMap()` and clean up their own markers and layers when it changes (a retry makes a new map).

## 6. How each screen composes the kit

```tsx
// Guest Map tab (features/map): data, filter, ranking and the sheet stay here
<MapView label={t('map.heading')} view={LUCERNE_VIEW} status={status} insets={{ top: CONTROLS, bottom }} onRetry={retry}>
  <PinLayer pins={pins} selectedId={openId} dimmedIds={dimmed} fit="first-load" onSelect={openFromPin}
    renderPin={(p, s) => <PhotoPin {...s} look={look} photoSrc={photoOf(p)} />} renderCluster={(m, zoomIn) => <PhotoCluster members={m} zoomIn={zoomIn} />} />
  <MapControls zoom top={CONTROLS + 8} />
  <MapCardRow items={kept} selectedId={openId} renderCard={(p, i) => <MapCard {...pinCard(p)} nav={{ index: i, count: kept.length, onStep }} />} />
</MapView>
// Place editor preview: same, interactive={false}, one pin, no controls, `extras` become eyebrow and text
// Tour route map: mode="3d" lazy cooperativeGestures resetKey={stops}
<MapView ...><RouteLayer coordinates={coords} /><PinLayer pins={stopPins} renderPin={NumberedPin} .../>
  <MapControls zoom fullscreen compass="auto" /><MapCorner corner="top-left">{wholeRoute}{threeD}</MapCorner>
  <MapCard eyebrow="Stop 1 · Meet here" nav={...} action={<Button>View more</Button>} onClose={closeCard} /></MapView>
// Itinerary editor: <RouteLayer/> + <PinLayer draggable onMove/> + <MapControls zoom/> + <MapCorner corner="top-left">Drop a pin</MapCorner>; onMapClick adds the stop
// Place picker: <PinLayer pins={[pin]} draggable renderPin={TeardropPin}/> + <MapControls zoom/>; onMapClick places it; onFailed shows fields
```

Insets also place the controls and the credits, so a screen states "the card takes this much" once.

## 7. The three owner changes, exactly

1. **Card.** `MapCard` is the tour card as shipped: `rounded-2xl bg-surface p-3 shadow-overlay`, eyebrow `text-xs text-muted`, serif title `text-card-title font-semibold` (one line), text `line-clamp-2 text-sm text-muted`, 76 px rounded thumb on the right, nav row (tertiary icon buttons, "1 of 6" `text-xs tabular-nums`, disabled at both ends, focus kept on the other button), secondary small action on the right. The ✕ stays above the card, right. The text column keeps the thumb's height, so every card in a row has one height (the 2026-10-28 rule). Pin card fields: eyebrow = first category and next date, text = the local tip, action = "Read the story" when the pin has a main story, later "View more" for the E4.7 details sheet.
2. **Controls.** Top-right, one group for fullscreen and one for zoom in, zoom out and compass, 44 px, white, thin dividers, same as the tour. Built from `MapControlGroup` and `MapControlButton` (tooltip and `aria-label` from `t()`), so the label re-write effect, the CSS overrides and the Esc effect go. The compass shows only where the bearing can change (`'auto'`, Q1).
3. **Credits.** `MapCredits` bottom-right: the four credits written out at first, a round ⓘ after the first touch of the frame, ⓘ opens them again. `insets.bottom` lifts it clear of the card (Q4).

## 8. What each file becomes, in migration order

One commit per step; every screen works after each step. Start only when the sessions editing `features/map/**`, `components/aerial-map/**` and `components/map-controls.tsx` have committed.

| # | Step | Files | Guard (run `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm verify:routes`, `pnpm verify:renders` every step) |
|---|---|---|---|
| 1 | Move the infrastructure, no behaviour change | `components/aerial-map/*` → `components/map/` (renames above); picker and itinerary import the new style; keep `features/tours/map/aerial-style.ts` while `routes/lab.map.tsx` uses it | `map-aerial-map`, `map-fold-credits`, `map-screen`, `map-tab`, `map-tour-route`, `places-preview` unchanged and green |
| 2 | `MapView`, `useMap`, status layer, credits bottom-right; the place preview moves onto it | new `map-view.tsx`, `map-status.tsx`; `status-layer.tsx`, `map-skeleton.tsx` move; `place-preview.tsx` wrapped | new `map-view.test` (loading, drawn, failed and retry, credits fold, insets); `places-preview`, `places-review` |
| 3 | `MapCard`, `MapThumb`, `MapCardNav`, `MapCardRow`; `PlaceCardRow` rebuilt on them (change 1) | `place-card.tsx` becomes a thin pin adapter; `PinThumb` becomes `MapThumb` | `map-place-card-row`, `map-screen`, new `map-card.test` (nav disabled at ends, one height, labels, Esc, focus) |
| 4 | `PinLayer`; the guest map moves onto `MapView` + `PinLayer` (credits move, change 3) | `pin-map.tsx`, `pin-marker.tsx` become `PinLayer` + `PhotoPin`; `lib/clusters.ts` moves; `map-screen.tsx` shrinks | `map-clusters`, `map-screen`, `map-tab`, new `pin-layer.test` (tab order = rank, dim not hide, cluster), e2e 375 px |
| 5 | `MapControls`, `MapCorner`; the guest map gets them (change 2) | new `map-controls.tsx` over `components/map-controls.tsx` | new `map-controls.test` (zoom, fullscreen, compass auto, Esc); extend `tests/support/fake-maplibre.ts` (`zoomIn`, `zoomOut`, `resetNorthPitch`, `getBearing`) |
| 6 | `RouteLayer`, `NumberedPin`; the tour route map moves over (largest step) | `tour-itinerary-map.tsx` keeps data, sheet and copy; its init, markers, route, controls, labels, Esc, credits and `.css` rules go | `map-tour-route` (extend), `tour-detail-no-booking`, new `route-layer.test`, before and after screenshot diff |
| 7 | Itinerary editor moves over | `itinerary-map.tsx` shrinks; `map-shared.ts` deleted | itinerary editor tests, drag and drop-a-pin cases |
| 8 | Picker moves over; `fold-credits.ts` and its test are deleted | `map-picker.tsx` keeps its props (`overlay`, `controlsRef`, `onFailed`) and wraps `MapView` | `places-editor`, keyboard nudge case |
| 9 | Clean-up and docs | drop `useAerialMap` alias and the re-export once the lab is retired; update `heroui-and-styling.md` shared-UI table, `pins-design.md`, ADR-006 (credits and controls) | new guard test `map-kit-guard.test.ts`: no value import of `maplibre-gl` outside `use-map-instance.ts` and the lab, no `new Map(` of MapLibre outside it |

Look check: the two "before" screenshots are the reference; after steps 3 to 6 diff at 390 px. Only the card (pin map), the controls (pin map) and the credits position may differ.

## 9. Risks

- **Bundle.** The route files import kit parts statically (`/map` is `ssr:true`). Keep `maplibre-gl`, its CSS and the worker only in the dynamic `import()`; icons stay plain re-exports (rule 2); do not import the sheet, calendar or `Tooltip` extras into the kit beyond what the first load already has. Compare `pnpm build` chunk sizes before step 2 and after step 6; the guard test covers imports, not size.
- **SSR.** The server renders the frame, veil and overlays only; no `window` read outside effects (`reducedMotion()` is called in handlers).
- **Keyboard and screen reader.** Pins stay buttons in rank order with `aria-pressed`; card focus and Esc stay as shipped; the compass and fullscreen get visible labels and tooltips; the canvas keeps its `aria-label`; the live region stays with the screen. A map with draggable pins still has no key to move a pin (itinerary): not fixed here.
- **Phone full screen.** Pseudo-fullscreen (CSS) must respect the safe-area insets, sit above the tab bar and the music button, and lock page scroll; on the Map tab it would cover the guest shell (Q2).
- **Collisions on the guest tab** (seen in the screenshot): the Map or List pill is top-right where the control stack goes; the music button sits bottom-right (72 to 120 px) where the ⓘ goes; the card row's ✕ sits above the cards on the right (Q3, Q4).
- **Unverified:** nothing here was run in a browser except the two screenshots; the German strings and the 3D tour on a real phone were not checked.

## 10. Open questions for the owner

**Accepted 30.10.2026: the owner accepted all 10 recommendations below.** Where the owner's additions change a recommendation, they win: the controls (Q2, Q3, Q10) take the compact look of addition B, and the loading look (Q7) is the blurred overlay of addition A.

1. **Compass on flat maps.** Every map but the 3D tour cannot rotate or tilt, so a compass would do nothing. Recommendation: show the compass only where the bearing can change (the 3D tour), and give flat maps zoom and fullscreen only.
2. **Fullscreen on the guest Map tab.** It already fills the screen. Recommendation: no fullscreen button there; keep it on the tour route map, and offer it to the itinerary editor only if asked.
3. **Controls versus the Map or List pill.** Both want the top-right. Recommendation: the control stack starts below the pill row (68 px from the top); Categories and Map or List stay where they are.
4. **Credits ⓘ bottom-right versus the music button and the card's ✕.** Recommendation: ⓘ sits 8 px above the music button with no card, and 8 px above the ✕ while a card is open (like Apple's rule of credits just above the card).
5. **Pin card contents.** Recommendation: eyebrow = first category and next date, text = the local tip (2 lines), no chip row, "Read the story" only when there is a story; "View more" arrives with the E4.7 details sheet.
6. **Row or single card for pins.** Recommendation: keep the swipeable row (shipped, tested) and add the ‹ n of m › buttons inside each card, so keyboard and desktop users can step.
7. **One loading and failed look.** The tour, itinerary and picker each have their own. Recommendation: all use the guest map's veil and notice (a small, transient change outside the three you asked for); say no and the kit keeps a `plain` variant.
8. **`@vis.gl/react-maplibre`.** Recommendation: do not add it now; revisit if pins pass about 100 and we move to a GeoJSON layer.
9. **Folded credits and the providers' terms.** `pins-design.md` still lists "check swisstopo, OpenFreeMap, OpenMapTiles, OpenStreetMap terms" as open. Recommendation: ship the fold as asked (text visible first, ⓘ after the first touch) and make the terms check a launch task for you or the lawyer.
10. **Control look.** The tour's controls have a 12 px radius; the new `components/map-controls.tsx` has 16 px. Recommendation: use 12 px in the kit (the tour is the reference) and agree it with the session that owns that file.

## 11. As built, and where it differs from sections 4 to 8

Code is in `front-end/src/components/map/`; one commit per step of section 8. Differences, all small:

- **`useMapInstance`, no alias.** `use-aerial-map.ts` became `use-map-instance.ts` and every caller moved in step 1. No `useAerialMap` alias, no `features/tours/map/aerial-style.ts` re-export (the lab imports `components/map/map-style`).
- **No `handleRef`.** `MapView` has no `{ map, focus, fit }` handle. Screens read the map with `useMap()` in a child component (the picker's Recenter, the tour's camera). `MapView` also has an `overlay` slot (controls that stay pressable when the map is `inert`: the guest map's pills in List view), an `inert` prop and a `credits` switch.
- **`className` is the frame's position.** `MapView` does not add `relative`: a screen passes `relative` or `absolute inset-0` (the two classes fight when both are set).
- **Controls as the owner asked (addition B), not 44 px.** Zoom in and out are one 32 px wide pill with a 12 px radius, the compass (3D tour map only, Q1) and fullscreen (tour only, Q2) are round 32 px buttons, each with a 44 px hit area from `::before`. Two stacked buttons overlap their hit areas by 12 px in the middle; the lower button wins there.
- **Loading (addition A).** One blurred overlay, spinner, "Loading the map", until the map's first idle; reduced motion shows only the words. The failed notice reads "The places could not load" on every map (Q7): for the tour map and the editors that wording is not exact.
- **Pin card (addition D) and Q5.** The card's eyebrow is the first category and the next date, the text is the tip when the caller has one (only the editor's preview does today), no chips. `‹ n of m ›` shows with two cards or more. The ✕ is 36 px with a 44 px hit area, on both the guest map and the tour map.
- **Credits** are bottom right on every map and fold to a round ⓘ on the first touch. The picker, the itinerary and the tour map lost MapLibre's own attribution control and `fold-credits.ts`.
- **Picker fix.** A position that comes from a link or the coordinate fields eases the pin to the middle of the clear part of the map (56 px right for the controls, 52 px below for the credits, 56 px above for the pin's head). A tap, drag or key keeps the camera still unless the pin ends under them.
- **Story sheet (addition C).** The editor's preview opens the story in the shared `SheetFrame` inside the phone, with `Media` and `ArticleBlocks` of the guest story page. The API has no read of a story version and the story options carry no slug, so the text is the demo `Article` whose title equals the story's title in the previewed language; a story with no such article shows its title and "The story text is not available in the preview yet". A story that is published in no version of the previewed language has no Read the story button in the preview, as on the guest map.
- **Not built:** `MapCorner` has four corners but only the top left is used; the guest map's `MapControlsSkeleton` stays in `features/map` because it is the shape of the screen's own pills.
- **Guard.** `tests/map-kit-guard.test.ts` fails when a file outside the kit and the lab loads MapLibre, its CSS or its worker as a value, or when the old `map-controls`, `fold-credits` or `aerial-style` files come back.

