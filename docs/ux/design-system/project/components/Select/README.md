# Select

Pick one (or several) options from a short list opened from a field-style trigger.

## Covers
HeroUI v3 `Select` with `Select.Trigger`, `Select.Value`, `Select.Indicator`, `Select.ClearButton`, `Select.Popover` and an embedded `ListBox`.

## Spec
- Trigger: padding 12px x 8px, 28px inline-end when the indicator shows, radius 12px (`radius-xl`), `shadow-surface`.
- Value text 16/24 below 640px (no iOS zoom), 14/20 from 640px; placeholder `color-field-placeholder`.
- Indicator: 16px chevron at end 8px in `color-field-placeholder`; rotates 180deg when open (150ms). The trigger itself does not change when open.
- Focus-visible: the trigger is a button, so it takes the 2px `color-focus` ring with a 2px `color-background` gap (not the flush field ring).
- Clear button: 20px, icon 14px, 24px touch target, hidden while empty.
- Popover: width = trigger, radius 24px (`radius-3xl`), `shadow-overlay`, list padding 6px; items min 36px, padding 6px x 10px, radius 16px, gap 4px.
- Item states: hover `color-default`; keyboard focus = hover fill plus the 2px ring; pressed scale .98; selected = checkmark only, no fill; disabled 50%.
- Label to trigger 4px; label 14/20 500.

## Our changes
- 1px `color-field-border` (`border-width-field`). Trigger is 40px on phones including the border (7px vertical padding); approved by the owner.
- Disabled options dim only the label; the reason ("Für dieses Datum nicht verfügbar") stays at full `color-muted`.
- `secondary` field variant: not used; with the visible border, fields stay primary on surfaces.

## Use
- Pickup place on gift detail (C03), sort order. Up to about 10 options; longer lists use Autocomplete.

## Don't
- Don't put fewer than 3 options in a Select; use RadioGroup.
- Don't show the checkmark inside the trigger.
- Don't use real business names as sample data.
