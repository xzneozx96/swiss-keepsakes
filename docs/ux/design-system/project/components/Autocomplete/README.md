# Autocomplete

Select-style trigger whose popover holds a search field and a filtered list, for long option lists.

## Covers
HeroUI v3 `Autocomplete` with `Autocomplete.Trigger`, `Value`, `ClearButton`, `Indicator`, `Popover` > `Autocomplete.Filter` > `SearchField` + `ListBox`, optional empty state.

## Spec
- Trigger identical to Select (radius 12px, padding 12px x 8px, 28px inline-end, chevron 16px at end 8px, `shadow-surface`); focus-visible = 2px ring with 2px gap.
- Popover: 8px top padding, search row padding 12px x 4px, list max height 320px, list padding 6px, radius 24px, `shadow-overlay`.
- The search field inside takes the flush field focus ring; the first result carries keyboard focus (hover fill plus ring).
- Empty state: centred 14/20 text in `color-muted`.
- Enter 250ms fade + zoom 95% + 4px slide; exit 100ms.

## Our changes
- Search field and trigger carry the 1px `color-field-border`; both 40px on phones (approved).

## Use
- Product picker for merchants (M04, M24), partner lookup (M15).

## Don't
- Don't open it for under 10 options; use Select.
