# Chip

Static label for a status or category; the base of the two status labels on every order and booking.

## Covers
HeroUI v3 `Chip`, `Chip.Label`.

## Spec
- Pill, radius 16px (`radius-2xl`), inner gap 2px, label padding 2px, 500 weight, line height 20px.
- Sizes: sm 20px (4px x 0, 12px), md 24px (8px x 2px, 12px, default), lg 28px (12px x 4px, 14px).
- Variants: primary (solid colour), secondary (default grey with coloured text, the default), tertiary (text only), soft (tint + soft foreground).
- Colours: default, accent, success, warning, danger.
- No interactive states; not focusable.

## Our changes
- One status label spec, used on every card (Chip, Table, order rows): `soft`, `lg` 28px, a leading 14px icon (1.5px stroke) and words. Info / success / warning / danger / default (cancelled).
- Soft tints are our approved solids (`color-*-soft`) with the matching `*-soft-foreground`; info uses `color-info-soft` with `color-info` text (HeroUI has no info colour).
- Category chips (no status meaning) use `secondary` on `color-default`, without an icon.
- Not used: `primary` (solid) and `tertiary` (text only). Solid status fills break the rule that brick is never a solid fill, and a text-only status has no tint or icon.

## Use
- Order and booking rows (C14, M03), detail headers (C15, C16, M04, M07), table status columns. Each row shows two labels: progress and payment.

## Don't
- Don't show a status without its icon.
- Don't use a solid or text-only status chip.
- Don't make a chip clickable; use Tag or a Button.
