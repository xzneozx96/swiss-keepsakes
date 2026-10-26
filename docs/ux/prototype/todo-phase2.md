# Phase 2 prototype checklist

Superseded on 26 October 2026 by PRD v3. Screens are tracked in docs/development-plan/screen-inventory.md, and work in docs/development-plan/delivery-plan.md (one story per screen slice). Kept for history.

Draft for owner review, 13 October 2026. Build the fixed-departure tour flow from discovery through booking, payment, attendance, and completion.

Design work started on 13 October 2026. The three independent screen-design tasks are complete and await owner review. Open the [design gallery](design-phase2/index.html), [tour-flow outline](flow-2-outline.md), and [design progress](design-phase2/progress.md). App implementation status below remains separate from design progress.

The owner requested direct React implementation on 13 October 2026. The standalone HTML drafts are reference material. React integration is in progress in `front-end/src/features/tours/`, using the existing project components. C09 now also includes the requested interactive 3D itinerary map. Track this work in [the React integration report](reports/react-integration.md).

There is enough documented context to plan this phase. Open merchant policies below remain demo assumptions until approved. This is a browser prototype with simulated payments, not a production booking service.

## Follow the review process

Work one step at a time, as in [the main checklist](todo.md). Build a step, check it in the browser at 375px in EN and DE, and stop for owner review. Revise that step before starting the next. Mark a step approved only after the owner's OK.

Status uses `[ ]` for not started, `[~]` for built and awaiting review, `[x]` for approved, and `[!]` for not approved with a follow-up below. Every item below is not started. This draft does not approve pending Phase 1 work.

Use the local Vite preview with `cd front-end && npm run dev` from the project root. Update the client Artifact only when requested.

## Use the current sources

- [Main prototype checklist](todo.md), Phase 2 scope and review rules.
- [Current PRD v2](../../PRD/Swiss_keepsakes_PRD.md), sections 6.3, 7.3, 9, 10, and acceptance criteria.
- [UX spec](../ux-spec-phase1.md), sections 2.2, 2.3, 4.3, 4.4, 5, 6, 7, and scenario S7.
- [Frontend conventions](../../../front-end/README.md) and [project design system](../design-system/project/README.md).
- [Gift-flow outline](flow-1-outline.md) for shared payment, sign-in, merchant, review, and partner-report behavior.

The prototype's Phase 2 is a delivery slice. The PRD's Phase 1 describes the wider pilot scope. Follow the current PRD and UX spec when older notes differ.

## Keep the phase bounded

Build C08, C09, C10, C11, the tour behavior of C12, C13, C16, M05, M06, and M07. Extend existing C05, C14, M02, M08, C18, and basic P02 only where the booking flow needs them.

Reuse the guest and merchant frames, gallery, quantity controls, confirmation dialog, money and date formatting, payment simulator, and status labels. Tour bookings use a direct booking flow rather than the gift cart.

Leave manual payment adjustment and cancellation/refund operations to Phase 3. Leave private-tour quote requests, tour editing/publishing, broader discovery content, and full reports to their existing later phases. Seed tour configuration for this phase.

## Build and review the steps in order

