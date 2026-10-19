# React audit register, 2026-10-18

Scope: `front-end/src` (542 TS/TSX files, ~104k lines). Vite SPA, React 19, TanStack Router with autoCodeSplitting. Rules: Vercel react-best-practices (`server-*` skipped, not Next.js). Method: five read-only workers by dimension, key claims spot-checked against source by the orchestrator. Evidence is measured unless marked inferred. Per-dimension raw notes with the file:line evidence are in `docs/audit/raw/`.

Baseline (measured): entry `index-*.js` 311 KB (94 KB gz) plus 77 modulepreloaded chunks, 1.75 MB raw / 546 KB gz JS and one 672 KB CSS on first load. `tsc` strict passes. 0 test files. 0 `any`, 0 `@ts-ignore`. React Compiler not enabled. `react-hooks/exhaustive-deps` is off (`eslint.config.mjs:101`). `React.memo` appears once.

## Findings

### Bundle and loading
- **BUN-1 high.** Both locales eager. `contexts/locale-context.tsx:14-15` imports `en` and `de`; chunk is 355 KB raw / 86 KB gz in the initial load. Fix: dynamic-import the active locale. M.
- **BUN-2 high.** `components/icons.ts:12` `import * as Reicon` ships the whole pack, 230 KB raw / 74 KB gz preloaded everywhere, for ~130 icons used. Fix: named or deep imports. S-M.
- **BUN-3 high.** Demo seed data in the entry path. `features/demo/seed.ts:9,23` pull content and tours seeds (105 KB + 57 KB raw). Fix: lazy seed behind a skeleton. M, risky (consumers assume sync state).
- **BUN-4 medium (inferred cause).** Merchant editor and analytics hooks preloaded for guests (~40 KB). Find the static import that hoists them. S-M.
- **BUN-5 medium.** 71 photos, 13 MB, no `srcSet`, ~6 of 49 `<img>` have `loading`, hero lacks `fetchpriority`. M.
- **BUN-6 medium.** Render-blocking Google Fonts CSS, 672 KB single CSS. S-M.
- **BUN-7 low.** 17 `routes/lab.*` and `features/lab` (10.5k lines) ship in dist as lazy chunks. Not fetched by guests. S.
- **BUN-8 low.** `favicon.png` 474 KB, logo png 448 KB. S.

### State, re-render, runtime
- **RR-1 high.** `use-tours.ts:48-56` starts one 1 s `setInterval` per `useTours()` call, 28 call sites in 23 files. Every `TourCard`, the tour detail page and the tour editor forms re-render every second. Fix: one shared clock, minute granularity by default. S-M.
- **RR-2 high.** One `DemoContext` with no selectors. 105 `useDemo()` calls in 92 files. Any `update()` re-renders all consumers. `demo-store.tsx:41-43` stringifies the whole state (374 KB seed, photos as data URLs) to localStorage on every change. Fix: external store with selector hooks, debounced persist. L, migrate hot screens first.
- **RUN-1 high.** `lib/format.ts:7-18` builds a new `Intl.NumberFormat` per `formatMoney` call. `use-sales-overview.ts:443-477` makes ~560 calls per render; everything after line 240 is unmemoized and reruns on every period tap and 30 s tick (~30 ms Node, inferred 100 ms+ on phones). Fix: cache formatters per locale, memoize the hook body. S.
- **RR-3 medium.** `use-report-pages.tsx:37-268` aggregates ~150 lines in render and provides an unmemoized context value to 10 consumers. M.
- **RR-4 medium.** `use-tour-editor.ts:797`, `use-gift-editor.ts:696` `isDirty` via double `JSON.stringify` on every render. S.
- **RR-5 medium.** `planner-chat.tsx:227-231` writes refs and module state during render (safe today, unsafe under concurrent rendering). Transcript rows not memoized. S.
- **STR-3 high (correctness).** `writeStored` swallows quota errors. Only the two editors check the 4.5 MB budget. No `storage` event, so two tabs overwrite each other. `DEMO_VERSION` mismatch silently replaces stored data with the seed. S-M.
- **RUN-3 medium.** `warmAerialTiles` fires ~52 fetches per stop with no abort. `tour-itinerary-map.tsx:239-290`. S.
- Low: RR-6/RUN-8 article contents bar `setProgress` per frame, RR-7 map effect deps on array identity, RUN-5 `backdrop-blur` over infinite ken-burns, RUN-6 chat throttle and abort listener leak (`transport.ts:5-14`), RUN-7 search navigates router per keystroke.

