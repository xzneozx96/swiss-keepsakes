# ADR-012: Hide tour booking by moving its routes and screens out of the build and keeping its rules compiled

Status: accepted
Date: 2026-10-26
Source: AD-13
Applies to: `front-end/src/routes/**`, `front-end/src/features/tours/booking/`, `front-end/src/features/tours/merchant/`, `front-end/src/features/orders/`, `front-end/src/features/account/`, `front-end/tsconfig.json`, `front-end/e2e/`, `packages/domain/src/bookings/`, `api/src/modules/bookings/`

No new dependency, vendor or paid service. Option B below is a runtime flag. It is listed and not recommended.

## Context
The owner chose to hide tour booking, not delete it (Q4). PRD §4.2 says there is no path or navigation to it, no price, departure, seat count or booking button on a tour page (AC50, Q24), and the code stays dormant for a later decision. Private tour requests are out of scope too (Q6).

The router generates routes from files in `front-end/src/routes/`. Each booking route file calls `createFileRoute('/_guest/tours/$slug_/book')` with a typed path. A file that the generator ignores leaves that path unregistered, and `tsc` then fails on it. A prefix of `-` (the generator's ignore marker) is therefore not enough on its own. The tour information page and the booking pages share the `Tour` type, which carries prices, age bands and participant fields, and the merchant's tour editor edits departures next to content.

## Decision
We will remove the booking routes, screens and every link to them from the build, keep the booking rules in `packages/domain` compiled and tested, and not build the backend `bookings` module.

- **Routes and screens.** Move these route wrapper files out of `front-end/src/routes/` into `front-end/src/dormant/routes/`, and move the booking screens (`features/tours/booking/**` and the booking merchant pages) into `front-end/src/dormant/`. Exclude `front-end/src/dormant/` from `tsconfig.json` and ESLint. The wrappers are: `_guest/tours/$slug_.book*.tsx`, `_guest/tours/private-tour*.tsx`, `_guest/account_.bookings.*`, `store/bookings.tsx`, `store/bookings/**`. A README in that folder says how to restore them.
- **Live tour page.** `routes/_guest/tours/$slug.tsx` accepts `?book=true` and opens the booking sheet. Remove that search parameter and the sheet, and remove the typed links to removed routes in live code (`tour-selection-sheet.tsx`, `tour-list-page.tsx`, `private-tour-request.tsx` and the like). Without this, `tsc` fails on the missing routes.
- **Entry points.** Remove tour booking from guest navigation, account lists, the store sidebar, the dashboard, the calendar (keepsake orders stay) and the partner and report screens. The links and imports that point at the removed routes go.
- **Tour information page.** It renders from the tour guide type of ADR-005. It shows no price, departure, seat, booking button or "private tour" link.
- **Merchant tour editor.** It edits content, route and PDF only. The departure and price fields leave the editor.
- **Rules stay compiled.** `packages/domain/src/bookings/**` (transition tables, money rules) stays in place with its unit tests. The moved screens are not compiled, because typed links in them point at routes that no longer exist.
- **Tests.** The end-to-end tour booking flow is skipped with a reference to this ADR. Unit tests of the transition tables and money rules keep running.
- **Backend.** Phase 1 builds no `bookings` module, tables or routes, and the `money` and `orders` designs carry no `booking` transaction kind until the code returns. The design stays in backend.md, marked dormant.
- **Private tour requests** follow the same rule (routes removed, code kept).

## Consequences
- Unhiding is a deliberate move of the wrapper files back plus the entry-point edits, and it needs a backend phase. It is a project, not a switch.
- The moved screens can drift from the shared types while they sit out of the build. Unhiding means restoring them and fixing what drifted. The rules in `packages/domain` do not drift, because they stay compiled.
- The `Tour` type must be split so content and booking meet only where they need to. That is ADR-005.
- A new link to a booking page fails to type-check in live code, because the route does not exist.

## Assumptions
- Booking returns later, if at all, as a separate decision with its own backend phase (PRD §4.2).
- The typed-link errors that `tsc` reports after the move are the complete list of live code to fix (the currency check found `$slug.tsx`, `tour-selection-sheet.tsx`, `tour-list-page.tsx` and `private-tour-request.tsx`).
- The wrapper files stay small and hold no logic. The booking wrappers checked on 2026-10-26 are 10 to 14 lines each, a redirect or a component mount.
- Only these live files import booking code and must be edited: `routes/_guest/account.tsx`, `features/merchant/today/`, `features/merchant/calendar/use-calendar-items.ts`, `features/merchant/products/components/{tour-editor,departure-sheets,step-shell}.tsx`, `features/partners/report/lib/report.ts`, `features/notifications/components/render-mail.ts`, `features/demo/components/prototype-bar.tsx`, `features/tours/api/client.ts` and the `i18n` dictionaries.
- If the owner wants to switch booking on in a demo for a client within weeks, a flag (option B) is the cheaper path.

## Considered options
- **A. Remove routes and screens from the build, keep the rules compiled (chosen).** No path exists, and the bundle is clean. The screens can drift.
- **B. A runtime or build-time flag that guards the routes.** One-line unhide, and all the code stays type-checked, so it cannot drift. But routes remain registered, URLs resolve in the router, and every screen needs a flag check. This weakens "no path" (AC50) and invites partial unhiding. It is the better choice if the owner expects booking back within weeks.
- **C. Delete the code and rely on git history.** Cleanest tree. The owner ruled this out (Q4).

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
