# ButtonGroup

Joins related action Buttons into one bar that shares variant, size and disabled state.

## Covers
HeroUI v3 `ButtonGroup` and `ButtonGroup.Separator`.

## Spec
- Buttons touch (gap 0). Child buttons lose their radius; the first keeps 24px on its start side, the last on its end side.
- Separator: absolute, 1px wide, 50% of button height, top 25%, `currentColor` at 15% opacity, radius 4px.
- Outline variant: borders are de-duplicated, so only one 1px `color-border` line shows between buttons.
- Pressed keeps the colour change but drops the scale. Focus-visible ring (2px `color-focus`, 2px gap) is raised with z-index 10.
- Sizes and heights are the Button's (40px md on mobile).

## Our changes
- None beyond colour.

## Use
- Split buttons such as "Exportieren" plus a menu chevron (merchant reports, M21).
- Small sets of related actions on one object ("Drucken", "Teilen", "Duplizieren").
- The consumer provides the child Buttons; only direct children inherit the group props.

## Don't
- Don't use it for selection (a range switch like Tag / Woche / Monat); use ToggleButtonGroup.
- Don't mix variants inside one group.
