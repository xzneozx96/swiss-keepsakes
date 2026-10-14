# Flow 1 outline: gift request to payment

Step 1.0 in [todo.md](todo.md). Version 2, revised after a self-review and a second-opinion review against PRD v2 and UX spec Phase 1. Section 8 lists what changed from version 1 and what flow 1 deliberately leaves to later phases.

Sources:
- **PRD:** §5, §6.1–6.2, §7.2, §8, §8.1, §9.1–9.2, §10.1–10.3, §15
- **UX spec:** §1, §2.1, §2.3–2.5, §3.1–3.3, §4.1–4.2, §4.5–4.8, §5.1–5.3, §5.5, §6, §7, §8
- **Design system:** `docs/ux/design-system/project/`

## 1. The demo path

The prototype bar (section 4) switches roles. Each numbered step names the scenario or acceptance criterion it proves.

1. **Partner link (S1, AC11, AC24).** In the prototype bar, choose "Open via Guide Marco's QR", then "Open via Hotel am See's QR". This records both visits, as the `/r/{code}` links would, and with last-click Hotel am See wins. The guest lands on the **discovery home (C01)**, which shows the available categories. Nothing on screen says "referred by" (spec §4.1). The guest taps **Pocket knives** and gets the gifts list (C02) filtered to that category.
2. **Gift detail, knife (S1, AC04, AC26).** The guest opens the engraved pocket knife (C03), picks size M, and types "Anna" as the engraving with a character counter. They pick a pickup date: days before the earliest valid one are pale, with the reason "Needs 3 working days to engrave". They choose Shop Altstadt and add the knife to the cart. A fixed line reads: "This is the date you request. The seller confirms before you pay."
3. **Gift detail, gift box.** The guest adds the gift box, which uses a different date rule (calendar days, so weekends count), a 30% deposit and a different pickup date.
4. **Cart (AC28, R12).** C04 shows **Order 1** and **Order 2**, each explained: "Full payment after confirmation" or "30% deposit after confirmation", plus its own date and place.
5. **Sign in (AC01).** "Continue" opens the sign-in sheet (C05). Any 6-digit code works; `000000` shows the wrong-code error, and resend unlocks after 30 seconds. The code arrives in the Mail panel as N01. The guest returns to review (C06) with the cart unchanged.
6. **Review (AC25).** C06 shows, per order: items, the requested date and place, total, **the amount due after the seller confirms**, the payment deadline rule and the cancellation policy. The combined total is labelled "for reference". The guest taps **"Send request · no payment yet"**.
7. **Request sent (AC25, R03, R09).** C07 lists both orders as "Awaiting seller confirmation", with no response-time promise. It shows the optional trip profile (3 questions, skippable). Email N02 appears in the guest's mail.
8. **Merchant Today.** Switch to **Merchant · Manager**. M02 shows "2 requests awaiting confirmation" and the three numbers. Email N03 is in the staff mail.
9. **Change and accept, gift box (S2, AC26, R04).** The merchant opens the gift box order (M04). It shows the source "Hotel am See" (AC11). They change the pickup place to Pickup point Bahnhof, with a required note; the log reads "Pickup place changed from Shop Altstadt to Pickup point Bahnhof · note · Lukas · time". They accept: stock is shown per line, and the confirmation reads "You confirm you can prepare 1 item for pickup on 20.10.2026 at Pickup point Bahnhof. The guest will be asked to pay CHF 26.70 within 24 hours, by 14.10.2026, 10:30."
10. **Accept the knife (S2, AC05).** The merchant accepts the knife order (email N04).
11. **Guest pays the knife (S3, AC08).** Switch to **Guest**. C14 shows both orders. The gift box shows the new place and a free-cancel note (R04, a UX proposal). The guest opens the knife (C15): "Pay CHF 54.00 by 14.10.2026, 10:35. If it isn't paid by then, the order is cancelled automatically." "Pay" opens C12, the **simulated provider**. After success, C15 shows "Confirmed, being prepared · Paid in full". Emails N07 (receipt naming the shop as seller) and N21 (to staff) are sent.
12. **Guest pays the gift box deposit.** CHF 26.70. The label reads "Deposit paid · CHF 26.70 · CHF 62.30 left, due 24.10.2026".
13. **Handover with balance owed (S4, AC09).** Switch to **Merchant**. On the gift box, mark it Ready (email N12), then Handed over. **Complete** is locked with "CHF 62.30 still owed".
14. **Record payment and complete (S4, AC08, AC10, AC29).** "Record payment" opens M08: CHF 62.30, cash, the current demo time. The button reads "Record CHF 62.30 cash. Balance will be CHF 0.00." Recording the same amount again within 10 minutes shows the duplicate warning. The merchant completes the order. Commission changes from "Estimated" to "Recorded", once only. Who completed it and when is logged, and email N15 (review invite) is sent.
15. **Review (S4, AC17).** As **Guest**, the completed order shows "Write a review" (C18, 1–5 stars and text). The review appears on C03 marked "Verified purchase". Orders that aren't completed have no review button.
16. **Partner report (S5, AC12).** Switch to **Partner · Hotel am See**. P02 shows only this partner's transactions: reference, date, guest name, product, value, status and commission, with "Estimated, not recorded" rows marked. It shows no email, phone, engraving or pickup details, and none of Guide Marco's transactions.

