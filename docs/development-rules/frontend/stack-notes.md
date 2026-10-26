# Stack notes: Vite, React and TanStack Start (`front-end/`)

Versions and the full selected stack are in `../tech-stack.md`. This file keeps the facts and traps that are specific to Vite, React, TanStack Router and TanStack Start. The rules for routes, loaders and server code are in `tanstack-start.md`.

## TanStack Router and Start

- File routes live in `front-end/src/routes/`. History is browser history, so a deep link such as `/store/orders` is a real path. The built app is a Nitro Node server, started with `node .output/server/index.mjs`. It is not a static folder. `vite.config.ts` sets `base: '/'`, which browser history needs.
- `vite dev` forwards `/api` to `API_PROXY_TARGET` through Nitro `routeRules`. The built server does not forward. Production forwarding belongs to hosting (ADR-001).
- Automatic code splitting moves only a route's `component` into its own chunk. Anything else in the route file stays in the entry chunk. See `code-structure.md`.
- `defaultPreload: "intent"`. Hovering or touching a link loads the route's chunks and runs `beforeLoad` and `validateSearch`.

## Vite plugin order

In `front-end/vite.config.ts` the order is `tanstackStart()`, `nitro()`, `react()`, then the React Compiler preset (`babel({ presets: [reactCompilerPreset()] })`). Start must come before `react()`, or route generation and server function compilation fail. Vitest skips `tanstackStart()` and `nitro()` (`process.env.VITEST`), because with them two tests in `tests/auth-api.test.tsx` failed.

## React Compiler and lint

- The compiler memoizes automatically. It makes `pnpm build` take about 22 s instead of 2.4 s, and it also runs in `pnpm dev`. The cost was measured with the plugin removed.
- It skips six functions today and they run as written. Do not copy them as templates. `GuestAvatar` (a member expression it cannot reorder), `ItineraryMap`, `TourItineraryMap` and `LabMap` (`import()` expressions), `usePlaceSearch` (a `throw` inside `try/catch`) and `usePartnerOverview` (an internal compiler error).
- The React Hooks v7 lint rules include the compiler's checks at error level (refs, purity, set-state-in-effect, immutability). `pnpm lint` must report no errors.
- `pnpm lint:fix` is `eslint . --fix`. Do not run it on a shared tree. See `linting.md`.

## HeroUI and styling

See `heroui-and-styling.md`.

## Language and copy

- `useLocale()` gives `t(key, vars)`, `language` and `intlLocale`. English is always loaded. German is a lazy chunk.
- Each feature has `messages.ts` and `messages.de.ts`. Add every new string to both. Email copy (`mail.*`, `tourMail.*`, `requestMail.*`) lives in `packages/i18n/src/en.ts` and `de.ts`, not in the feature message files, because the server mail templates read it too.
- Never import `@/i18n/de` or `@sk/i18n/de` from first-load code.
- Text that shop staff write exists in English and German. Show it with `pickText` from `packages/domain/src/shared/localized.ts`. It falls back to the other language when one is missing and sets `isFallback`, so the screen can say so.

## State and storage

- Mock data lives in the demo store (`front-end/src/features/demo/store.ts`), saved to `localStorage` under keys that start with `sk.`. Screens read shop data through the `DataClient` and TanStack Query, not from the store (`api-integration.md`).
- Read and write storage only through `front-end/src/lib/storage.ts`.

## Known traps

- `.validator()` is the server function method in Start 1.169.4. `.inputValidator()`, which the web docs show, is absent, and the wrong name returns 500 on every route. Only `pnpm exec tsc --noEmit` catches it.
- A route's global CSS comes from a side-effect import in `src/routes/__root.tsx`. A `?url` import in `head().links`, which the Start Vite guide shows, gave an unstyled first paint in the spike.
- A build prints about 109 `"use client"` warnings from HeroUI, tiptap and swr (`MODULE_LEVEL_DIRECTIVE`). They are harmless. Any other warning needs a look.
- `nitro` is a beta release and is pinned exactly (`3.0.260903-beta`), as is `@tanstack/react-start` (`1.169.4`). Start 1.169.4 requires an exact `@tanstack/react-router` version. When you upgrade Start, align `@tanstack/react-router` and `@tanstack/router-plugin` in the same change, or two copies resolve.
- `verbatimModuleSyntax` must stay off. `front-end/tsconfig.json` does not set it, so it is off. Start's own guide warns that turning it on leaks server bundles into the client bundle.
- The package manager is pnpm 10.33.4, pinned by `packageManager` in `front-end/package.json` and used by agentic-rag. Run `corepack enable` once. Do not add `legacy-peer-deps`: pnpm resolves peers itself. Do not fall back to vitest 4.0, which brings its own older Vite.
- pnpm 10 skips dependency build scripts until approved. Only `unrs-resolver` is skipped today, and lint, tests and build work without it.
- Files under `front-end/tests/` are outside `tsconfig.json`, so only the test config's `@` alias resolves their imports.
- A stale `front-end/vite.config.js` once shadowed `vite.config.ts` and silently turned the compiler off. `tsconfig.node.json` sets `outDir` so `tsc -b` cannot recreate it. A build near 2 s means the compiler is off.
- A render counter must skip bailed-out subtrees (as React DevTools does) or every count is too high.
- Source maps list whole files, so they overstate what a chunk contains.
