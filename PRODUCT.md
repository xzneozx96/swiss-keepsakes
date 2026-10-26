# Swiss Keepsakes

## Product and audience

Swiss Keepsakes tells emotional stories about Lucerne for free: history, culture, and high-quality reviews of sights, restaurants, and accommodation, linked to an interactive map. The stories build organic traffic and loyalty. Victorinox knives are introduced gently as a bonus. Guests primarily use a phone. Visitors choose a stay type (short-stay or multi-day) and interests, kept in the browser only. Merchant Owner and Manager roles run the store. Referral partners, including guides, receive a limited view of their transactions and run group orders (the order flow is still open). Tour booking is hidden. Tours are free information with a PDF guide and an advisory route set by the merchant. The product is not a route planner.

Product authority is `docs/PRD/Swiss_keepsakes_PRD.md` (version 3, storytelling pivot) and `docs/ux/ux-spec-phase1.md`. The booking states, the 15-minute seat hold, deposit, pay-later and tour payment parts of `docs/ux/ux-spec-phase1.md` are superseded by the PRD and stay dormant. Prototype delivery order and owner approval are tracked in `docs/ux/prototype/todo.md` and `todo-phase2.md`.

## Platform and stack

This is a web prototype. `front-end/` uses React 19, HeroUI v3, Tailwind CSS v4, and TanStack Router with hash navigation. It has no backend and uses browser-held mock data. Payment-provider interactions are simulated.

## Confirmed constraints

- Guest and merchant interface copy supports English and Swiss German. Preserve the selected language, price, date, and booking meaning together.
- Booking and payment status are separate facts. Confirmation does not imply full payment, and full payment does not imply service delivery.
- Tour booking and every reservation service are out of scope and not shown to guests. The code stays dormant. The 15-minute seat hold, deposits, pay-later and tour completion rules are retired (PRD v3, section 18.2).
- The shop sells Victorinox knives only, with stock per SKU (size x theme x colour). A zero-stock combination cannot be selected. Prices first appear on the product page, never in stories, the map or shop lists. Complete a keepsake order only after delivery and full payment.
- Build and review steps separately. A built step stays awaiting review until the owner approves it. Update the client Artifact only when requested.

## Existing visual authority

Inherit `docs/ux/design-system/project/`, the implemented HeroUI theme in `front-end/src/styles/theme.css`, and accepted entries in `docs/ux/decisions.tsv`. The established world uses warm neutral ground, white surfaces, softened charcoal ink, Swiss red for actions, and separate tinted semantic statuses. Source Serif 4 names tours, products, and places. Inter handles controls and merchant headings.

Preserve the approved guest frame, photo gallery, detail-page composition, bottom-sheet choices, confirmation dialog, quantity controls, and in-flow sticky action bars. This context records the existing system and introduces no replacement identity.

## Phase 2 design assumptions

Current screen candidates and their sample policies are in `docs/ux/prototype/design-phase2/` and `flow-2-outline.md`. Their prices, tour copy, age bands, infant seat usage, deadlines, and reminder timing illustrate the designs. They await owner and merchant review. The previews do not prove production capacity, payment, commission, or role enforcement.

This context is derived from current project documents and accepted design decisions. It adds no product-policy approval.
