# HeroUI v3 (React) - Form Components Reference

Scope: Input, TextField, TextArea, NumberField, SearchField, InputGroup, InputOTP, Label, Description, ErrorMessage, FieldError, Fieldset, Form, Checkbox, CheckboxGroup, Radio/RadioGroup, Switch (+SwitchGroup), Slider.

Method: every value below was read from the v3 branch CSS (`packages/styles/components/*.css`), the token files (`themes/shared/theme.css`, `themes/default/variables.css`, `utilities/index.css`), the React sources where noted, and the docs MDX. Tailwind utilities are converted to px (1 unit = 4px, rem = 16px). OKLCH tokens were converted to sRGB hex with a script (OKLab math, rounded); hex values are therefore computed, not copied from HeroUI. Anything not present in those files is listed in section 0.

---

## 0. Values not found / caveats (read first)

| Item | Status |
|---|---|
| `--color-field-border-invalid` (used by NumberField, SearchField, InputGroup `[data-invalid]` `border-color`) | Not found in theme.css, variables.css or utilities. Moot in the default theme because field border width is 0. |
| `--ease-out` (used in most transitions) | Not defined in HeroUI theme.css (only `--ease-smooth: ease`, `--ease-out-*` named curves, `--ease-out-fluid`). It comes from the Tailwind v4 base theme, which is not in the fetched files, so the exact curve is unverified here. Treat as "ease-out". |
| Read-only styling | No component CSS rule targets read-only. Docs list `[aria-readonly="true"]` for Input but no rule exists. Read-only looks identical to default. |
| Fixed sizes for Input/TextArea/TextField | There is no `size` prop on any field. Only Switch has `size` (sm/md/lg). Input has no explicit height or width; height comes from padding plus line height. |
| Border in the default theme | `--field-border: transparent` and `--field-border-width: 0px`. All border-colour hover/focus tokens exist but are invisible by default. They only matter if a theme sets a field border (formulas given in section 1). |
| Slider hover | Docs mention thumb hover as a state, but slider.css has no hover rule. |
| Radio dot size | CSS comments say 6px (selected) and 8px (pressed) but the scale values (0.4286, 0.5714) on a 16px control compute to 6.86px and 9.14px. Both are given. |
| `invalid-field-ring` focused behaviour | Comment says "remove outline" on focus, but the CSS only adds `ring-2 ring-danger`; it does not unset the 1px outline. Visually the outline is likely hidden under/beside the ring. Not verified in a browser. |
| Form | No CSS file exists (`form.css` returns 404). Form is a bare `<form>`; no tokens to extract. |

---

## 1. Shared foundations

### 1.1 Field tokens (light theme / dark theme)

| Token | Definition | Light | Dark |
|---|---|---|---|
| `--field-background` | white / dark surface | `#FFFFFF` (`oklch(100% 0 0)`) | `#18181B` (`oklch(0.2103 0.0059 285.89)`) |
| `--field-foreground` | | `#18181B` (`oklch(0.2103 0.0059 285.89)`) | `--foreground` = `#FCFCFC` (snow) |
| `--field-placeholder` | `var(--muted)` | `#71717A` (`oklch(0.5517 0.0138 285.94)`) | `#9F9FA9` (`oklch(70.5% 0.015 286.067)`) |
| `--field-border` | | `transparent` | `transparent` |
| `--field-border-width` (`--border-width-field`) | | `0px` | `0px` |
| `--field-radius` (`rounded-field`) | `calc(var(--radius) * 1.5)` | 12px | 12px |
| `--field-shadow` (`shadow-field`) | | `0 2px 4px 0 rgba(0,0,0,.04), 0 1px 2px 0 rgba(0,0,0,.06), 0 0 1px 0 rgba(0,0,0,.06)` | `0 0 0 0 transparent inset` (none) |
| `--field-hover` (bg hover) | `color-mix(in oklab, field-background 90%, field-foreground 2%)` | computed `#F9F9F9` at 92% alpha (percentages sum to 92%, so result alpha is 0.92; over white it reads about `#FAFAFA`) | computed `#1C1C1F` at 92% alpha |
| `--field-focus` (bg focus) | `var(--field-background)` | `#FFFFFF` | `#18181B` |
| `--field-border-hover` | `color-mix(in oklab, field-border 88%, field-foreground 10%)` | with border = transparent: `#18181B` at 10% alpha (computed) | `#FCFCFC` at 10% alpha |
| `--field-border-focus` | `color-mix(in oklab, field-border 74%, field-foreground 22%)` | `#18181B` at 22% alpha (computed) | `#FCFCFC` at 22% alpha |
| `--disabled-opacity` | | 0.5 | 0.5 |
| `--focus` | `var(--accent)` | `#0485F7` (`oklch(0.6204 0.195 253.83)`) | same |
| `--danger` | | `#FF383C` (`oklch(0.6532 0.2328 25.74)`) | `#DB3B3E` (`oklch(0.594 0.1967 24.63)`) |
| `--danger-foreground` | snow | `#FCFCFC` | `#FCFCFC` |
| `--accent` / `--accent-foreground` | | `#0485F7` / `#FCFCFC` | same |
| `--accent-hover` | `color-mix(accent 90%, accent-foreground 10%)` | `#3592F9` (computed) | not computed here (formula identical, dark-theme accent is the same hue) |
| `--default` (secondary-variant bg, switch/slider track) | | `#EBEBEC` (`oklch(94% 0.001 286.375)`) | `#27272A` (`oklch(27.4% 0.006 286.033)`) |
| `--default-hover` | `color-mix(default 96%, default-foreground 4%)` | `#E1E1E2` (computed) | `#2E2E31` (computed) |
| `--muted` | | `#71717A` | `#9F9FA9` |
| `--foreground` | | `#18181B` | `#FCFCFC` |
| `--background` | | `#F5F5F5` (`oklch(0.9702 0 0)`) | `#060607` (`oklch(12% 0.005 285.823)`) |
| `--separator` | | `#E4E4E7` (`oklch(92% 0.004 286.32)`) | `#212124` (`oklch(25% 0.006 286.033)`) |
| `--ring-offset-width` | | 2px | 2px |

