# Surface

Neutral background container that sets the elevation level; Separator divides content inside it.

## Covers
HeroUI Surface and Separator.

## Spec
- Surface variants: `transparent`, `default` (`color-surface`), `secondary` (`color-surface-secondary`), `tertiary` (`color-surface-tertiary`). No padding, radius, border or shadow of its own; the consumer sets them (we use radius `radius-3xl` and padding 16 to 32px).
- Separator: 1px, radius 4px, `color-separator`; horizontal full width; vertical 1px wide, min-height 8px, stretches.

## Our changes
- `color-surface-secondary` and `color-surface-tertiary` take our warm neutrals (#F2F2EF, #EFEFEC) instead of HeroUI's cool greys.
- HeroUI asks for the `secondary` field variant inside a Surface. With our visible field border, fields stay `primary` everywhere; the `secondary` field variant is not used.

## Use
- Page ground is `color-background`; content blocks are `default` surfaces; inner groupings `secondary`.
- Separators between list rows and inside menus (inset 3% each side in menus).

## Don't
- Don't stack more than two surface levels.
- Don't use separators where spacing alone groups the content.
