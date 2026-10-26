# Prototype progress

Superseded on 26 October 2026 by PRD v3. Screens are tracked in docs/development-plan/screen-inventory.md, and work in docs/development-plan/delivery-plan.md (one story per screen slice). Kept for history.

How we work: one step at a time. I build a step, check it in the browser at 375px in EN and DE, and stop. You review it on the local Vite dev server (`cd front-end && npm run dev`), I revise it, and then I start the next step. A step is ticked only after your OK. The Artifact link is updated only when you ask for a client build.

- Client preview link (private until shared, updated on request): https://claude.ai/artifact/3WgnyLf32Gtux2sy8qpJXf
- Code: `front-end/` · Spec: `docs/ux/ux-spec-phase1.md` · Design system: `docs/ux/design-system/project/`

Status: `[ ]` not started · `[~]` built, waiting for your review · `[x]` approved · `[!]` not approved, follow-up below

## Setup

- [x] React + HeroUI v3 + TanStack Router project, Swiss Keepsakes theme, EN/DE, hosting test

## Phase 1: Gift request to payment (guest → merchant → partner)

Spec §4.2, §4.6, §4.7 · Scenarios S1–S5

- [x] 1.0 Flow 1 outline: screens, states, mock data and click path ([flow-1-outline.md](flow-1-outline.md)), v2 after self-review against PRD and spec
- [x] 1.1 Foundation: mock data and shared store, demo clock, guest and merchant app shells, prototype bar with role, language and Reset only (other prototype controls arrive with the step that needs them)
- [x] 1.2 C01 Discovery home: hero and available categories, each opening its list page
- [x] 1.3 C02 Gifts list
- [x] 1.4 C03 Gift detail (variant, engraving, quantity, pickup date and place) · Airbnb listing layout: photo gallery with fullscreen viewer (shared), centred title + one-line subtitle, stats row (earliest pickup · laurel rating, widest · reviews), seller host row (store icon; sheet with call, email, directions, visit shop), highlights, About with the demo story (Kapellbrücke knife only, story sheet), reviews (laurel score, cards with avatars and "Purchased on", all-reviews sheet with rating bars, 5–10 sample reviews per gift, some with photos), accordion (places, pickup date, cancellation, payment); choices in a bottom sheet (option cards, Airbnb quantity row, engraving, full-width calendar with pale-day reasons, place); sticky price bar. Labs: /lab/quantity (B chosen), /lab/seller (B chosen). Ink softened to #33312E; card overlays use the Airbnb pill (white 80% + blur). Open: DS tokens.json still #1A1A1A; another session works on cart/sign-in/mail in parallel (shared DEMO_VERSION, i18n files)
- [x] 1.4b Owner request: add-to-cart feedback (item flies into the cart, badge bump, 'Added to cart' toast with View cart) · report: [reports/1.4b.md](reports/1.4b.md)
- [x] 1.5 C04 Cart (grouped into orders) · built in the parallel run, report: [reports/1.5.md](reports/1.5.md)
- [x] 1.5b Owner request: reusable confirmation dialog for every delete, remove or cancel (first on removing a cart line) · report: [reports/1.5b.md](reports/1.5b.md)
- [x] 1.5c Owner request: cart line redesigned as lab option L Gift slip, cards on the shared M02/M03 surface (in progress) · report: [reports/1.5c.md](reports/1.5c.md) · built in the parallel run, report: [reports/1.5c.md](reports/1.5c.md)
- [x] 1.5d Owner request: flat cart list with selection (none selected by default), split into orders on C06 only, info Alert, shared QuantityBox (in progress) · report: [reports/1.5d.md](reports/1.5d.md) · built in the parallel run, report: [reports/1.5d.md](reports/1.5d.md)
- [x] 1.5e Owner request: cart line details (store, highlighted price, two pickup rows), pricing breakdown sheet with Select all in the bar, tinted info Alert, bottom spacing fix (in progress) · report: [reports/1.5e.md](reports/1.5e.md) · built in the parallel run, report: [reports/1.5e.md](reports/1.5e.md)
- [x] 1.5f Owner request: option and engraving as a metadata row on the cart line; bottom spacing fixed on C06, C07 and other screens with a bottom bar (in progress) · report: [reports/1.5f.md](reports/1.5f.md) · built in the parallel run, report: [reports/1.5f.md](reports/1.5f.md)
- [x] 1.6 C05 Sign-in sheet (Google or email code, simulated) · built in the parallel run, report: [reports/1.6.md](reports/1.6.md)
- [x] 1.7 C06 Review and send request · built in the parallel run, report: [reports/1.7.md](reports/1.7.md)
- [x] 1.7b Owner request: C06 Review and send restyled like the cart lines · report: [reports/1.7b.md](reports/1.7b.md) · built in the parallel run, report: [reports/1.7b.md](reports/1.7b.md)
- [x] 1.8 C07 Request sent (+ optional trip profile) · built in the parallel run, report: [reports/1.8.md](reports/1.8.md)
- [x] 1.9 M02 Merchant Today · built in the parallel run, report: [reports/1.9.md](reports/1.9.md)
- [x] 1.10 M03 Merchant gift orders list · built in the parallel run, report: [reports/1.10.md](reports/1.10.md)
- [x] 1.10b Owner request: M03 order cards redesigned as lab option L Pickup ticket, then card surface matched to M02 (1.10c) · reports: [1.10b](reports/1.10b.md), [1.10c](reports/1.10c.md)
- [x] 1.11 M04 Merchant order detail: accept, change date/place, decline · built in the parallel run, report: [reports/1.11.md](reports/1.11.md)
- [x] 1.12 C14 My transactions · built in the parallel run, report: [reports/1.12.md](reports/1.12.md)
- [x] 1.13 C15 Guest order detail · built in the parallel run, report: [reports/1.13.md](reports/1.13.md)
- [x] 1.14 C12 Payment (simulated provider: success, failure, processing) · built in the parallel run, report: [reports/1.14.md](reports/1.14.md)
- [x] 1.15 M04 continued + M08 Record payment sheet: ready, handed over, complete · built in the parallel run, report: [reports/1.15.md](reports/1.15.md)
- [x] 1.16 C18 Write a review (only after completion) · built in the parallel run, report: [reports/1.16.md](reports/1.16.md)
- [x] 1.17 P02 Partner report (basic: totals, product groups, transactions) · built in the parallel run, report: [reports/1.17.md](reports/1.17.md)
- [x] 1.18 Flow check: S2 and S4 in full, the flow-1 parts of S1, S3 and S5 (see outline §8), all side paths, in EN and DE, keyboard and error states · built in the parallel run, report: [reports/1.18.md](reports/1.18.md)
- [x] 1.19 Review gallery: screenshots of every screen built in the parallel run, in one HTML page where the owner marks each item approved or not approved with a comment ([screens/phase1-review/index.html](screens/phase1-review/index.html)) · reports: [1.19a](reports/1.19a.md), [1.19b](reports/1.19b.md), [1.19c](reports/1.19c.md)

