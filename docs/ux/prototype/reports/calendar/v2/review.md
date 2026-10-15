# Merchant calendar — calendar-only replacement

Status: UI prototype ready for owner review; not owner-approved or connected to merchant data. The previous A/B/C layouts were all rejected and are historical evidence only.

## Direction

The calendar is the whole screen. A compact toolbar offers date selection, Today and previous/next period. Day/Week/Month switches sit at the bottom on mobile and in the toolbar on desktop. No dashboard cards, filters, introductory content or persistent detail sidebar.

FullCalendar React supplies date layout, with custom event content, date cells, headers, controls and project colours. Tap a month date or overflow link to open Day. Tap an event to open its detail sheet. Mobile Week preserves seven days, initially reveals the active date and scrolls horizontally with time labels retained. Pickups use compact untimed chips. Month/Day support touch swipes; reduced-motion preferences remove the drag transform.

Interaction reference: [Google Calendar view switching](https://support.google.com/calendar/answer/6110849?hl=en) and [Android calendar navigation](https://support.google.com/calendar/answer/6110849?co=GENIE.Platform%3DAndroid&hl=en).

## Verification

- Scoped ESLint, TypeScript and Vite production build pass. Existing large MapLibre chunk warning remains.
- Browser checked Month/Week/Day at widths 375, 390, 768 and 1440: no page horizontal overflow. Calendar begins at 66px on mobile and 76px on desktop.
- Previous/next month, Today, date picker selection, keyboard Enter on date, Day drilldown, event sheet and Escape dismissal pass.
- German Day/Week/Month controls checked at 375px without overflow.
- Chromium touch emulation verified Month swipe advances October to November. This is browser emulation, not physical-device verification.
- Week scroll verified within viewport (375px viewport, 760px calendar). Selected date is brought into view on entering Week or changing date.
- No page errors in the final 12-view responsive/navigation check.
- Impeccable detector returned no findings. Visual review initially requested fixes to Week positioning/density and event-sheet heading; corrections and recaptures scored resolved. Final reviewer: **disposition: ship** (covers the scored fixes; owner approval remains pending).

## Captures

- [Month mobile](Month-mobile.png), [desktop](Month-desktop.png)
- [Day mobile](Day-mobile.png), [desktop](Day-desktop.png), [German mobile](Day-mobile-de.png)
- [Week mobile](Week-mobile.png), [desktop](Week-desktop.png)
- [Date picker](date-picker-mobile.png), [event details](event-mobile.png)

## Boundaries

Synthetic October 2026 schedule, fixed demo Today of 15 October, Europe/Zurich time. Preview notice appears inside sheets to keep the calendar uncluttered. Business fixture titles/statuses remain English; navigation controls support EN/DE. No real bookings, writes, availability checks, rescheduling, payments or order mutations. Final visual direction awaits owner review.
