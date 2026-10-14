# ListBox

Selectable list of options, used alone or inside Select, ComboBox and Autocomplete.

## Covers
HeroUI v3 `ListBox`, `ListBox.Item`, `ListBox.ItemIndicator`, `ListBox.Section`, the `Header` section label and `Separator`.

## Spec
- List padding 4px (6px inside a picker popover); 4px between items.
- Item: min height 36px, padding 8px x 6px (10px sides in popovers), 28px inline-end with an indicator, radius 16px (`radius-2xl`), gap 12px.
- Label 14/20 500 `color-foreground`; description 12/16 `color-muted`.
- Hover `color-default`; focus-visible 2px `color-focus` ring with 2px gap; pressed scale .98 (250ms); selected = 12px checkmark at end 8px, no fill; disabled 50%.
- `danger` variant = `color-danger` label: destructive items only.
- Header (section label): padding 8px x 6px top x 4px bottom, 12/16 500 `color-muted`.
- Separator inside: 1px `color-separator`, 94% wide, centred.

## Our changes
- None beyond tokens.

## Use
- Language switcher, account menu, the list inside every picker.

## Don't
- Don't keep 36px rows where the list is the main touch target on a phone; raise to 44px.
- Don't colour a selected row; the checkmark carries selection.
- Don't use the danger variant for non-destructive items such as "Abmelden".
