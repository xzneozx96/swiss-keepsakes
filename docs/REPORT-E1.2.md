# Report E1.2: extract the pure types and rules into `@sk/domain`

Branch `xzneozx96/e1-2-domain`, stacked on E1.1. Date 2026-10-19.

## What changed

- New workspace package `packages/domain` (`@sk/domain`), consumed as TypeScript source. There is no build step. `exports` maps `@sk/domain/<module>` to `src/<module>/index.ts`, and `.` to a root index with one namespace per module.
- 29 files moved with `git mv`, so history follows them. The codemod `scripts/codemods/extract-domain.mjs` did the move and rewrote every import specifier. It stops if a moved file imports something that did not move.
- Front-end imports now read `@sk/domain/<module>`. The only edits in `front-end/` besides import lines:
  - `contexts/locale-context.tsx`: `Language` is now `export type { Language }` from the domain (same `'en' | 'de'`).
  - `features/orders/lib/selectors.ts` (moved): `Pick<DemoData, 'products' | 'orders'>` became a local `StockData { products, orders }` interface, so the domain does not import the demo store type. `DemoData` still fits it.
  - `front-end/package.json` gets `"@sk/domain": "workspace:*"`, and `pnpm-lock.yaml` follows.
  - `front-end/tests/format.test.ts`: import line only.
- `eslint --fix` ran on the 220 front-end files whose imports changed (only my own files, never `lint:fix`). It merged and sorted the new import lines.

### Layout (`packages/domain/src/`)

| Module | Files | Came from |
|---|---|---|
| `shared` | `format`, `language`, `localized`, `slug`, `rich-text` | `lib/format`, `lib/localized`, `lib/slug`, `lib/rich-text`, new `language.ts` |
| `catalog` | `types`, `pickup`, `stock`, `publish`, `review`, `completeness`, `validation` | `features/catalog/{types,lib/*}`, `reviews/lib/review`, `merchant/products/lib/{completeness,validation}` |
| `orders` | `types`, `cart`, `trip`, `selectors`, `format`, `group-cart` | `orders/{types,lib/selectors,lib/format}`, `cart/{types,lib/group-cart}`, `checkout/types` |
| `bookings` | `types`, `selectors`, `calendar` | `tours/types`, `tours/lib/selectors`, `tours/booking/calendar` |
| `payments` | `duplicate` | `lib/payments` |
| `partners` | `types` | `partners/types` |
| `reporting` | `types`, `analytics`, `periods` | `reports/types`, `lib/analytics`, `merchant/sales/lib/periods` |
| `content`, `requests`, `notifications` | `types` (`requests` also `answers`) | the matching `types.ts` and `requests/lib/answers` |

`packages/domain/tsconfig.json` uses `lib: ["ES2022"]` with no DOM and `types: []`. A DOM or Node API in the domain fails `pnpm typecheck`, which keeps it pure.
Module names follow `docs/architecture/backend.md` section 4 where one exists. `money` is not used yet. The report types sit in `reporting`, and the money rules (`moneyState`, commission math) come with E1.4 and E1.5. `moneyState` and the transition tables are not in the prototype as pure code (see below).

## Acceptance

| Check | Result |
|---|---|
| `pnpm typecheck` (root) | pass: `packages/domain`, `spikes`, `front-end` |
| `pnpm test` (root) | pass: 7 files, 55 tests (42 new `[E1.2]` in `packages/domain/tests`, 13 existing front-end) |
| `pnpm build` (root) | pass, `front-end build: ✓ built in 23.42s` |
| `PLAYWRIGHT_CHANNEL=chrome pnpm e2e` (root) | pass: `8 passed (17.7s)`, all `[E0.8]`, `e2e/` untouched |
| `pnpm --dir front-end lint` | 0 errors, 47 warnings |
| `pnpm --dir front-end typecheck:tests` | pass |

### Text diff of 100 routes

Script: `scripts/codemods/route-text-diff.mjs`. It drives `front-end/scripts/verify/compare-builds.mjs`: 100 routes (guest and owner, English and German, frozen clock), the visible text of each page. Base is built from `20f92f2` before the change, new from this branch.

```
$ PLAYWRIGHT_CHANNEL=chrome node scripts/codemods/route-text-diff.mjs /tmp/opencode/sk-base /tmp/opencode/sk-new /tmp/opencode/sk-out
routes compared: 100, identical text: 100, different: 0
page errors base: 0, new: 0
```

### ESLint (`npx eslint src` in `front-end/`, no `--fix` on the whole tree)

Base (`20f92f2`): `✖ 47 problems (0 errors, 47 warnings)`, all `react-refresh/only-export-components`.
After: `✖ 47 problems (0 errors, 47 warnings)`, the same rule and the same count. No new findings. (Right after the codemod, before the targeted `--fix`, there were 528 `perfectionist/sort-imports` and `import/no-duplicates` errors from the new import lines. Fixed.)

