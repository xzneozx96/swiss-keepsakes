# Disclosure

One show/hide region opened by a Button you supply.

## Covers
HeroUI v3 `Disclosure` (`Heading`, `Trigger`, `Indicator`, `Content`, `Body`) and `DisclosureGroup`.

## Spec
- No styling of its own: the trigger is a Button, 40px on phones.
- Indicator 16px, inherits colour, rotates -180deg expanded (250ms).
- Body padding 8px; content height 200ms, opacity 200ms.
- Focus-visible: the Button's 2px `color-focus` ring with 2px gap.
- DisclosureGroup: width 100%, one open at a time by default (`allowsMultipleExpanded` for more); defines no spacing, so set it in the layout (use `spacing-2`).

## Our changes
- The trigger is a `tertiary` Button (grey, ink label). It reveals content on the same page rather than offering an alternative action, and the secondary variant's red-tinted label would read like a status.

## Use
- Payment history and order log on order detail (C15, C16, M04).

## Don't
- Don't use for a list of FAQ-style sections; use Accordion.