Also done during 1.2–1.3 (owner requests, see decisions.tsv): native-app guest frame (430px, tab bar, collapsing header), photo category tiles, shared ProductCard (layout D, favourite heart, rating), short dates "Wed 14 Oct", global search (/search) and scoped search (back + field in the top bar), light field focus, business-type rail (Gifts, Tours, Stays, Experiences), trip-advice CTA layout J, Lab pages at #/lab.

## Review follow-ups ([review history](screens/phase1-review/index.html): round 1 [verdicts](screens/phase1-review/round1/verdicts.json), round 2 [verdicts](screens/phase1-review/round2/verdicts.json), round 3 all approved in chat 2026-10-14)

Skill rule: evon:ui-ux for dashboard and analytics screens, impeccable for all others.

- [x] I0 impeccable init: PRODUCT.md from the PRD and UX spec (shared context for impeccable redesigns)
- [x] 1.6r Sign-in screen: two columns, form and Lucerne hero, Google or email code (impeccable) · from 1.6 · built in the parallel run, report: [reports/1.6r.md](reports/1.6r.md)
- [x] 1.12r Account hub: orders, bookings, payment info, profile (impeccable) · from 1.6 and 1.12 · built in the parallel run, report: [reports/1.12r.md](reports/1.12r.md)
- [x] 1.12s Account hub redesigned in the Instagram/Facebook settings style (grouped rows, sub-screens, proper Payments), avatar upload (impeccable) · owner follow-up on 1.12r · built in the parallel run, report: [reports/1.12s.md](reports/1.12s.md)
- [x] 1.12t Default avatar for the demo guest (DiceBear, same set as the reviewer avatars); also fixed the Account crash in 1.12s · report: [reports/1.12t.md](reports/1.12t.md)
- [x] 1.8r C07 Request sent reusing the C06 components, sections made consistent (impeccable) · from 1.8 · built in the parallel run, report: [reports/1.8r.md](reports/1.8r.md)
- [x] 1.13r C15 Guest order detail with tabs instead of one long page (impeccable) · from 1.13 · built in the parallel run, report: [reports/1.13r.md](reports/1.13r.md)
- [x] 1.9r M02 Today as a widget dashboard (evon) · from 1.9 · built in the parallel run, report: [reports/1.9r.md](reports/1.9r.md)
- [x] 1.9s M02 becomes Overview: Today plus Analytics (KPI group, Recharts composed chart, breakdowns), HeroUI Pro dashboard references (evon) · owner follow-up on 1.9r · built in the parallel run, report: [reports/1.9s.md](reports/1.9s.md)
- [x] 1.9t Dashboards: every KPI and tile as its own card (Overview Today, Overview KPIs, P02), round up-right arrow buttons instead of chevrons, all-time summary widget on Overview and P02 (evon) · owner follow-up · built in the parallel run, report: [reports/1.9t.md](reports/1.9t.md)
- [x] 1.11r M04 Merchant order detail: whole flow redesigned (evon) · from 1.11 · built in the parallel run, report: [reports/1.11r.md](reports/1.11r.md)
- [x] 1.15r M04 fulfilment and M08 Record payment in the new M04 style (evon) · from 1.15, after 1.11r · built in the parallel run, report: [reports/1.15r.md](reports/1.15r.md)
- [x] 1.17r P02 Partner report with widgets and charts (evon) · from 1.17 · built in the parallel run, report: [reports/1.17r.md](reports/1.17r.md)

