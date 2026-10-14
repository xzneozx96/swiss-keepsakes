# TextField

A labelled single-line or multi-line text field with description and validation message, 40px tall on phones.

## Covers
HeroUI v3 `TextField`, `Input`, `TextArea` (with `Label`, `Description`, `FieldError`).

## Spec
- Stack gap 4px: Label (Inter 14/20 500 `color-foreground`), field, Description (12/16 `color-muted`) or FieldError. The error replaces the description while invalid.
- Field: radius 12px (`radius-xl`), `color-field` background, `shadow-surface` (HeroUI field shadow). Text 16/24 below 640px (no iOS zoom), 14/20 above.
- Placeholder `color-field-placeholder`. Hover (pointer only): border `color-field-border-hover`, fill close to `color-background`. Invalid: 1px `color-danger` border.
- TextArea 3 rows = 88px on phones.
- `secondary` field variant: not used; with the visible border, fields stay primary on every surface.

## Our changes
- Visible 1px border (`border-width-field`) in `color-field-border` (#8F8F8B, 3:1 on white and on the page ground). HeroUI draws no border.
- Height stays 40px on phones with the border: vertical padding 7px + 24px line + 2px border (HeroUI's padding alone would give 42px). Fields drop to 36px from 640px, when text drops to 14px.
- Focus: 1px `color-focus` (ink) border plus a 1px flush ring, 2px in total. Ink so focus never reads as the brick invalid state.
- FieldError: 13/18 weight 500 (`label` style) with a 16px warning icon in `color-danger`, so the error is icon + words.
- Required marker `*` in `color-muted` (brick is for errors only); optional fields may say "(optional)" instead.
- Read-only style (HeroUI has none): `color-surface-secondary` fill, no shadow, a lock icon; used for values the shop confirmed.
- Character counter in the trailing slot (engraving text, C03).

## Use
- Contact data, engraving text, messages to the shop (C03, C11, C21, C22).
- The consumer provides label, name, validation and helper text; use `fullWidth` at 375px.

## Don't
- Don't use placeholder text as the label.
- Don't show a disabled field for confirmed data; use the read-only style or plain text.
- Don't drop below 16px input text on phones.
