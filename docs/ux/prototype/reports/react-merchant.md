# Phase 2 merchant React screens

Implementation is ready for integration and live review. These components use the current React app and tour demo store; no standalone HTML was created.

## Delivered

- `TourDeparturesPage`: ordered departures, confirmed seats, currently active payment holds, remaining seats and capacity. Mobile cards and a HeroUI desktop table open the manifest.
- `TourManifestPage({ departureId })`: each guest booking, participant breakdown, payment/balance and attendance actions. Both mobile and desktop expose the actions. No simulated bulk updates.
- `MerchantTourBookingPage({ bookingId })`: guest contacts, departure/meeting information, separate payment history and booking activity, balance, record-payment sheet, attendance and completion.
- `TourTodayQueue`: Zurich-date departures for insertion into the existing merchant Today screen.

Attendance and no-show require a confirmed booking, owner/manager role, and the tour end time to have passed. Completion requires recorded attendance and no outstanding balance. The shared confirmation dialog precedes outcome changes. Record-payment uses the current balance, rejects invalid/excess amounts, and delegates the change to the tour action hook.

## Existing components reused

`DetailCard`, `ActionPanel`, `SheetFrame`, `StatusChip` through shared `BookingStatusLabels`, `EmptyState`, `useConfirm`, shared icons and format/localization helpers. Tables and payment inputs use HeroUI v3 compound components directly. Screens inherit `MerchantShell` from routes rather than rendering a second shell.

English and German copy is exported by `merchant/messages.ts` as `tourMerchantEn` and `tourMerchantDe` for the root dictionaries. Dates use Europe/Zurich; cent amounts use the existing Swiss money formatter.

## Design choices

Applied the installed Evon UI/UX skill. Continued the app's existing rounded merchant surfaces and reusable detail cards. The prior layout draft supplies the screen structure; this pass implements it as React, as requested. No chart overhaul, new design-system primitive or dependency was added. All operational data is from the tour demo store.

## Validation

- Own directory ESLint passes: `./node_modules/.bin/eslint src/features/tours/merchant`.
- HeroUI skill read; its component-documentation fetch was attempted and failed because the documentation endpoint was unavailable in this environment. Current in-project v3 examples supplied the exact component APIs.
- Root session owns route registration, full typecheck/build and live browser checks. Those are integration gates, not claimed complete by this report.
