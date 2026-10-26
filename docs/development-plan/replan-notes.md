---
id: replan-notes-storytelling-pivot
status: draft
created: 2026-10-26
sources: PRD v3, docs/specs/001-storytelling-pivot (architecture, data model), ADR-001 to ADR-028, docs/development-plan/screen-inventory.md, status.json
---
# Delivery plan re-cut: notes

This file records what changed in `docs/development-plan/delivery-plan.md` when PRD v3 replaced the old plan. The plan is the source of truth for the Lark task list. These notes hold what the plan cannot: the retired ids, the old-to-new map, the screen coverage table, the judgment calls, and the questions for the owner.

Accepted ADRs used: ADR-001 to ADR-028, cited from `docs/adr/INDEX.md`. None is overturned. No ADR "Applies to" list matches the two files edited here, so the ADR files were not opened one by one.

## What changed

- E0, E1 and E2 keep every row whose status in `status.json` is Done, Verified or Blocked, with the same id and text. One row got the suffix "Superseded by PRD v3": E0.3, the seat-hold spike.
- E2.5, E2.6, E2.7 and E2.9 are rewritten under the same ids. E2.5 and E2.6 are the content schema and the content module, and E2.7 is media with PDFs. E2.9 is Fly staging for the real app only (gate H3: the demo stays on Vercel until launch), and E9.10 hands the demo over at launch.
- Old E3 to E7 (43 stories, all Backlog) are retired. New epics E3 to E9 replace them: 87 new stories. The plan has 120 stories and 10 epics.
- The sprint map has 21 rows (0 to 20). Sprints 0 to 3 are unchanged. Both tracks run side by side from Sprint 7.

## Retired ids and the old-to-new map

Delete these 43 tasks from Lark before the first live sync (see "Lark gaps"). The new ids E3.1 to E7.7 reuse the same strings with different meaning, so a live sync would patch an old task in place and keep its Status and comments.

| Old id | Old title | New id or ids |
|---|---|---|
| E3.1 | Cart submit | E6.7, E7.1, E7.2 |
| E3.2 | Merchant order screens M02, M03 and M04 on the API | E7.3, E7.4, E7.22 |
| E3.3 | Accept with stock holds, variants locked in ID order | E7.4, E6.3 |
| E3.4 | First-payment deadline job and the sweeper | E7.11 |
| E3.5 | External payments | E7.5 |
| E3.6 | Ready, handover and completion | E7.6 |
| E3.7 | Cancel and refund for orders paid outside the app (M10), per line and partial | E7.12 |
| E3.8 | Reviews | E5.4, E5.5 |
| E3.9 | Guest order screens C14 and C15 on the API. The order demo seed and its mock code are... | E7.7 |
| E3.10 | S1 to S4 and S6 as one staging suite | E7.25 |
| E4.1 | Bookings and the seat hold | None. Booking is hidden (ADR-012) |
| E4.2 | Pay-later bookings | None. Pay-later is out (O28) |
| E4.3 | Money module | E7.8 |
| E4.4 | Payment Element on C11 and C12. Server confirmation with a ConfirmationToken, refused... | E7.9 (the booking part is retired) |
| E4.5 | Stripe webhooks | E7.10 |
| E4.6 | Hold expiry | E7.10 (the hold part is retired) |
| E4.7 | Balance payment and reminders | None. Balance payments are out |
| E4.8 | Online refunds (M10) through Stripe Refunds | E7.13 |
| E4.9 | Departure screens M05 and M06. Service results, no-show, completion | None. Departures are hidden |
| E4.10 | Online payment for accepted keepsake orders | E7.9 |
| E4.11 | Provider sync and the nightly reconcile, with alerts | E7.10 |
| E4.12 | Store payment account in M22. The pilot store's restricted key, the `charges_enabled`... | E9.5 (the pilot account part) |
| E4.13 | S7 and S9 on staging with the TWINT and card test flows, and the k6 hold test | E7.25 (the booking part is retired) |
| E5.1 | Partners M15 and M16. QR and link, `/r/{code}` records a visit and attributes later... | E8.2, E8.3 |
| E5.2 | Commission | E8.4 |
| E5.3 | Partner access P01 and report P02. Token link, emailed code (N19), session cookie | E8.5 |
| E5.4 | Partner payouts recorded in M16 by Owner or Manager | E8.6 |
| E5.5 | Partner screens on the API. The partner demo seed and its mock code are deleted | E8.5, E8.6 |
| E6.1 | Articles | E4.3, E4.4 |
| E6.2 | Comments on articles, sign-in required | E5.3, E5.4 |
| E6.3 | Trip advice C21 with the M19 question set, and private-tour requests C22 and M20. N16... | E4.15, E4.16 (private tours retired) |
| E6.4 | Reports M21 and cost data M24 as SQL views | E8.8 to E8.10, E8.13 |
| E6.5 | Plausible, the consent banner, GA4 after consent | E8.7 (Plausible and GA4 are rejected, ADR-007) |
| E6.6 | Ledger CSV export for the accountant (Q11) | None. Dropped for Phase 1 (decision P1) |
| E6.7 | Guest data export and account deletion | None. Dropped for Phase 1 (decision P1) |
| E6.8 | S10 to S12 as one staging suite | E4.17 |
| E7.1 | Production | E9.1 |
| E7.2 | Restore drill | E9.2 |
| E7.3 | Runbooks in `docs/ops/` reviewed against architecture section 13 | E9.3 |
| E7.4 | Security | E9.4 |
| E7.5 | Live Stripe keys on the pilot account, TWINT live check, legal notice | E9.5 |
| E7.6 | Data inventory and the lawyer's confirmation | E9.6 |
| E7.7 | Full S1 to S12 run on production settings, then the first real order with the owner... | E9.9 |

