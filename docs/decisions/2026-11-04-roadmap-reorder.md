# The guest view comes first, then commerce, then the deferred content (roadmap reorder of 04.11.2026)

- Date: 2026-11-04
- Status: **decided on 2026-11-04** (owner, in chat, before Sprint 9). Amends the release order of 27.10.2026 (gate G-RM-ORDER). Plan only: nothing in this decision is built yet, and no code, migration or seed changed with it.
- Changes: `docs/development-plan/delivery-plan.md` (section 1, the rows E4.4, E4.5, E4.13, E4.14, E5.5 and E6.9, sections 5.1, 5.2, 6 and 7), `docs/ux/home-design.md`, `docs/decisions/2026-11-02-map-category-show-on-home.md`, `docs/adr/ADR-005-content-context-aggregates.md`, `docs/adr/ADR-030-merchant-edited-map-and-blog-categories.md` and `docs/specs/001-storytelling-pivot/data-model.md`.
- Related: `docs/decisions/2026-10-28-home-local-briefing.md`, `docs/decisions/2026-11-02-map-category-show-on-home.md`, run `20261104-sprint9`.

## Why

Releases 1 and 3 are built. Release 2 (Stories) held both the content a guest reads first (home, search, story pages, onboarding) and the content that needs a long editor and review chain (tours, the advice form, comments). The owner wants a guest to see a real home, real story pages and real keepsake pages first, and wants commerce to follow before the tour, advice and review work. The home also reads data the repo already has (map categories, pins with dates, the seeded tours), so it can be built on the real API without waiting for the tour editor.

## Decisions

1. **Release order (G-S9-ORDER).** The new order is Platform, 1, 3 (built), 2a Guest view, 4 Commerce guest, 5 Commerce partner, 2b Deferred content, 6, 7, 8, Launch, and 9 AI (not planned). Release 3 is built and its sign-off can come any time. It no longer waits for release 2.
2. **Release 2a "Guest view" is Sprint 9.** It holds E4.5 (onboarding), E4.4 (story pages), E4.13 (home), E4.14 (search) and E6.4 (keepsake list and product page). `rankItems` in `packages/domain` (ADR-006) is built in this sprint with E4.4 and E4.5. E4.5's acceptance criteria do not change.
3. **Release 2b "Deferred content" waits for release 5 (G-S9-DEFER).** It holds tours (E4.9, E4.10, E4.12), the advice form (E4.15, E4.16), reviews and comments (E5.1, E5.3, E5.4, E5.5), the tour links of E6.9, and the content journeys E4.17. Until 2b, tours and the advice form stay on the demo and seeded content. The advice banner keeps opening the existing demo advice form (G-S9-TOURS-DEMO).
4. **E5.5 moves to 2b.** Product ratings are part of reviews. O15 and O33 are no longer needed before 2b.
5. **Staging comes before release 4 sign-off.** E2.9 and E3.8 (blocked by O43) are built before release 4 is signed off.
6. **Home data comes from the real API (G-S9-REALDATA).** E4.13 has no mock layer. Missing data stays missing, and the owner provides it later.
7. **Service tiles (G-S9-TILES).** The "Sorted before you unpack" tiles are the map categories with Show on the home on, named in the guest's language, in category position order. A tile opens the guest map filtered to its category and its sub-categories, through a new `category` search parameter: `/$lang/map?category=<slug>`.
8. **Empty tile (G-S9-EMPTY-TILE).** A tile shows only when its category, with its sub-categories, has at least one published place.
9. **Icon restored (G-S9-ICON).** The map category icon that the owner removed on 2026-11-02 comes back, from the code already in git. Commit `dcdacc16` added it: the 24 keys in `packages/domain/src/content/category-icon.ts`, `placeIcon`, the contract field, the API validation, the picker grid in the Categories sheet, `category-icons.ts`, the messages and the seed icon step. Commit `e14ffb6c` removed the UI, and `324e40e9` removed the API, the contract and the seed step, and dropped the column with migration `0018`. Restoring needs one new migration, `0026`, that adds `content.map_categories.icon` and its CHECK back. The last migration on main is `0025_pickup_maps`. A tile and a pin without a photo read the icon by the `placeIcon` rule: the first category with an icon, and a sub-category takes its parent's. The migration is planned and not built.
10. **Events (G-S9-EVENTS).** "While you're in town" reads the pins with dates (`PinDate`, the public `nextDate`). The API already drops a pin whose last date has passed. This week is a next date within 7 days. Coming up is every later date, at most 3. "See all on the map" shows when more than 3 are ahead and opens the map filtered to dated pins. With no dated pin the section is not drawn.
11. **Route cards (G-S9-ROUTE-LINK).** A route card on the home opens the existing tour page.
12. **Search (G-S9-SEARCH).** E4.14 moves into Sprint 9. A tour result opens the existing tour page, and tour results come from the seeded tours (`GET /api/public/tours`) until E4.12. E4.14 no longer depends on E4.12. Keepsake results move in from E6.9.
13. **E6.9 is cut down (G-S9-E69).** The check of 2026-11-04 found that E4.3 already built the story editor's Keepsakes card and picker (up to 6, `keepsakeProductIds`), the merchant preview and the `keepsakeProductIds` field on the public story read. Not built: guest keepsake cards on story pages, keepsake results in search, and tour links. Places have no keepsake link. The guest cards on story pages (no price, a sold-out keepsake shown as sold out, an unpublished one hidden; AC31, AC54) go into E4.4. Keepsake results go into E4.14. The seed adds a few story-keepsake links, add only. What is left of E6.9 is the keepsake picker in the tour editor and the keepsake cards on tour pages. It moves to 2b, depends on E4.9 and E4.12, and is re-estimated at 2 points. Because E4.4 and E4.14 now link to keepsake pages, E6.4 is in Sprint 9 as well.
14. **Sprint 9 size (G-S9-SIZE).** The owner keeps all five stories in Sprint 9 and accepts that the sprint is over the usual 20 to 24 points. E4.13 is re-estimated at 8 points (the icon restore and the tiles and events data), which makes the sprint 26 points.
15. **Store label (G-S9-LABEL).** The store dashboard section "Places" is now "Locations and events" (German: "Orte und Veranstaltungen"). This is done, in commit `f326f0f7`.

## Rejected

- **Keep release 2 whole and build the tours first.** It delays the home, search and keepsake pages behind the tour editor, which only the merchant needs.
- **A mock layer for the home until the data exists.** The owner chose the real API and missing data (G-S9-REALDATA).
- **Drop the category icon for good.** The home tile and the photo-less pin have nothing else to draw, and the removal code is in git.
- **Move E4.12 into Sprint 9 so the search and the route cards link to a new tour page.** Both link to the existing tour page instead (G-S9-ROUTE-LINK, G-S9-SEARCH).
- **Split Sprint 9 in two.** The owner keeps it whole (G-S9-SIZE).

## Effect on the plan

- **Stories.** E4.4 gains the keepsake cards and depends on E6.4. E4.13 loses its dependency on E4.9 and E4.12. E4.14 moves into Sprint 9 and loses its dependency on E4.12. E6.9 and E5.5 move to 2b.
- **Sprint 9 and after.** The sprint map from Sprint 10 is rebuilt in the new release order (`docs/development-plan/delivery-plan.md`, section 5.2).
- **Open owner questions.** O41 is needed by the sprint that builds E6.8, O22 by the sprint that builds E7.21, and O43 before release 4 sign-off. O15 and O33 are needed by the sprint that builds E5.5.
