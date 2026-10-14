# RadioGroup

A labelled set of round options where exactly one can be chosen.

## Covers
HeroUI v3 `RadioGroup` and `Radio`.

## Spec
- Control 16px circle (`radius-lg`), `color-field` with `shadow-surface`; row gap 12px; label Inter 14/20 500.
- Selected: `color-accent` fill with a `color-accent-foreground` dot (scale .4286, about 7px). Pressed: scale .95, dot grows to about 9px, fill `color-accent-hover`.
- Focus-visible 2px `color-focus` ring with 2px gap. Invalid 1px `color-danger`.
- Description indent 28px, 12/16 `color-muted`. Vertical items 16px apart; horizontal: gap 16px, wraps.

## Our changes
- Unselected border `color-control-border` (= `color-field-border`, 3:1); hover darkens it to `color-field-border-hover`.
- Disabled dims only the control and label; the reason in the description stays at full `color-muted`.
- Rows at least 44px tall on phones.

## Use
- Payment option on review and booking (C06, C11): deposit vs full payment, with the amount due today in the description.
- The consumer provides label, options, descriptions and the disabled reason in words.

## Don't
- Don't use for more than about 6 options; use Select.
- Don't leave a disabled option without a reason.
