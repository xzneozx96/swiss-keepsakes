# ADR-022: Keep stock per SKU, leave out the inventory item, location level and purchasing flags, and name the path to pre-orders

Status: accepted
Date: 2026-10-26
Source: DM-15, gate S3
Applies to: `api/src/modules/inventory/`, `api/src/modules/catalog/`, `api/src/modules/orders/`, `packages/domain/src/catalog/stock.ts`, `front-end/src/features/cart/`, `front-end/src/features/checkout/`

No new dependency, vendor or paid service. This is the data-model answer to the reference study that ADR-021 asks for. It copies no Medusa code and adds no Medusa package. The study is in `docs/specs/001-storytelling-pivot/data-model.md`, section 9, with the pages read.

## Context
Medusa 2 separates an inventory item from a variant, keeps a level per stock location with stocked, reserved and incoming quantities, and reserves stock per line item. A variant has `manage_inventory` and `allow_backorder` flags. A cart holds line items and one cart completes into one order. Sales channels link to stock locations to scope availability.

Our shop sells knives only, counted one per SKU, from one stock place, for one storefront, with `store_id` as the merchant scope. The cart is a server table since owner M7 (ADR-026), and one cart splits into several orders by pickup time and place. A later limited-edition pre-order is planned (PRD Q23).

## Decision
We will keep the stock design of ADR-009 and ADR-016 and not copy the parts of Medusa that serve shapes we do not have.

- **No inventory item apart from the SKU.** `inventory.stock_items` stays one row per SKU. A kit or bundle (a variant that consumes several items) is out of scope, because the PRD sells no boxes or bundles.
- **No location level and no incoming quantity.** `store_id` scopes the merchant. If one merchant stocks two places, the level gains a location column in a migration.
- **No `manage_inventory` or `allow_backorder` on the SKU.** Every SKU is counted, and a zero-stock SKU cannot be bought (PRD 7.2).
- **No sales channel.** There is one storefront.
- **A server-side cart, which is not part of the stock design.** The owner chose a server cart on 2026-10-26 (M7, ADR-026). A cart line holds no stock.
- **Take the database guard Medusa lacks.** The inventory level model file that I read declares defaults and a unique index on item and location, and no check that reserved stays within stocked. ADR-016 keeps `CHECK (held <= on_hand)`.

## Consequences
- The stock tables stay small, and the oversell guard stays in the database.
- A pre-order cannot be added by flipping a flag. `allow_backorder` means a hold may exceed on-hand stock, which `CHECK (held <= on_hand)` forbids. The path is to give a hold a `backorder` flag and make the CHECK count only non-backorder holds, for example by keeping a second counter `held_backorder`. That change replaces ADR-016's constraint and needs a new ADR, written when the owner schedules the pre-order.
- Gift boxes, bundles and a second stock place each need a model change. Each is a migration the owner approves.
- The cart splits into several orders, because Medusa's one-cart-one-order shape does not fit PRD 8.1 (ADR-026).

## Assumptions
- The shop sells single knives, counted one for one, from one place (PRD 4.2, ADR-009).
- The pre-order arrives as a later phase and not in the pilot (Q23).
- A cart line never holds stock, and stock is held when an order is accepted.
- Medusa's behaviour in the pages I read is accurate for the version those pages describe. Behaviour that no page showed is marked "not verified" in the data model.

## Considered options
- **Copy Medusa's inventory item, level and reservation model.** A proven multi-location shape, and three tables where we need one. Rejected for now.
- **Add `allow_backorder` and `manage_inventory` now.** Ready for pre-orders, and unused columns with a CHECK that contradicts them. Rejected.
- **Commerce engine.** Rejected by ADR-021.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-29 note: the keepsake catalog design (`docs/decisions/2026-10-29-keepsake-catalog-design.md`) shows no stock locations. Inventory has an inventory item page, which is a screen over the one `inventory.stock_items` row per SKU. It does not adopt Medusa's separate inventory item model. The decision above stands
