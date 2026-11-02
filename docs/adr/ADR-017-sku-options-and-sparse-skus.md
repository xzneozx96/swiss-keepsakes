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

- `catalog.skus` has `sku_code` (optional, unique per store when present; amended 2026-11-02), `product_id`, `price_rappen`, a status and the computed `combination_key` of ADR-027. A SKU row exists only for a combination that is sold. A missing combination is not selectable. A combination with stock zero is selectable in the database and unavailable on the page (AC53).
- Stock is not on the SKU. `inventory.stock_items` has one row per SKU id (ADR-016). Holds, adjustments and order lines also use the SKU id.
- An order line keeps the chosen options as a snapshot (a list of option and value text pairs), so a renamed option does not change an old order (ADR-023).
- Prices are integer Rappen. Currency is not stored while the store sells in CHF only (O01).

## Consequences
- The merchant sees and edits each combination. Adding a colour means adding a value and then SKUs for the combinations that come in it.
- Stock, price and orders do not depend on how options are modelled, so the option model can change without touching them.
- **Amended 2026-11-01.** `catalog.products.status` also takes `archived` (the check in `0011_catalog` already allows it): a keepsake that has orders is archived instead of deleted, and archiving is final. It leaves its variants and SKUs as they are, so the old orders keep their SKU. A keepsake that no order references is deleted with its variants (ADR-014).
- **Amended 2026-11-02 (owner).** Removing a variant follows the keepsake's rule: a variant that no order line names is deleted, with its option values, and its combination is free again (it shows as Not sold and can be added back); one that an order line names is archived, which stays final. The request is `status: removed` on `PATCH .../variants/{skuId}` and on the bulk `PATCH .../variants`; the API decides by `SalesDirectory.soldSkuIds`, which has no implementation until the orders module (E7.1), so every variant deletes until then. An archived variant that no order line names may be deleted the same way; a sold one stays. Only `catalog.sku_option_values` references `catalog.skus`, with `ON DELETE CASCADE`.
- **Amended 2026-11-02 (owner).** The SKU code is optional: `sku_code` may be NULL, and when present it is unique per store. A variant's identity is its id and its combination, so any number of variants may have no code, and a refusal names such a variant by its values. Existing codes are kept (migration 0017).
- **Amended 2026-11-02 (owner).** A SKU may name one photo: `catalog.skus.media_id`, a plain id with no foreign key (ADR-013). The use case checks that the file is a ready image of the store's library.
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
- 2026-11-01 amended (owner: a keepsake is deleted if never sold, else archived; the product status takes `archived`)
- 2026-11-02 amended (owner: a variant is deleted if never sold, else archived)
- 2026-11-02 amended (owner: the SKU code is optional and unique per store when present; a SKU may name one photo)