**Side paths shown from seeded data or prototype actions:**

| Case | How it's shown | Proves |
| --- | --- | --- |
| Overdue first payment | "Expire this order's payment deadline" on an accepted, unpaid order. It becomes "Cancelled · payment overdue" (email N23 to guest and staff), stock is released and the old Pay button is gone. "Request again" puts the items back in the cart, so the guest picks a date and sends a new request through C06; nothing is sent automatically (spec §4.2). The other order from the same cart is unchanged. | S3, R05 |
| Late provider result | On C12, choose "Processing", then expire the deadline. The order stays cancelled, and the payment shows "Received after cancellation · awaiting reconciliation". The order is not restored. | S3, R05 |
| Pay-later gift | The chocolate set. Accepting it goes straight to "Confirmed, being prepared · Pay later · CHF 24.00, due …" (email N05). Stock is still reserved, and no payment request is created. | AC07 |
| Declined order | The merchant declines with a reason. The guest sees "Declined by seller" with the reason (email N06), and the other order is unaffected. | §2.1, N06 |
| Last item race | Two seeded requests both want the one limited-edition print. Accepting one works. Accepting the other stays "Awaiting confirmation", names the short line, and sends no payment request. | S2, AC05, O05 |
| Stock changed on send | "Make an item sell out", then send on C06. The error names the item and keeps everything entered. | C06, PRD §15 |
| Payment fails or is processing | On C12, "Fail" leads to retry (email N08). "Processing" shows "Payment processing" on C15, with no second Pay button. | §4.4 |
| Guest cancels before paying | "Cancel order" on an accepted, unpaid order opens a confirm dialog. The cancellation is free with no refund, because nothing was paid, and stock is released. | §2.1 |
| Ready and fully paid | One combined button: "Handed over and complete". | §2.1 |
| Missing translation | The limited-edition print exists only in English. In DE, its text and policy show in English with a language notice, while the UI, prices and dates stay German and Swiss-formatted. | AC30, R02 |

## 2. Screens and states

