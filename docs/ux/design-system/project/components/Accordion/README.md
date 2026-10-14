# Accordion

Stacked collapsible sections; one open at a time unless multiple expansion is allowed.

## Covers
HeroUI v3 `Accordion`, `Accordion.Item`, `Heading`, `Trigger`, `Indicator`, `Panel`, `Body`.

## Spec
- Trigger: padding 16px on all sides (about 52px tall), 14/20 500, start aligned.
- Indicator 16px chevron, `color-muted`, rotates -180deg expanded (250ms).
- Body: 14/20 `color-muted`, padding 0 16px 16px.
- Default variant: 1px `color-separator` line under each item except the last; hover = foreground at 3%.
- Surface variant: `color-surface`, radius 24px, inset separators 94% wide, hover `color-default`.
- Focus-visible: 2px `color-focus` ring with 2px gap on the trigger.
- Panel height 200ms, opacity 200ms.

## Our changes
- Surface separators use `color-separator` instead of foreground at 6%.
- The surface variant carries `shadow-surface` so it reads on the page ground.

## Use
- Tour detail sections (C09): inclusions, meeting point, conditions, cancellation.
- FAQ blocks on product pages (C03).

## Don't
- Don't hide prices or the cancellation rule only inside a collapsed item on checkout screens.
