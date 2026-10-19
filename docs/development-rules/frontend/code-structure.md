# Code structure

Read this before you add files, imports or routes. If the project already has a structure, follow it. Do not restructure unless asked.

## Organize by feature

A feature owns its screens, hooks, helpers, types, seed data and messages under `front-end/src/features/<feature>/`. Do not scatter one feature's files across shared folders.
Example: `front-end/src/features/catalog/` has `components/`, `hooks/`, `lib/`, `types.ts` and `seed.ts`. `front-end/src/features/merchant/products/` adds `messages.ts` and `messages.de.ts`.

## Dependency direction

- Features may import from the shared layers: `front-end/src/lib`, `front-end/src/hooks`, `front-end/src/contexts` and top-level `front-end/src/components`.
- Shared layers never import from `@/features`. Checked by ESLint (`no-restricted-imports` in `front-end/eslint.config.mjs`).
- Guidance, not enforced. Between features, import another feature's hook or component, not its internals. If two features need the same thing, move it down into a shared layer.

## Where things go

- Pure helpers with no React go in `lib/` (the feature's own, or `front-end/src/lib` if several features use it).
- Logic that holds state or reads the store goes in a hook.
- Shared UI goes in `front-end/src/components` only when several features use it and it is not tied to one feature's data.
- Copy and labels go in the feature's message files, never inline. See `stack-notes.md`.

## Routes are thin

A file in `front-end/src/routes/` declares the route, its search validation and its page, and composes a screen from a feature. It holds no business logic and makes no API calls.
Example: `front-end/src/routes/_guest/gifts/index.tsx`.

TanStack Router's code splitting moves only the route's `component` into its own chunk. Everything else in the route file, including what `validateSearch` and `beforeLoad` import, loads on first paint for every visitor.
- Put constants and types a route validator reads in `<feature>/lib/search-params.ts`. These files import nothing heavy.
- Examples: `front-end/src/features/reports/lib/search-params.ts`, `front-end/src/features/merchant/products/lib/search-params.ts`.
- `validateSearch` and `beforeLoad` must be pure. They also run on hover, because the router preloads on intent.

## Generated and shared files

- Never edit `front-end/src/routeTree.gen.ts`. It is generated.
- Do not create a barrel file that wraps or re-exports many modules, unless the barrel contains only plain re-exports. The reason is in `performance.md`.
