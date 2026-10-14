# Drawer

Edge-attached panel; on phones it is the bottom sheet for short tasks such as recording a payment.

## Covers
HeroUI Drawer (placement `bottom` default, `top`, `left`, `right`; Handle, Header, Heading, Body, Footer, CloseTrigger).

## Spec
- Backdrop `color-backdrop` (black 50%), fade 250ms `cubic-bezier(0.32,0.72,0,1)`.
- Dialog: bg `color-overlay`, `shadow-overlay`, padding 24px.
- Bottom: full width, max-height 85vh, top corners `radius-2xl` (16px), bottom corners 0. Left/right: width 320px (max 85vw), 384px from 640px, radius 0.
- Handle: bar 36x4, radius 2, `color-separator`; 8px below it.
- Heading 16/24 weight 500. Body 14/20 `color-muted`, scrolls. Footer: row, gap 8px.
- Spacing: header to body 8px, body to footer 20px. Close trigger top 16, end 16.
- Slide in 250ms, out 200ms, same curve. Drag to dismiss on handle, header, footer.

## Our changes
- Bottom padding adds `env(safe-area-inset-bottom)` (drawn as a 34px spacer); HeroUI has none.
- Footer on phones: tertiary "Abbrechen" (dismissive) left, primary stretches (`flex:1`) and repeats the amount ("CHF 37.80 erfassen"). Below 360px the buttons stack full width, primary on top, because HeroUI button labels never wrap.
- Single choices inside a sheet (Zahlungsart) are a ToggleButtonGroup: selected segment `color-accent-soft`, `color-accent-soft-foreground`, a 12px check and a 1px `color-selected-border` inset outline.
- Money pattern (UX spec §5.5): the sheet names the amount and the consequence before saving.

## Use
- M08 record payment and M09 adjust payment on phones (desktop: Modal).
- C05 login sheet (Google, email, 6-digit InputOTP).
- Filters on C02/C08 on phones.
- Cancelling or refunding is not a Drawer task: use AlertDialog.

## Don't
- Don't put long forms in a bottom sheet beyond 85vh; use a page.
- Don't use `isDismissable={false}` except for flows that would lose money data.
- Don't mark the selected segment by colour alone.