Dark `--default-foreground` = snow (`#FCFCFC`); light = eclipse (`#18181B`).

### 1.2 Status utilities (utilities/index.css)

| Utility | Effect | Used by |
|---|---|---|
| `status-focused-field` (= `focus-field-ring`) | `box-shadow` ring 2px `--focus` (`#0485F7`), ring offset 0 (flush against the element), no outline | Input, TextArea, NumberField group, SearchField group, InputGroup, InputOTP active slot |
| `status-focused` (= `focus-ring`) | ring 2px `--focus`, ring-offset width 2px, offset colour `--background` (a 2px gap in page background colour between element and ring) | Checkbox control, Radio control, Switch control, Slider thumb, CloseButton |
| `status-invalid-field` (= `invalid-field-ring`) | unfocused: `outline: 1px solid --danger` (offset 0). Focused/focus-within: `ring-2 ring-danger`, ring offset 0 | all text fields, checkbox control (unselected), radio control |
| `status-disabled` | `opacity: 0.5; cursor: not-allowed; pointer-events: none` | all |

### 1.3 Shared field behaviour (Input / TextArea / groups)

- Base: `rounded-field` 12px, bg `--field-background`, text `--field-foreground`, placeholder `--field-placeholder`, `shadow-field`, no outline, border width 0.
- Padding: `px-3 py-2` = 12px horizontal, 8px vertical.
- Type: `text-base` 16/24 below 640px, `sm:text-sm` 14/20 from 640px. This is the iOS no-zoom guard (16px on phones).
- Resulting single-line height with border 0: 8 + 24 + 8 = **40px (below 640px)**, 8 + 20 + 8 = **36px (640px and up)**.
- Variants: `primary` (default, has `shadow-field`) and `secondary` (no shadow, bg `--default`, hover `--default-hover`, focus `--default`; meant for use on Surface cards).
- Transitions: `background-color 150ms ease`, `border-color 150ms ease`, `box-shadow 150ms ease-out`; `motion-reduce:transition-none`.
- Hover (only on `@media (hover: hover)` devices, never while focused): bg `--field-hover`, border `--field-border-hover` (invisible in default theme).
- Focus: 2px `#0485F7` ring flush to the field, bg `--field-focus`, border `--field-border-focus`.
- Invalid (`data-invalid="true"`): 1px danger outline when not focused; 2px danger ring when focused; bg `--field-focus` (so hover bg is suppressed once invalid).
- Disabled: opacity 0.5, not-allowed cursor, no pointer events.
- In a field group (NumberField / SearchField / InputGroup) the group carries the styling and the inner `<input>` is `bg-transparent`, `rounded-none`, no border, no shadow.
- `Surface` rule: inside a Surface use `variant="secondary"`.

---

## 2. Input

- Purpose: primitive single-line `<input>`; no label/validation (wrap in TextField).
- Anatomy: single element `.input` (`data-slot="input"`).
- Variants: `primary` (default), `secondary`. Prop `fullWidth` -> `.input--full-width` = `width: 100%`. No sizes. No colour prop.
- Metrics: see 1.3. Height 40px (<640px) / 36px (>=640px). Width intrinsic unless `fullWidth`.
- States: hover, focus, invalid, disabled per 1.3. Selectors `:hover`/`[data-hovered]`, `:focus`/`[data-focused]`, `[data-invalid="true"]`, `:disabled`/`[aria-disabled]`.
- Secondary variant tokens: `--input-bg: var(--default)` `#EBEBEC`, `--input-bg-hover: var(--default-hover)` `#E1E1E2`, `--input-bg-focus: var(--default)`. Invalid bg = `--input-bg-focus`.
- Motion: 150ms colour/border, 150ms ease-out shadow.
- A11y: native input; `aria-invalid` mirrored to `data-invalid`. Needs a label via TextField or `aria-label`.
- Mobile: 16px text prevents iOS zoom; 40px tall (meets 40px+ touch target guidance, below 44px).
- Source: https://www.heroui.com/docs/react/components/input ; https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/input.css

