---
id: screen-inventory-storytelling-pivot
status: draft
created: 2026-10-26
sources: PRD v3 (approved), docs/specs/001-storytelling-pivot, ADR-001 to ADR-030, docs/decisions/2026-10-26-partner-handover.md, docs/decisions/2026-10-27-map-pins-and-events.md, docs/decisions/2026-10-28-onboarding-full-screen.md
---
# Screen inventory for the storytelling pivot

This file lists every route file of the app and every new screen that PRD v3 needs. Each existing route gets a verdict: Keep, Hide, or Redesign. Each new screen gets a proposed route. The UX checklist and the delivery plan derive from it.

Every screen also belongs to one feature slice (S0 to S12). A slice follows one feature from the guest screen through the merchant and partner screens that serve it, so a feature can be designed and built as a unit. The slice index comes first, then the two tables grouped by slice, then the detail areas.

Review page: https://claude.ai/artifact/PZrVtEWF73EoQw5tMCMK1V (private; source docs/development-plan/screen-inventory.html, regenerate from this file).

It chooses no visual design. The owner has no reference images (O23 closed, 27.10.2026): pins and the map use the default style of the map stack. Where a row says "layout", it means content blocks and order, not look.

Amended on 28.10.2026: every screen has a slice id (S0 to S12) and a UI work value (Design, Edit, Wire, None). Tables 1 and 2 are grouped by slice and a slice index was added. No verdict changed. The same day the onboarding decision (`docs/decisions/2026-10-28-onboarding-full-screen.md`) made N01 the full-screen flow and added N24, the small prompt for deep links.

Amended on 27.10.2026 for the map pins, local events and categories decision (owner gate G11): N03 and N17 change, N04 and N05 are removed, and N23 is new.

Accepted ADRs used: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030. ADR-002, 003, 005, 006, 008, 011, 013, 014, 015 and 018 are amended by the 27.10.2026 decision, and ADR-029 and 030 are new. None is overturned. Owner answers and orchestrator rulings of 2026-10-26 that settle the open questions are in "Decisions" (D1 to D6). No question is open.

## How to read the verdicts

- **Keep.** The screen stays. It gets only removals (booking, tour prices, categories), copy, or a move under `/$lang`.
- **Hide.** The route leaves the build and the code goes to `front-end/src/dormant/` (ADR-012). No link, no path.
- **Redesign.** The layout, the flow, or the data of the screen changes in a way a user notices.
- **New.** No route or screen exists today.

**UI work** (column 2 of tables 1 and 2) says how much interface design a screen needs. It applies to Redesign and New rows. Keep and Hide rows are "None".

- **Design.** New or changed layout, flow or content blocks. A designer should decide the screen before it is built. All New screens except N22 are Design.
- **Edit.** The screen exists and keeps its shape. It loses prices or booking, gains a tag, state, filter or notice, or reuses a pattern that is already designed.
- **Wire.** The change is server, data or provider behaviour. Nothing visible changes beyond small states.

The split is a judgement from the "Why" text of each row, not a decision of the owner. Move a row if you read it differently, then rebuild the page.

Tracks: **1** is map, stories, onboarding, and tour information. **2** is shop, cart, orders, and handovers. **P** is platform work that both tracks need (root, shell, auth, referral link).

## Feature slices

Each screen below carries a slice id in the first column of tables 1 and 2. The "UI design" column counts the Design rows of the slice (see "How to read the verdicts"). Both tables are sorted by slice. Slice S0 is platform work that every other slice mounts on. S1 to S6 are Track 1 and S7 to S10 are Track 2 (S11 is Track 1 and S12 is Track 2, both analytics and reports). Slice numbers are ids, not a build order. The release order is in the delivery plan, section 5.1.

| Slice | Feature | Track | Goal | Redesign | New | Keep | Hide | UI design | Design status | Approved screens | Spec | Blocked by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S0 | Platform shell | P | Root, guest shell, merchant layout, sign-in and invitation, referral link and sitemap, which every other slice mounts on | 5 | 1 | 6 | 0 | 1 | Not started | none | none | O22 |
| S1 | Onboarding and ranking | 1 | A full-screen first-visit flow and a small deep-link prompt whose answers re-rank every public list | 0 | 2 | 0 | 0 | 2 | Approved | N01, N24 | `docs/ux/onboarding-design.md` | O25, O32 |
| S2 | Home and discovery | 1 | A home that leads with stories and the map, and a search with no prices | 2 | 0 | 0 | 0 | 1 | In design | none | none | O25, O35 |
| S3 | Stories and moderation | 1 | Ranked story pages for guests. Story editor, comment moderation and product-rating moderation for the merchant | 6 | 0 | 0 | 0 | 2 | Not started | none | none | O15, O33, O39 |
| S4 | Map and places | 1 | Guest map and pin card. Merchant pins, categories and media library | 0 | 6 | 0 | 0 | 6 | Partly approved | N02, N03, N16, N17 | `docs/ux/pins-design.md` | O35, O39 |
| S5 | Tour information | 1 | Tours as free information with a route map and one PDF. Booking removed | 5 | 1 | 1 | 4 | 4 | Not started | none | none | O31 |
| S6 | Advice form | 1 | A fixed-question trip advice form for guests and the request inbox for the merchant | 1 | 0 | 5 | 1 | 1 | Not started | none | none | none |
| S7 | Keepsake catalog and stock | 2 | Keepsake pages without price in lists. Options, SKU combinations and stock for the merchant | 5 | 3 | 1 | 1 | 6 | Not started | none | none | O26 |
| S8 | Cart and payment | 2 | A server cart that becomes several orders, the handover picker, and Stripe payment | 4 | 1 | 0 | 0 | 3 | Not started | none | none | O22, O41 |
| S9 | Orders and tracking | 2 | Guest order tracking, merchant orders, today and calendar. Booking screens hidden | 5 | 0 | 1 | 7 | 2 | Not started | none | none | O36 |
| S10 | Partner handovers | 2 | Partner entry and report, handover meetings for partner and merchant, partner records | 3 | 6 | 2 | 0 | 7 | Not started | none | none | O22, O34, O40 |
| S11 | Story analytics | 1 | The SM-1 to SM-3 pages: traffic, map and story-to-shop funnel | 3 | 2 | 0 | 0 | 4 | Not started | none | none | O14, O29, O32 |
| S12 | Money reports | 2 | Sales, money, margin and costs with tour and booking money stripped | 0 | 0 | 4 | 0 | 0 | No design needed | none | none | none |
| | **Total** | | | **39** | **22** | **20** | **13** | **39** | | | | |

**Design status** says where the redesign of a slice stands. The page shows it as a badge, and the build script checks it against the Design rows.

- **Approved.** Every Design screen of the slice has an approved design, and the "Spec" column names the file a coding agent reads.
- **Partly approved.** Some Design screens are approved (listed in "Approved screens") and the rest are not designed yet.
- **In design.** A design is being made or reviewed. Nothing is approved yet.
- **Not started.** No design work has begun.
- **No design needed.** The slice has no Design screen (all rows are Keep, Edit or Wire).

The two removed ids N04 and N05 sit in S4 and are not counted. Two things differ from a plain reading of the old tables: product-rating moderation (`reviews.tsx`) is in S3 with comment moderation because both follow ADR-008 and ADR-018, and the merchant handover screens (N10 to N12) are in S10 with the partner ones because they are two sides of one meeting.

## Counts

