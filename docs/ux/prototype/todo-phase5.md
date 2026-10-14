# Phase 5 prototype checklist

Draft for owner review, 14 October 2026. Build partners and reports: the merchant's partner list and partner detail with the commission ledger, the partner's email-code access, the full partner report, the merchant reports, and the cost data behind contribution margin.

The owner started Phase 5 on 14 October 2026. Phase 4 is in progress in parallel, and Phase 3 (money operations) is still deferred.

## Follow the review process

Work one step at a time, as in [the main checklist](todo.md). Build a step, check it in the browser at 375px in EN and DE, and stop for owner review. Revise that step before starting the next. Mark a step approved only after the owner's OK.

Status uses `[ ]` for not started, `[~]` for built and awaiting review, `[x]` for approved, and `[!]` for not approved with a follow-up below. Update the status here as soon as a step changes state, and add a one-line note with its report link.

Use the local Vite preview with `cd front-end && npm run dev` from the project root. Update the client Artifact only when requested.

## Use the current sources

- [Main prototype checklist](todo.md), Phase 5 scope and review rules.
- [UX spec](../ux-spec-phase1.md), sections 2.4, 3.2, 3.3, 4.1, 4.8, 4.13, 5.2 (M15, M16, M21, M24), 5.3 (P01, P02), 6 (N19), and scenarios S5, S9, S12.
- [Current PRD v2](../../PRD/Swiss_Stories_and_Gifts_PRD_v2.md), sections 10 and 13, and acceptance criteria AC11, AC12, AC13.
- [Frontend conventions](../../../front-end/README.md) and [project design system](../design-system/project/README.md).

## Keep the phase bounded

Build M15, M16, P01, the rest of P02, M21, and M24. Replace the `partners` and `reports` placeholders in `/store/$section`, and put P01 in front of the existing `/partner` report.

Leave refund operations (M10) to Phase 3. The commission ledger still has to show an overpayment after a refund (AC13), so seed one refunded transaction instead of building the refund flow. Leave M22 settings and A01/A02 to Phase 6.

## Reuse, do not reinvent

Every step builds from screens that are already approved. Do not create a new card, list row, sheet, chart, or form pattern when one of these fits:

| Need | Reuse |
| --- | --- |
| Merchant lists (M15) | M03 order list cards (1.10b/c) |
| Merchant detail with key facts (M16, M24) | M04 detail and its standalone key-fact cards (1.11r/s), M07 (2.12) |
| Record an amount with method and date (M16 payout, M24 cost) | M08 Record payment sheet (1.15r) and its tour version (2.12) |
| Confirm before a destructive action (revoke link) | The shared confirmation dialog (1.5b) |
| Email code entry (P01) | C05 sign-in, email-code step (1.6r), and the simulated mailbox for N19 |
| Dashboards, KPI cards, charts (P02, M21) | P02 (1.17r, 1.9t) and the M02 Overview analytics (1.9s/t): one card per KPI, Recharts, round arrow buttons |
| QR code (M16) | `qrcode.react` (already installed for the prototype sheet): `QRCodeSVG` on screen, `QRCodeCanvas` for the PNG download |
| Status labels, money and dates | The existing label, money, and date helpers |

Cite only approved screens. From Phase 2, 2.12 (M07) and 2.13 (P02 tour part) are approved; 2.4, 2.5, 2.8, 2.9, and 2.10 are not, so they are not references.

Skill rule: evon for every Phase 5 screen, since they are dashboard, analytics, and merchant screens. As in Phase 1, skip evon's brief and wireframe gates: do the audit and brief, build the recommended plan, and write the brief into the step report. Chart bars, funnel bars, and data meters use the Overview's red chart palette (owner, 14 October 2026); UI progress bars stay ink (D1). P01 follows C05, so it is checked against impeccable as C05 was.

## Build and review the steps in order

