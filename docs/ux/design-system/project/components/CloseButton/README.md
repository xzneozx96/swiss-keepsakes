# CloseButton

A small round dismiss control for dialogs, drawers, toasts and chips.

## Covers
HeroUI v3 `CloseButton`.

## Spec
- 24 x 24px, padding 4px, radius 12px (a circle). Icon 16px, stroke 1.5px, `color-muted` on `color-default`.
- Hover `color-default-hover`; pressed scale .93 (250ms); focus-visible 2px `color-focus` ring with 2px gap; disabled 50%.
- Default `aria-label="Close"`; override it for context ("Hinweis schliessen").

## Our changes
- On phones, pad the tap area to 44 x 44px in the host layout (invisible). HeroUI ships no touch-target extension here.

## Use
- Top-right of Modal and Drawer (16px from top and end), Toast close, removable items.

## Don't
- Don't use it as the only way out of a flow that also needs a labelled "Abbrechen" button.
- Don't shrink it below 24px.