- [x] **2.0 Agree the tour-flow outline.** Draft built with the screen sequence, routes, booking transitions, seat accounting, mock policies, and verification cases. The linked design gallery contains C08, C09, C10, C11, C12, C13, C16, M05, M06, and M07 candidates plus the M02 tour queue. Owner review of layouts and sample policies is pending. Evidence is in `reports/2.0.md`. **Approved by the owner, 14 Oct 2026 (recorded in chat).**
- [x] **2.1 Add tour demo data and booking state.** Seed fixed departures, age-group prices, capacity, payment policies, and participant fields. Include full-payment, 30% deposit, and pay-later examples, plus sold-out and unpublished tours. Store booking-time prices, policy, referral source, and hold deadline. Reset restores the fixtures. Reload preserves active holds without extending them. Add controls only as their review step needs them. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.1.md](reports/2.1.md). **Round 1: not approved** (follow-up below). **Approved in round 2 (14 Oct).**
- [x] **2.2 Build C08 Tour list.** Show duration, starting price, and nearest available departure. Open C09 from a tour card. Show empty and coming-soon states. Make the existing Tour navigation reach this list. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.2.md](reports/2.2.md). Owner approved in round 1, 14 October 2026.
- [x] **2.3 Build C09 Tour detail.** Show the gallery, itinerary, inclusions, exclusions, meeting point, participation conditions, age-group prices, payment policy, and cancellation policy. Open C10 from the booking action. Explain when no departure is available. Reuse the approved gift-detail components where they fit. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.3.md](reports/2.3.md). Owner approved in round 1, 14 October 2026 (including the in-map stop card redesign).
- [x] **2.4 Build C10 Departure and participant selection.** (A bottom sheet on C09 since 2.4-r5.) Show dates, times, prices, and available seats. Add adult, child, and infant counters and explain which groups consume seats. Block sold-out departures and quantities above capacity. Keep the selection when the guest goes back. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.4.md](reports/2.4.md). **Round 1: not approved** (follow-up below). **Approved in round 4 (14 Oct).**
- [x] **2.5 Build C11 Review booking and reuse C05 sign-in.** Collect contact name, phone, and configured participant information. Show the departure, meeting point, group counts, total, amount due today, remaining balance, and due date. Preserve inputs through sign-in and validation. Recheck capacity before creating the booking. Do not start the hold merely by opening C10 or C11. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.5.md](reports/2.5.md). **Round 1: not approved** (follow-up below). **Approved in round 3 (14 Oct).**
- [x] **2.6 Extend C12 for the first tour payment.** Create a 15-minute hold when a booking requiring full payment or a deposit is successfully submitted. Show the remaining time and correct amount due. Simulate success, failure, and processing. Confirm only while the hold remains valid. Prevent duplicate submissions and charges. A failed attempt can retry within the original deadline. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.6.md](reports/2.6.md). Owner approved in round 1, 14 October 2026.
- [x] **2.7 Build expiry and late-payment paths.** Expire an unpaid hold, release its seats once, disable the old payment action, and offer a new booking through C10. Recheck current availability and price on rebooking. Reload does not reset the deadline. A late provider result never restores an expired booking. If money was received, show a separate reconciliation exception. Simulate session closure and distinguish the actual payment time from the result's arrival time. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.7.md](reports/2.7.md). **Round 1: not approved** (follow-up below). **Approved in round 2 (14 Oct).**
- [x] **2.8 Build C13 Booking confirmed.** Show the booking reference, departure, meeting point, participants, and separate booking and payment labels. Include Add to calendar and the optional trip profile. Confirm pay-later bookings without a card or a 15-minute timer. A deposit confirms the booking with the remaining balance still due. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.8.md](reports/2.8.md). **Round 1: not approved** (follow-up below). **Approved in round 3 (14 Oct).**
- [x] **2.9 Extend C14 and build C16 Guest booking detail.** List bookings alongside gift orders with separate status and payment labels. Show the booking timeline, contact action, meeting details, price and policy snapshots, and payment history. Cover held, expired, confirmed, delivered, completed, no-show, and overdue states. Pay an outstanding balance through C12 without creating another seat hold. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.9.md](reports/2.9.md). **Round 1: not approved** (follow-up below). **Approved in round 3 (14 Oct).**
- [x] **2.10 Build M05 Departure schedule and connect M02.** Show upcoming departures, confirmed seats against capacity, active holds separately, outstanding balances, and bookings needing reconciliation or attendance results. Open M06 for a departure. Use the same seat counts as the guest flow. Add tour work to the existing merchant Today view. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.10.md](reports/2.10.md). **Round 1: not approved** (follow-up below). **Approved in round 3 (14 Oct).**
- [x] **2.11 Build M06 Departure guest list.** Show each booking's group counts, contact details, and payment label. After the tour ends, allow Owner and Manager to record service delivered or no-show per booking. Require confirmation before recording results. Do not mark a whole departure completed merely because its time has passed. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.11.md](reports/2.11.md). **Round 1: not approved** (follow-up below). **Approved in round 2 (14 Oct).**
- [x] **2.12 Build M07 Merchant booking detail and reuse M08.** Show the guest, departure, participant information, referral source, price and policy snapshots, payments, commission eligibility, and activity history. Allow Owner and Manager to record an external payment with the existing balance and duplicate-payment checks. Keep payment adjustment and refunds for Phase 3. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.12.md](reports/2.12.md). **Round 1: not approved** (follow-up below). **Approved in round 2 (14 Oct).**
- [x] **2.13 Connect delivery, completion, commission, and C18 review.** Keep a delivered booking open while money is owed. Permit completion only after service delivery and full payment. Record commission once and show it in the existing basic P02 report. Open the guest's tour review only after completion. No-show never opens completion, commission, or review, even if the merchant retains payment. Preserve collected money and outstanding debt when recording no-show. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.13.md](reports/2.13.md). **Round 1: not approved** (follow-up below). **Approved in round 2 (14 Oct).**
- [x] **2.14 Add overdue-policy and notification demos.** Seed one tour policy that cancels and releases seats after its balance deadline and one that allows a grace period or merchant decision. Do not auto-charge a saved card. Demonstrate N07, N08, N09, N10, N11, N13, N15, and N22 in the existing simulated notification mechanism. N11 appears only after actual cancellation. Label unapproved reminder timing as a proposal. Built and verified by the Phase 2 resume; awaiting owner review. Report: [reports/2.14.md](reports/2.14.md). **Round 1: not approved** (follow-up below). **Approved in round 2 (14 Oct).**
- [x] **2.15 Check the complete flow and regressions.** Run the cases below at 375px in EN and DE. Check keyboard use, focus, validation, empty states, loading states, long German labels, refresh, and Reset. Run the frontend typecheck, lint, and production build. Recheck the gift flow where shared sign-in, payment, quantities, statuses, reviews, reports, or navigation changed. Record actual evidence in `reports/2.15.md`. Complete-flow check ran on 14 October 2026: 652/652 joined-up and 867/867 step-driver checks, tsc clean, build OK. Report: [reports/2.15.md](reports/2.15.md). **Round 1: not approved** (follow-up below). **Approved in round 2 (14 Oct).**
- [x] **2.16 Present the Phase 2 review gallery.** Collect screenshots of the built screens and critical exception states in `screens/phase2-review/index.html`. Link each item to its report. Let the owner record approval or a revision comment, following the Phase 1 gallery approach. Close Phase 2 only after the owner approves the steps and complete-flow check. Gallery built at [screens/phase2-review/index.html](screens/phase2-review/index.html) with 16 items; awaiting owner verdicts. Report: [reports/2.16.md](reports/2.16.md). **Done: four review rounds in the [review history](screens/phase2-review/index.html); every step approved by round 4 (14 Oct).**

