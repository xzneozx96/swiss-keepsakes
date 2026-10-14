# Tour-flow design outline

Draft for owner review. This document expands step 2.0 of [the Phase 2 checklist](todo-phase2.md). The screen previews explore layout and visible states. They do not implement booking or payment operations in the app.

## Review the screen groups

Open [the design gallery](design-phase2/index.html). Each group has two layout candidates, an EN and DE switch, and relevant state examples. The gallery's notes remain in this browser until exported. A saved preference is not step approval.

| Design group | Screens | Main task | Skill | Files owned by its worker |
| --- | --- | --- | --- | --- |
| Tour discovery | C08, C09, C10 | Compare tours, understand the experience, choose a departure and group | Impeccable | `design-phase2/discovery/` |
| Booking and status | C11, C12, C13, C16 | Review costs, pay the due amount, understand the booking and balance | Impeccable | `design-phase2/booking/` |
| Merchant operations | M05, M06, M07 | Find a departure, record each booking's service outcome, collect its balance | Evon UI/UX | `design-phase2/merchant/` |

The coordinator owns the gallery, shared preview styling and assets, this outline, progress records, and integration. Workers do not edit application code or shared translations. No worktree is used. At most three design tasks run concurrently.

## Follow the guest path

1. Open the Tour tab to C08. Compare the duration, starting price, and next departure.
2. Open C09. Read the itinerary, meeting point, inclusions, age-group prices, participation conditions, and policies.
3. Open C10 from the booking action. C10 is a bottom sheet over C09, like gift C03's "Your gift" sheet. Choose a fixed departure and participant counts, then continue to C11 with the sheet's "Review booking · CHF {total}" button.
4. Reuse C05 sign-in if needed. Keep the selection when sign-in returns to C11.
5. On C11, enter contact and participant information and review the amount due today, remaining balance, and deadline.
6. Submit the booking. For full payment or a deposit, create the hold and open C12. For pay later, confirm directly and open C13.
7. After the provider confirms payment during an active hold, open C13. Offer calendar download and the optional trip profile.
8. Find the booking in C14 and open C16 to see its departure, meeting point, status, payment history, and next action.
9. Pay a due balance through C12 without a new hold. After merchant completion, open C18 to review the tour.

Proposed app routes follow the UX spec with hash navigation. C08 uses `#/tours`, C09 uses `#/tours/{slug}`, C10 is the sheet on C09 at `#/tours/{slug}?book=true` (the older `#/tours/{slug}/book` redirects there), C11 uses `#/tours/{slug}/book/review`, and C16 uses `#/account/bookings/{id}`. Reload, Back from C11 and C11's edit action reopen the C10 sheet with the selection kept. Browser Back, the sheet's X and a swipe down close it and stay on C09. Confirm exact route filenames against the existing router during implementation. The standalone previews use query parameters, not these app routes.

## Follow the merchant path

1. Open M05 from Bookings or the M02 tour queue. Scan departures by date and time, seat counts, balances, and work needing attention.
2. Open M06 to see bookings for one departure. Keep booking status and payment status separate.
3. Open M07 for the full booking record, contact details, participants, referral source, money history, and activity.
4. After the tour ends, confirm service delivered for each booking that received it. Record no-show separately for absent guests.
5. If money is owed, use M08 to record an external payment or let the guest pay online.
6. Complete only a delivered, fully paid booking. Record commission once and enable the guest's tour review.

Owner and Manager can record payments, delivery, no-show, and completion. Payment adjustment remains Owner-only and arrives in Phase 3. A merchant-cancelled departure is not customer no-show. Cancellation and refund operations remain in Phase 3.

## Preserve the established visual system

Use the implemented warm ground, softened ink `#33312E`, white surfaces, Swiss-red action colour, and separate semantic status colours. Source Serif 4 names tours and places. Inter handles controls and merchant headings. Keep the existing mobile guest frame and merchant shell in the eventual app.

