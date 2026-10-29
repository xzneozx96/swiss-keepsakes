# Button

The pill-shaped action button: one `primary` per screen for the forward action, other variants for everything else.

## Covers
HeroUI v3 `Button` (variants primary, secondary, tertiary, outline, ghost, danger, danger-soft; sizes sm, md, lg; icon-only; pending).

## Spec
- Height below 768px: sm 36, md 40 (default), lg 44. From 768px: 32 / 36 / 40.
- Padding x 16px (sm 12px). Gap 8px. Radius `radius-3xl` (24px), so every size is a full pill.
- Label Inter 14/20 weight 500 (lg 16/24). Icons 20px below 640px, 16px above; 16px in sm. Icon stroke 1.5px.
- Icon-only: width equals height, a circle. Needs an `aria-label`.
- Variants: primary `color-accent` / `color-accent-foreground`; secondary `color-default` with `color-accent-soft-foreground` text; tertiary `color-default` with `color-foreground`; outline transparent with 1px `color-border`; ghost transparent.
- Hover is per variant (pointer devices only, 100ms): primary `color-accent-hover`; secondary and tertiary `color-default-hover`; outline and ghost `color-default`. Pressed = hover colour plus scale .97 (sm .98, lg .96, 250ms).
- Focus-visible: 2px `color-focus` ring with a 2px `color-background` gap. Disabled: `opacity-disabled` (50%). Pending: 16px spinner before the label, presses blocked.

## Our changes
- `color-accent-hover` is darker than the accent (#C12D20), so white labels keep 5.7:1 while pressed. HeroUI lightens, which drops to 4.4:1.
- Destructive buttons use `color-destructive` (ink) with `color-destructive-foreground`, not HeroUI's brick `danger`. Brick is never a solid fill in this theme; the dialog carries the brick icon and words.
- `danger-soft` is not used. A refund entry point is a tertiary button that opens an AlertDialog.
- **Changed 2026-10-29 (owner, keepsake catalog design, `docs/ux/keepsake-editor-design.md`).** The two rules above and the rule under Use that limit the ink button to an AlertDialog still hold for the confirm button. Destructive actions outside a dialog now use the danger tone, never a solid fill: `danger-soft` buttons (a trash button, Unpublish) and danger menu items (red text, through `isDanger` on `RowActions`). The button that opens a confirm dialog stays plain or `danger-soft`. The confirm button inside the dialog stays ink.
- Focus ring is ink (`color-focus`) so it never reads as the brick invalid state.

## Use
- Primary for the one forward step: "Jetzt buchen", "CHF 54.00 bezahlen" (C03, C11, C12).
- Secondary for an alternative forward path ("In den Warenkorb" next to "Jetzt buchen").
- Tertiary for dismissive actions ("Abbrechen", "Zurück", "Behalten").
- Destructive (ink) only inside an AlertDialog that confirms cancel or refund.
- Full width is the usual mobile pattern in sheets and footers. Labels never wrap: below 360px stack footer buttons full width, primary on top.
- The consumer provides the label, optional leading or trailing icon and `onPress`.

## Don't
- Don't put two primaries in one context.
- Don't use brick or red for overdue or errors on a button; those are tinted Chips and Alerts.
- Don't rely on hover: touch has none; pressed scale and colour are the feedback.
