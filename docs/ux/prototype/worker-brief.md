# Worker brief: parallel build of flow 1 (steps 1.5–1.17)

Read this whole file before you start. Your task spec names your step, your files and your dependencies. Up to two other workers are editing this codebase at the same time, in the same folder, with no git. You cannot undo a clobbered file, so follow the shared-file rules exactly.

## Read first

1. `docs/ux/prototype/todo.md`: your step line and the steps around it.
2. `docs/ux/prototype/flow-1-outline.md`: §1 demo path, the §2 row for your screen and the "Every screen also gets" list, §3 notifications, §5 mock data, §7 decisions.
3. `docs/ux/ux-spec-phase1.md`: the section for your screen ID (search for it, e.g. `C04`), plus §1.3 copy rules and §5.5 shared patterns.
4. `docs/ux/decisions.tsv`: all of it. It records the owner's taste: Airbnb-style patterns, bottom sheets instead of new screens, native-app guest frame, short dates such as "Wed 14 Oct". Follow it.
5. `docs/ux/design-system/project/` (README, components) and the HeroUI v3 skill at `.claude/skills/heroui-react/SKILL.md`.
6. Reference implementation for structure, style and quality: `front-end/src/features/catalog/` (especially `components/gift-detail.tsx` and `hooks/use-gift-detail.ts`), `src/components/`, `src/features/demo/`.
7. Order domain logic (after task T0 lands): `front-end/src/features/orders/`. Use its selectors and transitions; do not write your own totals, balance or payment-label logic.

## Design skills (owner rule, 2026-10-13)

- Dashboard or analytics screens (merchant M02/M03/M04/M08, partner P02 and other back-office views): invoke the **evon:ui-ux** skill (Skill tool, `evon:ui-ux`) and follow it.
- All other screens (guest app: auth, account, cart, checkout, order detail, discovery): invoke the **impeccable** skill (Skill tool, `impeccable`) and follow it. Product context is in `PRODUCT.md` at the repo root once task I0 has written it; never run `impeccable init` yourself.
- Owner decision: skip evon's brief-approval and wireframe gate (and impeccable's equivalent shaping confirmations). Build your recommended plan directly and record the brief and the plan in your report.
- impeccable reports WORLD_DISCOVERY_REQUIRED because the repo has no DESIGN.md. Treat the existing design system (`docs/ux/design-system/project/`, `front-end/src/styles/theme.css`, the accepted rows in decisions.tsv) as the incumbent world. Don't run world discovery or `document`, and don't create DESIGN.md.
- The owner rejected flat, boring layouts in review. A redesign must clearly change hierarchy and layout, not just restyle. Keep the project's tokens and HeroUI theme (`docs/ux/design-system/project/`, `front-end/src/styles/theme.css`) unless the skill gives a strong reason, and name any token change in your report.

## Code conventions

- Match the existing code: feature folders `src/features/<feature>/{components,hooks,lib}`, file routes in `src/routes/`, `@/` imports, HeroUI v3 components, icons through `src/components/icons.ts`, money through `src/lib/format.ts`, status through `StatusChip`.
- Every visible string goes through `t()`, with a key in both `src/i18n/en.ts` and `src/i18n/de.ts`. Use Swiss German spelling (ss, not ß).
- **Owner rule: every delete, remove or cancel action asks first** in the shared confirmation dialog `src/components/confirm-dialog.tsx` (task 1.5b builds it; read its JSDoc). Never build a one-off confirm dialog. If the file does not exist yet when you need it, ask the coordinator.
- Demo data changes go through `useDemo().update(...)`. Bump nothing in `features/demo/seed.ts` `DEMO_VERSION` unless your task spec says so.

## Shared-file rules (no git, parallel editors)

- **Own only the files your spec lists**, plus new files you create inside your own feature folder or route.
- **Shared files** (`src/i18n/en.ts`, `src/i18n/de.ts`, `src/components/icons.ts`, `src/features/demo/types.ts`, `src/features/orders/*` after T0): make small anchored `Edit` insertions only. Put your i18n keys in one block under your own prefix (e.g. `"cart.*"`, `"merchantToday.*"`), placed at the end of the object just before the closing `};`, and re-read the file right before each edit. If an edit fails because the text moved, re-read and retry. Never `Write` a whole shared file. Never delete or reword keys you did not add.
- Never touch `src/routeTree.gen.ts` by hand; the Vite router plugin regenerates it.
- Do not edit `todo.md` or `decisions.tsv`. The coordinator owns them. Put your decisions in your report (below).
- If you need a change in a file another step owns, do the smallest additive change, and name it under "Touched outside my files" in your report.

## Commands

- Lint only your own files: `cd front-end && npx eslint --fix <your files>`. Never run `npm run lint` (it fixes the whole tree, including other workers' half-written files).
- Type check: `cd front-end && npx tsc --noEmit -p tsconfig.json`. Errors in files you do not own may come from other workers in progress; list them in your report and do not fix them.
- Never run `npm run build` or `npm run build:artifact` (they overwrite the shared `dist/`, and the client Artifact link is updated only on the owner's request).
- Dev server: `cd front-end && npx vite --port <your port> --strictPort` in the background, on the port your spec names. Never use 5173 (the owner's server). Kill your server before you finish and confirm the port is free (`ss -ltnp | grep <port>` prints nothing).

## Verification (required before you report done)

- Drive the real flow in a browser at 375px width, in EN and DE (prototype bar language switch), with Playwright MCP. Do not use `docs/ux/tools/shot.sh` or the Orca browser tab; other workers share that tab. If Playwright reports the browser profile is in use, write a short headless Playwright script in your scratchpad instead.
- Save screenshots to `docs/ux/prototype/screens/<step>/` (e.g. `screens/1.5/cart-en.png`, `cart-de.png`, plus each named state: empty, error, etc.).
- Check: every state in the outline §2 row for your screen is reachable; no horizontal overflow at 375px; no missing i18n keys (DE shows no English key strings); keyboard focus works; merchant screens also checked at 1024px.
- Your own files are clean under `tsc` and `eslint`.

## Report

Write `docs/ux/prototype/reports/<step>.md` with:

1. What you built (screens, states, routes, files created and changed).
2. Decisions, one per line, ready to paste into `decisions.tsv` as `2026-10-13<TAB>unit<TAB>decision<TAB>why<TAB>evidence<TAB>result` (result `PROPOSED`).
3. Touched outside my files (path and exact change).
4. Verification evidence: screenshot paths, commands run and their result.
5. Open questions for the owner.

Then send `worker_done` as your preamble says, with `--report-path` set to that file.
