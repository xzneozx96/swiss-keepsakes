# ADR-020: Shape the analytics event table so that it carries no identifier and no exact time

Status: accepted
Date: 2026-10-26
Source: DM-10
Applies to: `api/src/modules/analytics/`, `api/src/modules/reporting/`, `packages/api-contract/`, `front-end/src/lib/analytics/`, `api/migrations/`

No new dependency, vendor or paid service. It refines ADR-007 (fields, session id, no joins) and answers gate D2 and G4 in the table design. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-10.

## Context
ADR-007 lists the fields of an event and says no view joins events to orders, identity or partners below aggregate counts. A column list without ids still allows a join by time. An `order_submit` event with a second-precise time matches one row of `orders.orders.created_at`. A stored path or URL can carry a partner token (`/partner/{token}`, D7) or a referral code (`/r/:code`).

## Decision
We will make the table unable to hold what a join needs.

- No column for account, guest, order, partner, referral, visitor, email, IP address, user agent, URL or path. No foreign key into or out of the `analytics` schema.
- Time is stored as `bucket_hour`, a timestamp cut to the hour, and a CHECK enforces it. Order inside a session comes from `seq`, a counter the browser keeps in memory. The key is `(session_id, seq)` and there is no surrogate id, because an identity column would put events in insert order within the hour.
- `session_id` is a random uuid made in the browser memory and never stored there. The key `(session_id, seq)` removes the duplicates that a retried batch sends.
- Every categorical column has a CHECK on a closed list: event name, page type, language, referrer class, segment, device class. Interests must be a subset of the four fixed codes.
- A shape CHECK ties each event to the content it may carry. Pin and outbound events carry a place id. A story view carries a story group id. A product view carries its product id (owner decision M5, 2026-10-26).
- An `order_submit` is never stored. The function `analytics.record_order_submit(session)` reads the session's first event for its referrer class and segment, adds one to `order_submits` in `daily_funnels` for today, and adds one to `order_sessions` when the session read a story and then opened a product. The row has no session, order or time finer than the day.
- Raw events are read only by the roll-up job. `reporting` reads `analytics.daily_counts` and `analytics.daily_funnels`, which hold counts. A retention job deletes raw rows by `bucket_hour`.

## Consequences
- The dashboard can show traffic by hour and day, not by the minute. Funnel order inside a session still works.
- A reader of the database cannot match an event to an order, even with write access to both.
- No stored key and no stored time can match a session to an order, so gates D2 and G4 hold for stored links. A day's funnel count can be 1 in a quiet week. That is a count, which the gates allow, and the data model asks whether the dashboard hides counts below a threshold.
- A per-product view count stays available (owner M5).
- ADR-007 listed `order_submit` as an event with the session id. This ADR counts it per day and never stores it, as the owner decided (M5, 2026-10-26: purchases are counted per day and never stored per session). ADR-007 keeps the keepsake id on product events, so only the order submit differs. The architect owns ADR-007, so this note and the data model carry the change.
- **Accepted residual risk (owner M5).** A product id and an hour together let a reader who knows an order's products guess which session viewed the product that was later bought, most easily in a quiet hour of the pilot. No stored row links a session to an order, and the owner accepted the guess.
- Adding a new event or a new column is a migration and a contract change.

## Assumptions
- Raw event volume stays near thousands a day, so no partitioning is needed (the threshold is 100 million rows).
- Retention of 14 months is the proposal (O14) and the owner and lawyer set the final value.
- The browser derives the referrer class and never sends the referrer URL.
- Whether an in-memory session id needs consent is a lawyer question (O14, O32). If consent is needed, the browser stops sending, and the table does not change.

## Considered options
- **Store `occurred_at` to the second.** Gives exact ordering and a correlation channel to orders. Rejected.
- **Store `order_submit` with a bare session id and an hour.** Matches ADR-007 and still lets a reader guess the session of a single order in a quiet hour. Rejected, because the gates forbid it.
- **Hash the session or partner id.** A hash of a persistent value is still persistent. Rejected, there is no such id.
- **Postgres roll-ups only, with raw events kept 30 days.** A shorter window lowers the exposure, and the owner may choose it when setting O14.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
