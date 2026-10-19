# Re-render / React anti-pattern audit (read-only)

Setup facts (measured)
- No babel-plugin-react-compiler: vite.config.ts has only tanstackRouter, react(), tailwindcss; package.json has no babel/compiler entry. Manual memoization matters.
- eslint.config.mjs:101 sets "react-hooks/exhaustive-deps": "off". So 0 eslint-disable comments for it is meaningless; dep bugs are invisible to lint. Only jsx-a11y disables exist.
- React.memo used once in src (merchant/calendar/calendar-page.tsx:35). useMemo 37 total.
- Contexts: locale-context.tsx (memoized value, fine), demo-store.tsx DemoContext (memoized value but holds ALL app data), use-report-pages.tsx Ctx (unmemoized), merchant-back-bar slot (DOM node, fine).

## RR-1 high: per-component 1s interval in useTours (28 call sites)
use-tours.ts:48-56: every useTours() call creates useState(Date.now()) + setInterval 1000ms and re-renders its host component every second. 28 call sites in 23 files. Worst: TourCard (tour-card.tsx:26, rendered per tour in tour-list-page.tsx:51, discovery-home.tsx:208, article-page.tsx:217; 11 tours = 11 timers, 11 re-renders/sec), tour-editor.tsx:423 DeparturesCard and :679 TourReview (a form re-renders every second while typing), departure-picker/model.ts:53, use-calendar-items.ts:39. Mechanism measured; per-second render cost inferred.
Fix: one shared clock (useSyncExternalStore over a single interval, or coarsen to 30-60s). Components needing seconds opt in. Effort S-M.

## RR-2 high: single DemoContext with no selectors, 92 consumer files
demo-store.tsx: state = whole app DB in one context; any update() replaces state and re-renders all mounted useDemo() consumers (92 files). Also writeStored(JSON.stringify(state)) to localStorage synchronously in an effect on every change (demo-store.tsx:41-43); photos are base64 JPEG data URLs (photo-upload.ts:60) so payload can be large (inferred).
Fix: external store with selectors, debounce persist. Effort L (incremental).

## RR-3 medium: ReportPagesProvider recomputes ~150 lines of aggregation, fresh context value every render
use-report-pages.tsx:37-268: aggregation in render body, one useMemo (:126). Returned object new each render, passed to Ctx.Provider (:265-268). Subscribes to useDemo and useSalesOverview -> useDemoNow (30s tick, use-sales-overview.ts:135), so the 10 useReportPages consumers (recharts pages) re-render on every demo change and every 30s.
Fix: memoize derived blocks and the value; split filters from data. Effort M.

## RR-4 medium: editor hooks stringify whole draft on every render
use-tour-editor.ts:797, use-gift-editor.ts:696: isDirty = JSON.stringify(edit) !== JSON.stringify(saved) each render (keystrokes plus RR-1 ticks). Drafts hold rich-text and photo data URLs (inferred size). Fix: dirty flag in change() or useMemo. Effort S.

## RR-5 medium: planner chat side effects in render, whole transcript per token
planner-chat.tsx:227-231: updateRef.current = update and module-level hooks.createInquiry assigned during render. :516-527 messages.map re-renders all messages and renderAssistant rebuilds nodes per streamed token; no memo (inferred). TracePanel :158 setState in effect is timer-based, tolerable.
Fix: assign in effect; memo message rows. Effort S.

## RR-6 low: article-contents setProgress each scroll frame (article-contents.tsx:50-62), rAF throttled and passive. Fix: CSS variable via ref. S.

## RR-7 low: tour-itinerary-map.tsx:239 effect deps [tour.id, tour.itinerary, attempt] rebuild MapLibre on itinerary identity change; only mount (tour-detail-page.tsx:399) passes stable state tour, so latent.

## RR-8 low: index keys, 53 hits, nearly all skeletons. Content lists: tour-detail-page.tsx:409, tour-sections.tsx:75, booking-page.tsx:273; static, no row state.

## Large files
- tour-editor.tsx / gift-editor.tsx: ~12 module-level components each, not monoliths. Real issues: RR-1 inside DeparturesCard/TourReview, many cards each calling useDemo() (gift-editor.tsx:312,478,637,813), RR-4. Lazy init correct (use-tour-editor.ts:440, use-gift-editor.ts:301).
- sections-editor.tsx: one refocus effect (:502), fine.
- step-shell.tsx: keyboard detector (:461-490) bails out when unchanged. Clean.
- report-pages.tsx, sales-overview.tsx: fed by RR-3; sales-overview effect :91 fine.
- planner-chat.tsx: RR-5. tour-itinerary-map.tsx: imperative MapLibre with cleanup, RR-7 only.

## Checked and clean
- Inline components: 0 true cases (about 20 `const Icon = lookup[...]` are stable refs).
- Lazy state init used where needed.
- && conditionals: no number/length leaks.
- Listeners clean up; snowfall rAF canvas has no setState; music SeekBar isolated leaf.
- LocaleContext value memoized.
- use-sign-in.ts:54 and use-partner-access.ts:54 timers run only during resend countdown.
