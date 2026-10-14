# SearchField

A search input with a leading magnifier and a clear button that appears once text is entered.

## Covers
HeroUI v3 `SearchField` (group, search icon, input, clear button).

## Spec
- Group radius 12px, `color-field`, `shadow-surface`; HeroUI fixes it at 36px.
- Search icon 16px (stroke 1.5px) in `color-field-placeholder`, 12px from the start; input start padding 8px.
- Clear button: HeroUI draws a 20px CloseButton, 8px from the end, hidden while empty. Escape clears.
- States: hover fill close to `color-background`; focus-within 1px `color-focus` border plus 1px flush ring; invalid 1px `color-danger`; disabled 50%.
- `secondary` variant: not used.

## Our changes
- 40px on phones like Input (approved; the 36px group may clip 16px text, unverified).
- Visible 1px border in `color-field-border`.
- Clear button 24px visible inside a 32px target (HeroUI's 20px is below the 24px minimum, WCAG 2.5.8).
- Always a visible label above the field; the placeholder is only an example ("z. B. Taschenmesser").

## Use
- Gift search (C02), merchant product and order search (M03, M11).
- The consumer provides the label and the query handler.

## Don't
- Don't use it for filtering a long option list inside a picker; use Autocomplete.
- Don't rely on the placeholder as the label.
