# Dormant code

Tour booking, private tour requests and the category page are hidden, not deleted (ADR-012, AD-13, PRD §4.2 AC50).
This folder is outside `tsc`, `typecheck:tests` and the router. Nothing live imports it.

- `routes/` holds the route wrapper files, at the path they had under `src/routes/`.
- `features/` holds the screens those wrappers mounted, at the path they had under `src/features/`.

## Restore

1. Move each wrapper back from `routes/` to `src/routes/` and each screen back to its `features/` path with `git mv`.
2. Regenerate `src/routeTree.gen.ts` (`pnpm exec vite build`). Never edit it by hand.
3. Re-add the entry points that were removed: links from the tour page, tour list, account, store sidebar, dashboard, calendar and reports.
4. Fix what drifted while the code was out of the build. The moved screens were not type-checked.
5. Plan a backend phase first. Phase 1 builds no `bookings` module (ADR-012), so the screens have no server to talk to. Restoring them is a project, not a switch.

## Code deleted, not moved

Task-level edits removed some booking and private-request code outright. Recover it from git, not from this folder.

- Entry-point code removed when the routes moved (the booking sheet and sticky bar on the tour page, the "all departures" and categories links, the bookings menu items): commit `55690f9` and its parent.
- The private-request tab code removed from the request inbox (the `PrivateTourRow` type, the `privateRow` builder, the mark-answered toast, the `'private'` branch of `replyHref`), the booking rows removed from the partner ledger, reports, sales, cost data and calendar, the bookings row on the account hub, and the `renderTourMail` call in `render-mail.ts`: the commit `feat(E3.1): strip booking from kept screens and menus` (use `git log --grep 'strip booking'`) and its parent.
- Files here that import types or hooks that no longer exist (`merchant/components/private-tour-rows.tsx`, `use-overdue-check.ts`) need those imports fixed on restore.
- `src/dormant/tests/failed-command-tours.tsx` has no `.test` in its name so that Vitest skips it. Rename it to `failed-command-tours.test.tsx` when you restore the screens.