## 3. TextArea

- Purpose: primitive multiline `<textarea>`.
- Anatomy: single element `.textarea`.
- Same tokens/states/variants as Input (1.3); additionally `min-height: 38px`; prop `rows` default 3 (docs), `fullWidth` -> `width:100%`. Resize handle is the browser default (no `resize` rule except inside InputGroup, where `resize: vertical`).
- Height at 3 rows (derived, not in source): 3 x 24 + 16 = 88px below 640px; 3 x 20 + 16 = 76px from 640px.
- Source: https://www.heroui.com/docs/react/components/text-area ; .../components/textarea.css

## 4. TextField

- Purpose: composition root that wires Label, Input/TextArea, Description, FieldError with React Aria accessibility and validation.
- Anatomy: `TextField` > `Label`, `Input` | `TextArea`, `Description`, `FieldError`.
- CSS: `.textfield { display:flex; flex-direction:column; gap:4px }` (gap-1). `.textfield--full-width` (prop `fullWidth`) sets width 100% and forces child `[data-slot=input]`, `[data-slot=textarea]` to width 100%.
- Spacing: Label -> Input 4px; Input -> Description 4px; Input -> FieldError 4px (plus FieldError own `px-1` 4px horizontal inset).
- Invalid: `[data-invalid="true"]` / `[aria-invalid="true"]` sets `[data-slot="description"] { display:none }`, so the error message replaces the description in the same slot position.
- Required: `isRequired` -> Label gets red asterisk (see Label). Disabled/invalid propagate to child label colours.
- Props: `isRequired`, `isInvalid`, `isDisabled`, `isReadOnly`, `validate`, `validationBehavior` ('native' default | 'aria'), `validationErrors`, `fullWidth`, `name`, `autoFocus`.
- A11y: React Aria wires `aria-labelledby`, `aria-describedby`, `aria-invalid`; native validation by default.
- Mobile: stack is single column; use `fullWidth` at 375px.
- Source: https://www.heroui.com/docs/react/components/text-field ; .../components/textfield.css

## 5. NumberField

- Purpose: numeric entry with optional stepper buttons and locale formatting (`formatOptions`, `minValue`, `maxValue`, `step` default 1).
- Anatomy: `.number-field` (flex-col gap 4px) > `Label`; `.number-field__group` > `DecrementButton` (`.number-field__decrement-button`, `slot="decrement"`), `.number-field__input`, `IncrementButton` (`.number-field__increment-button`, `slot="increment"`); `Description`; `FieldError`. Label has `width: fit-content`.
- Group: `display:grid; height:36px (h-9); align-items:center; overflow:hidden; rounded-field 12px; text-sm 14/20; bg field; shadow-field; border width 0`. Columns: input only `1fr`; decrement+input `40px 1fr`; input+increment `1fr 40px`; both `40px 1fr 40px`.
- Input: `min-width:0; rounded-none; bg transparent; px-3 (12px) py-2 (8px); text-base 16/24 (<640px) / text-sm 14/20 (>=640px); tabular-nums; no shadow`. Note: at <640px the input content height (24 + 16 = 40px) exceeds the group's fixed 36px; group is `overflow:hidden`, so clipping/centering behaviour on phones should be verified.
- Buttons: `40px` wide, full group height (36px), transparent bg, `text-field-foreground`, icon 16px (IconPlus / IconMinus, `data-slot=number-field-*-button-icon`). 1px divider: increment has `border-inline-start`, decrement has `border-inline-end`, colour `--field-placeholder` at 15% (`#71717A` @ 15% in light, `#9F9FA9` @ 15% in dark). Corner radii: increment `rounded-e-field` (12px right), decrement `rounded-s-field` (12px left).
- States:
  - Hover (group, hover-capable devices, not focus-within): bg `--field-hover`.
  - Focus-within: 2px `#0485F7` flush ring, bg `--field-focus`.
  - Invalid: 1px danger outline (2px ring when focus-within), bg `--field-focus`.
  - Disabled: group opacity 0.5, not-allowed, no pointer events; each button also `status-disabled`.
  - Button pressed (`:active`/`[data-pressed]`): bg `--field-foreground` at 10% alpha, `transform: scale(0.97)`.
  - Autofill: highlight lifted to group (bg `--field-focus`, border `--field-border-focus`).
- Variants: `primary` (default), `secondary` (group bg `#EBEBEC`, hover `#E1E1E2`, focus `#EBEBEC`, no shadow; invalid uses danger outline). `fullWidth` -> `.number-field--full-width` and `.number-field__group--full-width` width 100%.
- Motion: group 150ms bg/border ease, 150ms ease-out shadow; buttons 150ms bg/border ease.
- A11y: React Aria NumberField (spinbutton role, Up/Down arrows, PageUp/PageDown, wheel/scroll, Home/End with min/max); buttons are labelled by RAC.
- Mobile: `inputMode` decimal keyboard via RAC; 40px stepper targets, 36px tall (below 44px minimum).
- Source: https://www.heroui.com/docs/react/components/number-field ; .../components/number-field.css ; icons from `packages/react/src/components/number-field/number-field.tsx`