| Step | Screen | Content | States |
| --- | --- | --- | --- |
| 1.2 | C01 Discovery home | Hero ("Lucerne, a place you always want to return to", Lucerne photo), the available categories as tiles (Pocket knives, Gift boxes, Chocolate, Prints, Small gifts, and Tours marked "coming soon" until Phase 2). A tile opens C02 filtered to that category. | Category with no products available (tile hidden or "none available right now"); skeleton |
| 1.3 | C02 Gifts | Category filter rail (TagGroup, per its card), product cards (serif name, "from CHF", "Earliest pickup: Friday") | Empty category; skeleton |
| 1.4 | C03 Gift detail | Photo (gradient placeholder), story, variant, engraving + counter, quantity, pickup date (DatePicker with pale-day legend), pickup place with address and hours, payment, payment deadline and cancellation policy, reviews with "Verified purchase" and "Only guests who completed a purchase can review" | Out of stock; variant not sold; invalid date with reason; translation notice |
| 1.5 | C04 Cart | Orders grouped by payment policy, date and place (R12), each with policy text and subtotal | Empty cart; line with invalid date + earliest valid date suggested |
| 1.6 | C05 Sign-in sheet | Google (simulated), email → 6-digit code (InputOTP with label) | Wrong code; expired code; resend in 30 s; 5 attempts (UX proposal) |
| 1.7 | C06 Review and send | Per order: items, requested date/place, total, amount due after confirmation, payment deadline rule, cancellation policy; reference total | Stock changed on send (data kept) |
| 1.8 | C07 Request sent | Orders created, "Awaiting seller confirmation", what happens next, trip profile | Trip profile answered or skipped |
| 1.9 | M02 Today | Task cards in priority order, each linking to a filtered M03: awaiting confirmation, awaiting payment, to prepare, ready, overdue, handed over but owed. Three numbers: still to collect, commission to pay, completed this week. | No tasks |
| 1.10 | M03 Gift orders | 7 status tabs from spec §3.2 with counts, scrolling on phones (Tabs card). Phone: stacked rows. Desktop: Table. Each row has both labels, pickup date and place. | Empty tab |
| 1.11 | M04 Order detail | Decision block (accept with stock per line / change date or place with required note / decline with reason). Items and engraving, guest and contact (email shown as copyable text), source, payment history, commission (basis, rate at time of order, estimated or recorded), log, policy at time of order (AC15). | Stock short at accept |
| 1.12 | C14 My transactions | Stacked rows: product, amount, reference, date, progress label + payment label | No transactions |
| 1.13 | C15 Order detail | Timeline, both labels, action block (pay, cancel, contact shop with order reference as copyable text), confirmed date and place, payment history, policy at time of order | requested · accepted (payment due, auto-cancel warning) · accepted with changed place (R04 note) · preparing · ready · handed over with balance · completed (review) · declined · cancelled (overdue, by guest) · payment processing · payment received after cancellation |
| 1.14 | C12 Payment | Labelled **simulated payment provider**: seller (the shop), amount, order reference; Pay / Fail / Processing | Processing; failed with retry |
| 1.15 | M04 + M08 | Ready → Handed over → Complete (locked with reason), combined button when paid. M08 sheet: amount (defaults to balance), method (cash, bank transfer, other), time, note, consequence on the button | Duplicate warning (same amount within 10 min); amount above balance blocked |
| 1.16 | C18 Write a review | 1–5 stars, text, the product reviewed; review shows "Verified purchase" | Already reviewed |
| 1.17 | P02 Partner report | Period: day, week, month. Three numbers: commission after adjustments, actually paid, still to pay. Summary by product group. Transaction list. | No transactions |

**Every screen also gets:**
- the shared patterns from spec §5.5: skeleton on load, plain errors that keep input, empty states with one sentence and one action, money actions confirmed in a sheet
- status shown as tint plus icon plus words
- full keyboard use
- guest screens 375px first, centred column on desktop
- merchant screens 375px first, plus a two-column layout from 1024px
- the spec §1.3 copy rule: never "delivery"/"Lieferung", "guaranteed date" or "AI"; requested dates are called requests until the seller accepts

**Design-system cards to apply when first used:**
- Chip (status label spec)
- TagGroup (filter rail)
- Card (serif titles, prices)
- DatePicker and Calendar (legend, de-CH)
- Drawer (sheets, safe area, stacked footer)
- AlertDialog (cancel and decline)
- InputOTP
- Tabs
- Table (desktop) and stacked rows (phone)
- Alert (auto-cancel warning)
- Toast
- EmptyState
- Skeleton
- Link (underlined)

## 3. Notifications

Emails aren't sent. Each one appears in a **Mail** panel in the prototype bar, per recipient, in the recipient's language, with the content defined in spec §6:

| Email | Event |
| --- | --- |
| N01 | sign-in code |
| N02 | request received |
| N03 | new request (staff) |
| N04 | accepted, payment due, with the auto-cancel warning |
| N05 | accepted, pay later |
| N06 | declined |
| N07 | receipt (shop named as seller) |
| N08 | payment failed |
| N12 | ready for pickup |
| N15 | review invite |
| N21 | guest paid (staff) |
| N23 | auto-cancelled as overdue (guest and staff) |