Table 1 has 72 rows: the 72 non-lab route files. The 17 `lab.*` files are one line below the table.

| Existing screens | Total | Guest | Merchant | Partner | Admin | Shared |
| --- | --- | --- | --- | --- | --- | --- |
| Keep | 20 | 4 | 13 | 1 | 1 | 1 |
| Hide | 13 | 7 | 6 | 0 | 0 | 0 |
| Redesign | 39 | 16 | 20 | 1 | 0 | 2 |
| **All existing** | **72** | **27** | **39** | **2** | **1** | **3** |
| **New** | **22** | **5** | **13** | **3** | **0** | **1** |

| By track | Track 1 | Track 2 | Platform |
| --- | --- | --- | --- |
| Keep | 6 | 8 | 6 |
| Hide | 5 | 8 | 0 |
| Redesign | 17 | 17 | 5 |
| **All existing** | **28** | **33** | **11** |
| **New** | **11** | **10** | **1** |

"Shared" rows serve more than one audience: `__root.tsx`, `sign-in.tsx`, and `invitation.tsx`. Layout files count as rows. Sheets and in-page blocks in table 2 count as New screens because each needs its own design. N04 and N05 are removed and not counted, and their ids are not reused.

## Table 1. Existing route files

Rows are grouped by slice (first column). Paths are relative to `front-end/src/routes/`. "Id" is the screen id of `docs/ux/ux-spec-phase1.md` where one exists. "Render" follows ADR-001: **SSR** for public content, **ssr:false** with `noindex` for everything else. Booking routes carry "none" because they leave the build. A "ruling D*n*" tag points to a decision in "Decisions".