## 6. SearchField

- Purpose: search query input with search icon and clear button.
- Anatomy: `.search-field` (flex-col gap 4px) > `Label` (fit-content), `.search-field__group` > `SearchField.SearchIcon` (`.search-field__search-icon`), `.search-field__input`, `SearchField.ClearButton` (`.search-field__clear-button`, a CloseButton, `slot="clear"`); `Description`; `FieldError`.
- Group: `position:relative; display:inline-flex; height:36px; align-items:center; overflow:hidden; rounded-field 12px; text-sm; bg field; shadow-field; border width 0`.
- Search icon: `shrink-0`, 16px square (IconSearch), colour `--field-placeholder`, margin-inline-start 12px, margin-inline-end 0, non-interactive.
- Input: `flex:1; rounded-none; bg transparent; px-3 py-2; text-base (<640px) / text-sm; no shadow`. With search icon present: `padding-inline-start: 8px`. With clear button present: `padding-inline-end: 8px`. Native WebKit search cancel/decoration hidden.
- Clear button: `20px x 20px` (`size-5`), `margin-inline-end: 8px`, `shrink-0`, base CloseButton (rounded-xl 12px, `bg-default` `#EBEBEC`, `text-muted`, hover `bg-default-hover` `#E1E1E2`, pressed `scale(0.93)`), icon overridden to 12px (`size-3`). When the field is empty (`data-empty="true"`) the button is `opacity:0; pointer-events:none`.
- States: hover (bg `--field-hover`, not focus-within), focus-within (2px `#0485F7` flush ring; bg stays field), invalid (1px danger outline; bg `--field-focus`), disabled (opacity 0.5). Variants `primary`/`secondary` (secondary: bg `#EBEBEC` / hover `#E1E1E2` / focus `#EBEBEC`, no shadow). `fullWidth` -> `.search-field--full-width`, `.search-field__group--full-width`.
- Motion: 150ms bg/border ease, 150ms ease-out shadow. CloseButton: transform 250ms ease-out-quart, colour 150ms, bg 100ms.
- A11y: `role=searchfield`, Escape clears (React Aria), clear button has accessible label; description hidden when invalid.
- Mobile: input 16px; same 36px group height caveat as NumberField.
- Source: https://www.heroui.com/docs/react/components/search-field ; .../components/search-field.css ; .../components/close-button.css

## 7. InputGroup

- Purpose: single field with prefix/suffix adornments (icon, text, button, kbd, badge) inside one rounded shell. Used inside TextField.
- Anatomy: `.input-group` (`InputGroup`/`InputGroup.Root`) > `InputGroup.Prefix` (`.input-group__prefix`), `InputGroup.Input` (`.input-group__input`, `data-slot=input-group-input`) or `InputGroup.TextArea` (`data-slot=input-group-textarea`), `InputGroup.Suffix` (`.input-group__suffix`).
- Root: `display:inline-flex; min-height:36px; align-items:center; rounded-field 12px; text-sm 14/20; bg field; shadow-field; border width 0`. With a textarea: `align-items:flex-start; height:auto`.
- Input: `flex:1; rounded-none; transparent bg; no border/shadow; px-3 py-2; text-base (<640px) / text-sm`. With prefix: `padding-inline-start: 0` (prefix supplies 12px). With suffix: `padding-inline-end: 0`. Textarea: `min-height:38px; resize: vertical`.
- Prefix/Suffix: `flex; height:100%; align-items:center; justify-content:center; px-3 (12px); bg transparent; colour --field-placeholder`; prefix radii `12px 0 0 12px`, suffix `0 12px 12px 0`; they declare a 1px-style border only on the inner side with width `--border-width-field` (0), so no visible divider by default. With textarea: align top with `padding-top: 8px`.
- States: hover (not focus-within), focus only when the inner input/textarea is focused (`:has([data-slot=input-group-input]:focus)`): 2px flush `#0485F7` ring, bg `--field-focus`; invalid: 1px danger outline, bg `--field-focus`; disabled: opacity 0.5. Variants `primary` / `secondary` (bg `#EBEBEC`, hover `#E1E1E2`, focus `#EBEBEC`, no shadow). `fullWidth` -> `.input-group--full-width`.
- Motion: 150ms bg/border ease, 150ms ease-out shadow.
- A11y: label via TextField wrapper; adornments are not part of the accessible name unless given `aria-label` (icon-only buttons need `aria-label`).
- Mobile: use `fullWidth`; prefix/suffix hit areas are 12px padding around content.
- Source: https://www.heroui.com/docs/react/components/input-group ; .../components/input-group.css

## 8. InputOTP

