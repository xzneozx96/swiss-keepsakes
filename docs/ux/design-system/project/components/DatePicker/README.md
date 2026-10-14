# DatePicker

Segmented date input with a calendar popover; also the reference for the other date and time fields.

## Covers
HeroUI v3 `DatePicker`, `DateField`, `TimeField`, `DateRangePicker` (all built on the date input group).

## Spec
- Field group: HeroUI height 36px, radius 12px, input padding 12px x 8px, 16px text below 640px, 14px from 640px; segment gap 1px; `shadow-surface`.
- Focused segment: `color-accent-soft` fill with `color-accent-soft-foreground` text, radius 6px; the group shows the flush focus-within ring.
- Prefix / suffix 12px from the edge in `color-field-placeholder`.
- Calendar trigger: 16px icon in a 24px hit area (padding 4px, radius 12px).
- Popover: padding 12px, radius 20px, `shadow-overlay`, 276px wide around a 252px Calendar (or RangeCalendar).
- DateRangePicker: start and end inputs with a 4px-padded separator; use `fullWidth` at 375px.
- TimeField: same group; hour cycle from the locale.

## Our changes
- 1px `color-field-border`; groups are 40px on phones including the border to fit 16px text (HeroUI 36px; approved).
- Focus-within ring is ink (`color-field-border-focus`), flush.
- de-CH format DD.MM.YYYY, 24-hour time written "14:30" without spaces.

## Use
- Pickup date (C03), departure date (C10), report period (M21, P02), payment time (M08).

## Don't
- Don't use a plain TextField for dates.
