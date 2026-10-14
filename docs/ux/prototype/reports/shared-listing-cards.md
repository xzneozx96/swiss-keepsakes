# Shared gift and tour listing cards

Implemented in React, 13 October 2026.

- `components/listing-card.tsx` owns the existing gift card presentation: 4:3 photo, 24px corner treatment, bottom-left price pill, serif title, rating row, metadata and top-right heart. The heart remains a separate control outside the route link.
- `ProductCard` keeps its existing props and delegates its presentation to `ListingCard`; gift discovery, gift list, and saved gift callers continue to use the same adapter.
- `TourListPage` uses the shared card with duration and next departure metadata. Coming-soon and no-date states remain explicit. Unpublished cards have no route link.
- The tours list adopts the gift list's 260px full-bleed photographic header, collapsing compact bar, overlapping rounded sheet, 16px content inset and 28px card gaps. The shorter tour inventory remains one card per row.
- Tour hearts use the existing persisted favourites hook, keyed by `tour:${tour.id}`, matching the tour detail integration. Review ratings use the existing review hook with the same key.

Stable card API: `ListingCardProps` accepts `to: '/gifts/$slug' | '/tours/$slug'`, `slug`, `name`, `photo`, `fromLabel`, `price`, `metadata`, optional `supplementaryMetadata`, `badge`, `statusLabel`, `languageNote`, `rating`, `favourite`, `layout`, and `disabled`.

Validation: targeted ESLint passed for all three changed React files; TypeScript compilation passed. Browser verification is delegated to the coordinating agent to avoid concurrent browser sessions.
