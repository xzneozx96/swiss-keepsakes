# Fieldset

A titled group of fields with an action row, the standard way to compose a form section on a phone.

## Covers
HeroUI v3 `Fieldset` (legend, field group, actions), `Form`, `Label`, `Description`, `FieldError`, `ErrorMessage`.

## Spec
- Fieldset: legend Inter 16/24 500 `color-foreground`; 24px between legend, field group and actions; 16px between fields; actions get 4px extra top padding and 8px between buttons.
- Form: native form with React Aria validation; no styling of its own. The first invalid field takes focus on a failed submit.
- Label 14/20 500; invalid turns it `color-danger`; disabled 50%.
- Description 12/16 `color-muted`, 4px below the control, hidden while invalid.
- FieldError 4px side inset, fades in 150ms. ErrorMessage is the same message for non-form parts (Calendar, TagGroup).

## Our changes
- Fields inside use the visible 1px `color-field-border` and 40px height on phones.
- Required marker `*` in `color-muted` (HeroUI uses brick; brick is for errors only).
- FieldError and ErrorMessage: 13/18 weight 500 in `color-danger` with a 16px warning icon, so every error is icon + words.
- Below 360px the action row stacks full width, primary on top (button labels never wrap).

## Use
- Contact and traveller details (C11), trip consultation steps (C21), private tour request (C22), merchant settings (M22).
- At 375px: 16px side padding, primary action stretched (`flex:1`), back action as tertiary.
- Error pattern (UX spec 5.5): plain words, keep what was typed, offer a retry.

## Don't
- Don't put two primary buttons in the action row.
- Don't show errors only as a coloured border; always include the error text and icon.
