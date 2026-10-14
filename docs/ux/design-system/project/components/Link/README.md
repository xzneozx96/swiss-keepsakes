# Link

An inline text link in the ink colour, weight 500, underlined, with an optional trailing external-link icon.

## Covers
HeroUI v3 `Link` and `Link.Icon`.

## Spec
- Colour `--link` = `color-foreground`; weight 500; size inherits from the surrounding text.
- HeroUI: no underline at rest; hover underline at 50% `color-muted`, 1.5px thick, 4px offset; pressed full `color-muted`.
- Icon 0.75em (12px at 16px text), 4px start margin, stroke 1.5px.
- Focus-visible 2px `color-focus` ring with 2px gap, radius 12px. Disabled 50%.

## Our changes
- Underlined at rest on every device in `color-muted` (1.5px, offset 4px); hover and pressed turn the underline `color-foreground`. The link colour equals body text, so weight alone is too weak a cue (WCAG 1.4.1).

## Use
- Policy and help links inside body text ("Stornobedingungen"), "Karte öffnen" for meeting points (C09, C16).
- The consumer provides `href` and the text.

## Don't
- Don't colour links red; brand red is for buttons and selection.
- Don't use a Link for an action that changes data; use a Button.
