# Kbd

A keyboard key or shortcut label for menus and help text on desktop.

## Covers
HeroUI v3 `Kbd`, `Kbd.Abbr`, `Kbd.Content`.

## Spec
- Height 24px, padding x 8px, radius 8px (`radius-lg`), gap 2px. Inter 14/20 500 `color-muted` on `color-default`. Variant light: transparent background.
- Static: no states. Modifier glyphs carry an `<abbr title>` (Command, Shift, …) for screen readers.

## Our changes
- None.

## Use
- Merchant desktop only: shortcuts in Dropdown items and search ("⌘ K").

## Don't
- Don't show shortcuts on phones (under 768px).
