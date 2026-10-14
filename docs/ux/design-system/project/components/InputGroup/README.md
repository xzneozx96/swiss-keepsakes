# InputGroup

A text field with prefix and suffix slots inside one shell, for currency amounts and units.

## Covers
HeroUI v3 `InputGroup` (Prefix, Input or TextArea, Suffix).

## Spec
- Shell min height 36px, radius 12px, `color-field`, `shadow-surface`.
- Prefix and suffix: padding x 12px, `color-field-placeholder`. They carry an inner border of `border-width-field` in `color-field-border` (invisible in HeroUI's default 0px theme; visible here at 1px). The input drops its padding on the side that has an adornment.
- Focus ring (1px `color-focus` border plus 1px flush ring) only when the inner input is focused. Invalid 1px `color-danger`. Disabled 50%.
- `secondary` variant: not used.

## Our changes
- 40px on phones (approved) and a visible 1px `color-field-border`, which also shows HeroUI's prefix and suffix dividers.

## Use
- CHF amounts in the payment and refund sheets (M08, M09, M10): prefix "CHF", suffix "von 89.00".
- Use tabular numbers for the value. The consumer provides label, prefix, suffix and validation.

## Don't
- Don't put interactive buttons in the suffix without an `aria-label`.