Considered and left unmarked: E1.3 (its booking half is dormant under ADR-012, its order half is live) and E0.1 (its spike text mentions a booking hold, but SP1 is a finished proof). E0.6 and E0.7 are Blocked in `status.json` with no decision named in the plan. E2.9 still depends on E0.7. See "Still open".

## Coverage table

The key is the route file for rows of table 1 of the inventory, and the N-id for rows of table 2. Screen ids repeat across rows (M11, M12, M13, M17, C12 and C21 each sit on more than one row), so an id cannot be the key. All 39 Redesign rows, all 22 New rows and all 13 Hide rows appear once.

| Key | Screen id | Verdict | Story |
|---|---|---|---|
| `__root.tsx` | none | Redesign | E3.2 |
| `_guest.tsx` | none | Redesign | E3.5 |
| `_guest/index.tsx` | C01 | Redesign | E4.13 |
| `_guest/stories/index.tsx` | C19 | Redesign | E4.4 |
| `_guest/stories/$slug.tsx` | C20 | Redesign | E4.4 |
| `_guest/tours/index.tsx` | C08 | Redesign | E4.12 |
| `_guest/tours/$slug.tsx` | C09 | Redesign | E4.12 |
| `_guest/gifts/index.tsx` | C02 | Redesign | E6.4 |
| `_guest/gifts/$slug.tsx` | C03 | Redesign | E6.4 |
| `_guest/cart.tsx` | C04 | Redesign | E6.7 |
| `_guest/cart_.review.tsx` | C06 | Redesign | E7.2 |
| `_guest/cart_.sent.tsx` | C07 | Redesign | E7.1 |
| `_guest/account_.orders.$orderId.tsx` | C15 | Redesign | E7.7 |
| `_guest/account_.orders.$orderId_.pay.tsx` | C12 | Redesign | E7.9 |
| `_guest/plan.tsx` | C21 | Redesign | E4.15 |
| `_guest/search.tsx` | none | Redesign | E4.14 |
| `invitation.tsx` | M01 | Redesign | E8.1 |
| `r.$code.tsx` | none | Redesign | E3.7 |
| `partner/index.tsx` | P01 | Redesign | E8.5 |
| `store.tsx` | none | Redesign | E4.1 |
| `store/index.tsx` | M02 | Redesign | E7.22 |
| `store/calendar.tsx` | M27 | Redesign | E7.23 |
| `store/orders/index.tsx` | M03 | Redesign | E7.3 |
| `store/orders/$orderId.tsx` | M04 | Redesign | E7.4 |
| `store/products/index.tsx` | M11 | Redesign | E6.1 |
| `store/products/gifts/new.tsx` | M12 | Redesign | E6.1 |
| `store/products/gifts/$productId.tsx` | M12 | Redesign | E6.1 |
| `store/products/tours/index.tsx` | M11 | Redesign | E4.9 |
| `store/products/tours/new.tsx` | M13 | Redesign | E4.9 |
| `store/products/tours/$tourId.tsx` | M13 | Redesign | E4.9 |
| `store/content/index.tsx` | M17 | Redesign | E4.3 |
| `store/content/articles/$articleId.tsx` | M17 | Redesign | E4.3 |
| `store/content/comments.tsx` | M18 | Redesign | E5.4 |
| `store/content/reviews.tsx` | M23 | Redesign | E5.4 |
| `store/content/analytics.tsx` | none | Redesign | E8.8 |
| `store/partners/index.tsx` | M15 | Redesign | E8.2 |
| `store/partners/$partnerId.tsx` | M16 | Redesign | E8.2 |
| `store/reports/sales.tsx` | none | Redesign | E8.10 |
| `store/reports/guests.tsx` | none | Redesign | E8.11 |
| N01 | N01 | New | E4.5 |
| N02 | N02 | New | E4.6 |
| N03 | N03 | New | E4.7 |
| N04 | N04 | New | E4.8 |
| N05 | N05 | New | E5.2 |
| N06 | N06 | New | E7.20 |
| N07 | N07 | New | E7.16 |
| N08 | N08 | New | E7.16 |
| N09 | N09 | New | E7.17 |
| N10 | N10 | New | E7.14 |
| N11 | N11 | New | E7.14 |
| N12 | N12 | New | E7.19 |
| N13 | N13 | New | E6.3 |
| N14 | N14 | New | E6.2 |
| N15 | N15 | New | E6.2 |
| N16 | N16 | New | E4.2 |
| N17 | N17 | New | E4.2 |
| N18 | N18 | New | E4.11 |
| N19 | N19 | New | E4.10 |
| N20 | N20 | New | E8.8 |
| N21 | N21 | New | E8.9 |
| N22 | N22 | New | E3.6 |
| `_guest/tours/$slug_.book.tsx` | C10 | Hide | E3.1 |
| `_guest/tours/$slug_.book_.review.tsx` | C11 | Hide | E3.1 |
| `_guest/tours/private-tour.tsx` | C22 | Hide | E3.1 |
| `_guest/tours/private-tour_.sent.tsx` | C22 | Hide | E3.1 |
| `_guest/account_.bookings.$bookingId.tsx` | C16 | Hide | E3.1 |
| `_guest/account_.bookings.$bookingId_.pay.tsx` | C12 | Hide | E3.1 |
| `_guest/account_.bookings.$bookingId_.confirmed.tsx` | C13 | Hide | E3.1 |
| `store/bookings.tsx` | none | Hide | E3.1 |
| `store/bookings/index.tsx` | M05 | Hide | E3.1 |
| `store/bookings/$bookingId.tsx` | M07 | Hide | E3.1 |
| `store/bookings/departures/$departureId.tsx` | M06 | Hide | E3.1 |
| `store/products/categories.tsx` | M26 | Hide | E3.1 |
| `store/requests/private.tsx` | M20 | Hide | E3.1 |

