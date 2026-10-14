# Checkbox

A 16px square checkbox with a label, used alone or in a CheckboxGroup.

## Covers
HeroUI v3 `Checkbox` and `CheckboxGroup` (checked, unchecked, hover, focus, indeterminate, invalid, disabled).

## Spec
- Control 16 x 16px, radius 6px (`radius-md`), `color-field` with `shadow-surface`. Label row gap 12px, Inter 14/20 500.
- Checked: `color-accent` fill, 10px checkmark in `color-accent-foreground` (dash-drawn, 150ms). Indeterminate: 12px dash. Hover when checked: `color-accent-hover`.
- Focus-visible: 2px `color-focus` ring with 2px gap around the control.
- Description and error indent 28px (16 + 12). Description 12/16 `color-muted`.
- CheckboxGroup: label, description, then items 16px apart (margin-top 16px each).

## Our changes
- Unchecked border `color-control-border` (= `color-field-border`, 3:1 on white). Hover darkens it to `color-field-border-hover`; HeroUI's own hover would lighten the edge.
- Invalid: 1px `color-danger` edge plus a FieldError line with a warning icon and words. Invalid and checked keeps the accent fill (HeroUI fills brick; brick is never a solid fill here); the error text carries the state.
- Disabled dims only the control and label; the reason in the description stays at full `color-muted`.
- Each row gets a 44px tap height on phones (the label is part of the target).

## Use
- Optional extras on gift detail and cart (C03, C04): gift wrap, greeting card, gift ribbon. Terms consent on review (C06).
- The consumer provides label, optional description, value and `isRequired` / validation.

## Don't
- Don't write state into the label; the label is the option text only.
- Don't use a checkbox to trigger an immediate action; use Switch for settings that apply at once.
- Don't shrink the hit area to the 16px box.