- [x] **5.0 Agree the Phase 5 outline.** Write `flow-5-outline.md` with screens, routes, mock data, click paths, the reuse map above per screen, and verification cases. Owner approves before 5.1. [flow-5-outline.md](flow-5-outline.md) approved by the owner on 14 October 2026 with D1–D13 as proposed.
- [x] **5.1 Add partner and report demo data.** Approved 14 October 2026: [reports/5.1.md](reports/5.1.md). Funnel and behaviour events move to 5.10, where they are first used; link opens are built here for M15. Seed per partner: link opens over 60 days (some outside the 30-day window), commission entries in every state from spec §2.4, payouts, and one refunded transaction that leaves an overpayment, its offsets, and a carry-over into the next period. Seed funnel and behaviour events with one period of partial tracking coverage. Seed cost lines: complete, missing, and confirmed zero. Add a third partner so M15 has substance, and revoke that partner's report link, not Hotel am See's (the prototype Partner role). Phase 4 is seeding data at the same time: re-read the demo store, `upgrade.ts`, and `i18n/en.ts`/`de.ts` just before writing. Keep the demo version unchanged and fill new collections from the seed on load, as Phase 4 does (outline D12).
- [x] **5.2 Build M15 Partners.** Approved 14 October 2026 (revision 2; desktop screenshots still to add). First version built 14 October 2026 ([reports/5.2.md](reports/5.2.md)). *Revision 2 built, awaiting review (desktop screenshots pending):* the owner asked for partner management on M15. Partners tab: search, filters (All, To pay, Report link revoked, Archived), "Add partner" sheet (name, type, email, referral code), a QR sheet per partner (download PNG, copy link), archive or delete (D17). Analytics tab (D18): link opens, transactions, conversion and commission to pay, opens per day by partner, and a per-partner comparison. Reuse the Overview KPI cards and chart, the M08 sheet, and the shared confirmation dialog. List partners with kind, link opens in the last 30 days (called opens, never scans), transaction count, and amount still owed after offsets. Open M16 from a row. Match the M03 list cards.
- [x] **5.3 Build M16 Partner detail.** Approved 14 October 2026: [reports/5.3.md](reports/5.3.md). Show the downloadable QR (PNG, printable), the referral link to copy, the private report link, and the registered email. Show the commission ledger: transactions with commission state, payouts, refund adjustments, each offset, and the amount still to offset. Match M04 key-fact cards and the M04/M07 history sections.
- [x] **5.4 Add the M16 payout sheet.** Approved 14 October 2026: [reports/5.3.md](reports/5.3.md). "Record as paid" opens a sheet with the amount (defaulting to what is still owed after offsets), method, date, and reconciliation note; it saves who recorded it. Owner and Manager can both record. An offset never counts as new money paid. Reuse the M08 sheet.
- [x] **5.5 Add revoking the report link in M16.** Approved 14 October 2026: [reports/5.3.md](reports/5.3.md). Owner only, with the shared confirmation dialog. Manager does not see the action. A revoked link stops opening P02 (checked in 5.6).
- [x] **5.6 Build P01 Partner access.** Approved 14 October 2026: [reports/5.3.md](reports/5.3.md) (P01 checks listed there). `/partner/{reportToken}` shows the shop name and the partially hidden email, sends a 6-digit code (N19 in the simulated mailbox), and opens P02 on the right code. Show the wrong-code and revoked-link states. A forwarded link alone does not open the report. The prototype sheet's Partner role goes through P01. Reuse the C05 email-code step.
- [x] **5.7 Complete P02 Partner report.** Approved 14 October 2026: [reports/5.7.md](reports/5.7.md). Fill "Actually paid" from M16 payouts. When there is an overpayment, show "Offset" and "Still to offset" with their history, including amounts carried from an earlier period. Add the per-transaction list: reference, order date, guest name, product, value, status, and commission, with "Estimated, not recorded" on open ones. Show no contact details, engraving, or notes (AC12). Extend the approved 1.17r/1.9t layout; do not redesign it.
- [x] **5.8 Build M24 Cost data.** Approved 14 October 2026: [reports/5.8.md](reports/5.8.md). Per transaction: cost of goods, packaging, payment fee, delivery, and other variable costs. Each line is "actual" or "missing"; a cost that does not apply is confirmed as 0, and an empty field never means 0. No default or estimated costs. Match M04 key-fact cards and the M08 sheet.
- [x] **5.9 Build M21 Reports: filters and money summary.** Approved 14 October 2026: [reports/5.9.md](reports/5.9.md). Filters for period, partner or source type, guest group, goods or tours, and product. Separate summary cards for transaction value, collected, outstanding, refunds, and commission, never added into one revenue figure. Goods and tours shown separately. Match the M02 Overview KPI cards.
- [x] **5.10 Add M21 funnel, sources, and guest groups.** Approved 14 October 2026: [reports/5.9.md](reports/5.9.md). Funnel from link opened → viewed → booking started → request or booking sent → paid → completed, with rates and drop-off per step. Conversion by source. The four guest groups plus "Not determined". Show tracking coverage where events are missing instead of filling in zeros. Funnel bars and coverage meters in ink. Reuse the M02 and P02 chart patterns.
- [x] **5.11 Add M21 products and operations.** Approved 14 October 2026: [reports/5.9.md](reports/5.9.md). Best-selling products, SKUs, and tours; stock and seats; delivered, no-show, and cancelled bookings; content, CTA, and widget performance. Reuse the P02 by-group bars. The content part uses the article and advice-question IDs seeded in Phase 4 step 4.1 and waits for it; it does not add a second content seed.
- [x] **5.12 Add M21 contribution margin.** Approved 14 October 2026: [reports/5.9.md](reports/5.9.md). Show margin only for transactions with complete actual costs. Otherwise show "Not enough data to calculate margin" with the missing items and a link to M24. Summaries state their data completeness, with an ink meter, and never present a partial margin as the whole period's.
- [x] **5.13 Connect the merchant navigation.** Approved 14 October 2026: [reports/5.9.md](reports/5.9.md). Partners and Reports open M15 and M21 from the merchant shell, replacing the placeholders. M02 has no partner or report cards today, so add only an "Open reports" link from the Overview analytics to M21, opening on the same period.
- [x] **5.14 Check the complete flow and regressions.** Done 14 October 2026: [reports/5.14.md](reports/5.14.md). Phase 5 driver 102/102 EN and 134/134 DE; 2.15 guest, merchant and checks and the gift pass all pass; typecheck, lint and build clean. Run AC11, AC12, AC13, and scenarios S5, S12, and the commission part of S9 at 375px in EN and DE. Check keyboard use, focus, validation, empty states, long German labels, refresh, and Reset. Check that M15, M16, P02, and M21 show the same numbers for the same partner and period. Run the frontend typecheck, lint, and production build. Recheck the gift and tour flows and the existing P02.
- [x] **5.15 Present the Phase 5 review gallery.** Approved 14 October 2026 (round 2). [screens/phase5-review/index.html](screens/phase5-review/index.html). Round 1 (8 items, 44 screenshots): 7 approved; 1 comment, M15's Partners / Analytics switch to underline tabs, fixed and approved in round 2 ([reports/5.2.md](reports/5.2.md), Revision 1). Collect screenshots in `screens/phase5-review/index.html`, link each item to its report, and let the owner approve or comment, as in Phases 1 and 2.

For each built step, save a short report under `reports/5.N.md` with changes, the reused components, screenshot paths, verification results, demo assumptions, and remaining issues.

## Open questions

| # | Question | Default until you decide |
| --- | --- | --- |
| Q1 | Who can enter and correct cost data in M24 (spec O14 open) | Owner and Manager, with who and when saved |
| Q2 | Revenue formula for contribution margin (spec O14 open) | Collected amount minus refunds, excluding tax; shown as a demo assumption |
| Q3 | The refund that creates the overpayment is seeded, because M10 is in Phase 3 | Seeded, labelled as demo data |
| Q4 | Does the prototype sheet's Partner role ask for the P01 code every time | Per spec R10: once, then the session lasts 30 days on that browser |
| Q5 | Revoking a report link is Owner only (spec R10 is a proposal, not decided) | Owner only |