## Keep rows

A Keep row needs no story unless the inventory names a change. These rows name one, or move a kept screen off the demo store. The six rows marked "(added)" are not in the inventory. They follow from the rule that no feature reads both the demo store and the API.

| Route file | Change named in the inventory | Story |
|---|---|---|
| `_guest/account.tsx` | Strip the booking list and the booking import | E3.1 |
| `store/sales.tsx` | Strip tour figures | E3.1 |
| `store/partners/analytics.tsx` | Strip tour partners | E3.1 |
| `store/reports/index.tsx` | Strip booking money (E3.1). Reads real orders in E8.13 | E3.1 |
| `store/requests/index.tsx` | Drop the private-tour tab (E3.1). Moves to the API in E4.16 | E3.1 |
| `sign-in.tsx` | `takeGoogleReturn` goes with hash history | E3.4 |
| `store/$section.tsx` | Preparation time added when O22 is decided | E7.21 |
| `_guest/tours.tsx` | Moves under `/$lang` with its children | E3.5 |
| `_guest/plan_.sent.tsx` | Sent notice copy (AC34) | E4.15 |
| `partner/$token.tsx` | Strip tour lines | E8.5 |
| `store/requests/advice/$requestId.tsx` | Moves to the API (added) | E4.16 |
| `store/requests/questions.tsx` | Moves to the API (added) | E4.16 |
| `store/requests/analytics.tsx` | Moves to the API (added) | E4.16 |
| `store/products/pickup.tsx` | Moves to the API (added) | E6.6 |
| `store/reports/margin.tsx` | Reads real orders (added) | E8.13 |
| `store/reports/costs.tsx` | Reads real orders (added) | E8.13 |

