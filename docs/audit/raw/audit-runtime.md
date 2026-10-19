# Runtime / JS performance audit (read-only)

Repo: front-end/src. Date 2026-10-18. Measured = I ran code or counted files; inferred = from reading code plus Node microbenchmarks (not a browser profile; phone CPUs are roughly 3-5x slower than the Node numbers).

## Data sizes (measured: createSeedState() via jiti, JSON.stringify)
- Whole demo state: 374 KB JSON. products 21 (95 KB), reviews 169 (59 KB), tours: 3 tours / 23 departures / 17 bookings (97 KB), articles 21 (53 KB), costs 135 (35 KB), orders 12, comments 43, partners 3.
- Report transactions = 12 orders + <=17 bookings = ~29. Cost rows (completed only) <=29. Calendar events <=~60.
- Photos: 71 JPEG, 12.5 MB total, largest 499 KB. Knife art: 13 WebP, 30-44 KB each.
- Consequence: O(n*m) filters/finds in reports, sales, search, catalog, calendar are irrelevant at these sizes. No list needs virtualization or content-visibility (largest rendered list is ~29 rows or 21 cards).
- Microbench (Node 22): new Intl.NumberFormat currency+format 27 us; new Intl.DateTimeFormat+format 48-83 us; cached formatter .format 0.5-1.6 us.

## Findings

### RUN-1 (high) formatMoney builds a new Intl.NumberFormat on every call; Sales/Reports hooks call it hundreds of times per render (rule: js-cache-function-results / js-hoist)
- src/lib/format.ts:7-18 `formatMoney` does `new Intl.NumberFormat(...)` per call.
- src/features/merchant/sales/hooks/use-sales-overview.ts:443-477 `barsOf` calls `format()` 4x per bar (value, gifts, tours, previous). It runs for 4 KPIs (value, collected, sales, unpaid) plus 2 more in `extra` (moveKpi, lines 534-565) = 6 charts; `extra`, `methods`, `sellers`, `months` are computed on every render even in the Overview which comment-says "Reports only" (lines 528, 567, 641).
- Same hook lines 410-441 `label()` -> `fmt()` builds 1-2 new Intl.DateTimeFormat per slot per KPI, identical for all 6 KPIs (labels do not depend on the KPI). `range()` (348-358) and `pct()` (265) and `count()` (250) also construct a formatter per call.
- Nothing after the first useMemo (line 140-238) is memoized, so every render of SalesOverview/ReportPagesProvider redoes it: every 30 s (useDemoNow tick, demo-store.tsx:80-86), every period change, every demo state update.
- Estimate (inferred): 28-day period = 28 slots. DateTimeFormat: 6 x 28 x ~1.5 x 60 us ~ 15 ms. formatMoney: 5 money KPIs x 28 x 4 = 560 calls x 27 us ~ 15 ms. ~30 ms in Node for 28d, ~60 slots (custom/3m) about double. Plausibly 100-150 ms on a mid phone: a visible long task when tapping a period chip. ReportPagesProvider (use-report-pages.tsx:39-258) runs useSalesOverview + useReports + all page aggregations for every Reports tab, so it is paid again there.
- Data is tiny (29 txs), so the cost is Intl construction, not the filters.
- Fix: S. Module-level cache of NumberFormat/DateTimeFormat per locale in lib/format.ts (Map keyed by locale+options); hoist `label` results out of `barsOf` (compute once per slot); wrap the post-memo part in useMemo keyed on [sales, period, custom, filters, today, nowTime, language]. App-wide win because formatMoney is called in every card/row.

### RUN-2 (medium) useTours() starts a 1 s setInterval per consumer, re-rendering whole screens every second (rule: rerender-derived-state / client-event-listeners - shared ticker)
- src/features/tours/hooks/use-tours.ts:49-55 `setTick(Date.now())` every 1000 ms, no condition. `now` is a fresh Date each tick, so it defeats memo of any child that takes `now`.
- 28 call sites. TourCard (tour-card.tsx:26) is one per card (3 tours in seed, 3 intervals + 3 more 30 s intervals via useProductReviews->useDemoNow, use-product-reviews.ts:65). TourDetailPage (tour-detail-page.tsx:56 and :87) re-renders its entire subtree each second including TourItineraryMap (not memoized, tour-itinerary-map.tsx:38) and the full useProductReviews item build. Merchant today-queue.tsx has 3 consumers, tour-editor 2.
- Who needs 1 s: only booking hold countdowns (tour-review-page, tour-payment-page). Everything else shows minutes/dates. The Calendar already coarsens to minutes (use-calendar-items.ts:40 `Math.floor(now/60000)` + memo(CalendarScreen)), which shows the authors know the pattern.
- Impact (inferred): idle CPU wakeups/React commits 1/s per consumer, battery on phones, and any in-progress interaction (map flyTo, sheet animation) shares main thread with a re-render. Not a visible jank on its own at this size.
- Fix: S/M. `useTours({ tick: "second" | "minute" })` default minute, or a single shared ticker (useSyncExternalStore) that notifies only when the selected granularity changes. Keep the 1 s only on hold countdown screens.

