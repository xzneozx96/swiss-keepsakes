# ADR-030: Keep two merchant-edited category lists, map categories for pins and blog categories for stories

Status: accepted
Date: 2026-10-27
Source: gate G11 (`docs/decisions/2026-10-27-map-pins-and-events.md`)
Applies to: `api/src/modules/content/`, `packages/domain/src/content/`, `packages/api-contract/`, `front-end/src/features/content/merchant/`, `front-end/src/features/discovery/`, `front-end/src/features/tours/map/`, `api/migrations/`

No new dependency, vendor or paid service. The tables follow the shape of `catalog.product_categories`.

## Context
The map is a curated local guide. Visitors need to find what they want: walking sights, photo spots, local food and drink, free essentials. The owner wants to create and rename these groups without a release. Pins no longer have a fixed type (ADR-005, ADR-029), so the old four types cannot serve as filters. Stories also need a grouping for the story list, for example Legends, Swiss history and Practical tips, which is where tips with no location now go.

The four interests (PRD §3.3) already exist. Visitors answer them in onboarding, and they only change the order of items (PRD §3.2, ADR-006). They are fixed codes in `packages/domain`, not merchant data.

## Decision
We will add two merchant-edited lists to the `content` module, and keep the interests as they are.

- **Map categories** tag pins. They are the chips on the map. A chip highlights the pins of its category and dims the others, and no pin is hidden (AC87, AC88; owner decision D7 kept for map categories).
- **Blog categories** tag stories.
- **Shape.** Both lists look like product categories: a name in EN and DE, an order, and one level of sub-categories. A name needs at least one of EN and DE, as for product categories (DM-22, AC30). A category that has sub-categories or tagged items cannot be deleted (AC87). The merchant can create, rename and reorder them. Only the Owner and Manager roles edit them.
- **Many to many.** A pin can sit in several map categories and shows under each chip (AC88). A story can sit in several blog categories. No category is required to publish. A pin with no map category shows only under **All**.
- **Chips style on the client.** The map response carries each pin's category ids. A chip changes the style of the pin layer (highlight or dim), not the data, and reloads nothing (ADR-006). A parent chip also covers pins tagged only with its sub-categories, and the read adds those ids. A pin with no category is highlighted only under **All**.
- **Interests stay fixed.** They remain the four onboarding answers and rank items. Categories highlight, and interests rank. The merchant tags both. Visitors see only the categories as chips.
- **Tables.** The data model names `content.map_categories`, `content.blog_categories` and the link tables `content.place_categories` and `content.story_categories` (decision record, "Data model"). The db-designer owns their columns and constraints.

## Consequences
- The merchant manages two lists, and a category editor is needed for each. It can be one screen with two tabs, built once for both lists.
- The merchant controls chip names and order, so a poorly chosen list makes the map harder to read. The decision record gives example lists as a starting point.
- Deleting a category is blocked while it has sub-categories or a pin or story uses it, so the merchant must remove the sub-categories or move or untag items first.
- Sub-categories add one level to the chip bar. The visual treatment (chips with an expandable second row, or a flat list) is left to the screen design.
- The product category lists and these two lists look alike but stay separate tables, so a change to one does not touch the other.

## Assumptions
- Phase 1 has a short list of map categories, in the range of 5 to 15, so the chip bar fits on a phone with a horizontal scroll.
- One level of sub-categories is enough. A deeper tree would need a new decision.
- One merchant owns all categories in Phase 1, as with pins (ADR-005). Categories carry `store_id` like the other content rows.
- Names exist in EN and DE, with the language notice when one is missing (AC64).

## Considered options
- **A. Two lists, one for pins and one for stories (chosen).** Matches how the owner thinks about the content. Map chips and story groups have different names and different readers, so a change to one list never forces a change to the other.
- **B. One shared list for pins and stories.** One editor and one table. But the map would show chips such as Legends that no pin uses, and the story list would show Photo spots, so each side would need a filter on "used here". Rejected.
- **C. Categories replace interests.** One concept for the visitor. But interests drive onboarding ranking (Q26, AC38), and merchant-edited names cannot be the stable codes that the ranking function and the analytics events use. Rejected.

## History
- 2026-10-27 proposed
- 2026-10-27 accepted (gate G11)
