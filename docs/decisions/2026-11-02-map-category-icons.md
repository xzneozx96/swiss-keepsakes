# Map categories get an icon and a "Show on the home" switch

- Date: 2026-11-02
- Status: **decided on 2026-11-02** (owner, in chat; replaces the first T-009 design of the same day). Built as T-009 and T-009b in run `20261029-sprint7-release1`, with migration `0016_map_category_icons`.
- Changes: `docs/decisions/2026-10-28-home-local-briefing.md`, `docs/adr/ADR-005-content-context-aggregates.md`, `docs/adr/ADR-030-merchant-edited-map-and-blog-categories.md`, `docs/specs/001-storytelling-pivot/data-model.md`, `docs/development-plan/delivery-plan.md`, `docs/development-plan/screen-inventory.md`, `docs/ux/pins-design.md`, `docs/ux/home-design.md` and PRD §11.1 (Vietnamese).
- Related: brief `.factory/runs/20261029-sprint7-release1/briefs/T-009-category-roles.md`.

## Why

The place editor classified a place twice.
- The Categories block picks map categories, such as Free essentials › Drinking water and Toilets, or Food and drink › Bakeries.
- A second block, "Shown on the home", asked again for a Service (water, toilets, SIM and Wi-Fi, transport, lockers, cash) and a Food and drink kind (restaurant, café or bakery, pub or bar, market).

Both fixed lists came from the home decision of 2026-10-28 (E4.2, migration `0010`). No live guest page reads the two fields yet; only the lab home does.

## Decisions

1. **A map category stays a plain category.** The first T-009 design gave it a "home role" that the code had to understand (ten codes, three behaviours). The owner rejected it: "why not treat them as regular map categories". Nothing in a category tells the code what it means.
2. **A map category gets two optional properties.**
   - **Icon**: one of a fixed set of 24 keys: `toilet`, `water`, `wifi`, `transport`, `locker`, `cash`, `restaurant`, `cafe`, `bar`, `market`, `supermarket`, `shop`, `landmark`, `church`, `bridge`, `monument`, `museum`, `viewpoint`, `square`, `info`, `holiday`, `emergency`, `boat`, `mountain`. The list lives in one place, `packages/domain/src/content/category-icon.ts`; the API validates it and the database checks it.
   - **Show on the home**: a switch, off by default. The home's "Sorted before you unpack" row will list the categories with it on. Nothing reads it yet.
3. **A place with no photo shows the icon of its first category that has one.** A sub-category with no icon of its own takes its parent's. This is derived, never stored (`placeIcon` in the same domain file).
4. **A blog category has neither.** An icon, or `showOnHome: true`, on a blog category is 422.
5. **The columns `content.places.service_type` and `food_kind` go** (migration `0016`), after their values become category links.
6. **The place editor loses the "Shown on the home" block.** Must-visit stays a toggle and moves into the "Recommended for" block. It is a curated mark, not a guest filter chip, so it does not become a category.

## Rejected

- **A home role per category** (water, toilets, restaurant, and so on, with services and food kinds as two groups). It made a category more than a name and tied the code to merchant-edited data. Owner, 2026-11-02.
- **Keep the two fields on the place and only hide them until the home is built.** Cheaper, but the place stays classified twice.
- **Must-visit as a category.** It would show among the guests' filter chips.

## What was built (T-009, T-009b)

- **Data.** `content.map_categories.icon` (text, nullable) with the CHECK `map_categories_icon_check` on the 24 keys, and `show_on_home` (`boolean NOT NULL DEFAULT false`). Migration `0016_map_category_icons` copies every stored `service_type` and `food_kind` before it drops them. For each store and value:
  1. a category named like the value takes its icon (an exact, case-insensitive match of the EN or DE name, such as "Toilets" or "Bakeries"); a service value also switches "Show on the home" on, as the home row listed the six services before. The values map as water to `water`, toilets to `toilet`, connect to `wifi`, transport to `transport`, lockers to `locker`, cash to `cash`, restaurant to `restaurant`, cafe-bakery to `cafe`, pub-bar to `bar`, market to `market`;
  2. if none matches, a top-level category named after the value is created (EN and DE), last among the top level, with that icon;
  3. each pin with the value is linked to a category of its store with that icon, unless one of its categories already has the icon, its own or its parent's.
  The backfill runs only while the old columns exist and every other step checks first, so the file can run twice. It renames and deletes no category and deletes no place.
- **Rule.** `packages/domain/src/content/category-icon.ts`: `categoryIcons`, `CategoryIcon` and `placeIcon(categoryIds, categories)`. The API contract repeats the key list (it does not import the domain); a contract test keeps the two equal.
- **API.** The pin write and read lose `serviceType` and `foodKind`; `mustVisit` stays. The map category write, patch and read carry `icon` (nullable; patch `null` clears it) and `showOnHome`. A blog category with either set is 422 on that field. The public map category list (`GET /api/public/map-categories`) carries both on each category (`null` and `false` on the blog list).
- **Merchant UI.** Categories page, map tab only: the add and edit sheet has an **Icon** picker (a grid of the 24 icons and None, each a radio with a screen-reader label) and a **Show on the home** switch with a one-line hint. The table and the phone page show the icon before the name and the quiet text "On the home" when the switch is on. The icons come from `reicon-react` through `components/icons.ts` (no new dependency). The place editor has no "Shown on the home" block; Must-visit is a switch under the stay choice in **Recommended for**.
- **Not built.** No guest page reads the icon or the switch yet; the home (E4.13) and the pin icon will.