For each built step, save a short report under `reports/2.N.md` with changes, screenshot paths, verification results, demo assumptions, and remaining issues. Use `[~]` until owner approval. These report, outline, and gallery files are planned outputs, not existing evidence.

## Review follow-ups ([review history](screens/phase2-review/index.html): round 1 [verdicts](screens/phase2-review/round1/verdicts.json), round 2 [verdicts](screens/phase2-review/round2/verdicts.json), round 3 [verdicts](screens/phase2-review/round3/verdicts.json), round 4 [verdicts](screens/phase2-review/round4/verdicts.json))

Round 1, 14 October 2026: approved 2.2, 2.3 with the 2.3-map stop card, and 2.6. The owner left the rest unreviewed and said to treat them as not approved: "there are many not reviewed items, treat them as not approved because the overall design is not good at all … we should reuse the styling of the shopping flow (as all related flows are now approved in design) as much as possible instead of creating new style to ensure consistency." Clarified: "reusing styling … is to reuse the ui style, not redesigning ux or adjusting the user flow". Each follow-up below is a visual restyle only, matched to the approved gift screen named.

- [x] 2.4-r2 C10 restyle, matching C03's option/date sheets and QuantityBox · worker R1 · report: reports/2.4-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · resolved by 2.4-r4/r5, approved in round 4
- [x] 2.5-r2 C11 restyle, matching C06 Review and send (1.7b) and C05 sign-in (1.6r) · worker R1 · report: reports/2.5-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · round 2: not approved, follow-up below · resolved by the round 3 follow-up, approved in round 3
- [x] 2.8-r2 C13 restyle, matching C07 Request sent (1.8r) · worker R1 · report: reports/2.8-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · round 2: not approved, follow-up below · resolved by the round 3 follow-up, approved in round 3
- [x] 2.7-r2 Expiry and late-payment states restyled, matching C15's deadline and after-cancellation states (1.13r/s/t) · worker R2 · report: reports/2.7-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · approved in round 2
- [x] 2.9-r2 C14 rows and C16 restyled, matching the account hub (1.12s) and C15 (1.13r/s/t) · worker R2 · report: reports/2.9-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · round 2: not approved, follow-up below · resolved by the round 3 follow-up, approved in round 3
- [x] 2.10-r2 M05 and the M02 tour work restyled, matching M03 tickets (1.10b/c) and the Overview widgets (1.9r/s/t) · worker R3 · report: reports/2.10-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · round 2: not approved, follow-up below · resolved by the round 3 follow-up, approved in round 3
- [x] 2.11-r2 M06 restyled, matching the M03 list cards · worker R3 · report: reports/2.11-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · approved in round 2
- [x] 2.12-r2 M07 and the tour M08 restyled, matching M04 (1.11r/s) and M08 (1.15r) · worker R3 · report: reports/2.12-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · approved in round 2
- [x] 2.13-r2 Completion, commission and the tour part of P02 restyled, matching M04 fulfilment (1.15r) and P02 (1.17r, 1.9t) · worker R3 · report: reports/2.13-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · approved in round 2
- [x] 2.14-r2 Merchant overdue states restyled, matching the M04 decision block · worker R3 · report: reports/2.14-r2.md · built, fix pass applied after [the gift-vs-tour comparison](reports/phase2-r2-comparison.md); in round 2 · approved in round 2
- [x] 2.1-r2 Data only, no visual change. Re-review together with the restyled screens. In round 2. · approved in round 2
- [x] 2.15-r2 Re-run the complete-flow check after the restyle. Done: 1,519 checks passed, 0 failed; tsc and build clean. Report: [reports/2.15-r2.md](reports/2.15-r2.md). · approved in round 2
- [x] 2.16-r2 Round 2 gallery in `screens/phase2-review/round2/`, then a coordinator comparison pass and fixes before you review. Built: round 2 has 12 items and 100 screenshots, each tour screen next to its gift reference. Open it from the [review history](screens/phase2-review/index.html). Reviewed 14 Oct.