| Slice | UI work | Route file | Target URL | Id | Audience | Verdict | Render | Why (PRD, AC) | ADR | Track  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---  |
| S0 | Wire | `__root.tsx` | root |  | all | **Redesign** | SSR (root) | Start root: head tags, CSS side-effect import, providers made server-safe, browser history (§4.1, AC61) | 001, 002 | P  |
| S0 | Design | `_guest.tsx` | guest layout |  | guest | **Redesign** | SSR for public children | Shell moves under `/$lang`. Phone tabs stay Explore, Keepsakes, Tours, Account, with the language prefix, until E4.6 swaps Tours for Map (owner answer D5, 2026-10-26; gate G-S5-MAPTAB, 27.10.2026). Onboarding prompt and language notice mount here (§3.1, AC36, AC64) | 002, 006 | P  |
| S0 | None | `_guest/credits.tsx` | `/credits` |  | guest | **Keep** | ssr:false (ruling D1) | Photo credits page. Not in the ADR-001 render lists | 001 | P  |
| S0 | None | `sign-in.tsx` | `/sign-in` | C05 | all | **Keep** | ssr:false | Google or e-mail code (§5, Q17). `takeGoogleReturn` goes with hash history | 001 | P  |
| S0 | Edit | `invitation.tsx` | `/invitation` | M01 | merchant, partner | **Redesign** | ssr:false | Reuse for partner invitations as well as staff. Token stays in the fragment (§5, §10.4) | 001, 010, 019 | P  |
| S0 | Wire | `r.$code.tsx` | `/r/$code` |  | guest | **Redesign** | server route (302) | Client `<Navigate>` becomes a server 302 to a same-origin target path, so a QR or link opens the shared story (§6.1, §10.1, AC24) | 001 | P  |
| S0 | None | `admin.tsx` | `/admin` | A01, A02 | admin | **Keep** | ssr:false | Super Admin invites merchant, opening checklist (§5, AC03) | 001 | P  |
| S0 | Edit | `store.tsx` | merchant layout |  | merchant | **Redesign** | layout, ssr:false | Groups Dashboard, Operations, Products, Partners, Content, Settings. Marketing becomes Content and Bookings leave (E4.1). Handovers, Places, Categories, Media, Traffic and Map entries come with their own screens (§6.4, §13.1) | 012 | P  |
| S0 | None | `store/$section.tsx` | `/store/settings` | M22 | merchant | **Keep** | ssr:false | Store info, members, payout. Preparation time (O22) added when decided | 010 | P  |
| S0 | None | `store_.onboarding.tsx` | `/store/onboarding` |  | merchant | **Keep** | ssr:false | Merchant store setup checklist. Not the guest onboarding (§3.1) |  | P  |
| S0 | None | `store/reports/route.tsx` | reports layout |  | merchant | **Keep** | layout | Report page frame |  | P  |
| S2 | Design | `_guest/index.tsx` | `/$lang` | C01 | guest | **Redesign** | SSR | Story and map first, shop gentle. Four-category rail, "Soon" and priced tour rail go (§1.2, §7.0, Q24, AC54) | 001, 002, 006 | 1  |
| S2 | Edit | `_guest/search.tsx` | `/search` |  | guest | **Redesign** | ssr:false (ruling D1) | Search over stories, places, keepsakes. Drop category browse and tour booking data, no price in results (§7.0, AC54) | 001, 006 | 1  |
| S3 | Edit | `_guest/stories/index.tsx` | `/$lang/stories` | C19 | guest | **Redesign** | SSR | Ranked by `rankItems`, tags for places, stay and interests (§3.2, §11.2, AC38) | 001, 002, 006 | 1  |
| S3 | Design | `_guest/stories/$slug.tsx` | `/$lang/stories/$slug` | C20 | guest | **Redesign** | SSR | Place tags, up to 6 keepsake cards without price, up to 3 "explore more", language notice (§11.2, AC31, AC32, AC33, AC54, AC64) | 001, 002, 005, 011 | 1  |
| S3 | Edit | `store/content/index.tsx` | `/store/content` | M17 | merchant | **Redesign** | ssr:false | Story list by language version, status, tags, review type (§11.2, §11.3) | 002, 003, 014 | 1  |
| S3 | Design | `store/content/articles/$articleId.tsx` | `/store/content/articles/$articleId` | M17 | merchant | **Redesign** | ssr:false | Pin tags, blog categories, stay tag, interests, up to 6 keepsakes, up to 3 related, language versions, publish rules (§11.2, AC31, AC33, AC41, AC87) | 003, 005, 011, 014, 030 | 1  |
| S3 | Edit | `store/content/comments.tsx` | `/store/content/comments` | M18 | merchant | **Redesign** | ssr:false | Hide and unhide story comments only. No delete (AC47) | 008, 018 | 1  |
| S3 | Edit | `store/content/reviews.tsx` | `/store/content/reviews` | M23 | merchant | **Redesign** | ssr:false | Product ratings only. Hide only. Product-rating hide refused until O33 (§11.6, AC47, AC69) | 008, 018 | 1  |
| S5 | None | `_guest/tours.tsx` | tours layout |  | guest | **Keep** | layout | Outlet only. Moves under `/$lang` with its children | 002 | 1  |
| S5 | Edit | `_guest/tours/index.tsx` | `/$lang/tours` | C08 | guest | **Redesign** | SSR | Information list. No price, "Soon", maintenance or next departure (§7.3, AC50, AC54) | 001, 005, 012 | 1  |
| S5 | Design | `_guest/tours/$slug.tsx` | `/$lang/tours/$slug` | C09 | guest | **Redesign** | SSR | Drops `?book=true` sheet and adult, child, infant prices. Adds route map, PDF download, keepsake cards (§6.3, §7.3, AC50, AC51, AC67) | 001, 004, 005, 012 | 1  |
| S5 | None | `_guest/tours/$slug_.book.tsx` | removed | C10 | guest | **Hide** | none | Tour booking hidden, no path (§4.2, Q4, AC50) | 012 | 1  |
| S5 | None | `_guest/tours/$slug_.book_.review.tsx` | removed | C11 | guest | **Hide** | none | Tour booking hidden (§4.2, Q4) | 012 | 1  |
| S5 | None | `_guest/tours/private-tour.tsx` | removed | C22 | guest | **Hide** | none | Private tours out of scope (Q6, §4.2) | 012 | 1  |
| S5 | None | `_guest/tours/private-tour_.sent.tsx` | removed | C22 | guest | **Hide** | none | Private tours out of scope (Q6, §4.2) | 012 | 1  |
| S5 | Edit | `store/products/tours/index.tsx` | `/store/content/tours` | M11 | merchant | **Redesign** | ssr:false | Tour guide list. Content, not product (§7.3). Moves to the Content group (owner answer, 2026-10-26) | 003, 005 | 1  |
| S5 | Design | `store/products/tours/new.tsx` | `/store/content/tours/new` | M13 | merchant | **Redesign** | ssr:false | Tour guide editor: content blocks, route stops, one PDF, stay tag, interests, keepsake links. No price or departures (§7.3, AC45, AC51) | 003, 004, 005, 012 | 1  |
| S5 | Design | `store/products/tours/$tourId.tsx` | `/store/content/tours/$tourId` | M13 | merchant | **Redesign** | ssr:false | Same editor in edit mode, preview in EN and DE (§7.3, AC45) | 003, 004, 005, 012 | 1  |
| S6 | Design | `_guest/plan.tsx` | `/plan` | C21 | guest | **Redesign** | ssr:false (ruling D1) | Today an AI chat (`useChat`) with an itinerary card. Must become a fixed-question form with a review step (§12, G10, AC34). Itinerary building is out (G9, §4.2) | 001 | 1  |
| S6 | None | `_guest/plan_.sent.tsx` | `/plan/sent` | C21 | guest | **Keep** | ssr:false (ruling D1) | Sent notice. Copy: store replies by e-mail, no deadline (AC34) |  | 1  |
| S6 | None | `store/requests/index.tsx` | `/store/requests` | M19 | merchant | **Keep** | ssr:false | Advice request inbox. Drop the private-tour tab (§12, AC18) |  | 1  |
| S6 | None | `store/requests/advice/$requestId.tsx` | `/store/requests/advice/$requestId` | M19 | merchant | **Keep** | ssr:false | Request detail, reply by e-mail outside the system (§12) |  | 1  |
| S6 | None | `store/requests/questions.tsx` | `/store/requests/questions` | M19 | merchant | **Keep** | ssr:false | Fixed question set of the store (§12, AC34) |  | 1  |
| S6 | None | `store/requests/analytics.tsx` | `/store/requests/analytics` |  | merchant | **Keep** | ssr:false | Inquiry analytics |  | 1  |
| S6 | None | `store/requests/private.tsx` | removed | M20 | merchant | **Hide** | none | Private tour requests out of scope (Q6). ADR-012 covers them in prose, not in its wrapper list. Extended by ruling D2 | 012 | 1  |
| S7 | Edit | `_guest/gifts/index.tsx` | `/$lang/gifts` | C02 | guest | **Redesign** | SSR | Keepsakes/Andenken list, no price and no "from" price, no sub-category filter, no category rail (§7.0, Q24, AC54) | 001, 002, 021 | 2  |
| S7 | Design | `_guest/gifts/$slug.tsx` | `/$lang/gifts/$slug` | C03 | guest | **Redesign** | SSR text, SPA price and stock | Option selectors from size, theme, colour. Sold-out combination not selectable. No engraving. Price first here (§7.2, AC52, AC53, AC55) | 001, 017, 022, 027 | 2  |
| S7 | Edit | `store/products/index.tsx` | `/store/products` | M11 | merchant | **Redesign** | ssr:false | Only Keepsakes and Pickup points. Tours, Stays, Experiences tabs and category filter go (§7.0, §4.2) | 012, 027 | 2  |
| S7 | Design | `store/products/gifts/new.tsx` | `/store/products/gifts/new` | M12 | merchant | **Redesign** | ssr:false | Options, values, SKU combinations, stock per SKU. No engraving, no sub-category, no deposit or pay-later (§7.2, AC53, AC55) | 009, 016, 017, 027 | 2  |
| S7 | Design | `store/products/gifts/$productId.tsx` | `/store/products/gifts/$productId` | M12 | merchant | **Redesign** | ssr:false | Same editor in edit mode, held stock shown (§7.2, AC05, AC53) | 009, 016, 017, 027 | 2  |
| S7 | None | `store/products/pickup.tsx` | `/store/products/pickup` | M14 | merchant | **Keep** | ssr:false | Pickup points with hours, shared by self-collect and handovers (§10.4) | 024 | 2  |
| S7 | None | `store/products/categories.tsx` | removed (ruling D2) | M26 | merchant | **Hide** | none | No category UI in Phase 1. Tables stay (§7.0, M9, M10) | 021, 027 | 2  |
| S8 | Design | `_guest/cart.tsx` | `/cart` | C04 | guest | **Redesign** | ssr:false | Server cart, lines grouped by destination, re-check on each change (§8.1, AC80, AC81) | 021, 026 | 2  |
| S8 | Design | `_guest/cart_.review.tsx` | `/cart/review` | C06 | guest | **Redesign** | ssr:false | Preview of the orders the cart will create, handover line prefilled, pay online or cash (§8.1, §10.4, AC66, AC70, AC71, AC76, AC82) | 024, 025, 026 | 2  |
| S8 | Edit | `_guest/cart_.sent.tsx` | `/cart/sent` | C07 | guest | **Redesign** | ssr:false | Lists created orders, repeat-safe, no trip profile (§3.4 removed, AC83) | 026 | 2  |
| S8 | Wire | `_guest/account_.orders.$orderId_.pay.tsx` | `/account/orders/$orderId/pay` | C12 | guest | **Redesign** | ssr:false | Simulated provider page becomes the Stripe Payment Element. Not shown for cash orders (§9.1, AC65) | 021 | 2  |
| S9 | None | `_guest/account.tsx` | `/account` | C14 | guest | **Keep** | ssr:false | Account hub and order list. Strip the booking list and `features/tours/booking` import (§4.2, AC50). Built in E7.26 on real orders | 012 | 2  |
| S9 | Design | `_guest/account_.orders.$orderId.tsx` | `/account/orders/$orderId` | C15 | guest | **Redesign** | ssr:false | Tracking for self-collect and partner path states, order code, cash state, payment label (§6.2, §10.4, §8, AC25, AC65, AC66, AC72) | 025, 028 | 2  |
| S9 | None | `_guest/account_.bookings.$bookingId.tsx` | removed | C16 | guest | **Hide** | none | Booking detail hidden (§4.2, Q4) | 012 | 2  |
| S9 | None | `_guest/account_.bookings.$bookingId_.pay.tsx` | removed | C12 | guest | **Hide** | none | Booking payment hidden (§4.2, Q4) | 012 | 2  |
| S9 | None | `_guest/account_.bookings.$bookingId_.confirmed.tsx` | removed | C13 | guest | **Hide** | none | Booking confirmation hidden (§4.2, Q4) | 012 | 2  |
| S9 | Edit | `store/index.tsx` | `/store` | M02 | merchant | **Redesign** | ssr:false | Today cards: drop tours, add handover proposals, missing bags, pending prep (§6.4, §10.4, AC72, AC77) | 012, 025 | 2  |
| S9 | Edit | `store/calendar.tsx` | `/store/calendar` | M27 | merchant | **Redesign** | ssr:false | Drop booking items. Show handover meetings and pickup times in Europe/Zurich (§13.1a) | 012, 024 | 2  |
| S9 | Edit | `store/orders/index.tsx` | `/store/orders` | M03 | merchant | **Redesign** | ssr:false | Tabs and filters for partner-path statuses, handover and pending-accept (§8, §10.4, AC66) | 025 | 2  |
| S9 | Design | `store/orders/$orderId.tsx` | `/store/orders/$orderId` | M04 | merchant | **Redesign** | ssr:false | Handover binding, receipt and no-show, cash, guest name and e-mail, commission at completion (§10.4, §9, AC29, AC74) | 023, 025, 028 | 2  |
| S9 | None | `store/bookings.tsx` | removed |  | merchant | **Hide** | none | Booking hub hidden (§4.2, Q4) | 012 | 2  |
| S9 | None | `store/bookings/index.tsx` | removed | M05 | merchant | **Hide** | none | Departures hidden (§4.2, Q4) | 012 | 2  |
| S9 | None | `store/bookings/$bookingId.tsx` | removed | M07 | merchant | **Hide** | none | Booking detail hidden (§4.2, Q4) | 012 | 2  |
| S9 | None | `store/bookings/departures/$departureId.tsx` | removed | M06 | merchant | **Hide** | none | Departure guests hidden (§4.2, Q4) | 012 | 2  |
| S10 | Design | `partner/index.tsx` | `/partner` | P01 | partner | **Redesign** | ssr:false | Entry splits: read-only report by link and code, and signed-in handover work (§10.3, §10.4, O24 closed) | 010, 019 | 2  |
| S10 | None | `partner/$token.tsx` | `/partner/$token` | P02 | partner | **Keep** | ssr:false | Read-only report. Strip tour lines. `no-referrer`, `noindex`, token in path (§10.3, AC12) | 001, 010 | 2  |
| S10 | Edit | `store/partners/index.tsx` | `/store/partners` | M15 | merchant | **Redesign** | ssr:false | Partner type, account invitation state, handover count (§10, §10.4) | 010, 019, 024 | 2  |
| S10 | Edit | `store/partners/$partnerId.tsx` | `/store/partners/$partnerId` | M16 | merchant | **Redesign** | ssr:false | Adds invite account and handover agreements. Report link stays read-only (§10.3, §10.4, AC58) | 010, 019, 024 | 2  |
| S10 | None | `store/partners/analytics.tsx` | `/store/partners/analytics` |  | merchant | **Keep** | ssr:false | Partner analytics. Strip tour partners (§13.1) | 012 | 2  |
| S11 | Edit | `store/content/analytics.tsx` | `/store/content/analytics` |  | merchant | **Redesign** | ssr:false | Content view: stories read, new story comments, hidden comments (§13.1) | 007, 020 | 1  |
| S11 | Design | `store/reports/sales.tsx` | `/store/reports/sales` |  | merchant | **Redesign** | ssr:false | Conversion page becomes the SM-3 story-to-shop funnel (§1.3, §13.1, AC60) | 007, 020 | 1  |
| S11 | Design | `store/reports/guests.tsx` | `/store/reports/guests` |  | merchant | **Redesign** | ssr:false | Four guest groups are gone. Becomes anonymous segment split of SM-1 to SM-3, blocked by O29 (§13.3, G4) | 007, 020 | 1  |
| S12 | None | `store/sales.tsx` | `/store/sales` |  | merchant | **Keep** | ssr:false | Sales overview. Strip tour figures (§13.1) | 012 | 2  |
| S12 | None | `store/reports/index.tsx` | `/store/reports` |  | merchant | **Keep** | ssr:false | Money view. Strip booking money, keep cash and refunds (§13.1, AC19) | 012 | 2  |
| S12 | None | `store/reports/margin.tsx` | `/store/reports/margin` |  | merchant | **Keep** | ssr:false | Contribution margin (R14, §13.2) |  | 2  |
| S12 | None | `store/reports/costs.tsx` | `/store/reports/costs` | M24 | merchant | **Keep** | ssr:false | Actual cost entry (R14) |  | 2  |