## Judgment calls

- **Vertical slices, with one exception.** E2.5 to E2.7 are backend foundations with no screen. The architecture spine says no server-rendered page ships before its content comes from the database, and the brief fixed these three ids. Every story from E3 on delivers a screen, its API and its tables.
- **Where server rendering turns on.** E3 moves the framework and every route starts `ssr:false`. Server rendering turns on inside the content stories (E4.4, E4.8, E4.12, E4.13, E6.4), so AC61 is proved there. Otherwise E3 would depend on track 1 work, and "tracks after E3" would not hold.
- **Narrower blocks.** The inventory says O26 blocks C03, N14 and N15, and O41 blocks C04 and C06. The plan blocks only what the missing answer stops: the Victorinox data (E6.5) and the cart without sign-in (E6.8). O22 blocks the handover picker and auto-accept, not checkout. Approved as decision M2.
- **Kept rows and the AC and ADR rule.** Kept E0 to E2 rows cite no AC or ADR, and the brief says to keep their text. The check for "at least one AC, one ADR and the story tag" runs on the rewritten and new rows only.
- **Footing.** Points are guesses. The 87 new stories hold about 343 points, and the E2 rewrites hold 20 more. No story has 8 points.
- **Small consistency fix.** The old text said staging exists "in Sprint 3" while E2.9 sat in Sprint 4. Section 1 now says Sprint 4.
- **Epic names.** E2 keeps its name, "Identity, catalogue and staging", because the Lark Epic option is matched by name. The name is now a little loose, since the catalog moved to E6.
- **Mail and screen ids.** The inventory's N01 to N22 are screens. The older UX spec's N01 to N24 are mails, and rows E2.2, E2.3, E2.4 and E2.8 cite them. The plan says so in section 1 and section 4.

## Lark gaps

These need an edit to `lark.json` or `sync-lark.mjs`. Both are outside the scope of this task, so nothing was changed.

1. **Id reuse.** `sync-lark.mjs` matches a Lark task by the id at the start of its summary. Live sync would patch old E3.1 to E7.7 in place. Old E4.12, E7.5 and E7.6 are Blocked and would stay Blocked. Delete the 43 old tasks first.
2. **Epic options.** `lark.json` holds the old Epic names for E3 to E7 and has no E8 or E9. `select(state, "Epic", label)` returns an undefined option for them. Rename the Lark options (the guids stay) and add two.
3. **Sprint sections.** `lark.json` has sections 0 to 17. The plan has 0 to 20, so the sync creates 18 to 20. The sync never renames a section, so sections 4 to 17 keep their old titles.
4. **Blocked detection.** On create, the sync sets Blocked only when the text matches `Blocked by Q\d+`. New rows say `Blocked by O23`, so they would be created as Backlog. Change the pattern to `[QO]\d+`. Nineteen rows say "Blocked by": E4.6, E4.7, E4.13, E5.5, E6.5, E6.8, E7.20, E7.21, E7.24, E8.3, E8.8 to E8.12 and E9.5 to E9.8.
5. **`status.json`.** It still lists old E3 to E7 entries. Only a pull from Lark rewrites it. Until then trace treats the old Blocked entries of E4.12, E7.5 and E7.6 as the new rows' status.