### First-load bundle (`docs/front-end-audit/measure-initial-load.mjs`, gzipped / raw bytes)

| | JS gz | JS raw | CSS gz | CSS raw | first-load JS files |
|---|---|---|---|---|---|
| Base `20f92f2` | 95776 (entry) / total 352799 | 1111266 | 61997 | 589087 | 32 |
| After | 95774 (entry) / total 352800 | 1111270 | 61997 | 589087 | 32 |

The first load did not grow (JS total +1 byte gzipped, +4 raw; the entry chunk is 2 bytes smaller). The domain is imported through per-module `index.ts` files with plain re-exports, and the package sets `"sideEffects": false`.

## Vercel

Checked in a fresh `git clone` of this branch: `pnpm install --frozen-lockfile` in `front-end/`, then `pnpm --dir front-end build`: `✓ built in 25.90s`, `dist/` produced. pnpm finds the workspace root above `front-end/`, installs the whole workspace, and links `@sk/domain` into `front-end/node_modules`.

- `front-end/vercel.json` does not need to change (`installCommand: pnpm install --frozen-lockfile`, `buildCommand: pnpm build`, `outputDirectory: dist` all still work).
- The Vercel root-directory setting (`front-end`) stays, **but** Vercel's "Include source files outside of the Root Directory in the Build Step" must be on. It is on by default. With it off, only `front-end/` is uploaded, the lockfile and `packages/domain` are missing, and the install fails. I reproduced the failure with a copy of `front-end/` alone (`ERR_PNPM_NO_LOCKFILE`). That was already true after E1.1 (the lockfile is at the root), and E1.2 adds the dependency on `packages/domain`. I did not change any Vercel setting and did not run a Vercel deploy.

## Left in the front-end, and why

| Code | Reason |
|---|---|
| `orders/lib/transitions.ts`, `tours/booking/transitions.ts`, `tours/merchant/lib/transitions.ts` | Mixed with the demo store: they take `DemoState`, call `sendMail`, read `demoNow`, and `createTourSeed`. E1.3 builds the pure transition tables. |
| `orders/lib/labels.ts` | Imports `@/i18n/en` message keys, `StatusTone` from a component and `pickText` text. It is UI copy. The pure `moneyState` is E1.4. |
| `partners/lib/ledger.ts`, `link-opens.ts`, `partners/report/lib/*`, `reports/lib/*`, `merchant/today/lib/*` | Read `DemoData`, `DEMO_HISTORY`, `prng` and the demo clock (`@/features/demo/*`). They are rules over mock data. E1.5 takes commission math. |
| `demo/types.ts`, `demo/clock.ts` | The browser-held mock store and clock. They stay in the prototype. |
| `checkout/lib/create-orders.ts`, `checkout/lib/trip.ts` | `create-orders` calls `sendMail` and takes `DemoState`. `trip.ts` reads `DemoData`. |
| `lib/storage.ts`, `lib/audio.ts`, `lib/avatars.ts`, `lib/photos.ts`, `lib/victorinox-art.ts`, `lib/payments` callers | Browser APIs (localStorage, Audio, `import.meta.glob` assets) or assets. |
| `catalog/lib/cart-toast.ts`, `*/seed.ts`, `*/messages*.ts` | HeroUI toast, seed data, i18n. |
| `contexts/locale-context.tsx` | React. It re-exports `Language` from the domain. |
| Other `lib/*` such as `planner/lib/*`, `content/merchant/lib/*`, `merchant/products/lib/{records,photo-upload,...}`, `tours/lib/{selectors→moved, upgrade}`, `tours/merchant/lib/{mail,render-mail,...}` | I did not move them. They read the store, the clock or i18n, or I judged them not purely domain (mail rendering, photo upload with `FileReader`). A later story can split them. |

I did not rewrite any moved function, so behaviour is the prototype's. `format.ts` creates `Intl` formatters, cached in module-level maps, not in render, so it stays inside the rule. It needs the `Intl` global only.

## Not verified

- No Vercel deploy and no check of the Vercel project's "include files outside root directory" toggle. Evidence is a local fresh clone only.
- Vite dev server (`pnpm dev`) was not started. The build, Vitest and Playwright (against the built app) cover the imports. The dev server should follow the symlink the same way, since the workspace root is detected, but I did not run it.
- Safari/WebKit and the German-only Playwright projects beyond the `phone-de` project in `pnpm e2e`.
- No render-count or CPU comparison (`pnpm verify:renders`). The text diff and the bundle sizes were done, as asked.
- The domain code itself is not linted. `front-end/eslint.config.mjs` covers `front-end/` only. A lint zone for the domain is E1.7.
- `pnpm test:e2e` from `front-end/` (the older `smoke.spec.ts`) was not run. Root `pnpm e2e` was.
