# Breadcrumbs

Trail of links showing where a page sits; the last item is the current page.

## Covers
HeroUI v3 `Breadcrumbs`, `Breadcrumbs.Item`.

## Spec
- Row gap 6px; item gap 4px; items do not shrink or wrap.
- Link 14/20 500 `color-muted`, underline on hover (offset 4px); current item `color-foreground`.
- Separator: 12px chevron in `color-muted`, flipped in RTL.
- HeroUI CSS defines no focus, pressed or disabled styling.

## Our changes
- Focus-visible added: 2px `color-focus` ring with 2px gap, radius 12px, as on Link.

## Use
- Merchant desktop screens (M04, M07, M16).

## Don't
- Don't show more than the last two levels at 375px; there is no overflow handling.