- Purpose: one-time-code entry built on the `input-otp` library.
- Anatomy: `.input-otp` (root: `position:relative; display:flex; width:100%; align-items:center; gap:8px`) > `.input-otp__group` (`flex; min-width:0; align-items:center; gap:8px`) > `.input-otp__slot` (> `.input-otp__slot-value`, `.input-otp__caret`) ; `.input-otp__separator`; props `maxLength` (required), `pattern`, `inputMode` (default numeric), `onComplete`, `pasteTransformer`, `textAlign`.
- Slot: `height:40px; width:38px (w-9.5); flex:1; min-width:0; centred content; rounded-field 12px; bg field; text-field-foreground; shadow-field; text-sm font-semibold (600); border width 0`. (Because `flex:1` with `min-width:0`, the slot may flex from the 38px nominal size when the group has spare room; verify in browser.)
- Slot value: `text-lg 18/24; letter-spacing -0.27px`; entrance animation `slot-value-in 250ms ease both`, transform-origin bottom centre: from `opacity 0, translateY(8px), scale(.8)` to `opacity 1, translateY(0), scale(1)`.
- Caret: `position:absolute; height:16px; width:2px; rounded-sm 4px; bg --field-placeholder`; animation `caret-blink 1.2s ease-out infinite` (opacity 1 at 0-70%/100%, 0 at 20-50%).
- Separator: `height:2px; width:6px; rounded-sm 4px; bg --separator` (`#E4E4E7` light / `#212124` dark), `shrink-0`.
- States: hover (bg `--field-hover`); active slot (`data-active="true"`): `z-index:10`, bg `--field-focus`, 2px flush `#0485F7` ring; filled (`data-filled`): bg `--field-focus`; disabled: slot opacity 0.5 and root `cursor:not-allowed; opacity:0.5`; invalid slot: 1px danger outline (2px ring when active), bg `--field-focus`.
- Variants: `primary`, `secondary` (slot bg `#EBEBEC`, hover `#E1E1E2`, active/filled `#EBEBEC`, no shadow).
- Motion: slot 150ms bg/border ease, 150ms ease-out shadow; value-in 250ms; caret 1.2s loop. `motion-reduce` disables value animation.
- A11y: single underlying input (input-otp library), paste support via `pasteTransformer`, `inputMode` default numeric (autocomplete attribute not verified).
- Mobile 375px: 6 slots x 38px + 5 gaps x 8px = 268px (plus a 6px separator and 8px gaps if grouped 3+3 = about 288px) fits within 375 minus 2 x 16px gutters (343px).
- Source: https://www.heroui.com/docs/react/components/input-otp ; .../components/input-otp.css

## 9. Label

- Purpose: accessible field label (native `<label>`).
- Style: `text-sm 14/20; font-medium (500); colour --foreground` (`#18181B` / `#FCFCFC`).
- Required: `.label--required` or parent `[data-required="true"]` (excluding role group/radiogroup/checkboxgroup and `data-slot` radio/checkbox) adds `::after { content:'*'; margin-inline-start: 2px; colour --danger }`.
- Disabled (`.label--disabled`, `[data-disabled="true"] .label`): opacity 0.5, not-allowed, no pointer events.
- Invalid (`.label--invalid`, `[data-invalid="true"] .label`, `[aria-invalid="true"] .label`): colour `--danger` (`#FF383C` / `#DB3B3E`).
- Placement: first child of its field, 4px above the control (parent gap-1). In NumberField/SearchField/Slider the label is `width: fit-content` (Slider: `w-fit`).
- A11y: `htmlFor`; click focuses/activates control; props `isRequired`, `isDisabled`, `isInvalid`.
- Source: https://www.heroui.com/docs/react/components/label ; .../components/label.css

## 10. Description

- `text-xs 12/16; colour --muted` (`#71717A` / `#9F9FA9`); `text-wrap; overflow-wrap:break-word`. Placed 4px below the control. `slot="description"` for aria-describedby. Hidden (`display:none`) on TextField/NumberField/SearchField when invalid. Inside Checkbox/Radio: see those sections (indented 28px). Switch: indented 52px (md).
- Source: https://www.heroui.com/docs/react/components/description ; .../components/description.css

## 11. ErrorMessage

- Purpose: low-level error text for non-form components (TagGroup, Calendar). Form fields should use FieldError.
- Style: `height:auto; text-xs 12/16; overflow-wrap:break-word; colour --danger`. Transitions: `opacity 150ms ease-out`, `height 350ms ease`; `motion-reduce:transition-none`. Uses RAC `Text slot="errorMessage"`. No padding.
- Source: https://www.heroui.com/docs/react/components/error-message ; .../components/error-message.css

## 12. FieldError

- Purpose: form validation message; renders only when the parent field is invalid.
- Style: `height:0; padding-inline: 4px (px-1); text-xs 12/16; overflow-wrap:break-word; colour --danger; opacity:0`; when `data-visible`: `height:auto; opacity:1`. Transitions `opacity 150ms ease-out`, `height 350ms ease`.
- Placement: last child in TextField/NumberField/SearchField/Slider-like stacks, 4px below the control (parent gap), 4px side inset.
- Inside `.checkbox`, `.switch`, `.radio`: overridden to `margin:0; height:auto; min-height:0; padding:0; colour --muted; opacity:1; transition:none`, then the checkbox/radio/switch rules indent it (28px / 28px / 52px md) and `text-xs`. (So in toggle fields the error text is muted-coloured, not red, by this CSS; the Label/control carries the red.)
- A11y: announced via React Aria validation (exact ARIA role not verified); supports render function with `ValidationResult`.
- Source: https://www.heroui.com/docs/react/components/field-error ; .../components/field-error.css