- [x] 1.13s C15: every card on the shared shadow surface (rounded-3xl, shadow-surface), no solid borders (impeccable) · round 2 review of 1.13r · built in the parallel run, report: [reports/1.13s.md](reports/1.13s.md)
- [x] 1.13t Posted review on C15 without a bordered box (shared surface or borderless inset) · follow-up of 1.13s · built in the parallel run, report: [reports/1.13t.md](reports/1.13t.md)
- [x] 1.11s M04 and fulfilment: key-facts group as standalone cards like the Overview and P02 dashboards, no vertical dividers (evon) · round 2 review of 1.11r and 1.15r · built in the parallel run, report: [reports/1.11s.md](reports/1.11s.md)
- [x] 1.9 M02 Overview: round 2 screenshot was broken (tours text keys missing at capture time); recaptured for round 3
## Later phases (expanded into steps when we reach them)

- [x] Phase 2: Tour booking: C08–C13, C16, M05–M07 (15-minute hold, expiry, no-show) · [focused Phase 2 checklist, draft for review](todo-phase2.md) · **closed 14 Oct 2026**, every step approved ([review history](screens/phase2-review/index.html))
- [ ] Phase 3: Money operations: M09 adjust, M10 cancel and refund, refund states on C15/C16
- [ ] Phase 4: Discovery and content: rest of C01 (time-based blocks, tours, stories, advice), C19–C23, M11–M14, M17–M20, M23 · next, before Phase 3 · [Phase 4 checklist, draft for review](todo-phase4.md)
- [ ] Phase 5: Partners and reports: M15, M16, P01, full P02, M21, M24 · started 2026-10-14, alongside Phase 4 · [Phase 5 checklist, draft for review](todo-phase5.md)
- [ ] Phase 6: Onboarding and admin: M01, M22, A01, A02

## Open decisions

| # | Question | Default until you decide |
| --- | --- | --- |
| D1 | Progress bars in ink instead of red (agent change on the design system) | Ink |
| D2 | Toasts with an action or an error stay until closed (agent change) | Stay until closed |
| D3 | Default language (spec R01) | English |
| D4 | Phase order: start with gift flow, or show discovery (Phase 4) first for the look | **Decided 2026-10-14:** gift flow, then tours, then Phase 4; Phase 3 deferred |
| D5 | Client demo date | None set |
| D6 | Discovery home as the platform home page, showing available categories | **Decided:** C01 built in flow 1 (step 1.2) |
| D7 | Engraving: required or optional, fee, max length, extra preparation time (PRD §7.2 open) | **Decided:** optional, free, 12 characters, within the 3 working days |
| D8 | First-payment deadline after acceptance (R05) | **Decided:** 24 hours |
| D9 | Preparation days count from the request date (the seller re-checks at acceptance) | **Decided:** from request |
