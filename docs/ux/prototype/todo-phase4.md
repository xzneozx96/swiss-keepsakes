# Phase 4 prototype checklist

Superseded on 26 October 2026 by PRD v3. Screens are tracked in docs/development-plan/screen-inventory.md, and work in docs/development-plan/delivery-plan.md (one story per screen slice). Kept for history.

Draft for owner review, 14 October 2026. Build discovery and content: the rest of the guest home page, stories, trip advice, private-tour requests, the trip profile, and the merchant screens that manage products and content.

The owner chose on 14 October 2026 to build Phase 4 next and leave Phase 3 (money operations) for later. Phase 2 round 2 follow-ups stay open alongside this phase.

## Follow the review process

Work one step at a time, as in [the main checklist](todo.md). Build a step, check it in the browser at 375px in EN and DE, and stop for owner review. Revise that step before starting the next. Mark a step approved only after the owner's OK.

From 4.7 on (owner, 15.10.2026) the steps are built without stopping and reviewed together in the 4.19 gallery.

Status uses `[ ]` for not started, `[~]` for built and awaiting review, `[x]` for approved, and `[!]` for not approved with a follow-up below.

Use the local Vite preview with `cd front-end && npm run dev` from the project root. Update the client Artifact only when requested.

## Use the current sources

- [Main prototype checklist](todo.md), Phase 4 scope and review rules.
- [UX spec](../ux-spec-phase1.md), sections 3.1, 3.2, 4.1, 4.9, 4.10, 4.11, 5.1, 5.2, 6 (N16, N17), and scenario S10.
- [Current PRD v2](../../PRD/Swiss_keepsakes_PRD.md), sections 3.1 and 12, and acceptance criteria AC16, AC17, AC18.
- [Frontend conventions](../../../front-end/README.md) and [project design system](../design-system/project/README.md).

## Keep the phase bounded

Build the rest of C01, C19, C20, C21, C22, C23, M11, M12, M13, M14, M17, M18, M19, M20, and M23. Replace the existing placeholders at `/stories`, `/plan`, and the `products`, `content`, and `requests` sections of `/store/$section`.

Reuse what exists: the C01 rails and `AdviceBanner`, the trip-profile hook from C07/C13, the advice options in `/lab/advice`, the review cards and C18, and the Phase 1 and 2 guest and merchant components.

Leave money operations to Phase 3, partner management and full reports to Phase 5, and M22 settings (members, payout account, policies) to Phase 6. The advice widget's questions are configured in M19 in this phase.

## Match approved styling

Phase 2 round 1 failed because new screens did not reuse the approved styling. Each step below names the approved screen it must match. Guest screens use impeccable. Merchant screens use evon, as M04 and M07 did.

## Build and review the steps in order

- [x] **4.0 Agree the Phase 4 outline.** Write `flow-4-outline.md` with screens, routes, mock data, click paths, and verification cases. Owner approves before 4.1. · approved 14.10.2026 with D1–D12 and A1–A5: [flow-4-outline.md](flow-4-outline.md), report: [reports/4.0.md](reports/4.0.md)
- [x] **4.1 Add content demo data.** Seed articles in EN only, DE only, and both languages, with linked gifts and tours. Seed comments, one advice question set in EN and DE (with one missing translation), sample advice and private-tour requests, pickup points, and reviews with and without merchant replies. · approved 14.10.2026: [reports/4.1.md](reports/4.1.md)
- [x] **4.2 Finish C01 Discovery home.** Add the time-based blocks ("Have 2 hours in Lucerne?", "A few days here?") around the existing rails. Point the stories rail at real articles. Add the floating Trip advice button on C01, C09, and C20. Match the approved C01 (1.2) · impeccable. · approved 14.10.2026: [reports/4.2.md](reports/4.2.md)
- [x] **4.3 Build C19 Stories.** List only articles in the current language. Show an empty state when none exist. Match the C02 gift list · impeccable. · approved 14.10.2026: [reports/4.3.md](reports/4.3.md)
- [x] **4.4 Build C20 Article.** Blog layout per R17 (owner, 14.10.2026): large cover, author, date and read time, a sticky contents bar that tracks the section being read, photos, a YouTube video loaded on tap, and pre-recorded audio. Show the gifts and tours linked per R16, and comments. A signed-out guest sees "Sign in to comment", which opens C05. Show the "only in the other language" state. Match the C03 detail layout; comments match the review cards · impeccable. · approved 14.10.2026: [reports/4.4.md](reports/4.4.md)
- [x] **4.5 Build C21 Trip advice.** A chat with the shop's AI assistant (R19, owner 14.10.2026): the assistant asks the shop's questions one at a time as messages, choices are offered in the conversation (C03 gift option style) and other inputs sit in the composer, a short typing indicator precedes each message, answers appear as the guest's messages, optional questions can be skipped. For now it asks only the configured questions, answers no free questions and generates no plan. It asks for the email (required, no sign-in), shows a summary with "Send" and "Change an answer", then thanks the guest and says the team will reach out by email; no reply time. Save the question wording, language, and answers with the request (AC18, AC34). Opened from the chosen `/lab/advice` entry and the floating button · impeccable. · approved 14.10.2026: [reports/4.5.md](reports/4.5.md)
  - 14.10.2026: the first build (a step-by-step form) was replaced by the chat (R19) at the owner's request.