## 13. Fieldset

- Anatomy: `.fieldset` > `.fieldset__legend`, `.fieldset__field-group`, `.fieldset__actions`.
- `.fieldset`: `display:flex; flex-direction:column; gap:24px; flex: 1 1 0` (Safari fix).
- `.fieldset__legend`: `text-base 16/24; font-medium 500; colour --foreground`.
- `.fieldset__field-group`: `width:100%; space-y-4` = 16px vertical gap between direct children.
- `.fieldset__actions`: `flex; align-items:center; gap:8px; padding-top:4px` (so 24px + 4px = 28px above the buttons).
- Source: https://www.heroui.com/docs/react/components/fieldset ; .../components/fieldset.css

## 14. Form

- Native `<form>` wrapper around React Aria `Form` (validation, `validationErrors`, `validationBehavior` native|aria, `onSubmit`, `onInvalid`, `onReset`). No CSS, no tokens, no BEM classes (`form.css` does not exist). Layout is whatever the designer places inside; recommended composition: Form > Fieldset > fields > Buttons.
- A11y: landmark when `aria-label`/`aria-labelledby` given; first invalid field is focused on failed submit.
- Source: https://www.heroui.com/docs/react/components/form

## 15. Checkbox

- Purpose: boolean / multi-select toggle; supports indeterminate.
- Anatomy: `.checkbox` (field root) > `.checkbox__content` (clickable `<label>`: `.checkbox__control` > `.checkbox__indicator` + label text), then `Description` and `FieldError` as siblings of content.
- Field root: `flex; flex-direction:column; align-items:flex-start; gap:4px` (label row -> description 4px).
- Content row: `inline-flex; align-items:center; gap:12px; text-sm 14/20; font-medium 500; text-foreground`.
- Control: `16 x 16px; rounded-md 6px; overflow:hidden; border width 0 (--border-width-field), border colour --field-border; bg --field-background; shadow-field`. A `::before` accent fill (rounded 6px, inset 0) is the checked background: unselected `scale(0.7) opacity 0`; selected `scale(1) opacity 1`.
- Indicator box 12 x 12px, centred, above the fill. Checkmark: SVG viewBox 17x18, polyline `1 9, 7 14, 15 4`, stroke-width 2 (CSS also sets 2.5px stroke), displayed 10 x 10px (`size-2.5`), colour `--accent-foreground` (`#FCFCFC`), drawn via stroke-dashoffset (dasharray 22; unchecked offset 66, checked 44). Indeterminate: SVG viewBox 24x24, line from (21,12) to (3,12), stroke-width 3, round cap, displayed 12 x 12px.
- Variants: `primary` (default, shadow-field), `secondary` (control bg `--default` `#EBEBEC` / `#27272A`, no shadow). No sizes; "full rounded" is a docs customization (CSS class override).
- States:

| State | Control | Notes |
|---|---|---|
| Unselected | bg `#FFFFFF`, border transparent/0, shadow-field | |
| Hover (unselected) | border `--field-border-hover` (invisible by default) | `::before` becomes `--accent-hover` but opacity is 0, so no visible change by default |
| Hover (selected) | fill `--accent-hover` `#3592F9` | |
| Focus-visible | 2px `#0485F7` ring with 2px offset (offset colour = `--background`) around the 16px control | on control, not label |
| Selected | fill `--accent` `#0485F7`, border transparent, check `#FCFCFC` | |
| Indeterminate | bg `--accent` + fill, dash `#FCFCFC` | pressed: bg `--accent-hover` |
| Invalid (unselected) | 1px `--danger` outline (`#FF383C`) | 2px danger ring when focus-within per invalid-field-ring |
| Invalid + selected | bg and fill `--danger`, border transparent, check `--danger-foreground` | indeterminate invalid: bg `--danger`, dash `--danger-foreground` |
| Disabled | whole field opacity 0.5, not-allowed, no pointer events; description/error also `status-disabled` (compounded dimming on help text) | |
| Pressed | no rule defined | |
| Read-only | no rule | |

- Description/error indent: `padding-inline-start: 28px` (16px control + 12px gap), `text-xs 12/16`, `--muted`, `cursor: default`, `select-none`, `w-full`.
- Motion: control `background-color 200ms ease-out, border-color 200ms ease-out, transform 100ms ease-out`; fill `scale 100ms linear, opacity 200ms linear, bg 200ms ease-out`; checkmark dash `150ms linear 15ms` on select (`transition-all 200ms` otherwise); `motion-reduce:transition-none`.
- A11y: `role=checkbox` via RAC, Space toggles, `aria-checked="mixed"` when indeterminate, no label requires `aria-label`; `isRequired` + `validate` with native validation.
- Mobile: row height is the 20px label line; control is only 16px, so wrap in a tappable row with extra vertical padding (e.g. 12px) to reach 44px; the label is part of the click target.
- Source: https://www.heroui.com/docs/react/components/checkbox ; .../components/checkbox.css ; indicator SVG in `packages/react/src/components/checkbox/checkbox.tsx`

