# Flow 5 outline: partners and reports

Step 5.0 in [the Phase 5 checklist](todo-phase5.md). Approved by the owner on 14 October 2026, with decisions D1–D13 in section 7 as proposed. D14–D16 were added during step 5.1, D17–D18 during the 5.2 revision.

Sources:
- **PRD v2:** §10, §13, AC11, AC12, AC13
- **UX spec:** §2.4 (commission states, O08 basis and offset), §3.2, §3.3, §4.1, §4.8, §4.13, §5.2 (M15, M16, M21, M24), §5.3 (P01, P02), §6 (N19), R10, R14, R15, scenarios S5, S9 (commission part), S12
- **Frontend conventions:** [front-end/README.md](../../../front-end/README.md) and [the design system](../design-system/project/README.md)

Phase 5 builds on approved screens, so it has no design gallery. Each screen names the approved screen it must match (section 2). Every screen uses evon, without the brief and wireframe gates; P01 is also checked against impeccable, as C05 was. Progress, funnel and coverage bars are ink, not red.

## 1. The demo path

The prototype bar switches roles. Each step names the acceptance criterion or scenario it proves. The demo starts from Reset, in EN.

**Merchant** (switch to **Merchant · Owner**)

1. **Partners (M15, step 5.2).** Partners lists three partners: Hotel am See, Guide Marco and Guide Sophie. Each card shows the kind, "link opens, last 30 days" (never "scans"), transaction count and "still to pay". Hotel am See shows "CHF 0.00 to pay" with a "CHF 11.10 to offset" chip, never a negative amount. Guide Marco shows CHF 49.60 to pay. Guide Sophie shows CHF 5.85 to pay and "Report link revoked". The figures are worked out in section 4.
2. **Partner detail (M16, step 5.3).** The Owner opens Hotel am See. The key-fact cards show commission earned after adjustments, actually paid, still to pay after offsets, and still to offset. Below: the QR code with "Download PNG", the referral link with Copy, the private report link with Copy, and the registered email. The commission ledger lists, newest first: transactions with their commission state (estimated, recorded, not applicable, adjusted for refund), payouts, the seeded refund adjustment, and each offset against a later recorded commission.
3. **Record a payout (M16, step 5.4).** On Hotel am See, "Record as paid" shows "Nothing to pay: CHF 11.10 is still to be offset". The Owner opens Guide Marco instead. The M08-style sheet's amount defaults to CHF 49.60, what is still owed after offsets. The Owner picks method and date, adds a reference, and saves. The ledger shows the payout with who recorded it, Guide Marco's recorded October commissions turn "Paid", and still to pay becomes CHF 0.00. An offset is never listed as money paid (AC13, S5).
4. **Manager can pay, cannot revoke (steps 5.4, 5.5).** Switch to **Merchant · Store Manager**. The Manager records CHF 5.85 on Guide Sophie. The "Revoke report link" action is not shown.
5. **Revoke and reissue (M16, step 5.5).** Back as Owner, on Guide Marco: "Revoke report link" opens the shared confirmation dialog. After revoking, the old link shows as revoked and "Issue new link" creates a new one (R10).