- [x] **4.6 Build C22 Private tour request.** Open from Tours at `/tours/private-tour`. Collect group size, preferred dates, interests, and email, then show a sent state. Match the C06 sheets and C07 sent screen · impeccable. · approved 15.10.2026: [reports/4.6.md](reports/4.6.md)
- [~] **4.7 ~~Build C23 Trip profile.~~** Dropped: superseded by the owner's 2.17 decision (14.10.2026), trip answers per order or booking on C07, C13, C15 and C16; the spec marks C23 dropped. ~~Let the guest view, add, and edit travel style, arrival, and departure dates from the account. Show an empty state. Reuse the C07/C13 trip-profile hook. Match a 1.12s account sub-screen · impeccable.~~ · [reports/4.7.md](reports/4.7.md)
- [~] **4.8 Build M11 Products.** List gifts and tours with publish state and EN/DE completeness. Match the M03 list cards · evon. · built 15.10.2026, awaiting the batch review: [reports/4.8.md](reports/4.8.md)
- [~] **4.9 Build M12 Edit gift.** EN and DE tabs, variants and stock, engraving, preparation days and date mode, pickup places, payment policy with first-payment deadline, cancellation policy, and commission rate. Match M04 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.9.md](reports/4.9.md) · revision 2 (owner, 15.10.2026): rebuilt as a stepper, in the round 1 gallery as 4.9-r2
- [~] **4.10 Build M13 Edit tour and departures.** EN and DE tabs for description, itinerary, inclusions, exclusions, and meeting point; age groups, departure schedule, seats, prices per departure, policies, and commission. Keep seat counts consistent with M05. Match M07 and M05 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.10.md](reports/4.10.md) · revision 2 (owner, 15.10.2026): rebuilt as a stepper, in the round 1 gallery as 4.10-r2
- [~] **4.11 Build M14 Pickup points.** Name, address, opening hours, and EN/DE instructions. Changes show on C03 and C15. Match M04 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.11.md](reports/4.11.md)
- [~] **4.12 Build M17 Articles.** List by language, drafts and published, and a section editor (heading, paragraph, photo, YouTube video, uploaded audio) with author and cover (R17). Choose and order up to 6 published gifts and tours per language version (R16, AC31), and up to 3 stories for "More to discover" (R18, AC33). Publishing shows the article on C19. Match M03 and M04 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.12.md](reports/4.12.md)
- [~] **4.13 Build M18 Comments.** Hide, delete with the shared confirmation dialog, and reply. The result shows on C20. Match M03 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.13.md](reports/4.13.md)
- [~] **4.14 Build M19 Advice requests and questions.** An inbox with each request's saved questions and answers. Question setup: EN/DE text, order, answer type, required, missing-translation warning, and recipient email. Changes apply to new C21 requests only. Match M03 and M04 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.14.md](reports/4.14.md)
- [~] **4.15 Build M20 Private tour requests.** An inbox with an answered state. Match M03 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.15.md](reports/4.15.md)
- [~] **4.16 Build M23 Reviews.** List and reply; no delete button. Replies show on C03 and C09. Match M03 · evon. · built 15.10.2026, awaiting the batch review: [reports/4.16.md](reports/4.16.md)
- [~] **4.17 Add notification demos.** Show N16 (new advice request) and N17 (new private-tour request) in the existing simulated mailbox. · built 15.10.2026, awaiting the batch review: [reports/4.17.md](reports/4.17.md)
- [~] **4.18 Check the complete flow and regressions.** Run AC16, AC17, AC18, AC31, AC32, AC33, and scenario S10 at 375px in EN and DE. Check keyboard use, focus, validation, empty states, long German labels, refresh, and Reset. Run the frontend typecheck, lint, and production build. Recheck gift and tour flows where shared components changed. · done 15.10.2026, awaiting the batch review: [reports/4.18.md](reports/4.18.md)
- [~] **4.19 Present the Phase 4 review gallery.** Collect screenshots in `screens/phase4-review/index.html`, link each item to its report, and let the owner approve or comment, as in Phases 1 and 2. · built 15.10.2026, round 1 awaiting the owner: [screens/phase4-review/index.html](screens/phase4-review/index.html), [round 1](screens/phase4-review/round1/index.html)

For each built step, save a short report under `reports/4.N.md` with changes, screenshot paths, verification results, demo assumptions, and remaining issues.

## Open questions

| # | Question | Default until you decide |
| --- | --- | --- |
| Q1 | Do comments appear immediately or wait for merchant approval? The spec lists hide, delete, and reply only | **Decided 2026-10-14 (D11):** appear immediately; merchant can hide |
| Q2 | Which `/lab/advice` option becomes the C01 advice entry | **Decided 2026-10-14 (D1):** layout J (chosen 13.10.2026) plus a floating button on C01, C09, C20 |
| Q3 | Who can edit products and content: Owner only, or Manager too | **Decided 2026-10-14 (D12):** both, as with M04 |

Further decisions D2–D10 (routes, M14 placement, shared data, stored state, language fallbacks, C22 rules, M20 answered, N16 language) are in [the outline, section 7](flow-4-outline.md#7-decisions).
