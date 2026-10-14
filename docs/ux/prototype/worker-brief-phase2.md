# Worker brief: Phase 2 tour flow, verify and complete (steps 2.1–2.14)

Read this whole file before you start. Your task spec names your steps, your owned files, your booking cases and your port. Two other Phase 2 workers edit this codebase at the same time, plus a Phase 1 worker and other sessions, in the same folder, with no git. You cannot undo a clobbered file, so follow the shared-file rules exactly.

## What already exists

Codex implemented most of Phase 2 directly in React on 13 October 2026, then ran out of quota mid-verification. It is **not** a fresh build. Your job:

1. Read your checklist steps in `todo-phase2.md` and the booking cases assigned to you.
2. Read the existing code for those screens and compare it with each acceptance sentence.
3. Fix gaps and bugs in the existing code. Do not rewrite or restyle working screens. The owner already approved the shared gift/tour card and detail layout (hearts, ratings, reviews, itinerary with 3D map).
4. Verify in the browser, then write one report per step.

Typecheck, lint and production build were clean at handover.

## Read first

1. `docs/ux/prototype/todo-phase2.md`: your steps, the "Verify the important booking cases" table and "Keep unresolved policies visible".
2. `docs/ux/prototype/flow-2-outline.md`: routes, booking transitions, seat accounting and the sample policies. Step 2.0 (this outline) is still `[~]` awaiting owner approval; build against it and say so in your report.
3. `docs/ux/prototype/reports/react-integration.md`, `reports/shared-listing-detail.md`, `reports/tour-reviews.md`: what codex built.
4. PRD v2 (`docs/PRD/Swiss_Stories_and_Gifts_PRD_v2.md`) sections 6.3, 7.3, 9, 10 and acceptance criteria; UX spec (`docs/ux/ux-spec-phase1.md`) sections 2.2, 2.3, 4.3, 4.4, 5, 6, 7 and scenario S7. Search for your screen IDs.
5. `docs/ux/decisions.tsv`: the owner's taste. Follow it.
6. `front-end/README.md`, `docs/ux/design-system/project/`, `.claude/skills/heroui-react/SKILL.md`.
7. Code: `front-end/src/features/tours/` (all of it), `front-end/src/features/orders/` (gift order logic to mirror, not to duplicate), `src/components/`, `src/features/demo/`.

## Design skills (owner rule)

- Merchant back-office screens (M02, M05, M06, M07, M08, P02): invoke `evon-ui-ux` (Skill tool) where you change layout. Guest screens: invoke `impeccable`. Skip their brief-approval and wireframe gates; record your plan in the report. Never run `impeccable init`, world discovery or `document`; don't create DESIGN.md.
- Keep project tokens (`front-end/src/styles/theme.css`) and HeroUI theme.

## Code conventions

- Feature folders, `@/` imports, HeroUI v3, icons via `src/components/icons.ts`, money/dates via `src/lib/format.ts`, statuses via `StatusChip`.
- Every visible string through `t()` with EN and DE keys. Tour strings live in the `messages.ts` file of your own tour sub-folder (e.g. `features/tours/booking/messages.ts`), already registered. Swiss German spelling (ss, not ß).
- Every delete, remove or cancel action asks first through `src/components/confirm-dialog.tsx`.
- Demo data changes go through `useDemo().update(...)`. Do not bump `DEMO_VERSION`.
- Prefer domain logic as pure functions over `TourData`/`TourBooking` in your own `lib/` file, wired into `use-tours.ts` with a small edit. Use the existing selectors (`features/tours/lib/selectors.ts`) for seats, balances and labels; add a selector there rather than recomputing in a screen, so guest and merchant always show the same numbers.

## Shared-file rules

- **Own only the files your spec lists**, plus new files you create inside your own folders.
- **Shared files**: `features/tours/types.ts`, `features/tours/seed.ts`, `features/tours/hooks/use-tours.ts`, `features/tours/lib/selectors.ts`, `features/tours/messages.ts`, `features/tours/components/*`, `src/features/demo/*`, `src/components/layout/*`, `src/i18n/*`, `src/components/*`. Make small anchored `Edit` insertions only. Re-read the file right before each edit. If an edit fails because the text moved, re-read and retry. Never `Write` a whole shared file. Never delete or reword code or keys you did not add, except inside the functions your spec says you own.
- **Off limits** (Phase 1 worker active there): `src/features/account/components/guest-avatar.tsx`, `src/lib/avatars.ts`, `src/assets/avatars/*`, and any avatar or profile-photo code.
- Never touch `src/routeTree.gen.ts`. Do not edit `todo-phase2.md`, `todo.md`, `decisions.tsv` or `react-integration.md`; the coordinator owns them.
- If you need a change that belongs to another worker's area, use your preamble's `ask` command to the coordinator instead of editing it.

