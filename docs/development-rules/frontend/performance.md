# Performance

Read this before you touch first load, lists, typing, scrolling, streaming, dependencies or icons. These are the rules that mattered in this repo, taken from the one-by-one audit of the 70 Vercel React best-practice rules (`docs/front-end-audit/rule-coverage.tsv`). Each line gives the rule id. The rules are Vercel's `react-best-practices` (created by @shuding at Vercel). The full text of each applicable rule is in `docs/development-rules/reference/react-best-practices/rules/<id>.md`.

## First load

1. **Keep route-file imports light** (`bundle-dynamic-imports`). Constants for `validateSearch` go in `front-end/src/features/<feature>/lib/search-params.ts`. One heavy import there cost 63 KB.
2. **A barrel contains plain re-exports only** (`bundle-barrel-imports`). `front-end/src/components/icons.ts` is `export { X as YIcon } from "reicon-react"`. A wrapper call per icon pulled all 86 icons into first load (54 KB).
3. **Load heavy libraries on demand** (`bundle-conditional`, `bundle-defer-third-party`). Maps, charts, calendar, rich text editor, the QR code and the Better Auth client (E2.1) use `import()`. Load their CSS with them. Examples: `front-end/src/features/tours/map/tour-itinerary-map.tsx`, `front-end/src/features/demo/components/prototype-bar.tsx` (`lazy`).
4. **Preload on intent** (`bundle-preload`). The router has `defaultPreload: "intent"` in `front-end/src/router.tsx`. Keep `validateSearch` and `beforeLoad` pure, because hovering a link runs them.
5. **Images and fonts.** Give every `<img>` an explicit loading choice. Use `loading="lazy"` for anything below the fold and `fetchPriority="high"` for the hero (`front-end/src/features/discovery/components/hero.tsx`). Fonts must not block first paint: the root route preloads the stylesheet and a small inline script adds it, with a `<noscript>` link as the fallback (`front-end/src/routes/__root.tsx`).

## Updates that happen often

6. **No `setState` per frame** (`rerender-use-ref-transient-values`, `rerender-transitions`). Scroll, pointer-move and stream updates write to a ref or the DOM, or are throttled. Examples: the story progress bar in `front-end/src/features/content/components/article-contents.tsx`, and `useChat({ experimental_throttle: 50 })` in `front-end/src/features/planner/components/planner-chat.tsx`.
7. **Defer heavy results while typing** (`rerender-use-deferred-value`). Keep the input immediate and read results from a deferred value. Example: `front-end/src/hooks/use-url-input.ts`.
8. **Subscribe narrowly** (`rerender-defer-reads`, `rerender-derived-state`). See `components-and-hooks.md`.

## Work inside render

9. **Cache formatters and hoist regexes** (`js-cache-function-results`, `js-hoist-regexp`). Use `numberFormat`, `dateTimeFormat`, `pluralCategory` and `formatMoney` from `packages/domain/src/shared/format.ts`. Do not build `new Intl.*` in render.
10. **Index big collections once** (`js-index-maps`, `js-set-map-lookups`). If a loop looks something up in a large array, build a `Map` first, or a `Set` for membership checks (`new Set(selectedIds).has(id)`). Example: opens counted per day in `front-end/src/features/merchant/partners/hooks/use-partner-analytics.ts` (683 items). For lists under about 25 items, a plain `find` is fine.
11. **Start independent async work together** (`async-parallel`). Example: the map style fetch starts with the map library import in `tour-itinerary-map.tsx`.

## From the React docs (optimizing renders)

These come from the React team's docs (react.dev "Render and Commit" and the `useMemo`, `memo`, `useTransition`, `useDeferredValue`, `lazy` and `Suspense` references, read 2026-10-19). They add to items 1 to 11 and to the memoization rule in `components-and-hooks.md`, and they do not repeat them.