## 4. Prototype bar

A slim bar outside the product UI, labelled "Prototype". It's never part of the designed screens. **Each control is added in the step that first needs it**, so step 1.1 stays small:

| Control | Added in |
| --- | --- |
| Role: Guest · Merchant Owner (Chị Ngọc) · Merchant Manager (Lukas) · Partner (Hotel am See). Stands in for staff and partner sign-in (M01, P01 are later phases). | 1.1 |
| Language EN \| DE | 1.1 |
| Reset demo (restores seed data, clock and sources) | 1.1 |
| Entry: "Open via Hotel am See QR", "Open via Guide Marco QR", "Open directly". A direct visit keeps a source still inside its 30 days (PRD §10.1); a demo with no source starts from Reset. | 1.2 |
| Mail panel | 1.6 |
| "Make an item sell out" | 1.7 |
| "Show proposals": marks every element based on an undecided **UX proposal** (e.g. "Handed over", R04 free cancel, 5 code attempts, R01 default language), as spec §7 requires | 1.6 (first proposal element) |
| "Expire this order's payment deadline" | 1.13 |

## 5. Mock data

- **Shop:** the seller on receipts (PRD §9.2). Its guest-facing name is set in one config value. The brand name is still open (O01), so "Swiss Keepsakes" is used for now. Owner is Chị Ngọc, Manager is Lukas.
- **Categories:** Pocket knives, Gift boxes, Chocolate, Prints, Small gifts. These feed the C02 filter rail and the P02 product-group summary.
- **Products:**

  | Product | Price | Payment | Preparation | Notes |
  | --- | --- | --- | --- | --- |
  | Kapellbrücke pocket knife | CHF 54.00 (S, M, L variants) | Full payment, due 24 hours after acceptance | 3 working days, Mon–Fri | Engraving up to 12 characters, included |
  | Lucerne gift box | CHF 89.00 | 30% deposit (CHF 26.70) due 24 hours after acceptance; balance CHF 62.30 due pickup + 4 days | 2 calendar days | |
  | Chocolate set | CHF 24.00 | Pay later, due pickup + 2 days | Next day | |
  | Limited-edition print | CHF 119.00 | Full payment | | Stock 1, English text only |
  | Keyring | CHF 12.00 | | | Out of stock |

  Mon–Fri rules don't skip public holidays (PRD §7.2), and all times are Europe/Zurich.
- **Demo dates:** knife pickup 21.10.2026, gift box pickup 20.10.2026. Preparation days count from the request date (D9); the seller re-checks the date when accepting. First payments are due 24 hours after acceptance (D8), so preparation time remains even if the guest pays at the last minute.
- **Commission:** 10% on knives and small gifts, 15% on the others. The rate is stored on each order line at the time of ordering.
- **Pickup places:** Shop Altstadt and Pickup point Bahnhof, each with a made-up address, opening hours and instructions.
- **People:** guest Anna Keller (EN); partners **Hotel am See** and **Guide Marco**.
- **Seeded orders from other guests:**
  - one awaiting confirmation
  - two competing for the last print
  - one with payment due
  - one being prepared
  - one ready with a balance owed
  - one completed
  - one cancelled as overdue

  Sources are mixed between Hotel am See, Guide Marco and direct, so P02 can show that a partner sees only their own transactions.
- **Seeded reviews:** two on the knife, marked "Verified purchase".
- **Order references:** `SK-1042`-style.
- **Demo clock:** starts at **13.10.2026 10:00 Europe/Zurich** and runs with real elapsed time, so log entries, payment times and the 10-minute duplicate check behave normally. "Expire this order's payment deadline" changes only that order's deadline. Reset returns the clock to the start.
- **Persistence:** the data lives in the browser and survives reloads; Reset restores the seed. If storage is blocked, the demo resets on reload.

## 6. Not in flow 1

