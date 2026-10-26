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

## Files moved because only dormant code used them

Each file sits here at its old path relative to `src/`. Move it back with `git mv` when you restore the screens that use it. No import was rewritten, so the restored paths match.

- `components/surface-card.tsx`
- `features/tours/merchant/lib/report.ts` and `features/tours/merchant/lib/render-mail.ts` (nothing imported them after E3.1).
- `features/tours/discovery/departure-picker/` (whole folder)
- `features/tours/booking/booking-summary.tsx` and `features/tours/booking/sample-bookings.ts`
- `features/tours/reviews/tour-booking-review.tsx` and `features/tours/reviews/index.ts` (the reviews `messages*.ts` and `seed.ts` stay, because the dictionaries and the demo seed use them)
- `features/tours/components/booking-status.tsx`
- `features/tours/merchant/attendance-actions.tsx` and `features/tours/merchant/payment-sheet.tsx`
- `features/merchant/products/hooks/use-subcategories.ts` and `features/merchant/products/components/subcategory-sheet.tsx`
- `features/requests/hooks/use-private-tour.ts`, with its test in `tests/submit.tsx` (renamed from `tests/submit.test.tsx`; rename it back on restore)
- `usePrivateTourRequests` now lives in `features/requests/api/queries.ts` here. On restore, copy it back into `src/features/requests/api/queries.ts` (it needs `PrivateTourRequest` from `@sk/domain/requests`).

## Code deleted, not moved

E3.1 also deleted booking code from kept files. `466657f` is the last commit before E3.1. To see only what E3.1 changed, use a range that stops at the E3.1 head: `git log --oneline 466657f..<E3.1 head>` lists its commits, and `git diff 466657f <E3.1 head> -- front-end/src/<path>` shows exactly what went from a path. Restore the hunks you want. `<E3.1 head>` is the merge commit of the E3.1 pull request. Until it merges, use the branch head, for example the E3.1 merge commit (see `git log --grep 'E3.1'`). Do not diff against the current `HEAD`, because later stories also change these files. Paths are under `front-end/src/`.

- Tour page, `features/tours/discovery/tour-detail-page.tsx`: price list, payment-policy rows, sticky price and departure bar, sold-out state. `routes/_guest/tours/$slug.tsx`: the `?book` search. `tour-list-page.tsx`: the private-tour entry. `tour-preview.tsx`: the booking prop.
- Partner report, `features/partners/report/`: tours part of the mix and `colourOf` (`hooks/use-partner-dashboard.ts`, `hooks/use-partner-overview.ts`, `components/dashboard-widgets.tsx`); tour rows in `partnerReport` and bookings in `partnerAllTime` (`lib/report.ts`); the booking lookup in `hooks/use-partner-report.ts`.
- Partner ledger, `features/partners/lib/ledger.ts`: booking items in `commissionItems`. `features/merchant/partners/hooks/use-partner-detail.ts`: the booking link.
- Sales, `features/merchant/sales/`: tours split in the cards, charts and legends (`hooks/use-sales-overview.ts`, `components/sales-overview.tsx`, `components/sales-all-time.tsx`) and the split copy in `messages*.ts`.
- Reports, `features/reports/`: the booking mapper in `reportTransactions` (`lib/transactions.ts`); bookings in `useCostData` (`hooks/use-cost-data.ts`); the seats widget, tours outcomes, tours margin part and type filter options in `useReports` (`hooks/use-reports.ts`); the type filter in `components/filters-sheet.tsx` and `components/report-pages.tsx`; the private-tours donut (`hooks/use-report-pages.tsx`, `components/report-pages.tsx`); wording in `pages-messages*.ts` and `i18n/{en,de}.ts`.
- Inbox route, `routes/store/requests/index.tsx` is as before. `RequestsTab` in `features/requests/merchant/lib/search-params.ts` lost `'private'`, so `?tab=private` is no longer accepted.
- Partner wording, `features/partners/report/messages.ts` and `messages.de.ts`: keepsakes-and-tours and orders-and-bookings wording became keepsakes and orders.
- Requests, `features/requests/`: the private tab, `privateRow`, `PrivateTourRow` and the mark-answered toast (`merchant/components/merchant-requests.tsx`, `merchant/hooks/use-merchant-requests.ts`, `merchant/lib/search-params.ts`); the `'private'` branch of `replyHref` (`merchant/hooks/use-advice-request.ts`); the N17 link (`lib/render-request-mail.ts`).
- Calendar, `features/merchant/calendar/`: the tour-event builder (`use-calendar-items.ts`) and the open-departure link (`calendar-overlays.tsx`). The dead tour paths after that: the `TourItem` type and the `CalendarItem` union (`calendar-core.ts`), the `kind === 'tour'` branches, the lead-person label and `kindOrder` (`calendar-page.tsx`), the tour half of `EventDetail` (`calendar-overlays.tsx`) and the `as CalendarItem[]` cast (`use-calendar-items.ts`). The message keys `calendar.noBookings`, `tourMerchant.seatsBooked` and `tourMerchant.onHold` stay.
- Today, `features/merchant/today/components/today-overview.tsx`: the tours half and the `useOverdueCheck` call.
- Account, `routes/_guest/account.tsx`, `features/account/`: the bookings section, hub row and counts.
- Menus and demo, `components/layout/merchant-shell.tsx` (bookings items; the phone bar lost Bookings and Products moved under More), `components/layout/section-pages.ts`, `features/demo/components/prototype-bar.tsx`, `features/notifications/components/render-mail.ts` (the `renderTourMail` call and the `bookingId` guard), the categories links in `features/merchant/products/components/{gift-editor,merchant-products}.tsx`, the departures link in `tour-editor.tsx`.

## Imports to fix on restore

Paths in this list are the current locations inside `src/dormant/`, except where it says otherwise.

- End-to-end specs `e2e/flows/tour.spec.ts` and `e2e/flows/tour-submit.spec.ts` (repo root `e2e/`) were switched to `test.skip`. Re-enable them on restore.
- `features/requests/merchant/components/private-tour-rows.tsx` imports `PrivateTourRow` from the inbox hook; that type was deleted (see above).
- Moved files with relative imports (for example `use-overdue-check.ts`) resolve again once moved back to their original folder.
- `src/dormant/tests/failed-command-tours.tsx` has no `.test` in its name so that Vitest skips it. Rename it to `failed-command-tours.test.tsx` when you restore the screens.
