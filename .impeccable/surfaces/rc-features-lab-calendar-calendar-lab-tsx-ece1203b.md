---
version: 1
slug: "rc-features-lab-calendar-calendar-lab-tsx-ece1203b"
primary_target: "front-end/src/features/lab/calendar/calendar-lab.tsx"
related_targets: ["front-end/src/features/lab/calendar/calendar.css"]
---

# Merchant calendar — calendar-only direction

Mode: Operate. Target: `/lab/calendar`. Owner rejected all previous A/B/C options on 15 October 2026. The current direction follows the owner's explicit request for a full-screen calendar, date selection, period navigation and day/week/month views with mobile-native behavior. This is a local lab redesign within the existing Swiss Keepsakes visual system, not a global brand replacement.

## Direction contract

THESIS: The calendar is the screen. Remove the dashboard frame, intro, comparison cards, metrics, filters, search and persistent daily list. Details appear only after an event is selected.

OWN-WORLD: Inherit the project's white surface, charcoal text, Swiss red selected date, Inter controls and subdued tour/pickup colours. Quiet grid rules; custom React calendar content; no stock FullCalendar palette.

STORY: Scan the schedule, change day/week/month, jump to a date, navigate periods, and tap an event for details. Google Calendar supplies the familiar interaction reference; touch-first hit areas and a dismissible sheet carry the mobile behavior.

FIRST VIEWPORT: One compact toolbar at the top. The calendar fills all remaining space. Mobile view switching sits within thumb reach at the bottom; desktop puts it in the toolbar. No page scroll to reach the calendar.

FORM: One owner-specified canonical calendar direction. Seed: not applicable to the precisely specified familiar-product direction. Mobile Week remains a week, with horizontal in-calendar scrolling when needed; Month tap opens Day.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Existing project tokens remain authoritative; this scoped surface does not write root DESIGN.md. No shipping raster assets are needed. Screenshots are verification evidence. Mock data, no server mutations. New direction awaits visual approval.

## Finish record

Visual review: initial disposition fix; Week positioning, pickup density and sheet title corrected. Scoring disposition: ship. Evidence and UI-only boundaries: docs/ux/prototype/reports/calendar/v2/review.md. This is a reviewable prototype, awaiting owner approval.