### Structure
- **STR-1 high.** Feature layering. 1016 `@/features` imports, 102 through barrels, only `features/demo` has an `index.ts`. 18 of 20 features form one strongly connected component, value-level 2-cycles included (merchant<->partners, merchant<->tours, merchant<->reports, demo<->tours, content<->demo). Fix: shared layer plus barrels plus `import/no-restricted-paths`. M-L.
- **STR-2 high.** Unmemoized derivation in `use-sales-overview.ts` (1 `useMemo`, ~490 unmemoized lines) and `use-partner-report.ts`. Fix: pure `compute*` functions, memoize on real inputs. M.
- **STR-4 medium.** God editor hooks (803 and 702 lines), repeated wizard state and a module-level `let justCreated` flag. M.
- **STR-5 medium.** `DemoState.tours` optional (`types.ts:48`), 11 sites write `?? createTourSeed()`. Make required, delete fallbacks. S.
- **STR-7 low.** 163 probably dead i18n keys. en and de are in full parity (2986 keys each).
- **STR-8 low.** 159 exports unused outside their file. `"lint": "eslint --fix"` is a hazard in a shared tree.

### Duplication (jscpd 0.54%, 25 clones, low overall)
- **DUP-1 high.** `slugify` x2 diverged. `merchant/products/lib/records.ts:9-21` maps ä/ö/ü to ae/oe/ue; `content/merchant/lib/article-form.ts:278-289` strips diacritics instead (ü becomes u) and adds a `story` fallback. The same title gets different slugs. S.
- **DUP-2 high.** Intl date and number formatting re-implemented ~25 times, `T12:00:00Z` literal 58 times in 32 files. Already diverged (percent digits, U+2212 minus, `pickupDay`). M.
- **DUP-3 high.** Gift and tour editor hooks and shells ~95 and ~93 duplicated lines. Tour hook has `hasIssues`, gift lacks it. M-L.
- **DUP-4 high.** Offline-payment rules in `orders/lib/transitions.ts:204-231` and `tours/merchant/lib/transitions.ts:80-109` disagree: tour version blocks future timestamps and non-integer amounts, order version does not (UI coverage unchecked, inferred gap). M.
- DUP-5 to DUP-8 medium: analytics widget and hook overlap, eight `*-rows.tsx` DataTable wrappers, story teaser x2, five reduced-motion helpers, three media-query hooks, ~8 id generators.

## Checked and clean
maplibre-gl, recharts, tiptap, fullcalendar and temporal-polyfill are lazy. `@heroui/react` tree-shakes. No route-loader waterfalls. 0 true inline component definitions. Listener and timer cleanup is correct. Seeds are cloned. Tiptap created once. Recharts animations off. `formatMoney` single-sourced. i18n typed and in parity. At 21 products, 169 reviews and 3 tours, O(n*m) filters do not matter and no list needs virtualization.

## Priority (advisor-reviewed)

Lens: `PRODUCT.md` states this is a prototype with no backend and browser-held mock data. Fixes that survive a backend swap rank highest. Anything that invests in `DemoContext` or the seeds ranks lowest.

