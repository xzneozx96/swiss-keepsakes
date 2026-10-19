# Report E1.3 and E1.4: transition tables and `moneyState`

Branch `xzneozx96/e1-3-e1-4-rules`, stacked on E1.7 (`5f94bc5`). Date 2026-10-19.

## What changed

- `packages/domain/src/shared/transitions.ts`: generic `TransitionTable<S>`, `Transition<S>`, `canMove`, `listTransitions`.
- `packages/domain/src/orders/transitions.ts`: `ORDER_TRANSITIONS`, `ORDER_STATUSES`, `canTransition`, `orderTransitions`.
- `packages/domain/src/bookings/transitions.ts`: `BOOKING_TRANSITIONS`, `BOOKING_STATUSES`, `canTransition`, `bookingTransitions`.
- `packages/domain/src/money/money-state.ts` (new module `money`): `moneyState(input, now)`, `LedgerEntry`, `PaymentCode`, `RefundCode`. `now` is an argument; there is no clock read.
- Front-end call sites (import and guard lines only):
  - `orders/lib/transitions.ts`: `acceptBlock`, `declineBlock`, `markReadyBlock`, `handOverBlock`, `completeBlock` and the merchant branch of `cancelBlock` ask `canTransition` through a small `canMoveTo`. The block code and `status` payload are unchanged.
  - `tours/booking/transitions.ts` and `tours/merchant/lib/transitions.ts`: the three "pending_payment becomes confirmed" checks, "delivered to completed" and "confirmed to delivered/no_show" use `canTransition`.
  - `orders/lib/labels.ts`: `paymentLabel` builds a `MoneyInput` from the order, calls `moneyState`, and maps the reason code to the same i18n key, tone and vars as before. Keys, `StatusTone` and `pickText` stay in the front-end.

## Transition tables

Derived from what the prototype lets happen, not from the target diagram in `backend.md` (see "Differences from backend.md").

### Order (`OrderStatus`)

| From | May move to |
|---|---|
| requested | accepted, preparing, declined |
| accepted | preparing, cancelled |
| preparing | ready, cancelled |
| ready | handed_over, cancelled |
| handed_over | completed |
| completed | none |
| declined | none |
| cancelled | none |

Pickup changes and payments do not change the status, so they have no row. "Handed over and complete" is two steps, `ready` to `handed_over` to `completed`.

### Booking (`BookingStatus`)

| From | May move to |
|---|---|
| pending_payment | confirmed, expired |
| confirmed | delivered, no_show, cancelled |
| delivered | completed |
| completed | none |
| expired | none |
| no_show | none |
| cancelled | none |

Only `pending_payment` can confirm. `no_show` is terminal, so it can't reach `completed`.

### Differences from backend.md (not changed, behaviour must not)

- `requested` to `cancelled` (guest cancels) is in the diagram, but the prototype's `cancelBlock` refuses it, so it is not in the table.
- The prototype cancels only `confirmed` bookings (overdue policy), as the diagram says.
- The guest/overdue cancel rule ("accepted only, nothing paid, no processing payment") stays a local guard. The table only gives the status part, and for the shop it is `accepted`, `preparing`, `ready`.

## `moneyState`

Input: ledger entries (`collection`/`refund`, `processing`/`succeeded`/`failed`), total, stage (`requested`/`open`/`closed`), amount due now, due dates, deposit flag, cancel time. Output: `paid`, `balance`, `overpaid`, `refunded`, `refundPending`, `refundFailed`, `dueNow`, `overdue`, and two reason codes: `payment` (13 codes, the prototype's labels) and `refund` (`none`/`processing`/`failed`/`partial`/`full`).

- Only `succeeded` collections count as paid. `balance = max(0, total - paid)`, and 0 when closed. A duplicate raises `paid` and `overpaid`, never makes the balance negative. Refunds never bring the balance back (UX 2.3).
- The refund code is returned but no screen shows it yet, because the prototype has no refund keys. Adding copy for it is a later story.

### About "UX L584"

`docs/ux/ux-spec-phase1.md` line 584 is scenario S9. Its figures (basis CHF 100, 10% gives 10, refund 20 gives commission 2, overpaid 4 with new commission 3 then 6 gives offsets 3 and 1 and 5 owed) are commission and offset math (`backend.md` 7.3), which belongs to E1.5, not to `moneyState`. I asked the coordinator, who answered: pin the section 2.3 payment label figures plus the duplicate case, and leave the L584 commission figures to E1.5. The plan text for E1.4 cites L584 but those figures belong to E1.5.

The `[E1.4]` tests pin the section 2.3 figures: total 89.00, paid 26.70, balance 62.30 (deposit paid, due 20.10); due 54.00; pay later 89.00; overdue 62.30; paid in full 89.00; refund processing 54.00; refund failed 54.00; partial refund 20.00; full refund 54.00; and duplicates (54 + 54 on 89 gives paid 108.00, balance 0, overpaid 19.00).

## Tests

`packages/domain/tests/transitions.test.ts`: the full grid, 64 order pairs and 49 booking pairs, each asserted allowed or refused against an explicit list, plus `listTransitions` equals the list, terminal states, `no_show` reaches nothing, only `pending_payment` confirms. `packages/domain/tests/money.test.ts`: 15 `[E1.4]` tests. Root run: 10 files, 199 tests.

## Acceptance (real output)

```
$ pnpm typecheck
packages/domain typecheck: Done
spikes typecheck: Done
front-end typecheck: Done

$ pnpm test
 Test Files  10 passed (10)
      Tests  199 passed (199)

$ pnpm build
front-end build: Done

$ pnpm lint:zones
> eslint --no-error-on-unmatched-pattern api packages
(no output, exit 0)

$ PLAYWRIGHT_CHANNEL=chrome pnpm e2e
  8 passed (17.3s)

$ npx eslint src      (in front-end)
✖ 47 problems (0 errors, 47 warnings)      # all react-refresh/only-export-components, same as E1.2

$ PLAYWRIGHT_CHANNEL=chrome node scripts/codemods/route-text-diff.mjs /tmp/opencode/sk-base /tmp/opencode/sk-new /tmp/opencode/sk-out
routes compared: 100, identical text: 100, different: 0
page errors base: 0, new: 0
```

Base was built from `git archive 5f94bc5` in `/tmp/opencode/sk-base-src`, new from this branch.

## Not verified

- `pnpm verify:routes` and `verify:renders` were not run. The 100-route text diff was.
- Text diff is a frozen-clock demo with seeded orders. No order in it has a refund, so the refund codes are only unit-tested, not seen on screen.
- `paymentLabel` was checked by the text diff and e2e, not by a direct old-versus-new comparison over every status and payment combination.
- Tour bookings do not use `moneyState`. `useBookingLabels` in `front-end/src/features/tours/components/booking-status.tsx` still builds its own payment label from the booking's payments (`tours.payment.*` keys: exception, closed, sessionClosed, processing, overdue, paid, deposit, unpaid, none). Only gift orders go through `paymentLabel`. Tour bookings are in the E1.4 scope of "one money rule" but were not moved, so the two can disagree on edge cases such as a refund or a duplicate payment. Moving them needs its own story or an addition to E1.4.
- Guards in front-end places that read `order.status` directly (buttons, calendar, today queue) were left as they are. Only the transition guards listed above read the table. Moving the remaining button decisions is not done.
- `pnpm test:e2e` in `front-end/` (old smoke spec) was not run. Root `pnpm e2e` was.
- No live browser lanes from `sprint-0-1.md` (C14, C15, M04, M07 screenshots).
