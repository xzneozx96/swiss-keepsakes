# A place's service and food kind come from its map categories

- Date: 2026-11-02
- Status: **decided on 2026-11-02** (owner, in chat). Not built yet. It is being built as T-009 in run `20261029-sprint7-release1`, with migration `0016`.
- Changes: `docs/decisions/2026-10-28-home-local-briefing.md`, `docs/adr/ADR-005-content-context-aggregates.md`, `docs/adr/ADR-030-merchant-edited-map-and-blog-categories.md`, `docs/specs/001-storytelling-pivot/data-model.md` and `docs/development-plan/delivery-plan.md` (dated notes). T-009 writes the full amendments when it builds the change, PRD §11.1 included.
- Related: brief `.factory/runs/20261029-sprint7-release1/briefs/T-009-category-roles.md`.

## Why

The place editor classified a place twice.
- The Categories block picks map categories, such as Free essentials › Drinking water and Toilets, or Food and drink › Bakeries.
- A second block, "Shown on the home", asked again for a Service (water, toilets, SIM and Wi-Fi, transport, lockers, cash) and a Food and drink kind (restaurant, café or bakery, pub or bar, market).

Both fixed lists came from the home decision of 2026-10-28 (E4.2, migration `0010`). A merchant-edited category had no meaning the code could rely on, so the home could not tell that "Toilets" is the toilets tile. No live guest page reads the two fields yet; only the lab home does.

## Decisions

1. **A map category gets an optional home role.**
   - One of the six services (water, toilets, connect, transport, lockers, cash) or one of the four food kinds (restaurant, cafe-bakery, pub-bar, market).
   - It is set on the Categories page.
   - A sub-category with no role takes its parent's role.
2. **A place's services and food icon come from its categories.** The columns `content.places.service_type` and `food_kind` go (migration `0016`), after their values become category links.
3. **The place editor loses the "Shown on the home" block.**
4. **Must-visit stays a toggle** and moves into the "Recommended for" block. It is a curated mark, not a guest filter chip, so it does not become a category.

## Rejected

- **Keep the two fields and only hide them until the home is built.** Cheaper, but the place stays classified twice.
- **Must-visit as a category.** It would show among the guests' filter chips.
