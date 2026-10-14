# Slider

A horizontal track for picking a value or a range, with label and live output.

## Covers
HeroUI v3 `Slider` (single and range, horizontal and vertical).

## Spec
- Grid: label (14/20 500) left, output (14/20 500, tabular) right, track below, gap 4px.
- Track 20px tall, radius 12px, `color-default`; 12px transparent end caps reserve half a thumb. Fill `color-accent`.
- Thumb 28 x 20px `color-accent` rim with a 24 x 16px `color-accent-foreground` knob (radius 8px, `shadow-surface`). Dragging: knob scale .9.
- Focus-visible 2px `color-focus` ring with 2px gap. Disabled 50% (label stays full).

## Our changes
- Unfilled track gets a 1px inset `color-control-border` outline (3:1), so the end of the range is visible.
- Min and max shown as text under the track; output and limits in full CHF format ("CHF 120.00").
- 12px padding above and below the track gives a 44px hit area on phones.

## Use
- Price filter on the gift list (C02). Full width at 375px.
- The consumer provides min, max, step, `formatOptions` (CHF) and the label.

## Don't
- Don't use a vertical slider on phones.
- Don't use it for exact amounts; use InputGroup.