**`lab.*` (17 files, not inventoried row by row).** They are design experiments at `/lab/*` and stay `ssr:false`, outside the product. They import product code (`features/discovery`, `features/checkout`, `features/tours/map`) and not the other way: no file outside `routes/lab.*` imports `features/lab`. So no lab component is reused by a product screen. Two are worth reading for the map and the home: `lab.map` and `lab.map-loading` for the map, and `lab.blog-home` for the home and the story list. `lab.map` hard-codes an aerial swisstopo style "chosen on 15.10.2026". That conflicts with the tile decision of G11, so this inventory does not adopt it.

## Table 2. New screens

Rows are grouped by slice (first column). Routes follow ADR-002: `/$lang` is `en` or `de`, and only the public content routes of ADR-001 carry it. Dashboard, partner, and cart routes have no prefix and read the stored language. Every `/$lang` route here comes from the ADR-001 list or sits under a listed one, except where a decision tag says otherwise.

| Slice | UI work | Id | Proposed route | Audience | Purpose | PRD, AC | ADR | Track | Render | Reused components  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---  |
| S0 | Wire | N22 | /sitemap.xml, /robots.txt | all | Server routes, no UI. Published pages with hreflang alternates, non-production disallow | §4.1; AC61 | 001, 002 | P | server route | none  |
| S1 | Design | N01 | Full-screen layer over the whole guest shell, tab bar included (no route). Reopen entry on the Account tab and the home line | guest | Full-screen two-step onboarding on a guest's first visit when the visit began at the home: visitor type, then interests. Skippable at each step, closing counts as skipping. Guests only. Answers in `localStorage` `sk.onboarding`. **Final design F1, see `docs/ux/onboarding-design.md`** | §3.1 to §3.3; AC36, AC37, AC38, AC41, AC92 | 006, 007 | 1 | client only | the app's option cards (`TagGroup` and `Tag` as in `gift-detail.tsx`), locale context (not `SheetFrame`) |
| S1 | Design | N24 | Floating card at the top of the screen on a story reached by a deep link, a partner QR or link, or a search landing (no route) | guest | Never inserted into the content (the text does not move), but it floats over the top of the screen and can cover text until closed. Appears 10 seconds after the story page opens and stays until hidden or the guest leaves the story. Opens N01. Closing hides it for this visit only and is not a skip. The full-screen flow shows at the next Explore opening. **Final design N2 (card), see `docs/ux/onboarding-design.md`**. Shows on story pages only | §3.1; AC24, AC91 | 006, 007 | 1 | client only | N01 flow |
| S4 | Design | N02 | `/$lang/map` | guest | Interactive map: pins with merchant-edited map categories, ranked not hidden. A Categories sheet with checkboxes dims the pins outside the chosen categories on the map, and the list and card row hold only the chosen ones. A pin in several categories is highlighted under each chosen category, and a pin with none only under All. A Map and List switch gives a list alternative (AC93). Flat swisstopo aerial style with OpenFreeMap names, no 3D. Tap opens the pin card **Design approved 2026-10-28 (guest map option B "Cards"), see `docs/ux/pins-design.md`.** | §11.1; AC42, AC44, AC67, AC88, AC93 | 001, 006, 029, 030 | 1 | SSR page shell, map in browser | `tour-itinerary-map.tsx`, `aerial-style.ts` (made flat, O23), `lab.map` |
| S4 | Design | N03 | Sheet over N02 (deep link `/$lang/map?place=<slug>`) | guest | Pin card: photo (more photos in the details sheet carousel), tip, hours, address, next date for a dated pin, main story link (omitted when the story has no published version), other stories, outbound link, Open in Google Maps, and Show more for the details sheet with Previous and Next place. No review summary and no practical variant. A deep link to a hidden, expired or unknown pin shows the map with the notice "This place is no longer on the map" **Design approved 2026-10-28 (guest map option B "Cards"), see `docs/ux/pins-design.md`.** | §11.1; AC42, AC62, AC89, AC90 | 006, 015, 029 | 1 | client, data from `/api/public/places/:id` | `SheetFrame`, `story-card.tsx` |
| S4 | None | N04 | removed | guest | Removed on 27.10.2026. Pins have no page of their own and are not in the sitemap. The id is not reused | none | 002 | 1 | none | none  |
| S4 | None | N05 | removed | guest | Removed on 27.10.2026. Guests no longer review places. The id is not reused | none | 008, 018 | 1 | none | none  |
| S4 | Design | N16 | `/store/content/places` | merchant | Pins list: status (draft, published, hidden), map categories, next date, tags, main story. Add place and Add event both open N17 **Design approved 2026-10-28 (the one list design), see `docs/ux/pins-design.md`.** | §11.1; AC79, AC85, AC86 | 003, 005, 029 | 1 | ssr:false | `content-page.tsx`, data table |
| S4 | Design | N17 | /store/content/places/new and /$placeId | merchant | Pin editor, with no type choice: coordinates picker, slug, address (optional), weekly hours, optional date entries, map categories, photo with EN and DE alt text, EN and DE title and tip, stay tag, interests, optional main story, optional outbound link, hide. Required to publish: a title in one language, a location and a slug **Design approved 2026-10-28 (editor option S "Steps"), see `docs/ux/pins-design.md`.** | §11.1, §11.5; AC39, AC41, AC45, AC62, AC63, AC68, AC79, AC85, AC86 | 003, 005, 011, 014, 015, 029, 030 | 1 | ssr:false | `article-editor.tsx` frame, map from N02 |
| S4 | Design | N18 | `/store/content/media` | merchant | Media library: upload, find, replace, see where used | §11.2, §7.3; AC32, AC51 | 004 | 1 | ssr:false | `media-sheets.tsx`, `photo-field.tsx`  |
| S4 | Design | N23 | `/store/content/categories` | merchant | Category editor: two lists, map categories and blog categories, each with names in EN and DE, an order and one level of sub-categories. A category in use can't be deleted | §11.1, §11.2; AC87 | 003, 030 | 1 | ssr:false | `categories-page.tsx` pattern (dormant, ADR-012), `RowActions`, sheets  |
| S5 | Design | N19 | Sheet inside M13 | merchant | Tour PDF upload and replace, exactly one per tour | §7.3; AC51 | 004 | 1 | ssr:false | `media-sheets.tsx`  |
| S7 | Design | N13 | `/store/products/inventory` | merchant | Stock per SKU across products: on hand, held, available, out-of-stock filter, quick edit | §7.2, §13.1; AC05, AC53 | 009, 016, 022 | 2 | ssr:false | `filter-bar`, data table, `RowActions`  |
| S7 | Design | N14 | Sheet inside M12 | merchant | Options and values: add option, add value, order values | §7.0, §7.1; AC52 | 017, 027 | 2 | ssr:false | `subcategory-sheet.tsx` pattern  |
| S7 | Design | N15 | Section and sheet inside M12 | merchant | SKU combinations: sold combinations only, price, SKU code, stock, status | §7.2; AC52, AC53 | 009, 016, 017 | 2 | ssr:false | stock section of `gift-editor.tsx`  |
| S8 | Design | N06 | Sheet over /cart/review | guest | Handover picker: today's meetings of the QR partner, or switch to self-collect | §10.4; AC70, AC71, AC76 | 024, 025, 026 | 2 | client | `pickup-date-field.tsx`, `SheetFrame`  |
| S10 | Design | N07 | `/handover` | partner | My handovers and upcoming meetings, proposals awaiting reply (prefix by ruling D3) | §10.4, §6.5; AC58, AC77 | 010, 019, 024 | 2 | ssr:false | partner report shell, `RowActions`  |
| S10 | Design | N08 | `/handover/new` | partner | Propose or counter-propose pickup point, time, repeat rule, group arrival and leaving times | §10.4; AC58, AC76 | 024 | 2 | ssr:false | pickup point list, date fields  |
| S10 | Design | N09 | `/handover/meetings/$meetingId` | partner | Meeting day screen: receipt checklist "Received 5/6", deliver by order code, cash entry, return bag. Shows name, code, items, paid or cash due | §10.4; AC59, AC65, AC72, AC73, AC74 | 024, 025, 028 | 2 | ssr:false | order rows  |
| S10 | Design | N10 | `/store/handovers` | merchant | Handover list: proposals to answer, agreed, repeat rules, pause or end | §10.4, §6.4; AC58, AC77 | 024 | 2 | ssr:false | `RowActions`, `filter-bar`, `route-tabs`  |
| S10 | Design | N11 | `/store/handovers/$handoverId` | merchant | Accept, counter, create for partner, cancel one day, move meeting (lists orders without prep time) | §10.4; AC58, AC78 | 024, 025 | 2 | ssr:false | sheets pattern of M10  |
| S10 | Design | N12 | `/store/handovers/meetings/$meetingId` | merchant | Meeting view: orders to pack, mark "On the way", receipt alerts, returned bags, handover record | §10.4, §6.4; AC72, AC74, AC75 | 024, 025 | 2 | ssr:false | merchant order rows  |
| S11 | Design | N20 | `/store/reports/traffic` | merchant | SM-1: sessions, search sessions, by story and place | §1.3, §13.1; AC60 | 007, 020 | 1 | ssr:false | `report-charts.tsx`, `filters-sheet.tsx`  |
| S11 | Design | N21 | `/store/reports/map` | merchant | SM-2: pin opens, pin-to-story clicks, by pin and segment | §1.3, §13.1; AC60 | 007, 020 | 1 | ssr:false | `report-charts.tsx`  |
## Merchant navigation after the pivot

