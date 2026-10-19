# Report E1.5 and E1.6: commission math and Zurich date rules

Branch `xzneozx96/e1-5-e1-6-rules`, stacked on E1.3+E1.4 (`59a8d5c`). Date 2026-10-19.

## What changed

### E1.5, `packages/domain/src/money/commission.ts` (integer Rappen)
- `commissionBasis({ price, personalisation, discount, delivery? })`: price + personalisation - discount. `delivery` is accepted and ignored.
- `commissionAmount(basis, rate)`: half-up to the Rappen, computed in basis points so 0.1 does not drift.
- `refundAdjustment({ basis, alreadyRefundedBasis, refundedBasis, rate })`: positive amount to subtract, capped at the basis still left, so a line never goes below 0. A delivery-only refund passes `refundedBasis: 0` and gives 0.
- `splitDiscount(discount, lineValues)` (Q9): each line but the last gets its proportional share rounded half up; the last takes the rest. A share is capped at what is left, so the parts always sum to the discount and none is negative.
- `overpayment({ paid, earned })`, `offsetAmount(overpaid, newCommission)`, `partnerPosition({ earned, paid })` (earned, paid, owed, toOffset).
- Call sites: `orders/selectors.ts` `commission()` and `bookings/selectors.ts` `bookingCommission()` now call `commissionAmount` (the prototype has no discount or priced personalisation, so basis is unchanged); `front-end/src/features/partners/lib/ledger.ts` calls `offsetAmount` for its offset step. The ledger's event loop stays in the front-end.

### E1.6, new module `packages/domain/src/dates/`
- `zurich.ts`: `zurichOffsetMinutes`, `zurichDate`, `addCalendarDays`, `zurichInstant(date, 'HH:mm')`. The offset comes from `Intl.DateTimeFormat` with an explicit `timeZone: 'Europe/Zurich'` (tz database daylight-saving rules, not the machine's zone), and no clock is read. `catalog/pickup.ts` now re-exports this `zurichDate`, so every existing import still works.
- `reminders.ts`: `firstPaymentReminders` (24 h and 2 h before the deadline, exact hours), `balanceReminder` (3 Zurich days before the due date), `dayBeforeReminder('pickup' | 'tour', date)` (day before at 18:00 Zurich), `reminderSet`, `REMINDER_DEFAULTS`.
- `pickup-window.ts`: `isWithinPickupWindow(at, { date, from, to })` (from inclusive, to exclusive, Zurich time) and `isPickupDateInRange`.

## Decisions to confirm
- **Balance reminder time of day.** Q5 says "3 days before the due date" with no time. I used 09:00 Zurich (`REMINDER_DEFAULTS.balanceTime`). Change it in one place if the owner wants another.
- **Pickup window.** The prototype only has the Sunday-closed rule and free-text `openingHours`, so "window" is a date plus Zurich from/to times, and a date range check. There is no structured opening-hours data yet.
- **Rate precision.** Rates are used to 4 decimals (basis points).

## Tests

`packages/domain/tests/commission.test.ts` (`[E1.5][S9]`, `[E1.5][Q9]`) and `dates.test.ts` (`[E1.6]`). They pin:
- basis 100.00 and commission 10.00 (CHF 100 + 10 - 10, delivery 5); refund 20 gives 2; delivery-only refund gives 0; refunds to the full basis total 10.00
- S9: overpaid 4, commission 3 then 6, offsets 300 and 100, owed 500, still to offset 100 after the first
- split: [6000, 4000] gives [600, 400]; 100 over [3333, 3333, 3334] gives [33, 33, 34]; 1000 over three equal lines gives [333, 333, 334]; sums equal the discount in several cases
- DST 2026: offset changes at 2026-03-29 01:00 UTC and 2026-10-25 01:00 UTC; `zurichDate` equals Intl for every hour of 2026; day before 18:00 is 17:00 UTC on 28 March and 16:00 UTC on 29 March (23 h apart), and 16:00 UTC on 24 Oct and 17:00 UTC on 25 Oct (25 h apart); all 365 reminders of 2026 read 18:00 on the Zurich clock

## Acceptance (real output, trimmed)

```
$ pnpm typecheck
spikes typecheck: Done
packages/domain typecheck: Done
front-end typecheck: Done

$ pnpm test
 Test Files  12 passed (12)
      Tests  231 passed (231)

$ pnpm build
front-end build: Done

$ pnpm lint:zones
> eslint --no-error-on-unmatched-pattern api packages
(no output, exit 0)

$ PLAYWRIGHT_CHANNEL=chrome pnpm e2e
  8 passed (18.4s)

$ (front-end) npx eslint src
✖ 47 problems (0 errors, 47 warnings)

$ PLAYWRIGHT_CHANNEL=chrome node scripts/codemods/route-text-diff.mjs /tmp/opencode/sk-base /tmp/opencode/sk-new /tmp/opencode/sk-out
routes compared: 100, identical text: 100, different: 0
page errors base: 0, new: 0
```

Base build came from `git archive 59a8d5c` extracted to `/tmp/opencode/sk-scratch`.

## Not verified
- ESLint's 47 warnings were counted, not compared rule by rule, against the base. Same count and zero errors; the E1.3+E1.4 report lists them as `react-refresh`.
- `pnpm typecheck:tests` and the first-load bundle size were not run.
- Nothing calls the new reminder, window or `splitDiscount` code yet; only the unit tests exercise them. The commission rounding change (`Math.round` to basis points) was checked only by the tests and the route diff on the demo data.
- `zurichInstant` for a time inside the spring gap (02:00 to 03:00) or autumn overlap follows a documented rule, but no test pins it.
