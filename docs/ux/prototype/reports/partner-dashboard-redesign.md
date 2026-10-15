# P02 partner dashboard redesign (15.10.2026)

Skill: evon:ui-ux (dashboard). Owner rule: build directly, brief and plan here.

Round 1 (layout and widget shells only) was rejected as "small stuff". Round 2 below is the full
redesign: new layout, interactive charts, visual widgets.

## Layout

1. **All-time row** (not tied to the period)
   - *Your commission* hero: total earned, 30-day change, and a donut of paid out / still to pay /
     estimated on open orders. Hover or focus a legend row to highlight its slice and name it in
     the ring; replaces the old three-meter strip.
   - *Earned per month*: columns that open their month on click or Enter (`aria-pressed` on the
     month shown). Months before the first order have no column and are disabled.
2. **Period bar** (sticky): range with ‹ ›, "Compared with <previous period>", Day/Week/Month.
3. **Four number cards**: change badge against the previous period; sparkline of the period
   (commission, orders) or a meter (still to pay as a share of the commission).
4. **Commission chart** (8/12) beside **Keepsakes and tours** (4/12)
   - Chart: stacked recorded/estimated columns. Clicking a column selects it and filters the
     transactions to its orders; click again or the "Only …" chip to clear. Day and week views
     show a grey tick for the same hour or weekday of the previous period (month weeks do not
     line up, so none there).
   - Split: red/teal donut (keepsakes `--chart-1`, tours `--chart-4`), a tile per side, and the
     product groups ranked in their side's colour.
5. **Tabs**: *Transactions* (guest cards with photo, product, value, commission and status chips;
   commission filter via the standard filter button; pager of 10) and *Payments* (activity log,
   newest first, icon per kind: payout, refund, offset; offset totals underneath).

Phones: the same order in one column; numbers 2×2.

## Files

- New: `features/partners/report/components/partner-dashboard.tsx`, `dashboard-widgets.tsx`,
  `hooks/use-partner-dashboard.ts`, `messages.ts` (EN + DE, merged in `i18n/en.ts` / `de.ts`)
- Changed: `payments-widget.tsx` (activity log), `hooks/use-partner-report.ts` (previous period,
  raw figures, payment kinds), `lib/report.ts` (exports `zurichHour`), `routes/partner/$token.tsx`
  (renders the dashboard), `components/layout/partner-shell.tsx` (`isWide`)
- `components/partner-report.tsx`: the old `PartnerReport` component is no longer rendered; its
  view types are still used. Delete the component once the owner accepts round 2.

## Verification

eslint on the feature and route, `tsc --noEmit`: clean. Driver `pr-v2.mjs` (copied here) on the
no-HMR check server: guest photos load; column click sets `aria-pressed` and filters 8 → 4;
clearing restores 8; Payments tab shows the log; month click sets `date=2026-09-01` and presses
September. Screenshots month at 375/768/1024/1280, week, day, August (no payments), empty day,
loading, DE: no horizontal overflow, no console errors.

Older drivers: `section[aria-labelledby="report-chart"]` and the per-column aria-labels are kept.
Expected to fail in `1.17r-drive.mjs` (not run, RAM): line 76 "numbers 5.40 / 0.00 / 5.40" (the
"still to pay" hint now ends "· x% of the commission", and the cards add a change badge between
label and value), line 78 "orders widget 3 with hint" (same badge). Line 92 "group summary"
should still pass (groups moved inside "Keepsakes and tours", text unchanged).

Edits to files that already had uncommitted work: `use-partner-report.ts` gained the previous
period report and money (`previousReport`, `previousMoney`), a `raw` field, `chartTop`, and a
`kind` on payment rows; `lib/report.ts` only exports `zurichHour`. The round-1 rollback diff was
removed (stale).

Screenshots: `docs/ux/prototype/screens/partner-redesign/` (`before-*`, `v2-*`,
`compare-desktop-1280.png`, `compare-phone-375.png`).
