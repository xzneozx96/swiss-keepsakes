# ADR-008: Add one reviews module for place reviews, story comments and product ratings

Status: accepted
Date: 2026-10-26
Source: AD-9
Applies to: `api/src/modules/reviews/`, `api/src/modules/content/`, `api/src/modules/catalog/`, `api/src/modules/notifications/`, `packages/domain/src/reviews/`, `front-end/src/features/reviews/`

No new dependency, vendor or paid service. This changes the ownership in `docs/architecture/backend.md` section 4, where `catalog` owns `reviews` and `content` owns `article_comments`.

## Context
Guests write place reviews (rating and comment) with a sign-in only (Q16, Q17). They comment on stories, and rate a keepsake after the order is complete (§11.6). All three share one moderation rule: content is visible at once, only the merchant hides it, nothing is deleted, each hide stores who, when and an optional reason, and there is no report button (§11.4, G7). Hiding a product rating needs a separate owner decision (O33). Legal risks are open (DSA, Omnibus, UWG, GDPR, nFADP, O33). Review text keeps its written language (Q22).

## Decision
We will add a `reviews` module that owns all guest-written content.

- **Entities.** `PlaceReview`, `StoryComment` (one level of replies, as today) and `ProductRating`. Each has an author reference (the guest profile id, with no foreign key to Better Auth's user), a snapshot of the display name, text in the written language, a `visible` or `hidden` state, and an append-only moderation history.
- **Targets by id.** A review points at a place id, a story group id or a keepsake id. The module checks eligibility through other modules' `index.ts`: `content` says whether a place is published and of type `sight`, `restaurant` or `accommodation` (AC68), and `orders` says whether the guest has a completed order for the keepsake (AC17).
- **Publish and hide.** Insert is visible at once. Merchant staff can hide and unhide. Nobody deletes through the app (AC47, AC69). Hiding a product rating is refused until O33 is decided.
- **Eligibility.** A signed-in guest is required. A place review needs no purchase.
- **Rate limit.** A per-account limit on new reviews and comments is part of the module. Immediate publication plus email-code sign-in invites spam (backend.md R14), and the merchant is the only filter.
- **Reads.** Visitors read visible items by target. Rating counts and averages count visible items only, computed by a query or a `reporting` view. Phase 1 documents do not include review text (ADR-001).
- **Erasure and display name.** Account deletion anonymises the author reference and the display-name snapshot. Whether the text stays is open (O33, O25).
- **Merchant notice.** A new review queues a mail or a dashboard count through `notifications` (O25 proposal).

## Consequences
- One moderation rule exists in one place. The three kinds share the hidden-state and history tables.
- `catalog` and `content` lose their review tables. The migration moves the prototype's reviews and comments.
- The module couples to three other modules by id and by `index.ts` calls only.
- Immediate publication means abusive text shows before the merchant sees it. The PRD accepts this (G7) and lists the legal risk.

## Assumptions
- Phase 1 has one rating scale across place reviews and product ratings (O25 proposes 1 to 5). A different scale per kind would only change the module's validation.
- The merchant checks reviews often enough, or the notice reaches them quickly.
- The lawyer's answer on O33 can still change fields (for example a report path or an author-erasure rule) without a rewrite of the module boundary. Keeping hide history append-only and the author link replaceable is what allows this.

## Considered options
- **A. One module for all guest content (chosen).** One rule, one test suite.
- **B. Reviews stay in `catalog` and `content`.** Fewer modules, but the same moderation rule is written three times and kept in sync by hand.
- **C. Treat place reviews as `content`.** Merchant-written and guest-written text would share tables and permissions, which blurs who may edit what (AC16).

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
