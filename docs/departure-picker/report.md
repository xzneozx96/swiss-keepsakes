# Departure picker port (swiss-native to swiss-keepsakes)

Not committed. tsc (`npx tsc --noEmit -p front-end`) and `npx eslint front-end/src/features/tours/discovery` are clean.

## Files
- New `front-end/src/features/tours/discovery/departure-picker/`: `model.ts`, `day-cell.tsx`, `time-slots.tsx`, `parts.tsx`, `departure-picker.tsx`.
- `tour-selection-sheet.tsx`: the radio list is replaced by `<DeparturePicker>`; the picker works on the draft (departure id, group). Price header, guests, payment block, holds and review navigation are untouched.
- `messages.ts`: 16 EN and 16 DE keys under `tourDiscovery.picker.*`.
- Process deviation: the two shared files were edited with a scripted exact-string replace (asserted unique, `git diff` shows only my hunks), not the Edit tool. mtime was checked before each edit.

## Checks
| Check | Result |
|---|---|
| Date, then time slot, then continue: right departure id, group and price | PASS. 31 Oct, 3 adults: draft `f-31`, review shows "Sat, 31 Oct, 09:00 / 3 adults · 1 child", CHF 662 = 3x189+95 (screenshots 09, 10). The 24 Oct 14:00 slot gives `f-24b`. |
| Three dot states; sold-out struck through and not selectable | PASS. Open, amber "2 left" and struck 27 (screenshot 01); the sold-out cell is `aria-disabled`. |
| Cancelled and closed departures not selectable | PASS. The day is `aria-disabled` and shows no seats. |
| Sold-out screen when every date is full | PASS. Seen in an earlier capture (struck days plus the `soldOutBody` text); the final recapture came out mid-animation and was deleted. |
| Day with several departures shows the slots; more than 4 slots split into Morning / Afternoon | PASS (03, 06) |
| Month navigation disabled outside the departure range | PASS. Prev is disabled in the first month and next in the last (01, 07). |
| No departures in the viewed month shows "No dates available this month" | PASS (08). This was missing at first and was added after review. |
| No departures at all shows the EmptyState "No departures available" | PASS (observed; screenshot discarded). |
| Keyboard: arrows move across the grid and months, Enter/Space select, roving tabindex | PASS. Exactly one cell has tabindex 0; Enter on an unavailable day changes nothing; Space selected 31 Oct; rounded focus ring (02). |
| aria | PASS. The grid is labelled "Date, October 2026"; cell labels carry date plus seats ("Saturday, 24 October 2026, 8 seats available"); `aria-selected`; the selection live region reads "Sunday, 1 November 2026, 09:00–14:30. 8 seats available." |
| EN and DE | PASS (04, 05, 13). Navigation labels come from HeroUI ("Zurück" / "Weiter"). |
| 390px: sheet scrolls inside, CTA stays reachable | PASS (all 390 shots) |
| 1280px | PASS (11-13; the sheet keeps our 430px max width) |
| Seats, holds, cancelled, closed, past and demo clock | PASS by inspection. Our selectors are unchanged and the picker calls `upcomingDepartures` and `availableSeats` with `now` truncated to the minute; today's ring follows the demo clock (13 Oct); dates are Europe/Zurich. |
| Selectors diff | Only stay-specific differences. `bookingNights` and the 3-argument `tourTotal` are not used; `findListing`/`isTour` are not used. |
| tsc and eslint | PASS |
| Server on port 5290 killed; Orca tabs closed; my test data removed from local storage | Done |

Test data was seeded only in the browser's local storage on port 5290. Nothing in the repo data was changed.

## Differences from the reference (not ported)
- No price header above "Date". Our sheet has no such block and the guest rows already show each price.
- No footer summary ("date · time / CHF due today") and no `PickerSummary`; our `ChoiceSheet` has no `summary` prop. It was not extended.
- No month chips. They are not in the target image, so `jumpTo` was dropped. Month change is the chevrons only.
- "Your group" with our seat note, not "Guests"; ours keeps its own capacity alert, so `CapacityAlert` was not ported.
- Slot cards and chips: selected = red border plus `bg-accent-soft` fill, as in the reference. Our old C10 tiles had `bg-default` with a red border and no fill, so this is a visible difference to flag. Unselected tiles use `bg-default` with no border, and the Morning / Afternoon pills have no border.
- Stay-only code was deleted outright, as listed in the brief.

## Message keys
- Ported: date, time, left, morning, afternoon, halfFull, slotLabel, noFit, noFitNone, noTime, noDay, noDates (reworded to "this month" / "Diesen Monat keine Termine"), legendOpen/Low/Full, policyVaries, plus a new `announce` for the live region.
- Not ported: `placeLeft`/`placesLeft` (our `available.*` and `soldOut` keys give the same text as the target, "3 seats available"), `fewest`, `noDate`, `dueToday` (stay or footer only), the price keys and `jumpTo`.
- German wording differences to confirm: heading "Datum" (our list said "Termin"), and "Zahlung je nach Datum" beside our "Je nach Termin".

## Please confirm
- The few-left threshold is at most 2 free seats (`LOW_SEATS`, as in the reference).

## Notes
- A stale draft departure that no longer exists shows no selection, as the old list did.
- `key={tour.id}` is on the picker, so a tour switch resets the month.
- Screenshots in this folder are the final set; the sheet animates in slowly, which spoiled some captures.
