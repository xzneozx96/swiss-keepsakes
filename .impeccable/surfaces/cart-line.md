# Cart lines: local lab candidates

Status: **L selected by the user**, updated 2026-10-13. M and N remain alternatives.
The user authorized fresh polished proposals and comparison; no earlier cart
layout is treated as approved. This record describes `/lab/cart-line` only.
It establishes no production component, cart behavior decision or global design
rule. Source inspection does not establish rendered verification or visual
acceptance.

## Inherited authority

The existing authority remains `docs/ux/design-system/project/tokens.json` and
the implemented HeroUI theme in `front-end/src/styles/theme.css`. The lab
inherits that theme; it does not change either source, add global tokens,
write a root `DESIGN.md` or introduce a global design sidecar.

The palette uses warm page ground (`--background`), white gift surfaces
(`--surface`), soft neutral preview ground (`--default`), warm charcoal ink
(`--foreground`), muted supporting text (`--muted`) and quiet rules
(`--separator`). Outlined controls inherit `--border`; hover and active states
inherit the existing default roles. The selected comparison control uses ink
on the page-ground color. Removal is a neutral ink action. No new accent,
status color or shadow primitive is introduced.

The candidates retain the shared imagery and icons, locale-aware product and
engraving labels, money formatting, semibold emphasis, tabular quantities and
prices, and existing keyboard focus ring. These visual arrangements do not
supersede the system's established typography or component authority.

## Candidate decisions

| Candidate | Composition | Reason to compare |
| --- | --- | --- |
| L · Gift slip | A white, softly elevated gift card with a 72px thumbnail beside the complete product name, customization and unit price. Quantity and item total sit below a fine rule in their own row. | Balances the gift identity and editing controls in an everyday basket. |
| M · Open basket | Full-width product name, separate small-photo and customization row, then quantity and item total. Gifts are open rows separated by fine rules under the order heading. | Uses typography and spacing to keep details legible with fewer nested card surfaces. |
| N · Photo-led | A generous 176px-high product image above the complete name, customization and unit price. Removal sits over the image; quantity and item total have a separate row below a rule. | Gives each keepsake more visual presence, at the cost of a taller basket. |

L and N use the inherited surface shadow and 16px card corners; M uses space
and separators. Photos have rounded corners in L and M; N contains its image
inside the rounded card. These dimensions and compositions are local proposals.

All three use the same engraved knife and chocolate set. The product name and
engraving metadata wrap without truncation. Each line shows both its unit
price with an explicit “each” label and a separately labeled item total. The
order subtotal follows the gift list and reflects quantity or removal changes.

## Layout

The lab opens on L. “Compare new” shows L, M and N. Each preview is capped
at 375px. Comparison stacks vertically below 1100px and becomes three columns
at that breakpoint. A candidate can be shown alone using the labeled controls.
The warm neutral preview ground separates the samples from the lab page.

The gift cards use 16px padding and 12–16px internal gaps. M uses 20px vertical
row padding. Product names retain enough width to wrap; the editing row keeps
quantity on the left and the item total aligned right. Longer localized names,
engraving strings and prices require rendered phone-width review before any
production adoption.

## Interaction contract

- Quantity and removal buttons are 44px square, with visible focus and neutral
  hover/active states. Quantity controls have accessible decrease/increase
  labels; removal includes the product name. The quantity value announces
  changes politely.
- The minimum quantity is 1. Decrease is disabled at that boundary; removal
  remains a separate explicit action. Increase is disabled at the line maximum,
  calculated from stock and capped at 9.
- Each preview owns isolated local state. Quantity changes and removal update
  only that preview's lines and subtotal. Removing every gift shows an empty
  order message. Reset appears after an edit and restores that preview's
  original gifts and quantities.
- The new comparison controls and the earlier-direction selector have a
  minimum height of 44px. Reset has a minimum height of 44px.

## Scope and consistency notes

The implementation is confined to the cart-line lab and its local candidate
components. The older A–I layouts and J/K selection experiments remain
available through “Earlier directions.” J still compares selection by order;
K still compares selection by gift. They are older comparison choices, with
no new approval or change to their behavioral model from this extension.

The inspected candidates consistently reuse the implemented palette, imagery,
focus treatment and data formatting. Their full product/customization text,
explicit unit and item prices, separate removal and bounded quantity controls
support a fair comparison. Card geometry, image prominence and open-row
composition remain provisional. The user must choose a direction before
these local choices become a production design decision.

Source references: `front-end/src/features/lab/cart-line-directions.tsx`,
`front-end/src/routes/lab.cart-line.tsx` and
`front-end/src/styles/theme.css`.

## Verification record

The coordinating agent reports passing final checks and lab interaction checks
on 2026-10-13: all three new candidates updated the sample subtotal from 126
to 180 when quantity increased, to 72 after removal, and to 0 when empty;
Reset restored the sample. L disabled increase at the sample stock maximum of
4 while the independently edited M preview remained at 126. J and K remained
accessible. These results validate the lab interaction contract; they do not
constitute user approval of a visual direction.

## Selected layout summary sheet

L includes the shared CartSummarySheet, also used by M/N and earlier J/K.
The sticky white sheet has rounded top corners, per-order gift counts and
subtotals, a total for reference, payment timing note and full-width Continue
button. New candidates now use the same two-order sample as J/K. Quantity,
removal and order selection update the sheet; Continue is disabled when no
order is selected. This remains a lab preview without checkout submission.
The removal icon is an outlined bin with ghost destructive styling.
