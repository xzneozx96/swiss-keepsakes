# ADR-027: Model product options generically and enforce one SKU per combination with a key computed at commit

Status: accepted
Date: 2026-10-26
Source: DM-7, gate M9
Applies to: `api/src/modules/catalog/`, `packages/domain/src/catalog/`, `front-end/src/features/catalog/`, `front-end/src/features/merchant/products/`, `api/migrations/`

No new dependency, vendor or paid service. The owner chose generic, Medusa-style options on 2026-10-26 (M9). It replaces the `sizes`, `themes` and `colours` tables of the earlier model and revises ADR-017. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-7, and the Medusa study in section 9.

## Context
Medusa gives a product options with values and links a variant to a value of each option. I did not find on the pages I read where Medusa enforces that a combination is unique, so the uniqueness here is our own design. Our rules: a SKU takes exactly one value of each option of its product, a value belongs to its option and its option to the same product, a product may have no options, and each combination is unique per product (PRD 7.2, Q14). Victorinox becomes one product with the options Size, Theme and Colour.

## Decision
We will keep the options in two tables and link a SKU to values in a third.

- `catalog.product_options` has a localized name and a position, and `catalog.product_option_values` has a localized label, a position and an optional colour swatch. Positions are unique per product and per option, with a deferrable key so a reorder fits one transaction.
- `catalog.sku_option_values` has the key `(sku_id, option_id)`, so a SKU has at most one value per option. A composite key to the value table `(product_id, option_id, value_id)` proves the value belongs to that option and product, and a composite key to the SKU proves the SKU belongs to the same product.
- A deferred constraint trigger runs at commit on a new SKU, on every change of its option values, and on every new or removed option of its product. It locks the product row, counts the SKU's values against the product's options, refuses a mismatch, and stores `skus.combination_key`, the option and value ids in option order. `UNIQUE (product_id, combination_key)` makes each combination unique. A product with no options has the empty key and so exactly one SKU.
- A value that a SKU uses cannot be deleted.

## Consequences
- The three tables carry what the old fixed columns carried, and a second product line needs no schema change.
- `combination_key` is NULL between insert and commit, and the unique key ignores NULL, so a SKU that escaped the trigger would escape the key. A drift query lists it.
- Changing a SKU's option values changes its key at commit. An old order is unaffected, because it holds a snapshot.
- A product page query joins more tables than the fixed columns did.
- The commit-time count and the product-row lock are covered by tests for the single-session cases. The race of a new option against a new SKU in two sessions is designed and not tested.

## Assumptions
- Each product has a handful of options and a few hundred SKUs at most.
- The merchant fills in a value of every option for every SKU in one save.
- Option names and value labels exist in English and German.
- The business-rule triggers of ADR-015 and ADR-016 are accepted (owner M3).

## Considered options
- **Keep three fixed tables.** Simple, and a second product line with other axes would need a migration. The owner chose generic options. Rejected.
- **A jsonb map of options on the SKU.** No key to the values and no proof of ownership. Rejected.
- **A unique index over an expression.** An index expression cannot read other rows, so it cannot build the key from the option rows. Rejected.
- **A generated column.** A generated column cannot read other tables either. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
