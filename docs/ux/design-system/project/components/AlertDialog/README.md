# AlertDialog

Modal confirmation that demands an explicit choice before cancelling, refunding or deleting.

## Covers
HeroUI AlertDialog (Icon with `status`, Header, Heading, Body, Footer, optional CloseTrigger).

## Spec
- Same shell as Modal: dialog bg `color-overlay`, padding 24px, radius `radius-3xl`, `shadow-overlay`; backdrop `color-backdrop`.
- Not dismissible by backdrop click or Esc (`role="alertdialog"`).
- Icon 40x40 circle, glyph 20x20; status colours use the soft pair (danger: `color-danger-soft` bg, `color-danger` glyph).
- Heading 16/24 weight 500; body 14/20 `color-muted`, always scrolls inside. Footer right-aligned, gap 8px.
- Spacing: header gap 12px, header to body 8px, body to footer 20px.
- Sizes xs 320, sm 384, md 448 (default), lg 512, cover.
- On phones: bottom-anchored floating card, 16px from the edges (343px wide at 375px), all corners 24px.

## Our changes
- The destructive button is ink: `color-destructive` fill with `color-destructive-foreground` text. Brick is never a solid fill; it appears only as the soft icon circle and in the words.
- Footer: tertiary "Behalten" plus the ink destructive button. Below 360px the buttons stack full width, destructive on top, because button labels never wrap.
- Body text names the money consequence (amount, refund rule) per UX spec §5.5.

## Use
- Cancel an order or booking (C15, C16), cancel and refund on merchant side (M10, phone and desktop), revoke a partner link (M16), delete content (M17).

## Don't
- Don't use for routine confirmations; use Drawer (phones) or Modal (desktop) with a normal primary.
- Don't make the destructive button the only option; always pair it with a tertiary "Behalten"/"Abbrechen".
- Don't fill the destructive button with brick or Swiss red.