12. **Measure before you memoize.** A re-render is cheap by default, and a parent's update re-renders everything below it. Add `memo` or `useMemo` only when the React DevTools Profiler or `console.time` shows a cost (about 1 ms or more per interaction), measured in a production build with CPU throttling. Development timings mislead, because Strict Mode renders twice.
13. **Fix structure before adding memoization.** Keep state local (see `react-rendering-and-state.md`). Pass JSX as `children` so a wrapper's state change does not re-render them. Keep rendering pure. Remove effects that only set state, and remove needless effect dependencies (see `react-effects-and-refs.md`).
14. **Use `useMemo` for three reasons.** A slow pure calculation whose inputs rarely change, a value passed to a `memo` child, or a value that is a dependency of another hook. It helps updates, not the first render. Code must work without it, because React may drop the cache.
15. **Know what defeats `memo`.** A new object, array or function prop every render never equals the last one (`Object.is`). Pass primitives, or a narrow projection such as `hasGroups={person.groups !== null}`. A custom comparator must compare every prop that changes what renders or what a handler does, or the child keeps a stale handler. `sameListing` in `front-end/src/components/listing-card.tsx` skips `favourite.onToggle` on purpose, because every builder closes over a stable toggle and an id. A new builder must keep that true. Keep deep comparisons bounded.
16. **Mark non-urgent updates as transitions.** The function given to `startTransition` runs at once, and only the state updates inside it are marked. Wrap each update that follows an `await` in `startTransition` again. Never use a transition for a controlled text input. Do not call `setState` inside a `setTimeout` within it. A router navigation should be a transition, so already visible content stays on screen.
17. **Pair `useDeferredValue` with `memo`.** This extends item 7. Pass a primitive or an object made outside render. Wrap the slow child in `memo`, or the deferral does nothing. Compare `value !== deferred` to dim stale results. It does not make the slow render faster and does not delay network requests. Debouncing still helps there.
18. **Place code splitting and Suspense deliberately.** Declare `lazy()` at module top level, because inside a component it resets state on every render. The module must default-export the component, and it renders under `<Suspense fallback>`. Put boundaries where the loading state should appear, and not around every component. Keep fallbacks light and shaped like the final layout. A fetch inside an effect never triggers Suspense. Give a boundary a `key` tied to the content id to reset it per item.

## Server-rendered routes

19. **Keep `ssr: true` layouts light.** A layout above a public route renders on the server for every visitor, and its code is in the first load. Keep heavy imports out of it and out of its route file. A part that needs the browser loads with `ClientOnly` and `lazy` (`tanstack-start.md`, rule 1).
20. Guidance. **`<Hydrate>` is an experimental option for a below-the-fold block.** `<Hydrate when={visible()}>` from `@tanstack/react-start` delays hydration of its children until they scroll into view. Do not use it without an ADR (`tanstack-start.md`, rule 15). Measure first load before and after.

## Left as is in existing code

The audit found violations that were left on purpose because the code is cold, the data tiny, or the loading state is simulated. New code must not copy them.
- About 22 production sites still build `new Intl.PluralRules` or `new Intl.RelativeTimeFormat` inside functions (rule 9).
- Two merchant pages run their heavy hooks before a simulated skeleton, and six chart tooltips are defined as inline functions. Skeletons must mirror the real layout: see `heroui-and-styling.md`.
- The full list, with the reason for each, is `docs/front-end-audit/rule-coverage.tsv` (the `LEFT` rows).

## Not worth doing here

Do not wrap things in `useMemo` or `useCallback` by default (the compiler does it). Do not chase `rendering-svg-precision`. The audit was done on a client-only app. From E3.3 the public routes render on the server, and the `rendering-hydration-*` rules apply to them. Return only the fields the page renders from a server loader, because Start serializes `loaderData` into the HTML. The `server-*` rules from Vercel's list are about Next.js and stay out of scope. The rules for hydration and server code are in `tanstack-start.md`.

## How to check

- Type check and lint: `pnpm exec tsc --noEmit`, `pnpm lint`.
- First-load size: build, then follow the measuring steps in `front-end/scripts/verify/README.md`. Nitro writes its output to `front-end/.output`, so `--outDir` does not move it, and the measuring script needs the served `/` HTML saved as `index.html` next to the assets. The Start runtime added about 36 KB gzipped at E3.2 (E3.2 ticket report: 368,640 B gzip in 28 files before, 404,517 B gzip in 37 files after). Compare to that. A jump of more than a few KB needs an explanation in the pull request.
- Renders and CPU, and the text of 100 routes between two builds: `pnpm verify:renders` and `pnpm verify:routes`. How to use them is in `front-end/scripts/verify/README.md`.