### RUN-3 (medium) Guest map: every stop change pre-fetches ~52 tiles with no abort; re-fires on unrelated toggles (rule: js-early-exit / effect cleanup)
- src/features/tours/map/aerial-style.ts warmAerialTiles builds WARM = DEM r1 (9) + photo z16 r2 (25) + z15 r1 (9) + z14 r1 (9) = 52 fetches per call, `fetch(url).then(r => r.blob())`, no AbortController, no dedupe/cache of already-warmed stops.
- tour-itinerary-map.tsx:239-290 the effect has deps `[active, language, t, threeD, mapState, fullscreen, tour.itinerary]`; it calls warmAerialTiles + flyTo whenever the stop changes, and also on fullscreen toggle, 3D toggle and language change. Cleanup only sets `cancelled` (line 286): the fetches keep going. Paging quickly through 11 Lucerne stops queues 11 x 52 requests (~1 MB of JPEG per stop at ~20-30 KB/tile, inferred) on a connection already feeding MapLibre.
- loadAerialStyle() (aerial-style.ts:~65) re-fetches OpenFreeMap liberty style JSON on every map mount (browser HTTP cache may soften it).
- Map lifecycle itself is good: lazy import + IntersectionObserver (rootMargin 240 px), init once keyed on tour.id, ResizeObserver disconnected, markers removed, map.remove() in cleanup (lines 227-236). The addEventListener/removeEventListener count mismatch in this file (2 vs 1) is the marker click handler on elements that are removed with the markers: not a leak.
- Fix: S. Split the effect so the warm+flyTo depends only on active stop and mapState (move aria-label updates and camera pitch to a separate effect), pass an AbortSignal and abort in cleanup, skip warm for stops already warmed (Set of stop ids), cache the style promise at module level.

### RUN-4 (medium) Whole 374 KB demo state is JSON.stringify'd to localStorage on every update, and every useDemo consumer re-renders (rule: client-localstorage-schema, rerender-split-combined-hooks)
- src/features/demo/demo-store.tsx:33-35 `useEffect(() => writeStored(STORAGE_KEY, state), [state])`; context value is the whole state (line 53-56), no selectors. 42 files call useDemoNow, most pages call useDemo().
- Seed is 374 KB measured; JSON.stringify of that is ~1-3 ms in V8 (inferred), but merchant photo uploads are stored as data URLs in the state (lib/photos.ts:15-27), so a few uploads push it to MBs and each keystroke-driven update (any `update()`), e.g. mail/booking actions, rewrites all of it synchronously. localStorage quota (5 MB) failure is swallowed silently (lib/storage.ts:16).
- photoUrl() (lib/photos.ts:25) runs a full-string regex `^data:image/...;base64,[A-Za-z0-9+/=]+$` on every call for uploaded photos: O(length) per render per photo.
- Impact now: low (no keystroke-bound updates found; editors keep local draft state). Becomes real with several uploaded photos.
- Fix: M. Debounce/idle-schedule the write (requestIdleCallback or 300 ms trailing), store uploaded photos outside the main key (or IndexedDB), cache photoUrl by slug.

### RUN-5 (low-medium) Home story cards: 6 permanently running ken-burns animations under a backdrop-blur pill
- src/styles/globals.css:217-229 keyframes `ken-burns` (transform scale/translate, 14 s, infinite alternate); features/discovery/components/moving-story-rail.tsx:50 applies it to 6 cards (STORIES_ON_HOME = 6, use-discovery-view.ts:20), each with a staggered delay; line 68 puts `backdrop-blur-md` on the category pill that sits above the animating photo. A backdrop-filter over continuously-changing pixels has to be re-blurred every frame on the visible cards (about 1.6 on a phone screen). Offscreen compositor animations are culled by Chrome, but the 6 oversized scaled textures (photos up to 500 KB, scaled to 1.18) stay promoted.
- Respects prefers-reduced-motion (@utility wraps in no-preference). Only transform is animated: composited. Good.
- Impact (inferred): GPU/battery on the home screen, minor jank on low-end phones during scroll. Not CPU.
- Fix: S. Drop backdrop-blur-md on those pills (use bg-black/35), or start the animation only when the card is in view (useInView) and pause others.

### RUN-6 (low) Planner/advice chat: whole transcript re-renders per streamed word; no throttle, no row memo (rule: rerender-memo, rerender-transitions)
- features/planner/components/planner-chat.tsx:265 `useChat({ chat })` without `experimental_throttle`; transport (planner/lib/transport.ts:59-68) emits a delta per word every 24-32 ms (~35/s). Each delta re-runs the whole body: `renderAssistant` rebuilds all nodes for all messages (lines 417-485, 516-526), `useEffect([messages])` walks every part (284-305), TracePanel/ChainOfThought steps re-render.
- No markdown parsing anywhere (Assistant renders plain text, line 101), so per-render cost is JSX/diff only. Transcript is short (a scripted flow of ~6-12 turns): estimate 1-3 ms per delta (inferred). Not a problem at current size; it would be with a real model and long answers.
- transport.ts:5-14 `sleep()` adds an `abort` listener on the shared signal per call and never removes it (one per streamed word, hundreds per turn). Harmless until the signal is long-lived; add `{ once: true }` and remove on timeout.
- resize -> setTop on every event (planner-chat.tsx:273-282, advice-chat.tsx:170-180): un-throttled, re-renders the whole transcript during Android keyboard resize. Use a ResizeObserver/`dvh` only, or rAF.
- Fix: S. `experimental_throttle: 50`, memoize message rows (`memo` keyed by message identity), `{ once: true }` on the abort listener.

