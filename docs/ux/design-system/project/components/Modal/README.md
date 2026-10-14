# Modal

Dismissible dialog for a focused task that interrupts the page; the desktop counterpart of the bottom-sheet Drawer.

## Covers
HeroUI Modal (Backdrop, Container, Dialog, CloseTrigger, Header with Icon and Heading, Body, Footer).

## Spec
- Backdrop `color-backdrop`; variants opaque (default), blur, transparent. Dismiss by backdrop click and Esc.
- Container padding 16px on mobile, 40px from 640px. Placement `auto`: bottom on phones, centred from 640px.
- Dialog: bg `color-overlay`, padding 24px, radius `radius-3xl`, `shadow-overlay`.
- Sizes (max-width): xs 320, sm 384, md 448 (default), lg 512, cover, full.
- Header: column, gap 12px (icon 40x40 circle above heading 16/24 weight 500). Body 14/20 `color-muted`. Footer right-aligned, gap 8px.
- Spacing: header to body 8px, body to footer 20px. Close trigger (CloseButton 24px) top 16, end 16.
- From 768px controls use HeroUI's desktop sizes: 36px buttons and fields, 14px text (HeroUI's own `md:` behaviour).
- Motion: backdrop fade 150ms in, 100ms out; dialog fade + scale 1.05 to 1 over 250ms.

## Our changes
- Icon slot: `color-default` circle with an ink glyph (or the 3D icon set once sourced). HeroUI leaves the icon colour to the consumer; red stays reserved for actions.

## Use
- Merchant desktop tasks: propose another pickup date (M04, M07), record or adjust a payment (M08, M09 on desktop), edit a pickup point (M14), record a partner payout (M16).
- Long forms: `scroll="inside"`.

## Don't
- Don't use a Modal on phones for a true sheet; use Drawer.
- Don't use a Modal for cancel, refund or delete; use AlertDialog.