**Partner** (switch to **Partner**, which opens Hotel am See's report link)

6. **Access (P01, step 5.6).** The partner link shows the shop name and "g***@hotel-am-see.example". "Send code" puts N19 in the Mail panel. A wrong code shows an inline error with the attempts left. The right code opens P02 (AC12, S5).
7. **Report (P02, step 5.7).** The approved P02 layout now fills "Actually paid" from the M16 payouts. It shows the CHF 150.80 paid on 5 October for September, the −35.70 refund adjustment of 7 October, the offsets of 5.40 and 5.85, and CHF 11.10 still to offset, carried forward. It never shows a negative amount to pay (section 4). The transaction list shows reference, order date, guest name, products, value, status and commission; open transactions say "Estimated, not recorded". It shows no email, phone, engraving or notes, and no transaction of another partner (AC12, AC13, R15).
8. **Revoked link (P01).** Opening Guide Marco's old link from step 5 shows "This link is no longer valid. Ask the shop for a new one." The new link works.

**Reports** (switch back to **Merchant · Owner**)

9. **Money summary (M21, step 5.9).** Reports opens M21. Filters: period, partner or source type, guest group, goods or tours, product. Separate cards show transaction value, collected, outstanding, refunds and commission, each for goods and tours. They are never added into one revenue figure (S12).
10. **Funnel, sources and groups (M21, step 5.10).** The funnel runs link opened → viewed → booking started → request or booking sent → paid → completed, with the rate and drop-off at each step. Conversion by source (each partner, direct). The four guest groups plus "Not determined". The week with partial tracking shows its coverage ("Tracking data for 62% of visits") instead of a lower count.
11. **Products and operations (M21, step 5.11).** Best-selling products and SKUs, tours, stock and seats, delivered, no-show and cancelled bookings, and article, CTA and advice-widget performance.
12. **Contribution margin (M21 and M24, steps 5.8, 5.12).** Margin shows only for transactions with every actual cost entered. The period summary says "Margin for 14 of 19 transactions; 5 are missing costs" with an ink coverage meter and a link to M24. In M24, the Owner opens a transaction missing its packaging cost, enters it, and confirms delivery as "Not applicable (0)". M21 now includes that transaction (R14, S12).

**Side paths shown from seeded data or prototype actions:**

| Case | How it's shown | Proves |
| --- | --- | --- |
| No transactions in a period | P02 and M21 on a period with none show the existing empty state. | §5.3 |
| Code expired or too many attempts | The partner enters five wrong codes, or waits 10 minutes (the prototype sheet's clock controls are hidden for the client demo). P01 asks for a new code. | R10 |
| Forwarded link | A link opened in a fresh browser asks for the code. Opening the link alone never shows the report. | AC12 |
| Session kept | After the code, reopening the link on the same browser opens P02 directly for 30 days. | R10 |
| Overpayment larger than the next commission | The CHF 22.35 overpayment is larger than the October commissions recorded after it (5.40 and 5.85), so CHF 11.10 carries forward. Completing the SK-T1049 tour booking (35.70) then offsets 11.10 and leaves 24.60 owed, with the booking partly paid. | AC13 |
| Payout amount above what is owed | The sheet warns and requires a note, but allows it, since the merchant may have paid in advance. | §4.8 |
| Empty cost field | M24 shows "Missing" for an empty field, never 0. | R14 |
| Refresh | Refreshing any screen keeps the saved data and the P02 session. | §5.5 |

## 2. Screens and states

| Step | Screen | Content | States | Matches |
| --- | --- | --- | --- | --- |
| 5.2 | M15 Partners | Partner cards: name, kind, opens in 30 days, transactions, still to pay or overpayment chip | Empty; link revoked | M03 list cards (1.10b/c) |
| 5.3 | M16 Partner detail | Key-fact cards, QR with PNG download, referral link, report link, email, commission ledger | No transactions yet; overpayment; link revoked | M04 key-fact cards and history (1.11r/s), M07 (2.12) |
| 5.4 | M16 payout sheet | Amount (default: still to pay after offsets), method, date, reference, recorded by | Amount above owed (warning); nothing owed (Hotel am See) | M08 sheet (1.15r) |
| 5.5 | M16 revoke | Confirmation dialog, then "Issue new link" | Revoked; Manager (hidden) | Shared confirmation dialog (1.5b) |
| 5.6 | P01 Partner access | Shop name, masked email, send code, 6-digit code | Wrong code; expired code; too many attempts; link revoked | C05 email-code step (1.6r) |
| 5.7 | P02 Partner report | Approved layout plus actual payouts, offset, still to offset, offset history with carry-over | No transactions; no payouts; overpayment | P02 (1.17r, 1.9t), unchanged where approved |
| 5.8 | M24 Cost data | Transactions with cost completeness; per transaction: goods, packaging, payment fee, delivery, other; each actual, missing or not applicable (0) | All complete; missing; confirmed zero | M04 key-fact cards, M08 sheet |
| 5.9 | M21 summary | Filters; value, collected, outstanding, refunds, commission, goods and tours apart | No data in the filter | M02 Overview KPI cards (1.9s/t) |
| 5.10 | M21 funnel and sources | Funnel with rates and drop-off; conversion by source; guest groups | Partial tracking coverage | M02 funnel widget and P02 chart |
| 5.11 | M21 products and operations | Products, SKUs, tours, stock, seats, outcomes, content performance | No content data yet | P02 by-group bars |
| 5.12 | M21 margin | Margin where costs are complete; coverage meter; missing-cost list linking to M24 | No complete transactions | M02 KPI cards, ink meter |

## 3. Routes

| Route | Screen | Note |
| --- | --- | --- |
| `#/store/partners` | M15 | Replaces the placeholder. |
| `#/store/partners/{id}` | M16 | The payout sheet and revoke dialog open on top; no routes of their own. |
| `#/store/reports` | M21 | Replaces the placeholder. Filters live in search params, so a refresh or a shared link keeps them. |
| `#/store/reports/costs` | M24 list | Spec §3.2 puts costs under Reports. |
| `#/store/reports/costs/{transactionId}` | M24 transaction | Orders and bookings share one id space here, prefixed `o-` or `b-`. |
| `#/partner/{token}` | P01, then P02 | P01 until the code is verified on this browser, then P02 at the same URL. Period and date stay in search params, as today. |
| `#/partner` | Redirect | Goes to Hotel am See's current report link, so the prototype bar's Partner role keeps working. |

`routes/partner.tsx` becomes `partner/index.tsx` (the redirect) and `partner/$token.tsx` (P01 and P02). The `navigate({ from: "/partner" })` call and the empty-state link at `partner-report.tsx:558` move to the new route.

`partners` and `reports` leave the `$section` list; only `settings` stays there. The folder layout follows `store/orders/` and `store/bookings/`.

## 4. Mock data and model changes

Step 5.1 adds the seeds. Phase 4 is seeding at the same time, so step 5.1 re-reads `demo/types.ts`, `demo/seed.ts`, `demo/upgrade.ts` and `i18n/en.ts`/`de.ts` just before writing.

| Data | Change | Why |
| --- | --- | --- |
| Partners | Move from the static `partners` export in `partners/seed` into demo data, then delete the export. Six files import it: the partner shell, the prototype bar, `referral.ts`, the P02 report hook, M04's detail hook and M07's booking page. Add `email`, `reportToken`, and `revokedTokens`. | M16 revokes and reissues links, so the token must be editable |
| Payouts (new) | Partner, amount, method, date, reference, recorded by (role and name), recorded at | M16, P02, AC13 |
| Commission adjustments (new) | Partner, transaction, line, amount (negative), reason `refund`, at. Phase 3's M10 will write the same records. | The overpayment needs a refund; M10 is not built yet |
| Offsets | Computed, not stored: each overpayment is applied, oldest first, to the next recorded commission of the same partner. The ledger shows each application as its own entry. | O08 offset rule, one source of truth |
| Paid per transaction | Computed, not stored: money paid covers recorded commission, net of refunds, oldest first. A transaction is "Paid" when fully covered, "Partly paid" when partly. | P02 rows and the M16 ledger need a per-transaction state; payouts are lump sums (D13) |
| Commission state | Add `adjusted` to `CommissionState` for a transaction with a refund adjustment. Basis and rate stay as booked. "Paid" is not a stored state; it comes from the rule above. | §2.4 |
| P02 session (new) | Partner id, token, verified at; valid 30 days on this browser. The pending code with its sent-at time and attempts. | R10 |
| Funnel and behaviour events (new) | Built like `DEMO_HISTORY`: a fixed-seed history of link opens, views, booking starts, CTA and widget clicks, never written to demo data. Live link opens come from `referralVisits`, and live orders and bookings from demo data. One week is marked as partial tracking. | M21 funnel and coverage, S12 |
| Cost entries (new) | Per transaction and cost type: amount, or `not-applicable`, entered by and at. An absent entry means missing. | M24, R14 |

**Keeping stored state.** As Flow 4 D5: partners, payouts, adjustments, cost entries and the P02 session are all new collections, filled from the seed on load through `upgrade.ts`. `DEMO_VERSION` stays the same, so nobody's demo state is wiped. New fixture orders appear after Reset.

**One shared set of orders (D14).** Partner screens, M21 and the M02 Overview read the same transactions: the generated history since 11 August plus the demo orders and bookings. M02 and P02 already combined them this way (1.9t), so no approved figure changes in step 5.1. P02 gains the payouts, the refund adjustment and the offsets in step 5.7. Guide Sophie's two orders are the only new orders in demo data.

**Seeds (step 5.1, built).**
- **Partners.** Hotel am See (hotel) and Guide Marco (guide) as before, plus Guide Sophie (guide) whose report link is already revoked. Emails use `.example` domains.
- **Link opens.** 63 days of generated opens per partner (Hotel am See about 5 a day, Guide Marco 4, Guide Sophie 1.5), never stored, plus the opens made in the demo. The 30-day count excludes the older ones.
- **Commission.** From the shared orders: estimated (open), recorded, not applicable (declined or cancelled history orders) and adjusted for refund. Paid or partly paid comes from D13.
- **Payouts.** Monthly settlements: on 4 September for August and on 5 October for September. Each pays the commission recorded by then on transactions made in that month, so P02 (grouped by order date) shows the month as paid.
- **Refund.** On 7 October, Hotel am See's largest September order (SK-H094, a print) is refunded in full: CHF 238.00, commission −35.70. September's commission was already paid on 5 October.

**Worked numbers (CHF, demo clock 13.10.2026 10:00), from `reports/5.1-selfcheck.ts`.**

| Partner | Earned after refunds | Paid | Offset | Still to pay | Still to offset | Estimated (open) |
| --- | --- | --- | --- | --- | --- | --- |
| Hotel am See | 189.10 | 200.20 | 11.25 | 0.00 | 11.10 | 79.30 |
| Guide Marco | 174.20 | 124.60 | 0.00 | 49.60 | 0.00 | 31.20 |
| Guide Sophie | 17.70 | 11.85 | 0.00 | 5.85 | 0.00 | 0.00 |

Hotel am See's ledger: the 5 October payout settles September in full (150.80, equal to P02's September commission). By 7 October, 13.35 of October commission is owed. The refund removes 35.70, so 22.35 becomes an overpayment. October's next recorded commissions offset it: 5.40 on SK-1017 (12 October) and 5.85 on SK-H154 (13 October). CHF 11.10 carries forward.

- **Costs.** 135 completed transactions with cost data. Five of the most recent miss one cost each; delivery is confirmed not applicable everywhere (pickup only). Invented rates: goods 42% of the line value, packaging CHF 2.50 per gift order, provider fee 2.9% + CHF 0.30 per online payment, the guide at 30% of a tour.
- **Content events.** Use the article and advice-question ids from Phase 4 step 4.1. Step 5.11's content part waits for 4.1.

## 5. Notifications

| Mail | Recipient | Content | Language |
| --- | --- | --- | --- |
| N19 Partner report code | The partner's registered email | The 6-digit code, valid 10 minutes, and the shop name | The interface language at the time it was sent (D9) |

The type already exists in `MailTemplate`; step 5.6 adds the template to the Mail panel.

## 6. Not in Phase 5

- Refund, cancellation and payment adjustment flows (M09, M10): Phase 3. The one refund is seeded (D3).
- Sending payouts through a provider: payouts are recorded, not made, in the app.
- M22 settings, team and payout account; A01 and A02: Phase 6.
- Partner self-service (editing their own email, downloading their own QR).
- Export of reports to CSV or PDF.
- Real tracking or consent banners; the coverage figures are seeded.

## 7. Decisions

| # | Decision | Proposed |
| --- | --- | --- |
| D1 | Third partner | Guide Sophie (invented), report link revoked |
| D2 | Offsets | Computed from the ledger, oldest overpayment first; shown as ledger entries, never as payouts |
| D3 | The refund behind the overpayment (Q3) | Seeded as a commission adjustment, labelled as demo data; M10 writes the same record in Phase 3 |
| D4 | Partner session (Q4) | Per spec R10: code valid 10 minutes, 5 attempts, session kept 30 days on that browser |
| D5 | Who revokes a report link (Q5) | Owner only, with "Issue new link" after revoking (R10) |
| D6 | Payout above what is owed | Allowed with a warning and a required note |
| D7 | Who enters costs (Q1) | Owner and Manager; who and when is saved |
| D8 | Margin revenue (Q2) | Collected minus refunds, excluding tax; marked as a demo assumption until O14 is decided |
| D9 | N19 language | The interface language when the code is sent; partners have no stored language |
| D10 | M21 periods | The Overview's 7 days, 30 days and this month, so M21 and M02 agree; no custom date range |
| D11 | Funnel source | Seeded history plus live demo actions; seeded history never enters demo data, as with `DEMO_HISTORY` |
| D12 | `DEMO_VERSION` | Unchanged, as Flow 4 D5: new collections are filled from the seed on load |
| D13 | Paid per transaction | Money paid covers recorded commission, net of refunds, oldest first; an offset only moves overpaid money, so it adds nothing. "Paid" or "Partly paid" is computed |
| D14 | Which orders count | One shared set: the generated history and the demo orders, for partner screens, M21 and M02 alike (owner, 14 October 2026) |
| D15 | History orders in M04 | Openable, so ledger and report rows can link to any order, including the refunded SK-H094 (owner, 14 October 2026). M04 does not show the refund until Phase 3. |
| D17 | Removing a partner (5.2 revision) | Archive: the QR link stops crediting new visits, the report link stops working, the ledger stays and money owed can still be paid. A true delete only for a partner with no link opens and no transactions (owner, 14 October 2026) |
| D18 | Partner analytics (5.2 revision) | A separate Analytics tab on M15, beside the Partners tab (owner, 14 October 2026) |
| D16 | P02 period with a refund larger than its commission | Show recorded commission and the refund adjustment as separate lines, never a negative earned figure (owner, 14 October 2026; built in 5.7) |

## 8. Coverage check

Step 5.14 runs each case at 375px in EN and DE. It also runs the typecheck, lint and production build, and rechecks the gift and tour flows and the approved P02.

| Criterion | Demo steps | Verification case |
| --- | --- | --- |
| AC11 | 1, 10 | Unchanged: last-click source within 30 days, locked at order time. M15 counts opens in the last 30 days only. |
| AC12 | 6, 7, 8 | The link needs the emailed code. P02 shows only this partner's transactions and guest names, no contact details, engraving or notes. A revoked link does not open. |
| AC13 | 2, 3, 7 | Payouts keep amount, date, method, reference and who recorded them. The refund overpayment offsets the next recorded commission, carries over what is left, and shows "still to pay after offsets". |
| S5 | 3, 4, 6, 7 | Owner and Manager both record payouts; the partner sees them in P02. |
| S9 (commission) | 2, 7, 9 | The refund lowers commission on the refunded line only, keeps the rate at booking, and keeps the payout history. |
| S12 | 9, 10, 12 | Goods and tours apart; value and collected apart; "link opens", never "scans"; margin only with complete costs; confirmed 0 differs from missing. |
| Same numbers | 1, 2, 7, 9 | For this month, the one period M21 (7d/30d/month) and P02 (day/week/month) share, M15, M16, P02 and M21 show the same commission, paid and still-to-pay figures, matching the worked numbers in section 4. |
| General | All | Keyboard and focus, inline validation, empty states, long German labels, refresh, Reset. |