Inherit the approved gallery, centred detail title, seller row, and bottom-sheet choices from C03. Keep the cart's readable price and metadata hierarchy in C11. Use tinted Alerts and separate payment rows. Sticky action bars live in the screen's own flow and reserve only their actual space.

The preview controls and layout alternatives are review tools. They are not new customer-facing features. Existing component rules remain the authority over skill defaults, including card geometry and the light-only theme.

## Use explicit sample policies

The common sample booking is a Lucerne old-town walk on Friday 16 October 2026 at 10:00. Two adults at CHF 89 and one child at CHF 45 total CHF 223. A 30% deposit is CHF 66.90 and the remaining balance is CHF 156.10. The sample balance deadline is Thursday 15 October 2026.

These values illustrate the design. They are not approved tour prices, age bands, infant seat rules, availability, or payment deadlines. Each preview labels its sample assumptions. Do not infer production policy from an illustration.

| Policy question | Proposal for the later interactive demo |
| --- | --- |
| Age groups | Adults 16 and older, children 6 to 15, infants 0 to 5. Confirm these sample bands at review. |
| Seat usage | Adults and children each consume one seat. Infants are free and consume no seat in the sample. Show this rule before selection. |
| Capacity | Seed a departure with 12 seats, one sold out, and one with only the group's last seats available. |
| Payment | Include full payment, a 30% deposit, and pay-later tour policies. Snapshot the selected policy on booking creation. |
| Balance deadline | Use the shown sample date. Seed both automatic cancellation and grace-period policies for the overdue demo. |
| Participant fields | Require a contact name and phone. Demonstrate additional merchant-configured fields without silently making every field mandatory. |
| Reminder schedule | Keep R07's 3-day and 1-day reminders labelled as proposals. |
| No-show money | Preserve collected money and remaining debt. Leave refund and debt-waiver actions to the separately approved money rules. |

## Implement the booking model after design review

Keep the tour, departure, booking, and payment-attempt records separate. A booking snapshots participant counts, price, policy, referral source, and any hold deadline.

| Booking state | Allowed next result | Condition |
| --- | --- | --- |
| New full-payment or deposit booking | `pending_payment` | Capacity checked and seats held successfully. |
| `pending_payment` | `confirmed` | First payment succeeds while the hold is valid. |
| `pending_payment` | `expired` | The original 15-minute deadline passes without completed payment. |
| New pay-later booking | `confirmed` | Capacity checked and the tour policy allows booking without prepayment. |
| `confirmed` | `delivered` | The tour has ended and merchant confirms service delivery for this booking. |
| `delivered` | `completed` | Balance is zero. |
| `confirmed` | `no_show` | Merchant confirms the guest did not participate. |
| `confirmed` | `cancelled` | The tour's snapshotted overdue policy requires cancellation after any grace period. |

Initial holds and confirmed bookings consume capacity according to the tour's seat rules. Expiry or cancellation releases seats once. An expired booking stays expired if a provider result arrives later. Rebooking checks current price and capacity and creates a new record.

Show payment as a separate fact, including paid amount, amount still owed, deadline, processing, and reconciliation exception. Reload never extends a hold. Paying an existing balance never creates another hold. Repeated payment or completion results must not duplicate money or commission.

## Check the design before connecting behavior

- [ ] Review both layout candidates for each group and record the owner's selected layout.
- [ ] Check all ten required screen previews at 375px in EN and DE.
- [ ] Check merchant layouts at a desktop width as well as mobile.
- [ ] Check expired, processing, no-show, delivered-with-debt, and empty/error illustrations.
- [ ] Check visible control labels, keyboard focus, image loading, and horizontal overflow.
- [ ] Preserve the separation between sample design interactions and real app operations in the reports.

The later app verification remains step 2.15 of the Phase 2 checklist. Screenshots of these previews cannot prove concurrent reservations, payment-provider behavior, role enforcement, or commission calculation.
