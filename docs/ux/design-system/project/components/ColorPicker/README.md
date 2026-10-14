# ColorPicker

Colour choice controls: swatches, a swatch picker, a 2D area, channel sliders and a hex field, combined in a picker popover.

## Covers
HeroUI v3 `ColorPicker`, `ColorSwatch`, `ColorSwatchPicker`, `ColorArea`, `ColorSlider`, `ColorField`.

## Spec
- ColorSwatch: xs 16, sm 24, md 32 (default), lg 36, xl 40px; circle or square (radius 6px); checkerboard behind for transparency; inner 1px hairline.
- ColorSwatchPicker: wrap, gap 8px; item 32px with a 2px border; selected = border in the swatch colour, inner swatch scale .77, `shadow-surface`; hover scale 1.1.
- ColorArea: max 224px square, radius 16px; thumb 16px circle with a 3px white border, 20px while dragging.
- ColorSlider: track 20px, square, with 10px rounded end caps; thumb 16px with a 3px white border and `shadow-overlay`; label and output 14/20 500.
- ColorField: same group metrics as the date input (radius 12px, 12px x 8px padding).
- ColorPicker: trigger with swatch + label, gap 12px; popover min 248px, padding 8px 8px 12px, radius 20px, gap 12px.
- Swatch colours are content, so they are literal values, not tokens.

## Our changes
- ColorField uses the 1px `color-field-border` and 40px height on phones.
- The selected swatch's name is shown as text next to the picker.

## Use
- Not used in Phase 1 screens. Keep for a product variant picker that needs real colours (for example a knife scale colour on C03): use ColorSwatchPicker with the variant name in text.

## Don't
- Don't let colour be the only way to tell variants apart; show the variant name.
