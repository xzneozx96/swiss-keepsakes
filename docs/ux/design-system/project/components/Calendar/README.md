# Calendar

Single-month date grid for choosing one date, with today, unavailable and disabled days.

## Covers
HeroUI v3 `Calendar` (header, heading, nav buttons, grid, header cells, cells, cell indicator, year picker).

## Spec
- Root 252px wide; 7 columns of 36px; cells 36 x 36px, radius 24px (circles), 14/20 500.
- Header: 2px side padding, 16px bottom padding; heading 14/20 500; nav buttons 24px circles with 16px icons.
- Weekdays 12/16 500 `color-muted`, 8px bottom padding; 4px before the first week.
- States: hover `color-default`; pressed scale .95; today `color-accent-soft` + `color-accent-soft-foreground`; selected `color-accent` + `color-accent-foreground` (wins over today); outside month `color-muted` at 50%; unavailable 50% no strike; disabled 50% with line-through; focus-visible 2px `color-focus` ring with 2px gap.
- Cell indicator dot 3px, 4px from the bottom.
- Height: 248px (5 weeks) or 284px (6 weeks).

## Our changes
- Today also gets weight 600 and the 3px indicator dot, so it differs from other days without relying on the tint; selected stays solid accent as in HeroUI.
- Nav chevrons are `color-foreground` instead of HeroUI's `accent-soft-foreground`, keeping red for selection only.
- A legend under the grid explains pale days ("Blasse Tage: Shop geschlossen"); pair a tapped closed day with an ErrorMessage.
- German weekday labels (Mo–So), week starts Monday (de-CH).

## Use
- Pickup date on gift detail (C03) with "earliest ready" dates; departure date (C10) inside a DatePicker popover.

## Don't
- Don't use unavailable and disabled interchangeably: disabled = in the past, unavailable = shop closed or sold out.
- Don't rely on the 36px cells alone for touch; leave space around the grid.