## 16. CheckboxGroup

- Purpose: manages a set of Checkboxes with shared Label, Description, FieldError.
- Anatomy: `.checkbox-group` > `Label`, `Description`, `Checkbox` items, `FieldError`.
- CSS: `display:flex; flex-direction:column`; every `[data-slot="checkbox"]` child gets `margin-top: 16px` (mt-4). The CSS has no `gap`, so spacing between label/description and first item, and between items, is 16px margin-top. Group-level required asterisk shows on the group Label; individual checkbox labels do not get one.
- Disabled/invalid/required/read-only via props `isDisabled`, `isInvalid`, `isRequired`, `isReadOnly`.
- Source: https://www.heroui.com/docs/react/components/checkbox-group ; .../components/checkbox-group.css

## 17. RadioGroup / Radio

- Purpose: single choice from a list.
- Anatomy: `.radio-group` > `Label`, `Description`, `.radio` items, `FieldError`. Each `.radio` (flex column, gap 4px, align start) > `.radio__content` (clickable row: `inline-flex; align-items:center; gap:12px; text-sm 14/20; font-medium; text-foreground`) > `.radio__control` (> `.radio__indicator`) + label text; then sibling `Description`, `FieldError`.
- Group CSS: `display:flex; flex-direction:column`. Vertical (default): each radio `margin-top: 16px`. Horizontal: `flex-direction:row; flex-wrap:wrap; gap:16px`.
- Control: `16 x 16px; rounded-lg (8px, circle); border width 0; bg --field-background; shadow-field`. Indicator: absolute, fills the control; unselected `::before` is a full-size circle filled with `--field-background` (hides itself), selected: control bg `--accent` `#0485F7`, border transparent, dot colour `--accent-foreground` (`#FCFCFC`) at `scale(0.4286)` (6.86px; CSS comment says 6px). Custom indicator children replace the dot.
- Variants: `primary`; `secondary` (set on RadioGroup: control bg `--default`, no shadow, hover border `--field-border-hover`, unselected dot bg tracks `--default` / `--default-hover`).
- States:

| State | Style |
|---|---|
| Hover | control border `--field-border-hover` (invisible by default); unselected inner dot bg `--field-hover` |
| Focus-visible | 2px `#0485F7` ring, 2px offset (offset colour `--background`) on control |
| Pressed | control `scale(0.95)`; selected pressed: control bg `--accent-hover` `#3592F9`, dot `scale(0.5714)` (9.14px; comment says 8px) |
| Selected | as above |
| Invalid | 1px `--danger` outline on control (also when selected, plus ring on focus) |
| Disabled | radio opacity 0.5, not-allowed, no pointer events; description/error also dimmed |
| Read-only | no rule |

- Description/error indent: 28px, `text-xs`, `--muted`.
- Motion: control bg/border `200ms ease-out`, transform `100ms ease-out`; dot scale and bg `200ms ease-out`.
- A11y: `role=radiogroup` with arrow-key roving, `orientation` prop (`vertical` default), `isRequired`/`isInvalid`, `name`.
- Mobile: same caution as Checkbox (16px control; make the row at least 44px tall); horizontal orientation wraps at 375px.
- Source: https://www.heroui.com/docs/react/components/radio-group ; .../components/radio.css ; .../components/radio-group.css

## 18. Switch / SwitchGroup

- Purpose: on/off toggle.
- Anatomy: `.switch` (root, flex column, gap 4px, align start) > `.switch__control` (track) > `.switch__thumb` (> optional `.switch__icon`); `.switch__content` (clickable label wrapper; `inline-flex; gap:12px; text-sm 14/20; font-medium`) > `Label`, `Description`.
- Sizes (all px at 16px root):

| Size | Track (w x h) | Track radius | Thumb (w x h) | Thumb radius | Thumb left offset off -> on | Description indent |
|---|---|---|---|---|---|---|
| `sm` | 32 x 16 | 8 | 16.5 x 12 | 6 | 2 -> 13.5 | 44 |
| `md` (default) | 40 x 20 | 12 | 22 x 16 | 8 | 2 -> 16 | 52 |
| `lg` | 48 x 24 | 12 | 27.5 x 20 | 12 | 2 -> 18.5 | 60 |

  Thumb offset: `margin-inline-start: 0.5 (2px)`; selected `calc(100% - 1.5rem)` md, `calc(100% - 1.15625rem)` sm, `calc(100% - 1.84375rem)` lg (value is margin from track left; 2px remains on the right in every size). Vertical gap above/below the thumb: 2px (md), 2px (sm), 2px (lg).
