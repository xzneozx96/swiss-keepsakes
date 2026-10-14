# ToggleButton

A button that stays on or off, alone or in a ToggleButtonGroup for single or multiple selection.

## Covers
HeroUI v3 `ToggleButton` and `ToggleButtonGroup` (attached and detached).

## Spec
- Geometry is the Button's: 40px mobile (36 from 768px), radius 24px, padding 16px, Inter 14/20 500. Sizes sm 36, lg 44.
- Variants: default (`color-default`) and ghost (transparent). Selected for both: `color-accent-soft` background, `color-accent-soft-foreground` text.
- Pressed scale .97 (none inside a group). Focus-visible: 2px `color-focus` ring with 2px gap outside the pill; inside a group the ring is inset with no gap.
- Group attached: gap 0, outer corners 24px, separator 1px x 50% `currentColor` 15% in every segment except the first and the one after the selected item. Detached (`isDetached`): gap 4px, every button keeps 24px.

## Our changes
- Selected also gets a 12px check icon before the label (or an icon change, as "Merken" to "Gemerkt") and a 1px inset `color-selected-border` outline. The soft tint alone differs from unselected grey by hue only (1.02:1).

## Use
- Save or favourite toggles ("Merken" / "Gemerkt").
- Short single-choice switches: report range Tag / Woche / Monat (M21), payment method Bar / Karte / TWINT in the payment drawer (M08).
- At 375px use at most 3 German segments; four German labels overflow 343px. Category lists go in TagGroup inside ScrollShadow.

## Don't
- Don't signal selection by colour only; keep the check or the icon change.
- Don't use for navigation between pages; use Tabs.
