# Popover

Anchored floating panel for short supporting content, such as how a number was calculated.

## Covers
HeroUI Popover (Trigger, Content, optional Arrow, Dialog, Heading).

## Spec
- Content: bg `color-overlay`, padding 0, text 14px, radius `radius-3xl`, `shadow-overlay`, no border.
- Dialog padding 16px; heading weight 500.
- Placement default `bottom`, offset 8px, flips when there is no room.
- Arrow fill `color-overlay` (glyph size defined in HeroUI's code, not CSS).
- Motion: in 150ms (fade, scale from 0.9, 4px slide from the trigger side); out 100ms.
- The trigger is any Button; here a tertiary Button `sm` with an info icon.

## Our changes
- None beyond tokens.

## Use
- Explain a computed value next to it: commission basis (M16, P02), contribution margin (M21).
- Keep content within 343px wide on phones.

## Don't
- Don't put forms or long content in a Popover on phones; use Drawer.
- Don't hide information the user needs to complete a purchase behind a Popover.
