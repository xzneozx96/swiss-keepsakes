# ScrollShadow

Scroll container that fades its clipped edges to show there is more content.

## Covers
HeroUI ScrollShadow.

## Spec
- Orientation `vertical` (default) or `horizontal`; fade length 40px (`size`), offset 0; optional hidden scrollbar.
- Implemented as a CSS mask, not a drawn shadow: transparent at the scrolled edge, opaque over 40px. The thin scrollbar strip (10px) stays visible.
- In design files, draw a 40px gradient from the ground colour to transparent at the clipped edge.
- The rail drawn here is a TagGroup `lg` (32px tags, gap 6px, radius 16px) inside a horizontal ScrollShadow. The tags follow the TagGroup card: selected `color-accent-soft` with `color-accent-soft-foreground`, a 12px check and a 1px `color-selected-border` outline; unselected `color-default`.

## Our changes
- None beyond tokens.

## Use
- The C01/C02 category rail. TagGroup owns the rail's look and selection; ScrollShadow only clips and fades it.
- Tab lists that overflow at 375px (HeroUI Tabs uses it internally with edge chevrons).

## Don't
- Don't hide a primary action off-screen inside a scroll rail.
- Don't draw rail chips that are not TagGroup tags.
