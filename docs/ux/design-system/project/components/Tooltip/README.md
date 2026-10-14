# Tooltip

Short, non-interactive hint shown on hover or keyboard focus, mainly for icon-only buttons on merchant desktop screens.

## Covers
HeroUI Tooltip (Trigger, Content, optional Arrow).

## Spec
- Content: bg `color-overlay`, padding 8px, text 12/16, max-width 320px, radius `radius-xl` (12px), `shadow-overlay`.
- Placement default `top`, offset 3px (7px with arrow). Arrow fill `color-overlay`, stroke `color-border` at 40%.
- Delay: HeroUI docs say 700ms open / 0 close; the theme file says 1500ms / 500ms. Open decision: settle on one before build.
- Motion: in 150ms (fade, scale 0.9, 4px slide), out 100ms.
- The trigger here is an outline icon Button (40px, `color-border`) shown with its focus ring (ink, 2px gap): tooltips also open on keyboard focus.

## Our changes
- None beyond tokens.

## Use
- Labels for icon-only buttons on merchant desktop (export, edit, copy link). Write the action as a verb ("Als CSV exportieren").

## Don't
- Don't rely on a tooltip on phones: there is no hover. Every icon-only button still needs an `aria-label`.
- Don't put essential information or actions in a tooltip.
