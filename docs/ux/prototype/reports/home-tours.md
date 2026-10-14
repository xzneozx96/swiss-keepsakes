# Home Tours rail and search (owner, 14 October 2026)

**Reported:** "home screen not yet updated with tours ? still has coming soon label", then "pls use the shared card component used for gifts and tour list, instead of the current ui for the tour card on home screen, very hard to see".

**Root cause:** The C01 Tours rail and the search Tours group still read the Phase 1 placeholder `tourTeasers` in `features/discovery/seed.ts`: three invented tours, each with a hard-coded "Coming soon" badge, linking to the list. They never read the tour data.

**Fix:**
- C08's card moved from `tour-list-page.tsx` into `features/tours/discovery/tour-card.tsx` (`TourCard`, with a `layout` prop). C08's output is unchanged: AE 0 on `c08-list-en`, `c08-list-de` and `c08-empty-en`, and `2.2-drive` passes 22/0.
- The home rail renders `TourCard layout="carousel"` for every published tour, the same carousel treatment as the gift rails (`ProductCard`). Each card links to the tour detail page and shows the heart, price pill, rating, duration and next departure, or "Sold out".
- Search lists the published tours with duration and "from" price, linking to the detail page.
- Removed because nothing used them any more: `tourTeasers`, the `TourTeaser` type, the teaser card's tall variant and `priceLine`, the tall rail skeleton, and the `home.tours.onRequest` and `home.tours.from` keys. Stories keep "Coming soon" (Phase 4).

**Evidence:** `home-tours-drive.mjs` → `home-tours-drive.out`: 11/11 pass in EN and DE (no "Coming soon", real tours, heart on each card, price pill, card and search result open the detail page, no overflow, no console errors). Screenshots: `screens/home-tours/`.
