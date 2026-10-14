# Typography

Every type style in `tokens.json` and its HeroUI counterpart: Source Serif 4 for places, products and stories; Inter for everything else.

## Covers
HeroUI Typography (`type` h1 to h6, body, body-sm, body-xs, code; `color` default or muted; prose).

## Spec (HeroUI defaults)
- h1 36/40, h2 30/36, h3 24/32, h4 20/28, h5 18/28, h6 16/24; all weight 600, tracking -0.025em, `color-foreground`.
- body 16/28, body-sm 14/24, body-xs 12/20, weight 400. code 14/20 mono on `color-default`, padding 2px 6px, radius 6px.
- `muted` colour swaps to `color-muted`. HeroUI defines no font family.

## Our changes
The type scale comes from the approved type-and-colour draft (decisions.tsv, 2026-10-13), not only the typeface:
- h1 → `display`: Source Serif 4, 34/39, 500, -0.01em. A serif at 500 reads as heavy as Inter 600; 34px keeps two-line German titles inside 343px.
- h2, h3 → `title`: Source Serif 4, 24/29, 500, -0.01em. One title size keeps phone hierarchy simple.
- h4 → `card-title`: Source Serif 4, 20/26, 500, -0.01em.
- h5 → `heading`: Inter 18/24, 600. h6 and dialog/drawer headings stay HeroUI's Inter 16/24, 500.
- Running text → `body`: Inter 15/22, a touch denser than HeroUI's 16/28 for long German sentences on phones.
- `ui` (14/20, 500) and `caption` (12/16) are HeroUI's component sizes, unchanged.
- `label`: Inter 13/18, 500, for meta lines.
- `numbers`: Inter 18/24, 600, tabular, for prices and totals.

## Use
- Serif for place, product, tour and story names, and for order or booking titles and confirmation headings ("Bestellung #1042").
- Everything inside components (buttons, fields, chips, tables, dialogs) keeps HeroUI's Inter sizes: 14/20 for UI text, 12/16 for descriptions.
- Swiss German copy: "ss" instead of "ß"; CHF with apostrophe thousands (CHF 1’249.00); dates DD.MM.YYYY.

## Don't
- Don't set UI controls, numbers or labels in the serif.
- Don't use weights above 600.