The owner's groups stay: Dashboard, Operations, Content. On 2026-10-26 the owner renamed Marketing to Content (D4); the 15.10.2026 grouping is otherwise unchanged. This is a proposal for the children, not a visual design. Tables, filters, sheets, and sticky phone tabs follow the dashboard preferences (`RowActions`, `filter-bar`, `route-tabs`, `sticky-tabs`).

| Group | Children after the pivot | Change |
| --- | --- | --- |
| Dashboard | Today, Sales, Conversion (SM-3), Traffic (SM-1, N20), Map (SM-2, N21), Money, Guests, Margin | Two new pages. Conversion and Guests change meaning |
| Operations | Orders, Handovers (N10 to N12), Calendar | Bookings leave. Handovers join |
| Products | Keepsakes, Inventory (N13), Pickup points | Tours, Stays, Experiences, and Categories leave |
| Partners | All partners, Analytics | Account invitation and handovers added to the detail page |
| Content (was Marketing, D4) | Stories, Places (N16), Categories (N23), Tours, Media (N18), Comments, Reviews, Inquiries, Analytics | Renamed by the owner. Places, Tours, and Media join the old Marketing children. Categories added on 27.10.2026 |
| Settings | Unchanged | Preparation time when O22 is decided |

The phone bar keeps the agreed future state: Dashboard, Operations, Calendar, More.

