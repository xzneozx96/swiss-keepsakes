# NumberField

A number input with minus and plus steppers, used for counts such as tour participants per age group.

## Covers
HeroUI v3 `NumberField` (group, input, increment and decrement buttons).

## Spec
- Group radius 12px, `color-field`, `shadow-surface`; HeroUI fixes the group at 36px tall.
- Stepper buttons 40px wide, full height, 16px plus/minus icons (stroke 1.5px) in `color-foreground`; pressed `color-default` and scale .97.
- Input start-aligned (HeroUI `px-3`, no centring), tabular numbers, text 16/24 below 640px.
- States: hover fill close to `color-background` (pointer only); focus-within 1px `color-focus` border plus 1px flush ring; invalid 1px `color-danger`; disabled 50% (a stepper at its limit is disabled on its own).
- Keyboard: arrows, PageUp/PageDown, Home/End (React Aria spinbutton).
- `secondary` variant: not used.

## Our changes
- 40px on phones, like Input (approved). HeroUI's 36px group may clip the 16px mobile text (unverified; check in a browser).
- Visible 1px border in `color-field-border`. With HeroUI's border width at 1px the steppers get their own field-border edges; the card draws them as one divider on the inner side of each stepper.

## Use
- Participant counts by age group on C10; quantity on the gift detail (C03).
- The consumer provides label, min/max, step and the price line under it.

## Don't
- Don't use it for prices or free amounts; use InputGroup with a CHF prefix.
- Don't let the plus stepper exceed remaining places; disable it at the max.