These are left out on purpose:
- tours (Phase 2)
- payment adjustment (M09) and refunds (M10), Phase 3. M04 shows no adjust button yet.
- the rest of the discovery home from spec §4.1 (time-based blocks, featured tours, stories, trip-advice entry) and the other content pages (Phase 4). Flow 1 builds C01 with the hero and category tiles.
- partner email verification (P01) and the commission ledger with payouts (M16), Phase 5. P02 shows "paid CHF 0.00" until then.
- staff invites (M01) and admin (A01, A02), Phase 6
- the C23 trip-profile edit page (Phase 4)

Bottom navigation is Explore, Gifts, Tours and Account, with the cart in the header (spec §3.1). Items pointing to later phases show "Coming in a later step", so nothing looks broken.

## 7. Decisions

| # | Decision | Status |
| --- | --- | --- |
| D6 | The discovery home (C01) is built in flow 1 as the platform's home page: hero plus the available categories, each opening its list page. The other C01 blocks come in Phase 4. | Decided 13.10.2026 |
| D7 | Engraving: optional, free, up to 12 characters, included in the knife's 3 working days (PRD §7.2 open) | Decided 13.10.2026 |
| D8 | First payment due 24 hours after acceptance | Decided 13.10.2026 |
| D9 | Preparation days count from the request date; the seller re-checks at acceptance | Decided 13.10.2026 |

## 8. Coverage check

**Covered in flow 1:**

| Requirement | Where |
| --- | --- |
| AC01 browse without an account, sign in to buy | Steps 1–5 |
| AC04 per-product date rules | Steps 2–3, C04 invalid-line state |
| AC05 stock held only at acceptance, last-item race, released on cancel | Steps 9–10, side paths |
| AC07 pay later | Side path "pay-later gift" |
| AC08 balance, payment history, duplicate warning | Steps 11–14 |
| AC09 complete locked while money is owed | Step 13 |
| AC10 commission recorded once, who and when logged, review opens | Step 14 |
| AC11 last-click within 30 days, source locked at order time, shown on M04 | Steps 1, 9 |
| AC15 price and policy as at order time | C15 and M04 "policy at time of order" |
| AC17 review only after completion | Step 15 |
| AC25 request without payment, no response time | Steps 6–7 |
| AC26 pickup place chosen, merchant changes it with a note | Steps 2, 9 |
| AC28 two orders visible before sending | Step 4 |
| AC29 Manager records payment and completes | Step 14 |
| AC30 EN/DE, missing translation notice (guest side) | Every screen, side path "missing translation" |
| S2, S4 | Fully: steps 9–15 and side paths |
| R03, R04 (proposal), R05, R09, R12 | Steps 7, 11, side path "overdue", step 7, step 4 |
| N01–N08, N12, N15, N21, N23 | Mail panel |
| Spec §5.5 shared patterns, §7 proposals marked | Section 2 footer, "Show proposals" |

**Partly covered, finished in a later phase:**

| Requirement | In flow 1 | Missing, and where it lands |
| --- | --- | --- |
| S1, AC24 | Partner entry landing on C01, categories, two orders, sign-in, request without payment | The other C01 content blocks: time-based blocks, tours, stories, trip advice (Phase 4) |
| S3 | Separate payments, auto-cancel, late provider result not restoring the order | Reconciliation detail beyond a status line (needs the provider decision; spec §2.2) |
| S5, AC12, AC13 | Partner sees only their own transactions, guest name only | Code entry P01; Owner/Manager recording payouts in M16 (both Phase 5) |
| AC11 | Last-click A→B, source locked | The 30-day expiry case (Phase 5, with M15/M16) |
| AC29 | Manager records payment and completes | Owner-only adjustment (M09, Phase 3) |
| AC30 | Guest side | Merchant publishing in one language (M11–M13, Phase 4) |

**What changed from version 1:**
- Partner entry with last-click and the source shown on M04.
- Mail panel for notifications.
- Side paths added: pay-later, decline, guest cancel, last-item race, late provider result and missing translation.
- Combined "Handed over and complete" button.
- C18 (review) moved into flow 1, with seeded reviews.
- "Show proposals" toggle.
- 7 order tabs, a receipt naming the shop as seller, and copyable contact details.
- Per-product deadlines that leave room for preparation.
- Product categories.
- A demo clock that runs with real time.
- "Request again" returns the items to the cart instead of auto-sending.
- Prototype controls are built step by step, and coverage claims are split into covered and partial.