## Area 0. Guest shell (slice S0, `_guest.tsx`)

**Today.** `GuestShell` is a phone-width column (max 430 px) with no website header and a tab bar of five slots: Explore, Keepsakes, a raised centre "Assistant" button (sparkle icon, links to `/$lang/plan`), Tours and Account. A music dock sits above the bar. The route file only wraps it.

**Open design questions** (found on 28.10.2026 by reading the component, not stated in the PRD or an ADR):

- **Language switch (E3.11, gate G-S5-LANGSWITCH).** The story says it matches the guest header if the owner supplies no design. The shell has no header, so its place is open.
- **Language notice (AC64).** A banner for a page that exists only in the other language. It needs a slot in the shell and a look.
- **Centre Assistant button and music dock.** Neither appears in PRD v3, the ADRs or E3.11. The advice page becomes a fixed-question form (G10, AC34), so a sparkle button labelled "Assistant" would mislead. The five-slot layout also has to hold the Map tab when E4.6 replaces Tours. This is an owner decision: keep, rename or remove.

The onboarding layer (N01) and the small prompt (N24) mount here but are designed in S1.

## Area 1. Onboarding (slice S1, N01)

**Today.** The guest app has no onboarding. `store_.onboarding.tsx` is the merchant's store setup and is unrelated.

**What it is.** Two forms of one two-step flow, for guests only (PRD §3.1, ADR-006, decision record of 28.10.2026). N01 is a full-screen layer over the whole guest shell. N24 is a floating card at the top of a story page reached by a deep link. Step 1 is the visitor type (short-stay or multi-day), step 2 is one or more of the four fixed interests (§3.3). Both steps can be skipped. Answers live in `localStorage` key `sk.onboarding`. The server never sees them, except as anonymous values on analytics events (G4, AC37). Merchants, partners and Super Admins never see either form (AC92).

**Which form shows.** The entry of the current visit decides, kept in memory or `sessionStorage` and not in `sk.onboarding`. A guest who is unanswered and whose visit began at the home with no partner QR or link and no search result sees N01. A guest whose visit began anywhere else, or through a partner QR or link or a search result, sees the page at once with N24, and N01 at the first Explore opening of that visit (AC24, AC36, AC91). A guest who returns days later straight to the home starts a new visit and sees N01.

**States to design.**

| State | Behaviour |
| --- | --- |
| First visit at the home | N01 covers the shell. Content loads behind it (AC36) |
| First visit on a story, QR or search landing | The page shows at once. On a story page N24, a card, floats at the top of the screen 10 seconds after the page opens and stays until hidden. It is never inserted into the content (AC24, AC91) |
| First visit on a map pin card, a keepsake page or any page that is not a story | The page shows at once. Nothing else shows. N01 opens at the first Explore opening |
| Step 1, step 2 | Step 2 allows several interests. Skip on both. Labels EN and DE from §3.3, DE labels need merchant review |
| N24 closed | Hidden for this visit only. N01 still shows at the next Explore opening while unanswered |
| N01 skipped or closed | Counts as skipped. It does not return alone. The Account tab or the home line reopens it (ADR-006) |
| Answered | Layer gone. The home line "Sorted for … Change" and the Account tab open "change my answers". Ranking changes at once (§3.1) |
| Skipped, no answers | Content ranks by publish date only (O25 proposal) |
| Signed-in merchant, partner or Super Admin | Neither form shows. Default order (AC92) |
| Browser data cleared, new device | The flow shows again. No cross-device memory promised |
| First-visit consent box | Order against N01 and N24 is open (O32). Proposal: onboarding first, consent second, never both at once |

**Designs (28.10.2026).** N01 is option F1 "Guided", final. N24 is option N2, a card at the top while reading, with the wording "Find what you’ll love in Lucerne". Both are final. The full specification, copy table, open points and build notes are in `docs/ux/onboarding-design.md`. Read it before building E4.5. The lab page `/lab/onboarding-fullscreen` is the visual reference.

**Design notes.** N01 is a modal dialog: focus moves in and returns, Escape and a visible Skip close it, the background is inert, reduced motion is respected. The references are in `docs/ux/references/onboarding/`. Lab page: `/lab/onboarding-fullscreen` (N01 and N24, final). The reopen entry sits on the Account tab and on the home line, because the guest shell has no menu.

**Against today.** All new. It touches every public list through `rankItems` (home, stories, tours, map). Server HTML and API lists stay unranked, so the same markup serves every visitor and crawler, and neither form is in it. The client re-ranks after hydration, so the list order can change once on load. The UX checklist should include that shift.

## Area 2. Home (slice S2, C01 redesign)

**Today (`discovery-home.tsx`).** Hero, a block by local time of day, a rail of four categories with "Soon" on two, featured keepsakes, a tour rail, stories, a Victorinox showcase, an advice banner and floating button, and a seasonal snow effect. Tours and keepsakes show prices.

**Direction (PRD §1.1, §1.2, §6.1).** Story and map first, shop gentle, no price anywhere before the product page (Q24, AC54). Content blocks in order, with no layout implied:

1. Entry block that says what the site is (the brand name is open, O01).
2. The onboarding, when unanswered: N01 full screen on a first visit, N24 small prompt after a deep link.
3. A way into the map (N02).
4. Ranked feed of stories and places (`rankItems`, AC38). Home carries this feed (ruling D1).
5. Tour information rail, no price, no departure (AC50).
6. Keepsakes, small and last: a few cards, no price, linking to `/$lang/gifts` (Q24).
7. Trip advice form entry (C21, G10).

**Removed.** The four-category rail, the "Soon" labels, and the prices on tour cards, keepsake cards, and the Victorinox showcase. The seasonal snow and the time-of-day block are visual choices. They wait for the owner's references.

**States.** First visit with prompt. Answered and ranked. Content missing in the stored language (notice, AC64). Fewer published items than the first-launch minimum (O35). Loading. Reached by a partner QR (looks the same, §6.1).

**Render.** SSR at `/$lang` with title, description, canonical, and hreflang. `/` redirects with a 302 (ADR-002). The server order is newest first.

## Area 3. Catalog, options, SKUs, and inventory (slice S7, merchant)

**Today.** `gift-editor.tsx` edits a flat list of variants. Each variant has a name, a price, a stock figure, and a for-sale flag, and held units set the lowest stock. The editor also has engraving, a sub-category, a payment policy with deposit and pay-later, and a cancellation policy. `categories-page.tsx` (M26) manages sub-categories. The product list has tabs for Tours, Stays, and Experiences.

**After (ADR-017, ADR-027, ADR-009, ADR-016, ADR-022).** Victorinox becomes one product with the options Size, Theme, and Colour. The model is generic, so a later product line needs no new screen.