### Tier 1: cheap, measured, survives the backend
1. **BUN-2 icons namespace import.** 74 KB gz on every page, one file. `icons.ts` has 86 direct `Reicon.X` references and no string-key lookup (checked), so named imports are a mechanical edit. S.
2. **RUN-1 plus DUP-2 as one wave.** Cache `Intl` formatters per locale in `lib/format.ts`, then move the ~25 date, percent and amount sites onto it. Fixes the hot render path and the divergences (minus sign, fraction digits) together. S for the cache, M for the migration.
3. **RR-1 shared clock.** One `useSyncExternalStore` ticker replaces 28 per-call 1 s intervals. Keep 1 s only where seconds are shown (the booking hold countdown, likely `tours/booking/tour-payment-page.tsx`, not yet confirmed). Do not coarsen globally. S-M.
4. **BUN-1 lazy inactive locale.** ~86 KB gz. Open check: `notifications/components/render-mail.ts` imports both locales and is imported by `mail-panel`, `notifications-panel` and `use-account-hub`. If any is in the entry graph, fixing `locale-context` alone will not remove `de` from first load. M.
5. **STR-3 `writeStored` swallows quota errors.** Return a boolean and surface a toast. Uploaded photos can vanish silently. S.

### Tier 2: structure, narrow scope
- **STR-1 and BUN-4.** Move only the most-imported internals (`merchant/today/lib/analytics`, `decision-block`) into a shared layer, then add `import/no-restricted-paths` so the cycles cannot return. Not the full barrel migration. Measure guest preloads before and after.
- **DUP-4.** Confirmed at the lib level: `orders/lib/transitions.ts:204-231` rejects non-positive and above-balance amounts but does not reject a future timestamp. No guard was found in `record-payment-sheet.tsx` (grep only, UI not driven). Non-integer amounts may be legitimate for orders, so only the timestamp gap is a likely bug. Verify in the UI, then share the rule.
- **DUP-1.** Low urgency. Seeded article slugs contain no umlauts, so unifying will not break seeded links. Slugs created by merchants and stored in localStorage could change, so check before unifying.

### Defer
- **RR-2 DemoContext selectors (L).** Re-measure with the Profiler after the shared clock lands. The seed lists are small and the store is prototype-only.
- **STR-2 and RR-3 memoization.** Re-measure after the formatter cache.
- **BUN-3 lazy seeds.** Prototype-only cost.
- **BUN-7 and STR-6 lab route gating.** Ask the owner first. Lab routes may be reviewed on the deployed URL.
- **`exhaustive-deps` off.** Propose `warn` and count violations. The eslint config is shared with a parallel session, so it is not changed here.

## Outcome of the fix pass (2026-10-18)

Method: each change was verified on a scratch build against a clean `HEAD` build. `docs/audit/measure-initial-load.mjs` measures first-load JS. `.check/drv/compare-builds.mjs` renders 42 routes in English and German with a frozen clock and diffs the visible text. `.check/drv/clock-storage-check.mjs` counts live timers, samples the hold countdown and forces a storage failure.

