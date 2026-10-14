# InputOTP

A labelled row of single-character slots for the 6-digit sign-in code.

## Covers
HeroUI v3 `InputOTP` (Group, Slot, Separator).

## Spec
- Slot 38 x 40px, radius 12px, `color-field`, `shadow-surface`; value Inter 18/24 600; gap 8px.
- Active slot: 1px `color-focus` border plus 1px flush ring, and a 2 x 16px blinking caret in `color-field-placeholder` (1.2s). Filled slot keeps `color-field`.
- Separator 6 x 2px `color-separator`. Invalid slot 1px `color-danger`. Disabled 50%.
- 6 slots grouped 3 + 3 with a separator ≈ 282px, fits the 343px content width at 375px.
- `secondary` variant: not used.

## Our changes
- Visible 1px `color-field-border` on every slot.
- A visible Label above the slots ("Code aus der E-Mail") and a Description with the expiry; each slot gets an `aria-label` such as "Ziffer 1 von 6" (WCAG 3.3.2).

## Use
- Login sheet code entry (C05) and partner email verification (P01). Numeric keyboard (`inputMode` numeric); paste supported.
- The consumer provides `maxLength` 6, `onComplete`, the resend timer (custom) and the error text.

## Don't
- Don't auto-submit without showing the error in words when the code is wrong or expired.