- Colours: track off `--default` (`#EBEBEC` / `#27272A`); hover `color-mix(in oklab, track, transparent 20%)` (= `--default` at 80% alpha); pressed = hover; on `--accent` (`#0485F7`); on+hover/pressed `--accent-hover` (`#3592F9`). Thumb off: `white` bg, `black` text, `shadow-field`; on: bg `--accent-foreground` (`#FCFCFC`), text `--accent`, shadow `0 0 5px rgba(0,0,0,.02), 0 2px 10px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.3)`.
- States: focus-visible: 2px `#0485F7` ring, 2px offset, on the track; disabled: root opacity 0.5, thumb bg `--default-foreground` at 20% alpha, selected-disabled thumb opacity 0.4, description/error also `status-disabled`; read-only: prop exists, no rule.
- Label position: control left, content right (gap 12px); docs show reverse-order variant ("Label Position") by DOM order. Description under the label starts at the label x offset (`ps-[calc(2.5rem+0.75rem)]` = 52px for md); `FieldError` inside switch is `text-xs --muted`.
- SwitchGroup: `.switch-group` flex column gap 24px; `.switch-group__items` flex gap 16px, row (`--horizontal`) or column (`--vertical`, default, prop `orientation`).
- Motion: track `background-color 250ms ease`, `box-shadow 150ms ease-out`; thumb `margin 300ms cubic-bezier(0.32,0.72,0,1)` (`--ease-out-fluid`), `background-color 200ms ease-out`; `motion-reduce:transition-none`.
- A11y: `role=switch` (RAC), Space toggles; label or `aria-label` required.
- Mobile: md track 40 x 20 is below 44px; wrap row in a 44px-high hit area.
- Source: https://www.heroui.com/docs/react/components/switch ; .../components/switch.css ; .../components/switch-group.css

## 19. Slider

- Purpose: single or range numeric selection; horizontal or vertical.
- Anatomy: `.slider` (grid) > `Label`, `.slider__output`, `.slider__track` > `.slider__fill`, `.slider__thumb` (one per value).
- Layout (horizontal): grid areas `"label output" / "track track"`, columns `1fr auto`, `gap:4px`, width 100%. Label `text-sm 14/20 font-medium`, `width: fit-content`, left; output `text-sm font-medium tabular-nums`, right. Track below with 4px gap.
- Track: `height:20px; width:100%; rounded-xl 12px; bg --default` (`#EBEBEC` / `#27272A`); `border-inline: 12px solid transparent` (reserves half a thumb at each end, so the visible fill/thumb travel is inset 12px per side). When the fill starts/ends at the edge the border gets `--accent` (`data-fill-start` / `data-fill-end`).
- Fill: absolute, `height:100%`, bg `--accent` (`#0485F7`), no pointer events.
- Thumb: container `position:absolute; top:50%; height:100%; width: calc(1.5rem + 0.25rem) = 28px; rounded-xl 12px; bg --accent; cursor grab`; its `::after` is the visible knob: `24 x 16px; rounded-lg 8px; bg --accent-foreground (#FCFCFC); shadow-field` so the thumb reads as a white 24x16 pill inside a 2px accent rim (28 x 20 overall).
- Vertical (`data-orientation=vertical`): grid areas `output / track / label`, rows `auto 1fr auto`, gap 8px, full height; track `width:20px; height:100%`, `border-block: 12px transparent`; thumb `height: 28px`, knob `16 x 24px`, `left:50%`; output and label centred.
- States: dragging: cursor grabbing, knob `scale(0.9)`; focus-visible: thumb `z-index:10` + 2px `#0485F7` ring, 2px offset (offset colour `--background`); disabled: slider opacity 0.5, not-allowed, no pointer events (label kept at full opacity inside disabled slider), thumb cursor default; hover: not defined in CSS.
- Motion: thumb `background-color 250ms ease, transform 250ms ease-out, box-shadow 150ms ease-out`; knob `transition-all` (Tailwind default); `motion-reduce:transition-none` and no scale.
- Props: `minValue` 0, `maxValue` 100, `step` 1, `orientation`, `formatOptions`, `isDisabled`; range slider uses two thumbs.
- A11y: RAC slider (role=slider per thumb, arrow keys, PageUp/PageDown, Home/End).
- Mobile: thumb 28 x 20 hit area; track 20px; full width at 375px with 12px per-side inset; avoid vertical sliders unless height is provided.
- Source: https://www.heroui.com/docs/react/components/slider ; .../components/slider.css

---

## 20. Quick spacing cheat-sheet

| Pair | Value |
|---|---|
| Label / control / description / error vertical gap (TextField, NumberField, SearchField) | 4px |
| FieldError horizontal inset | 4px each side |
| Input padding | 12px x 8px |
| Group heights (NumberField, SearchField) | 36px; InputGroup min 36px |
| Control to label (Checkbox, Radio, Switch) | 12px |
| Checkbox/Radio description indent | 28px |
| Switch description indent | 44 / 52 / 60px (sm / md / lg) |
| CheckboxGroup, RadioGroup (vertical) item spacing | 16px margin-top per item (no gap) |
| RadioGroup horizontal | gap 16px, wrap |
| SwitchGroup | 24px between label/items; 16px between switches |
| Fieldset | 24px between legend/group/actions; 16px between fields; actions +4px top padding, 8px between buttons |
| InputOTP | slot 38 x 40, gap 8, separator 6 x 2 |