### Landed
- **RUN-1 and DUP-2.** `lib/format.ts` now caches `Intl` formatters per locale and options (`numberFormat`, `dateTimeFormat`). Every `new Intl.NumberFormat` and `new Intl.DateTimeFormat` outside the lab went through it, 81 sites. 20,000 `formatMoney` calls went from 455 ms to 24 ms (measured in Node, not a phone). Also added `calendarDay` (51 copies of the noon-UTC literal), `pickupDay` (2 verbatim copies) and `percentOf` (9 ratio closures, with the fraction digits as an explicit argument so the 0-digit and 1-digit variants stay visible). Not merged on purpose: the U+2212 minus in `deltaOf` and the held percent formatters, which are different behaviour, and 6 odd `T12:00:00Z` shapes.
- **RR-1.** `hooks/use-shared-clock.ts` is one timer per period for all components. `useTours()` defaults to a minute tick, `useTours("second")` is used only by `useOwnedBooking` for the hold countdown, and `useDemoNow` shares one 30 s timer. The two payment sheets read the live demo clock when they open, because a shared tick can be up to a minute old when a component mounts, and their "latest time" must never trail now. Displays on tour screens now update to the minute instead of the second, and actions still re-check against the live clock. Live intervals on `/tours` went from 7 (four at 1 s, three at 30 s) to 2. The countdown ticks identically each second.
- **STR-3.** `writeStored` returns `"kept"`, `"full"` or `"unavailable"`. Only a quota failure (`"full"`) warns. Blocked or missing storage stays silent, as before: a first version warned on every page load in a sandboxed frame, which the boot-time scenario in `.check/drv/storage-boot-check.mjs` caught. `DemoProvider` exposes `storageFull` and the root route passes it to `AppToasts`, which shows one warning (English and German) per failure run and re-arms after a successful save. Cross-tab overwrites and the silent `DEMO_VERSION` reset are not addressed.
- **STR-1, narrow.** `SheetFrame`, `useIsWide` and the analytics period helpers moved to `components/sheet-frame.tsx`, `hooks/use-is-wide.ts` and `lib/analytics.ts`. A `no-restricted-imports` rule in `eslint.config.mjs` stops `lib`, `hooks`, `contexts` and top-level `components` from importing `@/features`. It fires on a probe import and has no current violations. Import lines reaching into merchant internals from outside merchant went 103 to 79. The feature-level cycle group is unchanged at 18 of 20 features, and the 99 feature-pair edges are unchanged.
- **DUP-4.** `lib/payments.ts` holds the 10-minute window and `findDuplicatePayment`, replacing two copies. No behaviour change.
- **DUP-1.** `lib/slug.ts` is the one `slugify` (the transliterating `ä`, `ö`, `ü` version). Articles keep their `story` fallback at the call site.

### Corrections to the audit
- **BUN-2 was wrong.** `import * as Reicon` is already tree-shaken. The package exports 2,677 icons and the chunk contains only the ~80 used. The 230 KB is two SVG weights per icon. No change was made.
- **BUN-1 was not done.** Making `de` lazy needs three things together: the 14 feature `messages.ts` files split into separate English and German modules, the five bilingual consumers (three mail renderers, `use-merchant-requests`, `use-merchant-order-detail`) loaded on demand, and `prototype-bar` pulling in `mail-panel`. A partial attempt measured slightly worse than baseline and was reverted. The real prize is about 40 KB gzipped for English users and nothing for German users.
- **DUP-4 was not a live bug.** The order sheet rounds the amount to whole rappen and its time field has a `maxValue`, so both gaps are covered by the UI.

### Measured result
- First-load JS is 544,848 B gzipped before and 548,161 B after (+0.6%, 78 to 86 files). No bundle item improved it. Cause: relocating `SheetFrame` changed how rolldown partitions the HeroUI form chunks. Undoing only that move gave 545,410 B. The relocation was kept for the layering fix.
- 84 route renders (42 routes in each language) are text-identical to `HEAD`, with 0 page errors in both builds.

### Side effects to know about
- The new `no-restricted-imports` block in the shared `eslint.config.mjs` is an error, so any other session that imports `@/features` from `lib`, `hooks`, `contexts` or top-level `components` will now fail lint.
- New articles with umlaut titles get transliterated slugs (`Löwendenkmal` becomes `loewendenkmal`). Stored slugs are unchanged.
- Nothing is committed. `sheet-frame.tsx`, `use-is-wide.ts`, `use-shared-clock.ts`, `analytics.ts`, `payments.ts`, `slug.ts` and `docs/audit/` are untracked.

### Left for the owner to decide
Full BUN-1, BUN-3 lazy seeds, RR-2 demo-store selectors, STR-2 and RR-3 report memoization (re-measure first), lab route gating, and `exhaustive-deps`.

## Round 2: making the code follow the React rules (2026-10-19)

