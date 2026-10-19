# Stack notes: Vite and React (`front-end/`)

Versions and the full selected stack are in `../tech-stack.md`. This file keeps the facts and traps that are specific to Vite, React and TanStack Router.

## TanStack Router

- File routes live in `front-end/src/routes/`. History is hash-based, so the app is served as static files with no server rewrites.
- Automatic code splitting moves only a route's `component` into its own chunk. Anything else in the route file stays in the entry chunk. See `code-structure.md`.
- `defaultPreload: "intent"`. Hovering or touching a link loads the route's chunks and runs `beforeLoad` and `validateSearch`.

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
- Never import `@/i18n/de` from first-load code.
- Text that shop staff write exists in English and German. Show it with `pickText` from `packages/domain/src/shared/localized.ts`. It falls back to the other language when one is missing and sets `isFallback`, so the screen can say so.

## State and storage

- Mock data lives in the demo store (`front-end/src/features/demo/demo-store.tsx`), saved to `localStorage` under keys that start with `sk.`.
- Read and write storage only through `front-end/src/lib/storage.ts`.

## Known traps

- The package manager is pnpm 10.33.4, pinned by `packageManager` in `front-end/package.json` and used by agentic-rag. Run `corepack enable` once. Do not add `legacy-peer-deps`: pnpm resolves peers itself. Do not fall back to vitest 4.0, which brings its own older Vite.
- pnpm 10 skips dependency build scripts until approved. Only `unrs-resolver` is skipped today, and lint, tests and build work without it.
- Files under `front-end/tests/` are outside `tsconfig.json`, so only the test config's `@` alias resolves their imports.
- A stale `front-end/vite.config.js` once shadowed `vite.config.ts` and silently turned the compiler off. `tsconfig.node.json` sets `outDir` so `tsc -b` cannot recreate it. A build near 2 s means the compiler is off.
- A render counter must skip bailed-out subtrees (as React DevTools does) or every count is too high.
- Source maps list whole files, so they overstate what a chunk contains.