## Commands

- Lint only your own files: `cd front-end && npx eslint --fix <files>`. Never `npm run lint`.
- Type check: `cd front-end && npx tsc --noEmit -p tsconfig.json`. Errors in files you do not own may be another worker's work in progress; list them, don't fix them.
- Never run `npm run build`, `vite build` or `build:artifact`.
- Dev server: `cd front-end && npx vite --port <your port> --strictPort` in the background. Never use 5173, 5188, 5189, 5220 or 5221. Kill your server before finishing and confirm `ss -ltnp | grep <port>` prints nothing.

## Verification (required before done)

- Drive the real flow at 375px in EN and DE (merchant screens also at 1024px) with a headless Playwright script in your scratchpad (the Phase 1 drivers in `docs/ux/prototype/reports/1.12t-drive.mjs` show the pattern with `playwright-core` and the cached chromium-headless-shell). Do not use the shared Orca browser tab. Copy the final driver script and its output next to your report as `reports/2.N-drive.mjs` and `reports/2.N-drive.out`.
- Use the demo clock and prototype controls to reach time-based states (hold expiry, balance deadline, tour ended). Add a prototype control only when a review step needs it, in the existing prototype controls panel, under a "Tours" group.
- Save screenshots to `docs/ux/prototype/screens/2.N/` (`<state>-en.png`, `<state>-de.png`).
- For each booking case assigned to you, state PASS or FAIL with the evidence line from your driver output. Simulated races and provider results prove prototype behaviour only; say so.
- Check: no horizontal overflow at 375px, no raw i18n keys in DE, keyboard focus works, your files clean under `tsc` and `eslint`.

## Reports

Write one `docs/ux/prototype/reports/2.N.md` per step you own:

1. What was already there, and what you changed (files, routes, states).
2. Acceptance check: each sentence of the step line → met / fixed / not met (why).
3. Booking cases: PASS/FAIL with evidence.
4. Decisions, one per line, as `2026-10-13<TAB>2.N<TAB>decision<TAB>why<TAB>evidence<TAB>PROPOSED`.
5. Touched outside my files (path and exact change).
6. Demo assumptions and open questions for the owner.

Then send `worker_done` once, as your preamble says, with `--report-path` set to your last report and all step reports listed in the summary.

## Round 2: UI restyle (owner review, 14 October 2026)

The owner approved C08, C09 (with the in-map stop card) and C12, and rejected every other Phase 2 screen: "the overall design is not good at all". Round 2 restyles them to the **visual UI style of the approved gift-shopping flow**.

**Scope rule (owner, verbatim intent): reuse the UI style, not the UX.** Keep each tour screen's screens, steps, order, sections, content, states and logic. Do not merge, add, remove or reorder screens or sections. Do not make booking work like shopping. Change only the look:

- card surfaces and shadows (the shared `rounded-3xl` / `shadow-surface` surface, no solid borders, as in 1.13s)
- corner radius, typography (serif headings where gift uses them), spacing and section rhythm
- status chips, buttons, list rows, sheets, banners/alerts, key-fact tiles, dashboard widget cards (1.9t: each KPI or tile as its own card, round up-right arrow buttons)

Where an approved gift screen already renders that look through a component, use the same component instead of one-off markup. If it lives inside a gift feature folder, move it to `src/components/` (or a shared feature folder) and update the gift imports. A move like this is allowed in round 2. Re-read before each edit, keep the gift screen pixel-identical, and list every move in your report. Don't copy and restyle a component.

Don't touch the approved screens: C08 tour list, C09 tour detail and map, C12 payment.

**Reference:** approved screenshots in `docs/ux/prototype/screens/phase1-review/img/` (and `round2/`), the Phase 1 reports named in your spec, and the live gift screens in the app.

**Evidence:** for every restyled screen, save a gift-vs-tour pair at the same width and language in `screens/2.N-r2/` (`<screen>-gift-en.png`, `<screen>-tour-en.png`, plus DE for the tour). Re-run the step's existing driver, `reports/2.N-drive.mjs`; its behaviour checks must still pass. Update selectors only where markup changed, never weaken assertions. Then run a quick gift regression on any gift screen whose component you moved. Write `reports/2.N-r2.md`: what changed visually, the components reused or moved, the driver result, the screenshot pairs, and anything you left alone because it would need a UX change (flag it for the owner, don't do it).
