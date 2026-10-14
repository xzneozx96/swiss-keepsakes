# Toolbar

A row of related controls with one tab stop and arrow-key navigation; the attached variant floats as a pill bar.

## Covers
HeroUI v3 `Toolbar` (horizontal, vertical, attached).

## Spec
- Layout gap 8px, `w-fit`. Child separators: vertical 1px x 50% of the bar height in `color-separator`.
- Attached: radius 24px, `color-surface`, padding 4px, `shadow-overlay`.
- No states of its own; children keep theirs (toggles: selected = `color-accent-soft` + 1px `color-selected-border`).

## Our changes
- None beyond colour and the selected outline shared with ToggleButton.

## Use
- Formatting bar in the story editor (M17): bold, italic, link, image.
- Give it an `aria-label`.

## Don't
- Don't use it for the EN / DE content switch; that is secondary Tabs (M12, M13).
- Don't overflow it at 375px; it doesn't wrap. Move extra actions into a Dropdown.