Scope: the open items from the compliance review. Verified with scripts in `.check/drv/` (not tracked): `compare-builds.mjs` (100 routes in English and German, clock frozen), `render-count.mjs` (React renders per scenario, counted the way DevTools does), `search-check.mjs`, `flows-check.mjs` (trip planner), `language-check.mjs`, `mail-check.mjs`, `payment-sheet-check.mjs`, `clock-storage-check.mjs`, `storage-boot-check.mjs`. The decision trail is `docs/audit/react-rules-decisions.tsv`.

### Result against the rules
- **Hooks rules.** `eslint-plugin-react-hooks` is now 7.1.1, which carries the React Compiler's rules. `react-hooks/exhaustive-deps` is on (warn). `npx eslint src` reports 0 messages. Before: 4 `exhaustive-deps` and 25 compiler-rule findings (refs read or written in render, setState in effects, module-level reassignment, impure render, memoization the compiler could not keep). Two `set-state-in-effect` suppressions remain, each with a reason: the article page resumes a comment from storage, and the planner records tool times as the stream arrives.
- **`rerender-memo`.** React Compiler is enabled (`vite.config.ts`, plugin-react babel preset). The healthcheck compiles 978 of 978 components and hooks. `ListingCard` and `ProductCard` also carry a `memo` with a comparator, because their builders hand them fresh objects every render and the compiler cannot see through that. `TourCard` has a plain `memo` (its props are a tour object and a layout string).
- **`rerender-transitions`, `rerender-use-deferred-value`.** Search on `/search` and `/gifts` keeps the input on local state, defers the results, and syncs the URL after 250 ms in a transition (`hooks/use-url-input.ts`).
- **Report hooks.** `use-reports` and `use-partner-report` had memos that depended on optional properties, which the compiler skipped. They now depend on plain strings. The compiler memoizes both. I did not time the hooks on their own.
- **`rendering-*`.** All 27 `<img>` tags have a loading policy. The hero and sign-in photos use `fetchPriority="high"`, everything below the fold is lazy. The Google Fonts stylesheet no longer blocks first paint.
- **`bundle-*`.** Route files imported step lists and tab guards from the heavy editor hooks for `validateSearch`, which put the editors in the entry chunk. Those constants now live in `lib/search-params.ts` files. German is its own chunk, fetched on language switch, before first paint when German is saved, and with the mail list and the merchant screens.
- **`js-tosorted-immutable`.** All 54 `.sort(` calls sort fresh arrays or a local array, so there was nothing to change.
- **State.** The demo store is an external store with a stable context value. `useDemoSelector`, `useDemoActions` and `useStorageFull` let a component follow one slice. 40 files use them. 64 calls still use whole-state `useDemo()`, mostly the report, sales and order hooks that read most of the state, so a selector would not reduce their renders.

