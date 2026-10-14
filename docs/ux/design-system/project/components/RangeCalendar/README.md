# RangeCalendar

Calendar for a start–end date range, drawn as a tinted band with accent caps.

## Covers
HeroUI v3 `RangeCalendar` (same anatomy as Calendar; each cell is a band wrapper plus a 36px button).

## Spec
- Same metrics as Calendar; row pitch 40px (36px band + 2px above and below), 6-week height 308px.
- Range middle: wrapper `color-accent-soft`, text stays `color-foreground`.
- Start and end caps: button `color-accent` + `color-accent-foreground`; the band's outer end is rounded 24px.
- Where the range wraps to another week the band end is rounded 8px.
- Today, outside month, unavailable, disabled and focus: as Calendar. Pressed scale .9 (200ms).
- Keyboard: Enter starts, second Enter ends, Escape cancels.

## Our changes
- None beyond tokens and de-CH labels; the solid caps and the 14.9:1 text on the band carry the range without relying on the tint.

## Use
- Report period for merchants and partners (M21, P02).

## Don't
- Don't use for a single date; use Calendar.