## Decisions

The owner answered on 2026-10-26. Each answer is applied in the plan.

| Id | Question | Answer | Applied in |
|---|---|---|---|
| R1 | Review rules (O25) | Build E5.2 and E5.3 with the PRD defaults: one review per guest per place, 1 to 5 stars, the guest edits or deletes their own review, display name is first name plus an initial. O25 leaves section 6 | E5.2, E5.3 |
| H3 | Demo hosting (amends H2) | The demo stays on Vercel static hosting until launch. Fly staging hosts only the real app. A demo hand-over or retirement step is added to E9 | E2.9, E9.10 |
| P1 | Old E6.6 (ledger CSV for the accountant) and old E6.7 (guest data export and account deletion) | Dropped for Phase 1. No new story carries them. They return as new stories if the owner reopens them, and O33 and O14 apply when they do | Retired list |
| L1 | Old Lark tasks | The 43 old E3 to E7 tasks are deleted, then the new ones are created. The retired list above is the deletion list | Retired list |
| M1 | Split the `0014_orders` migration | Approved: carts in E6.7, orders in E7.1, handovers in E7.14 | E6.7, E7.1, E7.14 |
| M2 | Narrow blockers | Approved: O26 blocks only E6.5, O41 only E6.8, O22 only E7.20 and E7.21 | Section 6 |
| M3 | Stories beyond the inventory | Approved: E4.16, E6.6 and E8.13 | Those rows |
| M4 | Placeholder guest-cancel story | Keep E7.24 as a Blocked placeholder for O36 | E7.24 |
| S4 | Order of sprints 4 to 6 (asked 26.10.2026: should the Start move come first?) | Move first. Sprint 4: E3.1 to E3.4 with E2.5 in parallel. Sprint 5: E3.5, E3.7, E2.6, E2.9 and E3.8, so staging is set up once on Start with both programs. Sprint 6: E2.7, E3.6, E3.9, E4.1. Staging now exists from Sprint 5 | Section 1, section 5 |
| S5 | Hosting (asked 26.10.2026: can Next.js remove Fly? It can't, because the pg-boss worker needs a long-running process) | Develop on the local stack first and decide hosting later, as O43. E2.9 moves to Sprint 12 and E3.8 to Sprint 13, both Blocked by O43. E3.9 checks the move on the local stack. E9.1 now depends on E3.8. Fly in ADR-001 stays the default until O43 is answered | Sections 1, 4, 5, 6 and 7 |

## Still open

Nothing in the plan names why E0.6 and E0.7 are Blocked in `status.json`. E2.9 depends on E0.7. The owner or the orchestrator should name the reason, or move E0.7 to Done if SP7 is finished.

## Verification

Run on 2026-10-26.

- `node docs/development-plan/sync-lark.mjs --parse` prints 10 epics, 21 sprints, 119 stories (High 58, Medium 53, Low 8).
- `node scripts/trace.mjs docs/development-plan/delivery-plan.md` exits 0.
- A standalone Node script (not committed, it copies the parser's regexes and imports no repo script) checks: every story in exactly one sprint, points in 1, 2, 3 or 5, every dependency in the same or an earlier sprint, no cross-epic range, every new or rewritten row cites an active AC, an ADR and its own `[E<n>.<n>]` tag, and the coverage table against the inventory. Result: 119 stories, 39 Redesign, 22 New and 13 Hide rows, 74 mapped, 0 uncovered, 0 extra, 0 duplicates.
- A diff of the E0 to E2 rows against `HEAD` shows changes only in E0.3 (suffix) and in the rewritten E2.5, E2.6, E2.7 and E2.9.

Not verified: the points and the sprint map (guesses), that the inventory's "Keep" rows need no further change, the content of each ADR beyond its index line, and a live Lark sync (`--dry-run` ran and wrote nothing).
