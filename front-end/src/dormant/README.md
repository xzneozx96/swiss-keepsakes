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
