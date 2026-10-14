# Phase 2 discovery screens in the React app

13 October 2026 · built and awaiting owner review.

## Implemented

- C08: actual seeded tour cards, duration, adult starting price, nearest bookable departure, disabled coming-soon listing, empty list, and unavailable departure labels.
- C09: shared gallery, inherited centred title and listing facts, description, integrated itinerary/map, included/excluded items, meeting/participation/payment/cancellation accordions, age-group prices, honest empty review state and sticky departure action. Unpublished/unknown tours recover to the tour list.
- C10: future departure choices, local Zurich dates/times, live seats from the shared domain, adult/child/infant counters, capacity message, group total, amount due today, remaining balance and policy deadline. Draft changes use the central demo store and survive Back, language changes and refresh. A different tour starts with its first future available departure and the default two adults and one child. Selection creates no seat hold; Review booking continues to C11.

## Existing components reused

`PhotoGallery`, `Media`, `RouterLink`, `BackButton`, `CompactBar`, `QuantityStepper`, `StatusChip`, `EmptyState`, `useScrolledPast`, merchant `pickText`, `formatMoney`, `formatShortDate` and `zurichDate`. Accessible form/buttons/alerts/accordions come from the existing HeroUI v3 installation. These pages live under the existing guest frame; they introduce no separate shell, design review controls or HTML document.

`ProductCard` is gift-specific and has a hardcoded gift route; its approved composition is reused through the same shared media/link/status components rather than sending tour visitors to gift details. `GiftDetail` requires cart/pickup/engraving props that do not describe a tour; its approved gallery/header/section/action layout is preserved through its shared components. No gift component was changed. No invented operator contact is added to the tour model.

## Files

- `front-end/src/features/tours/discovery/index.ts`
- `front-end/src/features/tours/discovery/tour-list-page.tsx`
- `front-end/src/features/tours/discovery/tour-detail-page.tsx`
- `front-end/src/features/tours/discovery/tour-selection-page.tsx`
- `front-end/src/features/tours/discovery/messages.ts`

Global tour data, typed routes, dictionary registration, map component and broader booking integration are coordinator-owned.

## Validation and limits

Scoped ESLint completed successfully for `src/features/tours/discovery` (including its formatting fixes). HeroUI documentation fetch was attempted; remote retrieval was unavailable, so the implementation follows the existing project compound APIs and installed declarations. Browser and full integrated typecheck/build verification are coordinator-owned; this worker makes no screenshot or runtime acceptance claim.

Age bands (16+, 6–15, 0–5), infant seat exemption and the six-infant counter limit remain sample policies from the Phase 2 outline. Tour facts, prices, payment policy, dates and remaining capacity otherwise come from the shared seeded tour data and selectors. Content and owner approval remain pending. The interactive itinerary/map implementation is owned and verified by the coordinator.
