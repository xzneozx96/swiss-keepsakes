# Pagination

Page navigation with previous / next, page numbers, ellipsis and a results summary.

## Covers
HeroUI v3 `Pagination`, `Summary`, `Content`, `Item`, `Link`, `Previous`, `Next`, `Ellipsis`.

## Spec
- Sizes (below 768px / from 768px): sm 32/28px, md 36/32px (default), lg 40/36px; text 12, 14, 16px.
- Page link: square, radius 24px (circle), 500 weight, `color-default-foreground`; hover and pressed `color-default-hover` with scale .97; active page `color-default`.
- Previous / next: padding 10px (md), gap 6px, 16px chevrons.
- Ellipsis `color-muted`, hidden from assistive tech.
- Focus-visible 2px `color-focus` ring with 2px gap.
- Layout: below 640px summary stacks above the controls, both left aligned; from 640px one row, space-between, gap 16px.

## Our changes
- Current page also gets a 1px inset `color-foreground` outline and weight 600; the grey fill alone is 1.15:1 on white.
- Below 640px Previous / Next are icon-only (with `aria-label`), so 5 pages plus both arrows fit in about 276px.

## Use
- Merchant lists on desktop (M03 orders, M15 partners, M17 posts). Customer phone screens use load-more.

## Don't
- Don't show text Previous / Next below 640px; they overflow 343px.