| Screen | What the merchant does | Rules the screen must show |
| --- | --- | --- |
| M11 product list | Sees Keepsakes with status, languages, SKU count, availability. Pickup points tab stays | No category filter, no other product tabs |
| M12 product editor | Name and text in EN and DE, photos, commission rate, payment deadline, publish | Publish needs one full language (§7.2). No engraving, no sub-category, no deposit or pay-later (O28, Q23) |
| N14 options sheet | Adds options and values, orders them. A value may carry a colour swatch | A value used by a SKU cannot be deleted (ADR-027). The colour and theme lists are open (O26) |
| N15 SKU combinations | Adds only the combinations that are sold. Each has a SKU code, a price, a status, and stock | One value per option per SKU. A duplicate combination is refused at save. Adding an option needs a value for every existing SKU in the same save |
| Stock field | Sets on-hand stock per SKU | Shows held and available. Stock below held is refused (ADR-016). Zero stock keeps the other SKUs of the design for sale (AC53) |
| N13 inventory page | One table of every SKU: on hand, held, available, filter for sold out, quick edit | No purchasing flags, no locations (ADR-022). Pre-order is named as a later path, not built |

**Categories have no UI in Phase 1.** PRD §7.0 and gates M9 and M10 keep category tables and generic options in the data and show no screen for them. Concretely: `store/products/categories.tsx` is hidden, the "Manage categories" link and the Sub-category field in M12 go, the Tours, Stays, and Experiences tabs in M11 go, the four-category rail on the guest home goes, and the sub-category filter on the keepsake list goes. The label "Keepsakes" (EN) and "Andenken" (DE) names the one product group. The dormant pattern of ADR-012 covers these files (ruling D2).

**Guest side (C03).** Selectors come from the options and values of published SKUs. A combination with stock zero is shown as sold out and cannot be picked. The page shows price and availability loaded by the SPA, because no server text or list carries a price (ADR-001, owner gate D10).

## Area 4. Guest map (slice S4, N02, N03)

**Design approved on 2026-10-28** (option B "Cards"). The specification is `docs/ux/pins-design.md` and the visual reference is the lab page `/lab/pins`. Where the text below and that file differ, the file shows the approved design. The differences from the original PRD were settled and the PRD now matches.

**Today.** The only map is the 3D tour itinerary map (`tour-itinerary-map.tsx`, MapLibre, aerial style) inside the tour page. There is no place or pin screen.

**What it is.** The most important screen of the product (PRD §11.1). It shows all published pins in one cached list (`GET /api/public/map`). A pin is any place or event the merchant adds, with or without a story. A pin with dates is listed from the moment it is published and leaves the list after its last date. Opening a pin loads one pin.

**States to design.**

| State | Behaviour |
| --- | --- |
| Loading | Map shell and pin list load separately. MapLibre loads by dynamic import (AGENTS rule 9) |
| Loaded | Pins in a flat style: swisstopo aerial photos with OpenFreeMap names, no tilt and no 3D terrain, with the swisstopo, OpenFreeMap, OpenMapTiles and OpenStreetMap credits. Pins use the default style of the map stack (O23 closed, 27.10.2026) |
| Category chip selected | The chip highlights the pins of that map category and dims the others, and no pin is hidden. A parent chip also covers pins tagged only with its sub-categories. A pin in two categories is highlighted under both chips, and a pin with no category only under All (AC88, D7). Ranking by stay tag and interests still never hides a pin (AC44) |
| Ranked | Order and prominence follow stay tag and interests. No pin is hidden (Q26, AC44) |
| Pin open | Pin card (N03): photo, tip, hours, address, the next date for a dated pin, the main story link if any, the other stories that tag the pin, the outbound link if any. No price (AC42). A pin with no story shows no story link (AC62) |
| Directions | The card's Open in Google or Apple Maps button hands the pin's coordinates to the phone's map app. The site neither reads the visitor's location nor draws a route (AC89, G9) |
| Pin has no version in the stored language | English or German version shows with a notice. No machine translation (AC64) |
| Deep link | `/$lang/map?place=<slug>` opens the map with the card showing (AC90). If the pin is hidden, expired or unknown, the map opens normally with the notice "This place is no longer on the map". Pins have no page of their own, so no indexable twin exists |
| Tour route | A tour page shows the merchant's route on the map. No route builder, no location prompt, no "you are here" (AC67, G9) |
| Empty or failed | Short message with a retry. A map without network is not supported (O35 assumption) |

**Against today.** The tour map moves from a feature of one screen to a shared component. Entry points: the Map tab (D5, after E4.6), a story's place tag, a tour's route stops, and the home block. Category chips come from the merchant's map categories and replace the fixed place-type chips of D7, which keeps its highlight-and-dim behaviour.

## Area 5. Merchant map and pins (slice S4, N16, N17, N23)

**N16 and N17 design approved on 2026-10-28** (the list, and editor option S "Steps"). The specification is `docs/ux/pins-design.md` and the visual reference is the lab page `/lab/pins`. N23 is not designed yet.

**Today.** No place model or screen. Tour stops exist only inside the tour editor.

**Screens.** A pins list (N16), one editor (N17) and a category editor (N23). The list shows status (draft, published, hidden), map categories, next date, stay tag, interests, languages, and main story. Add place and Add event are two ways into the same editor. The editor has no type choice and edits:

- **Position** on a map picker, slug, address (optional), weekly opening hours, one photo with EN and DE alt text, EN and DE title and tip.
- **Dates**, optional. Each entry is one day with optional start and end times, or a range of days. A pin with dates shows from the moment it is published and leaves the map after its last date (AC86). An entry cannot cross midnight, and the end time stays empty for a late event.
- **Map categories** from the N23 list. None is required to publish, and a pin with none shows only under All (AC85, AC88).
- **Stay tag** (short-stay, multi-day, both) and **interests** from the four fixed codes (AC39, AC41). No separate rank field for restaurants.
- **Main story**, optional. A pin publishes without one (AC85). To publish, a pin needs a title in at least one language, a location and a slug (AC68).
- **Outbound link**, optional, one per pin. Changing it changes every page that shows the pin (AC63, ADR-011). Paid-link fields wait until the first paid link exists.

**Category editor (N23).** Two lists, map categories and blog categories. Each category has a name in EN or DE (one is enough), an order and one level of sub-categories. The merchant creates, renames and reorders them, and deletes one only while it has no sub-category and no pin or story uses it (AC87, ADR-030). Route `/store/content/categories`.

**Lifecycle.** A draft can be deleted. A published pin can only be hidden (AC79, owner gate M6). Publish rules run in the API as well as the UI (ADR-003). Edits show to guests within about 60 seconds, capped at 5 minutes (owner gate D5, O39).

**Other places the merchant touches pins.** The story editor tags pins and blog categories on a story. The tour editor lists route stops with their own coordinates and an optional pin link.

## Other areas at a glance

| Slice | Area | Screens involved | Main change |
| --- | --- | --- | --- |
| S3 | Stories and editorial reviews | C19, C20, M17 | An editorial review is a story of a review type tied to one pin, with writer and check date (§11.3). No new route |
| S3 | Comments and moderation | M18, M23 | Story comments need sign-in, show at once, hide only, no delete, no report button (G7, AC47). Product rating hide is refused until O33. Guests do not review places |
| S5 | Tour information | C08, C09, M13, N19 | Free information, route on a map, one PDF, no price or departure. Related keepsakes without price (AC50, AC51) |
| S8 | Cart and checkout | C04, C06, C07, N06 | Server cart, one cart can become several orders, repeat-safe submit (AC80 to AC83). Guest cart without sign-in is O41 |
| S9 | Order tracking | C15, M03, M04 | Partner-path states: placed, preparing, on the way, with partner, delivered. Payment label separate (§10.4) |
| S10 | Partner handovers | N07 to N09, N10 to N12, N06, M04, M16 | Handover record, repeating rule, receipt, no-show, commission at completion (ADR-024, ADR-025, ADR-028) |
| S0, S10 | Partner account | `invitation.tsx`, `sign-in.tsx`, P01 | Role comes only from an invitation. Self sign-up gives guest only (ADR-019). Report link stays read-only |
| S11 | Analytics SM-1 to SM-3 | N20, N21, `reports/sales.tsx`, `reports/guests.tsx` | First-party events with no persistent id (ADR-007, ADR-020). Cookie consent for tracking is open (O32, O14) |
| S5, S9 | Hidden booking | 11 route files named by ADR-012, plus 2 more (ruling D2) | Removed with their entry points. Domain rules stay compiled (ADR-012) |
| S6 | Advice form | C21, M19 | AI chat becomes a fixed-question form with review step and e-mail required (G10, AC34) |

