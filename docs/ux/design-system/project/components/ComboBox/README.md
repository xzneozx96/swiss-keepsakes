# ComboBox

Text input with a filterable popover list; type to narrow, then pick one.

## Covers
HeroUI v3 `ComboBox` with `ComboBox.InputGroup`, `Input`, `ComboBox.Trigger`, `ComboBox.Value` (multiple) and `ComboBox.Popover` > `ListBox`.

## Spec
- Input: padding 12px x 8px, 28px inline-end with the trigger, radius 12px, 16px text below 640px, 14px from 640px; `shadow-surface`.
- Trigger chevron 16px, `color-field-placeholder`, darkens to `color-foreground` on hover, rotates 180deg open, pressed opacity .7.
- Focus: 2px flush ring, drawn as a `color-field-border-focus` border plus a 1px ring of the same colour (ink).
- Popover and items: same as Select (radius 24px, padding 6px, items 36px min, radius 16px). The option with keyboard (virtual) focus shows the hover fill plus the 2px ring.
- `menuTrigger` default `focus`; `allowsCustomValue` for free text.

## Our changes
- 1px `color-field-border`; 40px on phones including the border (approved).
- Focus ring is ink, not accent, so it never reads as the brick invalid state.

## Use
- Country in contact details (C11), any list a person types faster than scrolls.

## Don't
- Don't use for fewer than 8 options; use Select.
- Don't rely on the hover fill alone for the keyboard-focused option; it must also show the ring.
