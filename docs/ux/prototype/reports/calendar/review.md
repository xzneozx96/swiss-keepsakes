# Merchant Calendar lab review

Date: 15 October 2026. Historical report: **all A/B/C layouts rejected by the owner** for clutter and poor mobile-native focus. Superseded by the calendar-only direction documented in `v2/review.md`. The checks below describe the rejected build only.

Preview: http://127.0.0.1:5174/#/lab/calendar (Vite server for this review). Also linked from `/lab`.

## Decisions and scope

The owner chose FullCalendar React and custom calendar elements. The lab uses the already-installed `@fullcalendar/react` 7.1.2, custom React event/day content, custom controls, and project theme tokens. FullCalendar provides date layout and navigation. Its Monarch theme supplies structural styles with project token overrides; no stock palette is imported. Default event markers are suppressed. The prototype does not modify merchant navigation or real order/booking flows.

Model the Domain shaped the fixture: `CalendarItem` distinguishes timed tours from date-only pickups. Type System Discipline keeps tour time/guest fields separate from pickup quantities. Display choices and fixtures remain local to the lab.

| Direction | Main benefit | Cost | Review status |
| --- | --- | --- | --- |
| A · Month overview | Plan across a month with compact event rows | Busy days need the daily list | Initial lab view, not an approved product default |
| B · Week planner | See tour timing and date-only pickups separately | Less planning horizon; mobile shows one day | Candidate |
| C · Day workspace | More room for customer, location and operational context | Month uses activity dots instead of titles | Recommended for daily operations, awaiting owner selection |

All data is fictional. Demo Today is 15 October 2026. Calendar timezone is Europe/Zurich. Notes are read-only examples. No backend, persistence, payment changes, cancellation actions, attendance recording, drag/reschedule or real capacity reconciliation.

## Verified

- `npm run build` passed (TypeScript plus Vite). Vite retains the large-chunk advisory for the existing application bundle, including MapLibre.
- Scoped ESLint passed with no errors or warnings after autofix. Only new calendar sources and lab index were linted; no repository-wide autofix.
- `git diff --check` passed.
- Browser: all three options at 375, 768 and 1440px in EN and DE. All 18 combinations had document width equal to viewport width; screenshots use `{A|B|C}-{EN|DE}-{375|768|1440}.png`.
- Tours filter: 2 cards for 15 October. Order search `OR-2081`: 1 card; detail shows James Wilson, pickup location and Paid in full separately from operational status.
- Search with no match: empty state and clear-filters action. Empty day 18 October: 0 cards.
- Cancelled booking on 21 October: 1 card with Show cancelled, 0 when hidden.
- `+2 more` on 15 October: all 5 daily cards available. Enter on a focused daily card opens details; Close details removes the panel.
- Week switches between 7 desktop columns and 1 mobile column when resizing. Next week shows 19–25 October and synchronizes the selected day to 19 October. Today restores the demo date.
- Independent browser contexts in Asia/Bangkok and America/Los_Angeles: tour stays at 09:00 and week stays 12–18 October. Los Angeles month cell 16 selects Friday 16 October with 2 cards.
- Browser reported no console errors during the interaction run; one Vite development warning was present.

## Visual probe

Ran the project's `probe.mjs` at 375, 768 and 1440px; results and images are in `probe/`. This was a quick static probe; interaction checks above were performed separately.

The first probe flagged low search-placeholder contrast (P1). The placeholder now uses `--muted` at full opacity; secondary lab text was raised to 12px. The second probe reports **0 findings classified Hỏng**. Remaining advisories: small controls in the existing global prototype bar, the approved project border colour, dense daily cards, and the native date field on desktop. The date field is retained for this lab; the calendar grid, event content and toolbar layout are custom. These advisories are recorded rather than treated as a claim of a complete accessibility audit.

## Design authority and remaining work

Colours come from `front-end/src/styles/theme.css` and `docs/ux/design-system/project/tokens.json`; typography inherits the app. Calendar-specific token mappings live in `front-end/src/features/lab/calendar/calendar.css`. Light theme only. Core controls have EN/DE labels; variant descriptions and fixture business text remain English.

PRD §13.1a and UX spec §3.2a record the decision and limits. Next product decision is the preferred layout. Before implementation, decide whether tours group by departure, note persistence, real loading/error states, source-of-truth APIs and server permissions. Existing fulfillment, payment, refund and commission rules remain authoritative.