### Measured, before this round and after
- **First-load JS:** 548,161 B gzipped to 495,591 B (-52.6 KB, -9.6%), 86 to 49 files, with the compiler on. The compiler adds about 25 KB. The editor-hook fix removed about 32 KB, and lazy German removed about 45 KB.
- **Renders per scenario:** favourite toggles 1,507 to 369, search typing 1,100 to 689, order tabs 2,646 to 2,088, sales period taps 899 to 857. An idle tours page went from 540 renders in 6 s (original `HEAD`) to 0.
- **CPU at 4x throttle, medians of three alternating runs per build:** search typing 1,805 ms to 876 ms (-51%), favourite toggles 956 to 859 ms, order tabs 1,400 to 1,320 ms, sales period taps flat. The machine was busy, so the absolute values are higher than in quieter runs. Render counts were stable across runs.
- **Costs:** the build takes about 22 s instead of 2.4 s. English users load a separate German chunk only when they switch language.
- **Behaviour:** 100 route renders, English and German, are text-identical to the build before this round, with 0 page errors. Three write-path flows give identical output on the baseline and the final build, comparing a normalized summary of the saved state (order, booking and payment counts and statuses, each mail's recipient, template, language and contents, the cart, the decline text): a gift order from detail to the sent page, a tour booking from review through payment to confirmation, and a merchant session that declines a German guest's order, accepts another, and records a payment twice to trigger the duplicate warning.

### Not done, and why
- **Demo seeds out of the entry path.** A first-time visitor needs the seed to render anything, so moving it behind a dynamic import only adds a request for them.
- **Selectors on the remaining 64 whole-state calls.** See above.
- **Lab routes.** They are lazy chunks, not part of the entry. Gating them needs the owner's say.
- **Harness bug caught.** The first render counter counted stale flags on subtrees that bailed out, which made every count look 5 to 10 times too high and hid the real effect of memoization. It was rewritten to walk the tree the way DevTools does, and all earlier numbers were remeasured.
- **A stale `vite.config.js` and `.d.ts`** (git-ignored `tsc` output) were shadowing `vite.config.ts`, so edits to the `.ts` file had no effect. Both were removed; copies are in the session scratch.

### Found in review, fixed
- A visitor who saved German and then failed to fetch the German chunk (offline, a stale page after a redeploy) got a white page, because first render waited on that fetch. `main.tsx` now starts in English if it fails, the provider falls back to English when German is not loaded, and a failed language switch is ignored. Proven by blocking the chunk request (`offline-german-check.mjs`): the old build rendered nothing, the new one renders in English and shows German on the next visit.
- `setLanguage` now ignores an earlier language that arrives after a later tap.
- The store saves once per event instead of once per `update` call.
- `scripts/artifact-page.mjs` took the first fonts link, which is now the preload one that needs an inline `onload`. It now writes a plain stylesheet link.
- `tsconfig.node.json` now writes its output to `node_modules/.tmp`, so `tsc -b` can no longer re-create a stale `vite.config.js` next to the config.
- Corrected above: `TourCard`'s memo has no comparator, and the CPU figures are medians.

### Know before you merge
- Visitors who saved German wait for one extra request before the first paint. English visitors never download German unless they switch, open the mail panel, or use a merchant screen.
- The v7 hooks plugin adds error-level compiler rules to the shared `eslint.config.mjs`, and the compiler now compiles whatever the parallel session writes. Their next component that reads a ref during render, or sets state synchronously in an effect, fails lint. `exhaustive-deps` is a warning.
- The compiler slows builds to about 22 s and also runs in `npm run dev`; I did not measure dev server start or hot reload.
- `useUrlInput`: leaving the page within 250 ms of typing drops that text from the URL, and going Back to an entry whose text equals the last sent one can be overwritten by a pending timer. The checks wait 700 ms, so they cannot see either.
- The memo comparator on `ListingCard` ignores `favourite.onToggle`. That holds because every builder closes over a stable toggle and an id; a future builder that captures render state would go stale.
- Five modules import the German dictionary statically (three mail renderers, `use-merchant-requests`, `use-merchant-order-detail`). That is safe while only lazy code imports them. Nothing enforces it; a first-load import would silently undo the saving.
- Not exercised by any script: the trip planner's final inquiry (`hooks.createInquiry` now registers in an effect), the advice chat's error reset, the tour review's capacity-failure branch and its re-enabled button, merchant itinerary drag-reorder, map pin selection, and place search (needs the network). The "English mail in English" line in `mail-check.mjs` prints false on both builds because the seeded template is the sign-in code; English mail rendering was not independently verified.
- The `docs/` folder changed under this run by something else: `docs/calendar/` and `docs/content/` are gone from disk and `docs/architecture/` is new. None of that is from this work.
- Nothing is committed. Five dev dependencies were added (`@babel/core`, `@rolldown/plugin-babel`, `babel-plugin-react-compiler`, `@types/babel__core`, and an upgrade of `eslint-plugin-react-hooks`).
