# Shared gift and tour detail design

Implemented React components using the existing GiftDetail visual design as the reference.

## Reuse

- `ListingDetailHeader` accepts `name`, `subtitle`, and `stats` (primary fact, rating, review count). It preserves the centered serif title, separator row, wider laurel rating column, and existing `Stars`/`Laurel` primitives.
- `ListingFavouriteButton` accepts the existing favourite contract (`isSaved`, `onToggle`, `label`) plus `pill` or `bar` tone. Both gift and tour detail use the same heart button.
- `ListingReviews` accepts `reviews: ListingReviewsProps` and a section `id`. It preserves the existing review summary, swipeable cards, empty state, long-review action, and Show all drawer. It delegates to existing `ReviewSummary`, `ReviewItem`, and `ReviewsSheet` components.

Both GiftDetail and TourDetailPage consume the extracted components. Gift engraving, options, pickup, cart, quantity, sticky action bar, and seller interactions remain in GiftDetail.

## Tour behavior

Tour detail now mirrors the gift gallery aspect, overlapping rounded content area, title, rating/review stats, seller row, highlight spacing, about section, reviews, and things-to-know accordion. Hearts persist through `useFavourites` using `tour:${tour.id}`, matching tour list cards. Reviews come from `useProductReviews` with kind `tour`; no locally invented score or count is displayed.

The existing interactive itinerary/map is retained, including its own heading. Existing `SellerRow`, `PhotoGallery`, `CompactBar`, `BackButton`, icons, accordion, and booking controls are reused. Tour-specific content remains in TourDetailPage.

New EN/DE labels are exported from `features/tours/detail/messages.ts` as `tourDetailEn` / `tourDetailDe` for the locale registry.

## Validation

Targeted ESLint completed without errors for GiftDetail, TourDetailPage, both shared component files, and detail messages. Integration build and browser verification are coordinated by the parent task after shared review-hook and seed updates land.
