# Dropdown

A trigger Button that opens a popover menu of actions, with optional sections, descriptions and selection.

## Covers
HeroUI v3 `Dropdown` (Trigger, Popover, Menu, Item, Section, ItemIndicator, SubmenuTrigger) and the menu `Header`.

## Spec
- Trigger: any Button; the card shows tertiary with a 16px chevron that rotates when open.
- Popover: `color-overlay`, radius 24px (`radius-3xl`), `shadow-overlay`, padding 6px, items 2px apart. Max width 48svw (180px at 375px); min width 220px from 768px.
- Item: min height 36px, padding 6px x 10px, gap 12px, radius 16px. Label Inter 14/20 500 `color-foreground`; description 12/16 `color-muted`.
- Section header: 12/16 500 `color-muted`, padding 6px 8px 4px. Separator 1px `color-separator`, 94% wide.
- Hover `color-default`; pressed scale .98; focus-visible 2px `color-focus` ring; disabled 50%. Danger item: label `color-danger` (brick text, never a fill).
- Selection indicator: 16px box, 10px checkmark (or 8px dot), drawn in 250ms.
- Enter 150ms fade + zoom from .9 + 4px slide; exit 100ms.

## Our changes
- On phones the same actions open as a Drawer action sheet with full-width 48px rows. The 48svw popover cap wraps German labels such as "Stornieren und erstatten" onto two lines.

## Use
- Merchant order actions (M04, M07): "Zahlung erfassen", "Abholdatum ändern", destructive item last after a separator.
- The consumer provides the trigger, items and `onAction`.

## Don't
- Don't hide the only path to a primary action in a menu.
- Don't use Kbd shortcuts in items on phones.
