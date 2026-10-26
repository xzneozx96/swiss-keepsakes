# ADR-007: Collect SM-1 to SM-3 events in a first-party anonymous event log

Status: accepted
Date: 2026-10-26
Source: AD-8
Applies to: `api/src/modules/analytics/`, `api/src/modules/reporting/`, `api/src/platform/http/`, `front-end/src/lib/analytics/`, `packages/api-contract/`

No new vendor or paid service. The owner chose the first-party event log and rejected Plausible and GA4 on 2026-10-26 (gate D2). This replaces the Plausible and GA4 parts of backend.md D13 for Phase 1. Sentry EU stays. The retention period and the lawyer's consent check are still open.

## Context
The owner chose three success metrics (Q28): visits and search traffic (SM-1), map engagement (SM-2) and story-to-shop conversion (SM-3). G4 lets the anonymous stay segment and interests travel with events, but never with an account, an order or a persistent identifier. The merchant dashboard (PRD §13.1) must show traffic by page, pin opens and the story-to-order funnel inside our own app. AC60 lists the events: `page_view` (with source), `pin_open`, `pin_to_story_click`, `story_view`, `product_view`, `order_submit`.

Two persistent identifiers exist elsewhere. GA4 sets a client id cookie (D13, after consent). The referral link sets a `visitor_id` cookie that lives 30 days for commission (backend.md section 5, `referral_visits`). Either one next to segment data breaks G4.

## Decision
We will record events in our own database through one endpoint, with no persistent identifier.

- **Endpoint.** `POST /api/public/events` takes a batch, validates it against an allow-list schema, rate-limits per IP, and sets no cookie. The browser sends it with `fetch` using `keepalive: true` and `credentials: 'omit'`, because `sendBeacon` sends cookies. The route is mounted before `authenticate`, never reads `Cookie`, and logs no client address.
- **Allow-list.** The event names are the six of AC60 plus `outbound_click` (ADR-011). The list lives in `packages/api-contract`, and a new event needs a contract change.
- **Fields.** Event name, content type and ids (place, story group, keepsake), page language, referrer class (`search`, `partner`, `social`, `direct`, `other`, derived in the browser from `document.referrer` and `utm_*`), optional `segment` and `interests`, a coarse device class, and a random session id.
- **Session id.** Random, kept in memory only, so it dies on reload or tab close. It is never written to storage, never sent to another endpoint and never stored with an order. SM-3 therefore measures within one page load chain (single-page navigation), which matches how the SPA works.
- **Never stored or sent.** Account id, order id, referral `visitor_id`, partner id, IP address (even hashed), email, review text, the cart, the raw user agent. `order_submit` carries the event name and the session id only. Partner sales figures come from orders, not from events.
- **Segment and interests** go only to this endpoint. No third-party analytics tool is loaded (gate D2).
- **No joins.** No view or report joins event rows to orders, identity or partners below aggregate counts.
- **Storage and reports.** A worker job rolls events up. `reporting` views read the roll-ups for the dashboard. Raw events keep for a period that the owner and the lawyer set (proposal: 14 months).
- **Search traffic.** Referrer class gives SM-1's search share. Search Console (free, Google) covers queries and impressions and needs no code.

## Consequences
- The dashboard needs no third-party API, and the merchant sees the same numbers we do.
- We own bot filtering and event volume. A visitor who blocks first-party requests is lost. Adblockers rarely block a same-origin path.
- Referrer class under-counts search from apps that strip the referrer. SM-1 is a lower bound.
- No cross-device or returning-visitor measure exists, which matches Q28 (returning visitors were not chosen).

## Assumptions
- Anonymous counting with an in-memory session id needs no consent banner. The EU rule covers anything stored on or read from the device (ePrivacy Art. 5(3), EDPB Guidelines 2/2023), and the EU has no analytics exemption in force. Whether an in-memory id and no stored data fall outside it is for the lawyer (O14, O32). A "consent is needed" answer moves event sending behind the consent state.
- Event volume stays low (pilot, thousands of events a day), so Postgres handles it.
- The owner accepts a dashboard that is ours and not a vendor's (gate D2).
- Plausible has no free plan. Custom properties, funnels and the Stats API are listed on the Business plan (USD 19 a month at 10,000 pageviews, per the currency check).

## Considered options
- **A. First-party event log (chosen).** No new vendor, G4 holds by construction, data sits next to orders for SM-3. Cost: we build the endpoint, the roll-up and the views.
- **B. Plausible EU only. Rejected by the owner (gate D2).** Cookie-free and already in D13 (a paid plan is needed for the features SM-3 uses). Custom properties carry the segment. Custom properties, funnels and API access need the Business plan, and the dashboard would live outside our app or use its API. A valid choice if the owner prefers to buy.
- **C. GA4 with consent. Rejected by the owner (gate D2).** Free, but its persistent client id contradicts G4 if segment travels with it, and sampling and consent loss undercount SM-2 and SM-3. Rejected for SM events.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
