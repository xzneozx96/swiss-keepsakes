# TagGroup

Wrapping or scrolling set of tags that can be selected and removed; the filter control and the owner of the C01/C02 filter rail.

## Covers
HeroUI v3 `TagGroup`, `TagGroup.List`, `Tag`, `Tag.RemoveButton`, with `Label`, `Description`, `ErrorMessage`.

## Spec
- List: flex wrap, gap 6px.
- Sizes: sm 20px (8px x 2px, 12/16), md 24px (8px x 4px, 12/16, default), lg 32px (10px x 6px, 14/20); radius 12px (lg 16px); 500 weight; inner gap 4px; icons 12px.
- Variants: `default` on `color-default`; `surface` on `color-surface`.
- Selected: `color-accent-soft` with `color-accent-soft-foreground`.
- Remove glyph 12px with a 24px touch target.
- Disabled 50%; focus-visible 2px `color-focus` ring with 2px gap.

## Our changes
- Selected tags also carry a 12px check icon before the label and a 1px `color-selected-border` outline, so selection is not shown by hue alone (owner decision).
- Use `lg` on phones.
- The C01/C02 category filter rail is a single-selection TagGroup in `lg`, inside a horizontally scrolling ScrollShadow (40px fade). This card owns that pattern; ToggleButton and ScrollShadow refer here.
- Filter amounts keep decimals: "Bis CHF 50.00".

## Use
- Category filters on discovery (C01) and gift list (C02), active filters with remove.

## Don't
- Don't use Tag for a status; use Chip.
- Don't drop the check icon on selected tags.
- Don't wrap the category rail onto two lines on a phone; let it scroll.
