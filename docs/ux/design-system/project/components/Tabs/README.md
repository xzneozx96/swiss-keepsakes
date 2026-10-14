# Tabs

Switch between panels of related content; pill (primary) or underline (secondary).

## Covers
HeroUI v3 `Tabs`, `Tabs.ListContainer`, `Tabs.List`, `Tabs.Tab`, `Tabs.Separator`, `Tabs.Indicator`, `Tabs.Panel`.

## Spec
- Primary: list on `color-default`, radius 20px, padding 4px (list 40px tall); tab 32px, padding 0 16px, radius 24px, 14/20 500, unselected `color-muted`; indicator `color-surface` with `shadow-surface`; separators 1px, half height, hidden beside the selected tab.
- Secondary: transparent, 1px bottom border `color-border`, square tabs, selected `color-foreground`, 2px `color-accent` indicator at the bottom.
- Hover opacity .7; disabled 50%; focus-visible 2px `color-focus` ring with 2px gap; indicator slides 250ms `cubic-bezier(0.32,0.72,0,1)`; panel margin 16px, padding 8px.
- Overflow: the list scrolls with 16px chevrons and a scroll shadow; no wrapping.

## Our changes
- Selected label is weight 600 in both variants, so selection does not rely on the faint white indicator (1.15:1) alone.
- Separators use `color-separator`.
- At 343px four German primary tabs (Offen, Bestätigt, Bereit, Abgeschlossen) need about 378px: the list scrolls sideways with a 64px fade and a chevron, as drawn. Prefer three tabs on phones.

## Use
- Primary: merchant order status tabs (M03), transaction filters (C14).
- Secondary: EN / DE content panels on product and tour editors (M12, M13). Actions such as "Vorschau" are Buttons outside the tab list.

## Don't
- Don't use vertical tabs at 375px.
- Don't put actions inside the tab list.
- Don't expect four German primary tabs to fit a phone without scrolling.
