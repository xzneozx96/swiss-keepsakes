# Card

Grouped content container; the base for gift and tour tiles, order rows and dashboard blocks.

## Covers
HeroUI Card (Header, Title, Description, Content, Footer).

## Spec
- Root: flex column, gap 12px, padding 16px, radius `radius-3xl` (24px), `shadow-surface`, no border.
- Variants: `default` (`color-surface`), `secondary` (`color-surface-secondary`), `tertiary` (`color-surface-tertiary`), `transparent` (no fill, no shadow).
- Title 14/24 weight 500; description 14/20 `color-muted`; content column gap 4px; footer row, items centred.
- No states in HeroUI. An interactive card wraps an anchor and adds its own hover and focus styles.

## Our changes
- Product, tour and story titles in a card use the serif `card-title` style (Source Serif 4, 20/26, 500, tracking -0.01em) instead of HeroUI's 14px title.
- A media block (photo) sits inside the padding with radius `radius-2xl`. Until photos exist, use the hero gradient (`color-hero-sky` to `color-hero-cream`, ending on `color-surface-tertiary`; the approved draft ended on a warmer sand). A label on the photo is a `secondary` Chip `md`.
- Prices: Inter 18/600 with tabular numerals, "ab" label above in 12px `color-muted`.
- Interactive card (the whole tile links to the detail page): focus-visible is a 2px `color-focus` ring with a 2px `color-background` gap around the card; hover adds nothing on touch. If the card also carries a button, the link covers the card except the button.

## Use
- Gift tile (C02), tour tile (C08), story card (C19), merchant "Heute" task cards (M02).
- One primary action per card at most; a linked tile may have none.

## Don't
- Don't add borders or coloured left rails to cards.
- Don't nest cards inside cards; use Surface `secondary` for inner grouping.