## Open items that block a screen

| Id | Blocks | What is missing |
| --- | --- | --- |
| O23 | N02, N03, home, lab.map decision | Closed by the owner on 27.10.2026. There are no reference images. Pins and the map use the default style of the map stack: swisstopo aerial photos with OpenFreeMap names, flat 2D |
| O41 | C04, C06 | How a guest cart without sign-in is kept, and for how long |
| O26 | C03, N14, N15 | Colour list, theme list, design rights, prices |
| O22 | C06, N06, N11, settings | Preparation hours and the auto-accept rule |
| O25 | N01, N24, home | Feed order when onboarding is skipped (proposal: date only), untagged content |
| O32 | N01, N24, tracking | Order of the onboarding prompt and the consent box, and what needs consent (referral memory, analytics, embedded video) |
| O29 | `reports/guests.tsx` | Whether any guest-group view stays |
| O33 | M23 | Hiding product ratings, label for affiliate links, personal data on orders |
| O15 | C20, M23 | Product rating scale, edit, merchant reply |
| O31 | C08, C09 | Whether a tour shows a reference price or a third-party provider |
| O35 | home, N02 | Launch minimum content per language |
| O34, O40 | N09, N12 | Cash the partner holds, reconciliation, limits |
| O36 | C15 | Whether a guest may cancel an order that sits on a partner handover |
| O39 | M17, N17 | Latency value is set (about 60 s, cap 5 min). Preview is an `ssr:false` route (ruling D6) |
| O14 | N20, N21 | Retention and consent text for the event log |

## Decisions

No question is open. Each row records who settled it. Answers carry the owner's date. Rulings come from the orchestrator, after the first version of this document asked the question.

| Id | Question | Settled as | By |
| --- | --- | --- | --- |
| D1 | Render mode of `credits`, `search`, `plan`, and where the ranked feed lives | `credits`, `search`, and `plan` (the advice form) are `ssr:false`. No places list page exists. The ranked feed lives on `/$lang` | Orchestrator ruling, 2026-10-26 |
| D2 | How to hide `store/products/categories.tsx` and `store/requests/private.tsx` | Extend the ADR-012 dormant pattern to the categories and private-tour screens and their components (`categories-page.tsx`, `subcategory-sheet.tsx`, the private-tour request screens) | Orchestrator ruling, 2026-10-26 |
| D3 | Route prefix of partner handover screens | `/handover/...` | Orchestrator ruling, 2026-10-26 |
| D4 | Where the tour editor lives, and the group name | The tour editor moves to `/store/content/tours`. The group "Marketing" is renamed Content and holds Stories, Places, Tours, Media, Comments, Reviews, and Inquiries | Owner answer, 2026-10-26 |
| D5 | Guest phone tabs | Explore, Map, Keepsakes, Account at launch of the map. Until E4.6 the tabs stay Explore, Keepsakes, Tours, Account, and Map replaces Tours (gate G-S5-MAPTAB) | Owner answer, 2026-10-26; sequence 2026-10-27 |
| D6 | Where a merchant previews a draft | An `ssr:false` preview route that reuses the public components, so drafts never enter the shared cache | Orchestrator ruling, 2026-10-26 |
| D7 | Map chips | Chips come from merchant-edited map categories and highlight the chosen category and dim the other pins. No pin is ever hidden by a chip. A pin has no fixed type, publishes without a story, and may have dates. Places and events have no page of their own, and guests do not review places (gate G11) | Owner answer, 2026-10-26 (chips that highlight and dim), kept for map categories on 2026-10-27 |
| D8 | Onboarding form | Full-screen flow on a guest's first visit at the home (N01). A small non-blocking prompt on a deep link, a partner QR or link, or a search landing (N24). Guests only. Closing N24 hides it for the visit and is not a skip. Reopen on the Account tab and the home line | Approved in chat on 2026-10-28, `docs/decisions/2026-10-28-onboarding-full-screen.md` |
| D9 | Onboarding design | N01 is F1 "Guided" (final). N24 is N2, a card floating at the top and never inserted into the content, on story pages only (final). Skip on step 1 goes to step 2. Close in change-my-answers mode keeps the changes | Chosen in chat on 2026-10-28, `docs/ux/onboarding-design.md` |
| D10 | Map and pins design | Approved on 2026-10-28: guest map and pin card as option B "Cards", merchant pins list, and merchant editor as option S "Steps". The differences from the PRD were settled the same day (Google Maps link, several photos, Categories sheet, Map and List switch, details sheet); only the folded credits stay open. N23 and N18 are not designed | Approved in chat on 2026-10-28, `docs/decisions/2026-10-28-pins-and-map-design.md`, `docs/ux/pins-design.md` |

Assumption that no source states: Stories and Tours are reached from Explore, because they no longer have a tab. The UX checklist should confirm it.

## Judgement calls made in this document

- The SM-3 funnel reuses the existing Conversion page. SM-1 and SM-2 are new pages. A single tabbed analytics page would also fit (§13.1 does not say).
- The Reviews page shows product ratings only. Story comments keep their own page.
- Verdict boundary: removing booking or price from a screen and moving it under `/$lang` is Keep. A change a user notices is Redesign.
- Tracks. The referral link `/r/$code`, shell, auth, and report layout are Platform. Tour information and the advice form are Track 1. Partner report and handovers are Track 2.

## Verification

Run on 2026-10-26 with `python3` (the script is not committed).

- Route files under `front-end/src/routes`: 89. Of those, 17 are `lab.*` and 72 are inventoried. Each of the 72 appears exactly once in table 1, matched as a fixed string. No file is missing or extra.
- Every AC id in tables 1 and 2 exists in the PRD §15 tables. The twelve removed ids (AC06, AC07, AC20 to AC23, AC27, AC28, AC35, AC40, AC56, AC57) are absent from those tables, so a citation would have failed.
- Every O id, ADR id, and PRD section cited exists. Every new screen cites a PRD section, and every one except N01 also cites an AC.

The 28.10.2026 amendment is checked by `scripts/build-screen-inventory.mjs`: every row has a known slice and UI work value, the slice index counts match the rows, and each slice's "Blocked by" matches the "Blocks" column of the open items table. The slice and UI work assignments themselves are judgement calls, not owner decisions.

The 27.10.2026 amendment was checked by reading the decision record. The counts were updated by hand. The AC ids AC85 to AC90 exist in the PRD (section 15) and were read against it.

Not verified: that a route listed as Keep has no booking import beyond the files named in ADR-012 (a `tsc` run after the move will list them), the content of the 17 lab files beyond their imports, and the guest-side behaviour in a running app. No code was run in the app, and nothing here was checked against the owner's reference images.
