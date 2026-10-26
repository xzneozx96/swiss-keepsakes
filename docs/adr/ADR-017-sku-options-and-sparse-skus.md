# ADR-017: Key stock, price and order lines on the SKU, which exists only for sold combinations of option values

Status: accepted
Date: 2026-10-26
Source: DM-7
Applies to: `api/src/modules/catalog/`, `packages/domain/src/catalog/`, `front-end/src/features/catalog/`, `api/src/modules/inventory/`, `api/src/modules/orders/`

No new dependency, vendor or paid service. It implements the SKU shape of ADR-009 and PRD 7.2. Revised on 2026-10-26 after owner answer M9, which replaced the three fixed option tables (sizes, themes, colours) with generic product options (ADR-027). Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-7.

## Context
A Victorinox SKU is a size, a theme and a colour, with its own stock set by the merchant (Q14). A combination with zero stock cannot be selected, and the prototype's variant is one size with a text label. The owner chose generic, Medusa-style options (M9), so a SKU is defined by its values of the options of its product, and the option lists are data.

## Decision
We will make the SKU the unit of stock, price and order.

- `catalog.skus` has `sku_code` (unique per store), `product_id`, `price_rappen`, a status and the computed `combination_key` of ADR-027. A SKU row exists only for a combination that is sold. A missing combination is not selectable. A combination with stock zero is selectable in the database and unavailable on the page (AC53).
- Stock is not on the SKU. `inventory.stock_items` has one row per SKU id (ADR-016). Holds, adjustments and order lines also use the SKU id.
- An order line keeps the chosen options as a snapshot (a list of option and value text pairs), so a renamed option does not change an old order (ADR-023).
- Prices are integer Rappen. Currency is not stored while the store sells in CHF only (O01).

## Consequences
- The merchant sees and edits each combination. Adding a colour means adding a value and then SKUs for the combinations that come in it.
- Stock, price and orders do not depend on how options are modelled, so the option model can change without touching them.
- The page needs a query that groups SKUs by product and builds the selectors from the options, values and published SKUs.

## Assumptions
- The range is a few hundred SKUs at most (12 designs, 3 sizes, a handful of colours).
- One currency (CHF) applies to the whole store in Phase 1.
- Victorinox is one product with the options Size, Theme and Colour (owner M9).

## Considered options
- **A SKU for every cross product, generated.** Simple for the page, and the merchant gets rows for combinations never made. Rejected.
- **Stock on the SKU row.** One table fewer, and the stock invariant would live beside the price and the status. Rejected by ADR-016.

## History
- 2026-10-26 proposed
- 2026-10-26 revised after owner answer M9 (generic options)
- 2026-10-26 accepted (gate DESIGN)