### RUN-7 (low) Global/gift search navigates the router on every keystroke (rule: rerender-use-deferred-value)
- routes/_guest/search.tsx:28-33 and routes/_guest/gifts/index.tsx (search onChange ~line 135) call `navigate({ search: { q }, replace: true })` per keystroke and the input value comes back from the URL (`query={q}`). Each keystroke = router match + whole page render + toCard() for all 21 products.
- Filtering itself is trivial (21 products, 3 tours, 21 articles; toLocaleLowerCase on a few KB). The risk is input lag/caret jumps on slow phones because the field is controlled by async router state.
- Fix: S. Local `useState` for the field, `useDeferredValue` (or 150 ms debounce) for the URL sync and the filter.

### RUN-8 (low) Article contents bar re-renders every scroll frame; AutoTextArea double-measures (rules: rerender-use-ref-transient-values, js-batch-dom-css)
- features/content/components/article-contents.tsx:34-70 scroll listener is passive and rAF-throttled (good) but `setProgress` changes every frame while scrolling, re-rendering the chip bar. Drive the progress bar through a ref (`style.transform`) and only setState when the active section changes. Reads (getBoundingClientRect x sections) are batched, no write interleave.
- components/auto-textarea.tsx:34-48: only on browsers without `field-sizing` (iOS Safari < 26), `useLayoutEffect(fit)` runs every render and `onInput` calls fit again: `height="auto"` then read scrollHeight = forced reflow per render, doubled per keystroke. Skip when the value has not changed.
- Also: Victorinox showcase (victorinox-showcase.tsx:104-148) 17 `<img>` all eager with sync decode (13 WebP, 30-44 KB; ~450 KB) below the fold; add `loading="lazy" decoding="async"`. Only 4 `loading="lazy"` outside Media in 27 raw `<img>` tags.
- background-music.tsx:240-249 MutationObserver on document.body subtree for the whole session; callback is cheap (debounced 50 ms, then one querySelector for iframe[src*=youtube]) but fires on every DOM insertion app-wide including chat streaming. Fine today.

## Checked and clean (with evidence)
- Recharts: every chart sets `isAnimationActive: false` (sales-overview.tsx:59, report-charts.tsx:18); datasets <= 62 bars; inline tooltip/formatters are cheap at that size. (new Intl.NumberFormat per FigureChart render, sales-overview.tsx:304, minor, covered by RUN-1's fix pattern.)
- Merchant itinerary map (itinerary-map.tsx): init once, diff markers by id with signature, `live` ref for handlers, ResizeObserver + map.remove() cleanup, keydown listener added/removed correctly.
- Snowfall (discovery/components/snowfall.tsx): IntersectionObserver start/stop of the rAF loop, ResizeObserver, reduced-motion bail-out, 36 flakes, cleanup complete; only mounted 24 Nov to 6 Jan (isFestiveSeason), so it is off today (2026-10-18).
- Knife fan: transform/opacity only (translate + opacity keyframe `vx-rise`), started by IntersectionObserver (useInView), `motion-safe:` guarded; no rAF.
- Calendar: memo(CalendarScreen), events memoized, minute-granularity clock, swipe drag writes a CSS variable (no setState), spring settle loop terminates; <= ~60 events.
- Tiptap (story-editor.tsx:212-259): created once, `shouldRerenderOnTransaction: false`, `useEditorState` selector, lazy-loaded (story-card.tsx:16).
- Scroll/resize listeners: only one window scroll listener outside labs (article-contents.tsx:60) and it is passive + rAF. addEventListener vs removeEventListener counts match in every non-lab file except the two map marker click handlers (benign, elements are destroyed with markers) and the transport abort listener (RUN-6). use-stop-drag drag path mutates DOM directly (no setState per move). IntersectionObserver used instead of scroll for useInView/useScrolledPast.
- Timers: all setInterval/rAF/setTimeout in effects have cleanups (checked demo-store, use-partner-access, use-sign-in, advice-chat, merchant-orders, calendar-page); partner/sign-in tickers only run while a resend countdown is active.
- prefers-reduced-motion: respected by ken-burns, sparkle, animate-rise/pop, text-shimmer, vx-rise (motion-safe), Snowfall, map camera durations, smooth scrolls. No non-composited property animations found outside lab/ (grep for transition-all / width|height|top|left transitions: none).
- zurichDayOf is cached (pickup.ts:18-24); lists at seed sizes (21 products, 12 orders, 29 rows) need no virtualization/content-visibility.
- Not reviewed: src/features/lab/* and routes/lab.* (prototype galleries, not user paths).
