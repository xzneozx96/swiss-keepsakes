# Switch

An on/off toggle for settings that take effect immediately.

## Covers
HeroUI v3 `Switch` and `SwitchGroup`.

## Spec
- Track / thumb: sm 32 x 16 / 16.5 x 12; md 40 x 20 / 22 x 16 (default); lg 48 x 24 / 27.5 x 20. Thumb inset 2px, `shadow-surface` on every size; travels 300ms (`cubic-bezier(0.32,0.72,0,1)`).
- Off: track `color-default`, white thumb. On: track `color-accent`, thumb `color-accent-foreground`. On + hover: `color-accent-hover`.
- Focus-visible 2px `color-focus` ring with 2px gap on the track. Disabled 50%.
- Label right of the control, gap 12px; description indent 52px (md). SwitchGroup: 24px between label and items, 16px between switches.

## Our changes
- Off track gets a 1px inset `color-control-border` outline (3:1). HeroUI's grey track is 1.07:1 on the page and nearly invisible outdoors.
- Wrap the row in a 44px-tall hit area on phones.

## Use
- Notification and reminder settings, merchant settings (M22).
- The consumer provides label, optional description and `onChange`.

## Don't
- Don't use a Switch inside a form that needs a submit; use Checkbox.