### Round 2 follow-ups (14 October 2026)

Round 2 approved 2.1, 2.7, 2.11, 2.12, 2.13, 2.14 and 2.15. Item 2.4 was not reviewed and moves to round 3 unchanged.

- [x] 2.5-r3 C11 signed out. Owner: "just small adjustment on the 2 commented screens, others are very good". On both EN and DE signed-out shots: "the 'sign in to book' text block should be inside the footer along with the button, make the description text concise as well" · built, in round 3 · approved in round 3
- [x] 2.8-r3 C13. Owner: "except for the commented screen, all others are good". On C13: "pls add thumbnail image to the tour info block" · built, in round 3 · approved in round 3
- [x] 2.9-r3 C14 and C16. Owner: "overall styling is quite good but some screens are inconsistent with the flows from gift shopping". · built, in round 3 · approved in round 3
  - Gift C14 (an approved Phase 1 screen, changed at the owner's request): "1. no need border around the card from Coming up section, follow the existing pattern pls (use light box-shadow) 2. the past orders section should be wrapped into a light box-shadow white box, each item inside is good though"
  - Tour C14: "1. no need border around the card, follow the existing pattern pls (use light box-shadow) 2. why don't have Coming up and Past booking like on the Your Orders page? 3. why don't have price displayed for each item ?"
  - C16, on the balance, deadline and posted-review screens: "why don't have the tab-like style as on the order detail screens ?? pls double check and update"
- [x] 2.10-r3 M05. Owner: "except for my only comment, others are good". On M05: "pls add tour thumbnail" · built, in round 3 · approved in round 3
- [x] 2.11-r3 M06 outcome buttons (owner request in chat, 14 Oct, after approving 2.11): "make the 2 buttons here into a seperate section, similar to [the M07 Complete booking panel] => wrapped by a border-dashed box, each button take full screen width" · built, in round 3 · approved in round 3
- [x] 2.2-home Home screen Tours rail and search (owner, 14 Oct: "home screen not yet updated with tours ? still has coming soon label"). Root cause: the C01 Tours rail and the search Tours group still read the Phase 1 placeholder `tourTeasers` (fake tours with a hard-coded "Coming soon" badge) instead of the tour data. Fix: both now list the published tours from the tour data, with duration and "from" price, linking to the tour detail page; a sold-out tour shows "Sold out". The placeholder list and the unused "price on request" key are removed; stories keep "Coming soon" (Phase 4). Evidence: `reports/home-tours-drive.mjs`, 9/9 pass, screenshots in `screens/home-tours/`. Card switched to the shared `TourCard` (owner, 14 Oct); 11/11 pass. · approved in round 3
- [x] 2.16-r3 Round 3 gallery with 2.2-home, 2.4, 2.5, 2.8, 2.9, 2.10 and 2.11 · built in `screens/phase2-review/round3/` (9 items incl. fix-back and fix-c15, 81 screenshots); evidence [reports/2.15-r3.md](reports/2.15-r3.md) · approved in round 3

### Round 3 follow-ups (14 October 2026)

Round 3 approved 2.2-home, 2.5, 2.8, 2.9, 2.10, 2.11, fix-back and fix-c15. 2.4: "only 2 small adjustments, others are good".

- [x] 2.4-r4 Option tiles on C03 (gift, approved screen, changed at the owner's request) and C10. On C03: "the check icon can be placed absolute position on the top-right corner to avoid taking space of the main element, better use the icon with a circle wrapped around the check". On both: "in active state (when an option is selected, i don't like the background to turn red, can make the order [border] red instead" · built: grey fill kept, 2px red border, circled check centred on the top-right corner (owner follow-up in chat), C10 radio dot removed; in round 4 · approved in round 4
- [x] 2.17 Trip answers per order or booking (owner, 14 Oct, option 1 of three): the three optional trip questions are saved on the order or booking they were asked for, shown and edited on C15/C16, and the standalone account card goes. PRD §3, O13, AC20 and UX spec R09/§4.9 updated. · built: [reports/2.17.md](reports/2.17.md), 84/84; edits on C15 apply to that order only (orders carry no send id); in round 4 · approved in round 4
- [x] 2.4-r5 C10 becomes a bottom sheet on C09, like gift C03's "Your gift" sheet (owner in chat, 14 Oct: "switch and update related specs design (prd, ux design spec, todo...) to reflect this revision"). Why it was a page: the UX spec defined C10 as its own route before the gift flow moved to the C03 sheet, and it was never revisited. Update the UX spec §4.3 and route tree, flow-2-outline and decisions.tsv; the PRD only if it implies a page. · built: shared `ChoiceSheet` (C03 unchanged, AE 0), `?book=true` address, UX spec, outline and decisions row 371 updated; PRD unchanged (never names C10); 2.4-r5 driver 100/0; in round 4. Report: [reports/2.4-r2.md](reports/2.4-r2.md) Round 5. · approved in round 4

## Verify the important booking cases

| Case | Required result | Source |
| --- | --- | --- |
| Full payment within the hold | Confirm the booking and show paid in full. Completion still requires service delivery. | AC05, AC09 |
| Deposit within the hold | Confirm after collecting 30%. Show the remaining 70% and its deadline. | AC06, S7 |
| Pay later | Confirm without a card or initial hold timer. Show the unpaid amount and deadline. | AC07, S7 |
| Last available seats | Competing attempts cannot reserve more than capacity. The rejected attempt preserves the guest's inputs. | AC05 |
| Failed or processing payment | Retry failure only while the original hold is valid. Block another payment while processing. | C12, section 4.4 |
| Reload during a hold | Keep the original expiry time and release the seats when that deadline passes. | R06, S7 |
| Expiry and rebooking | Keep the old booking expired. Create a new booking only after checking current seats and price. | R06, S7 |
| Late or repeated provider result | Do not restore an expired booking, duplicate a booking, or count money twice. Show reconciliation if money arrived. | AC05, N22, S7 |
| Balance payment | Reduce the existing booking's debt without another 15-minute hold or seat reservation. | R06, section 4.4 |
| Overdue balance | Cancel and release seats only when the snapshotted tour policy requires it. Show grace or merchant-action cases separately. | R07, AC27 |
| Service delivered with debt | Show delivered and the outstanding balance. Keep completion, commission, and review locked. | AC09 |
| Fully paid without service delivery | Keep completion, commission, and review locked. | AC09 |
| Service delivered and fully paid | Complete once, record commission once, and enable the customer's tour review. | AC09, AC10, AC17 |
| No-show with retained payment | Keep no-show separate from money. Do not complete, create commission, open review, refund, or waive debt automatically. | O10, S7 |
| Merchant cancels the tour | Do not classify guests as no-show. Show a seeded cancellation state. Manual cancellation and refund operations arrive in Phase 3. | O10 |
| EN and DE | Preserve price, date, policy, and status. For missing merchant translations, show the complete available version with a language notice. | AC30, S11 |

The frontend has no backend. A simulated last-seat race or provider result proves prototype behavior only. Real concurrent reservations, provider session closure, and late-payment reconciliation require backend/provider verification before launch.

## Keep unresolved policies visible

These questions do not block reviewing this checklist. Step 2.0 presents concrete demo choices for approval before their dependent behavior is built.

| Open item | Treatment for this prototype |
| --- | --- |
| Age bands, infant seat usage, participant fields, and realistic tour content | Propose explicit sample values in the outline. Keep them per tour. Do not present them as approved merchant settings. |
| Balance due dates, grace periods, reminder timing, and cancellation conditions | Use labelled fixtures to demonstrate both cancellation and grace cases. R07's reminders 3 days and 1 day before the deadline remain proposals. |
| Booking cutoff and minimum group size | State the sample availability assumptions in the outline. Leave merchant configuration to the tour-management phase. |
| Rescheduling, weather cancellation, no-show charges, and debt waiver | Display sample policy text only. Do not invent operational money actions. Resolve these before the affected Phase 3 work or pilot launch. |
| Payment provider and late-payment reconciliation mechanism | Use the existing simulator. Keep provider validation as a launch dependency. |
| Pending Phase 1 approvals | Reuse the current shared implementation provisionally. Surface any unresolved dependency when its Phase 2 step is reviewed. |
