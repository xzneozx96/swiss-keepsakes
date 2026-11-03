# ADR-032: Send anonymous visitor events to PostHog EU, read by our team in PostHog

Status: accepted
Date: 2026-11-03
Supersedes: ADR-007
Source: gate G-S8-D6, G-S8-ADR032, G-S8-SEGMENT, G-S8-CONSENT, G-S8-DEP-POSTHOG
Applies to: `front-end/src/lib/analytics/`, `packages/api-contract/`, `api/src/modules/analytics/`, `api/src/modules/reporting/`, `api/migrations/`

Supersedes ADR-007. It also replaces ADR-020 apart from the per-day order counter, which stays (see the amendment on ADR-020). `adr.ts` takes one id in `Supersedes:`, so ADR-020 is amended instead of marked superseded.

New dependency: `posthog-js` 1.444.4 (version from the research of 2026-11-03). The owner approved it with this ADR on 2026-11-03 (gate G-S8-DEP-POSTHOG). It is front-end only. `posthog-node` is not used. This reverses gate D2 of 2026-10-26 (no third-party analytics tool).

## Context
ADR-007 and ADR-020 record anonymous events in our own database. The table holds no identifier, time is cut to the hour, CHECKs close every value, and `order_submit` is never stored. The owner chose that design on 2026-10-26 (gate D2) and rejected Plausible and GA4.

On 2026-11-03 the owner reversed the choice (gate G-S8-D6). Anonymous visitor events go to PostHog EU cloud. Our team reads PostHog's own dashboards. The question "who reads the numbers" was answered "Our team, in PostHog". The merchant does not read them in our app.

That removes the reason for most of the own-log build. The in-app reports E8.8 to E8.11 would need a server adapter to PostHog's query API (240 requests a minute, 3 at once, 10 seconds) and a cache. Without merchant-facing reports, none of that is needed.

The research of 2026-11-03 (`.factory/runs/20261103-sprint8/research/posthog-vs-own-log.md`) says PostHog fits with conditions. It also lists what the own log gave and PostHog cannot: hour-only time, database-enforced closed values, an `order_submit` that is never stored, no IP at the vendor, and no segment or interests at a third party. The researcher recommended keeping the own log for sprint 8. The owner decided otherwise, so this ADR records the conditions that keep the loss small.

## Decision
We will send anonymous visitor events to PostHog EU cloud and read them in PostHog's dashboards. We will not build in-app merchant event reports.

**Client settings**
- Host `eu.i.posthog.com`.
- `persistence: 'memory'`. Nothing is stored on the device.
- `person_profiles: 'never'`.
- Autocapture, session recording, surveys and feature-flag requests are off.
- One config switch turns sending off. The callers do not change.

**Project settings**
- "Discard client IP data" is on.
- Retention is set with PostHog's organisation setting. The value is open (O14).

**Allow-list in `before_send`**
- Event names are closed. They are `page_view`, `pin_open`, `pin_to_story_click`, `story_view`, `product_view` and `outbound_click`.
- Property names and values are closed. They come from the contract in `packages/api-contract`.
- Segment and interests are sent, as closed values only: the anonymous audience values from the onboarding answers, never free text (owner gate G-S8-SEGMENT, 2026-11-03). The lawyer reviews this with O32 and O33.
- `before_send` drops the URL, path, referrer, user agent and every other `$` property. An event that breaks the list is dropped, not repaired.
- No account, order, partner or referral id goes on an event.
- Referrer class and device class are derived in the browser, as in ADR-007.

**Orders**
- `order_submit` is not sent to PostHog.
- A per-day counter stays in our database as `daily_funnels` (DM-10). It is the only analytics table we keep. `analytics.record_order_submit` stays, and the raw `events` table and the roll-up job go.

**Network**
- No reverse proxy at first. We accept the loss from ad blockers. We revisit if the numbers look thin.

**Consent**
- Sending is on for dev and staging. The switch is off for production until O32 is answered in sprint 17 (owner gate G-S8-CONSENT, 2026-11-03). The answer then uses PostHog's opt-in and opt-out calls.

**Before production**
- The owner signs PostHog's DPA.
- The lawyer reviews the segment and interests values with O32 and O33.
- The sub-processor list and a Swiss nFADP check by the lawyer are done.

## Consequences
**Lost from ADR-020**
- Time is exact to the millisecond at PostHog, not to the hour.
- The database no longer enforces the closed values. Only our `before_send` does, so a bug in it can leak a property.
- The IP address reaches PostHog's edge. We rely on the project setting to keep it from storage.
- Funnels and SM-3 across a session now live at the vendor. Our own table keeps the per-day order count only.
- Data sits at a third party, and the gate D2 rule "no third-party analytics tool" no longer holds.

**Gained**
- No endpoint, event table, roll-up job or retention job for events. E8.7a shrinks to the daily counter.
- PostHog's dashboards, funnels and breakdowns need no build.
- Free up to 1 million events a month. We expect 100,000 to 300,000.

**Work that follows**
- New dependency `posthog-js`. The server SDK is not needed.
- The plan rows E8.8 to E8.12 are rewritten or dropped. E8.7 is rewritten as the sender plus the daily counter.
- DM-10 needs an amendment, by the db-designer later. The `events` and `daily_counts` tables are no longer planned, and `daily_funnels` stays.
- backend.md D13 and the PRD wording for G4 and AC37 are updated.
- T-E8.7a and T-E8.7b stay on hold until the owner approves this ADR.

## Assumptions
- Our team, not the merchant, reads the numbers. If the merchant needs them in the app, option B below comes back.
- The `before_send` allow-list is the only guard. It is tested against the contract, and a property outside the list never leaves the browser.
- "Discard client IP data" works as PostHog documents. Not verified.
- `persistence: 'memory'` sets no cookie and writes no storage. The lifetime of `$session_id` in memory mode is not verified.
- Event volume stays under the free tier.
- The lawyer accepts PostHog EU as a processor under the nFADP and the GDPR.

## Considered options
- **A. Own event log (ADR-007, ADR-020).** Enforced by the database and no new vendor. Cost: we build the endpoint, roll-up and reports. Superseded, because only our team now reads the numbers.
- **B. PostHog with an in-app adapter and cache.** The merchant keeps reports in our app. Cost: a server adapter, a cache, a `store_id` property, a reverse proxy and posthog-node, for reports nobody asked for now. Rejected. Revisit if the merchant needs in-app numbers.
- **C. PostHog read by staff only (chosen).** Least to build. Cost: the losses listed under Consequences.

## History
- 2026-11-03 proposed (gate G-S8-D6)
- 2026-11-03 accepted by the owner 2026-11-03 (gate G-S8-ADR032)

## Amendments
- 2026-11-03: a signed-in Super Admin browsing the guest site sends nothing, the same as a merchant (store member). The browser learns this from `platformAdmin` on `GET /api/me`. Until that answer is known the gate stays closed. Source: owner 2026-11-03.
