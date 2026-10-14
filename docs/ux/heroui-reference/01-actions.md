# HeroUI v3 reference 01: Actions

Components: Button, ButtonGroup, CloseButton, ToggleButton, ToggleButtonGroup, Link, Dropdown (with Menu, MenuItem, MenuSection, Popover), Toolbar, Kbd.

Source of truth is the component CSS in `heroui-inc/heroui` branch `v3` (`packages/styles`). Docs pages (HeroUI v3.2.6) were used for anatomy, props and accessibility. Where docs and CSS disagree, CSS wins and the conflict is listed in section 12.

## 0. Conventions and global tokens

### Unit conversion
- 1 spacing unit = 4px (`--spacing: 0.25rem`). `--radius: 0.5rem` = 8px.
- Radius scale: xs 2, sm 4, md 6, lg 8, xl 12, 2xl 16, 3xl 24, 4xl 32 px. Field radius = 12px (`--field-radius = radius * 1.5`).
- Tailwind breakpoints used in these components: `sm` = 640px, `md` = 768px. A 375px phone is below both, so the "mobile" values apply.
- Text: `text-xs` 12/16, `text-sm` 14/20, `text-base` 16/24. `font-medium` = 500.

### Colour tokens, resolved
Hex values are computed from the OKLCH / `color-mix(in oklab, ...)` definitions in `themes/default/variables.css` (my conversion, sRGB, rounded; check against the source if you need exact OKLCH). Soft tokens are semi-transparent: the hex is the base colour, the alpha is given.

| Token | Light | Dark | Definition (source) |
|---|---|---|---|
| `--background` | #F5F5F5 | #060607 | light `oklch(0.9702 0 0)`, dark `oklch(12% 0.005 285.823)` |
| `--foreground` | #18181B | #FCFCFC | `--eclipse` / `--snow` |
| `--surface` | #FFFFFF | #18181B | white / `oklch(0.2103 0.0059 285.89)` |
| `--overlay` | #FFFFFF | #18181B | same as surface |
| `--muted` | #71717A | #9F9FA9 | `oklch(0.5517 0.0138 285.94)` / `oklch(70.5% 0.015 286.067)` |
| `--default` | #EBEBEC | #27272A | `oklch(94% 0.001 286.375)` / `oklch(27.4% 0.006 286.033)` |
| `--default-foreground` | #18181B | #FCFCFC | eclipse / snow |
| `--default-hover` | #E1E1E2 | #2E2E31 | mix default 96% + default-foreground 4% |
| `--accent` | #0485F7 | #0485F7 | `oklch(0.6204 0.195 253.83)` (same in both themes) |
| `--accent-foreground` | #FCFCFC | #FCFCFC | snow |
| `--accent-hover` | #3592F9 | #3592F9 | mix accent 90% + accent-foreground 10% |
| `--accent-soft` | #0485F7 at 15% alpha | #0485F7 at 12% alpha | `color-mix(accent 15% / 12%, transparent)` |
| `--accent-soft-hover` | #0485F7 at 20% alpha | #0485F7 at 16% alpha | |
| `--accent-soft-foreground` | #1E63AE | #61A8FB | mix accent 70% + foreground 30% (light); accent 80% + foreground 30%, normalised (dark) |
| `--danger` | #FF383C | #DB3B3E | `oklch(0.6532 0.2328 25.74)` / `oklch(0.594 0.1967 24.63)` |
| `--danger-foreground` | #FCFCFC | #FCFCFC | snow |
| `--danger-hover` | #FF5551 | #E15451 | mix danger 90% + danger-foreground 10% |
| `--danger-soft` | #FF383C at 15% alpha | #DB3B3E at 15% alpha | |
| `--danger-soft-hover` | #FF383C at 20% alpha | #DB3B3E at 20% alpha | |
| `--danger-soft-foreground` | #A43433 | #EB7872 | light: danger 70% + foreground 40% (normalised from 110%); dark: danger 80% + foreground 30% (normalised) |
| `--border` | #DEDEE0 | #28282C | `oklch(90% 0.004 286.32)` / `oklch(28% 0.006 286.033)` |
| `--separator` | #E4E4E7 | #212124 | `oklch(92% ...)` / `oklch(25% ...)` |
| `--separator-tertiary` | #CDCDCE | #3C3C3F | mix surface 81% + surface-foreground 19% |
| `--link` | #18181B | #FCFCFC | = `--foreground` |
| `--focus` | #0485F7 | #0485F7 | = `--accent` |
| `--disabled-opacity` | 0.5 | 0.5 | |

Note: `--danger-soft-foreground` light uses percentages 70 + 40 = 110, which CSS normalises; I normalised the same way. Re-verify in a browser if the exact hex matters.

### Shadows
| Token | Light | Dark |
|---|---|---|
| `--overlay-shadow` (menus, popovers, attached toolbar) | `0 2px 8px 0 rgba(0,0,0,.06), 0 -6px 12px 0 rgba(0,0,0,.03), 0 14px 28px 0 rgba(0,0,0,.08)` | `0 0 1px 0 rgba(255,255,255,.3) inset` |
| `--surface-shadow` | `0 2px 4px 0 rgba(0,0,0,.04), 0 1px 2px 0 rgba(0,0,0,.06), 0 0 1px 0 rgba(0,0,0,.06)` | `0 0 0 0 transparent inset` |

### Shared state utilities (from `utilities/index.css`)
| Utility | Effect |
|---|---|
| `status-focused` (= `focus-ring`) | `ring-2` (2px solid ring, `--focus` / #0485F7) plus a 2px offset gap painted in `--background` (`--ring-offset-width: 2px`, `ring-offset-background`). Visually: 2px gap in page background colour, then 2px accent ring, outside the element. Only on keyboard focus (`:focus-visible` or `[data-focus-visible="true"]`). |
| `status-disabled` | `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`. No colour change. |
| `status-pending` | `pointer-events: none` only. No opacity or colour change. |
| `no-highlight` | transparent `-webkit-tap-highlight-color`. |

### Easing and durations
| Name | Value | Source |
|---|---|---|
| `--ease-smooth` | `ease` | `themes/shared/theme.css` |
| `--ease-out-quart` | `cubic-bezier(0.165, 0.84, 0.44, 1)` | theme.css |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Tailwind v4 default; not defined in the HeroUI files I fetched. Treat as inherited from Tailwind. |
| spinner | `spin 0.75s linear infinite` (`--animate-spin-fast`) | theme.css |

All components wrap transitions with `motion-reduce:transition-none` (no animation when the user prefers reduced motion).

### Interaction attribute model (all components)
Each state works as both a pseudo-class and a React Aria data attribute: hover `:hover` / `[data-hovered="true"]`; pressed `:active` / `[data-pressed="true"]`; focus `:focus-visible` / `[data-focus-visible="true"]`; disabled `:disabled` / `[aria-disabled="true"]`; pending `[data-pending="true"]`; selected `[data-selected="true"]`. Hover styles only apply inside `@media (hover: hover)`, so touch devices never show a hover state.

---

## 1. Button

**Purpose.** Primary clickable action. React Aria Button wrapper. Docs: "A clickable button component with multiple variants and states."

**Anatomy.** Single element `.button` containing optional leading/trailing icon (SVG) and a text label. Pending state swaps in a Spinner (consumer-composed via render props: `<Spinner color="current" size="sm" />`, i.e. 16px). Inside a ButtonGroup it may also contain `ButtonGroup.Separator`.

### Base geometry
| Property | Value |
|---|---|
| Display | inline-flex, centered both axes, `w-fit`, `whitespace-nowrap` |
| Radius | `rounded-3xl` = 24px (a full pill at every size, since max height is 44px) |
| Padding X | `px-4` = 16px (sm: `px-3` = 12px) |
| Gap | `gap-2` = 8px |
| Font | `text-sm` 14/20, `font-medium` 500 (lg: `text-base` 16/24) |
| Border | none (outline variant only: 1px `--border`) |
| Default fg | `currentColor`, default bg `transparent` |

### Sizes (height changes at the `md` breakpoint, 768px)
| Size | Below 768px (mobile, touch) | 768px and up (desktop) | Padding X | Text |
|---|---|---|---|---|
| `sm` | 36px | 32px | 12px | 14/20 |
| `md` (default) | 40px | 36px | 16px | 14/20 |
| `lg` | 44px | 40px | 16px | 16/24 |

Icon-only (`isIconOnly`, `.button--icon-only`): `p-0`, width equals height (sm 36/32, md 40/36, lg 44/40), so a circle.

Full width (`fullWidth`): `w-full`.

### Variants (colour tokens, light / dark in section 0)
| Variant | Background | Hover bg | Pressed bg | Foreground | Border |
|---|---|---|---|---|---|
| `primary` (default) | `--accent` | `--accent-hover` | `--accent-hover` | `--accent-foreground` | none |
| `secondary` | `--default` | `--default-hover` | `--default-hover` | `--accent-soft-foreground` | none |
| `tertiary` | `--default` | `--default-hover` | `--default-hover` | `currentColor` (not set, inherits) | none |
| `outline` | transparent | `--default` at 60% alpha (`color-mix(in srgb, var(--default) 60%, transparent)`) | `--default` (solid) | `--default-foreground` | 1px solid `--border` |
| `ghost` | transparent | `--default` | `--default` | `--default-foreground` | none |
| `danger` | `--danger` | `--danger-hover` | `--danger-hover` | `--danger-foreground` | none |
| `danger-soft` | `--danger-soft` | `--danger-soft-hover` | `--danger-soft-hover` | `--danger-soft-foreground` | none |

`danger-soft` exists in CSS and in the docs' Variants demo but is missing from the docs' prop table (see section 12).

### State styling
| State | Styling |
|---|---|
| Rest | per variant table |
| Hover (pointer devices only) | background becomes the variant's hover token. Transition 100ms ease-out. |
| Pressed | background becomes the pressed token (same as hover for most variants; ghost/outline go to `--default`), and `transform: scale(0.97)` for md, `0.98` for sm, `0.96` for lg. Transform transition 250ms ease. |
| Focus-visible | `status-focused`: 2px `--focus` ring with a 2px gap in `--background`, outside the pill. |
| Disabled | opacity 0.5, cursor not-allowed, no pointer events. |
| Pending | `data-pending="true"`: pointer events off. No visual change from the component itself; show a 16px spinner (current colour) before the label. |
| Invalid | not applicable (no styling in CSS). |
| Selected | not applicable (use ToggleButton). |

### Icons
- Selector: any `svg` except spinner and link-icon svgs.
- Size: 20px below 640px (`size-5`), 16px from 640px (`sm:size-4`). In the `sm` button size: always 16px.
- Margins: `-mx-0.5` (-2px horizontal), `my-0.5` (2px vertical) below 640px, `sm:my-1` (4px) from 640px. `shrink-0`, centered, `pointer-events: none`.

### Motion
| Property | Duration | Easing |
|---|---|---|
| transform (press scale) | 250ms | `ease` |
| background-color | 100ms | `ease-out` |
| box-shadow (focus ring) | 100ms | `ease-out` |

### Accessibility
React Aria Button: native `<button>`; `isDisabled` sets `disabled`; `isPending` sets `data-pending` and blocks presses. Focus ring only for keyboard focus. Icon-only buttons need `aria-label` (not supplied automatically). Render props available: `isPending, isPressed, isHovered, isFocused, isFocusVisible, isDisabled`.

### Mobile (375px)
Default 40px height, 44px for `lg`, 36px for `sm`. Icons are 20px (16px in `sm`). No hover state on touch. Press feedback is the scale-down plus the pressed colour. `fullWidth` is the usual mobile pattern.

Sources: https://www.heroui.com/docs/react/components/button, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/button.css

---

## 2. ButtonGroup

**Purpose.** Joins related buttons into one segmented control; passes `variant`, `size`, `isDisabled` and `fullWidth` to direct child Buttons via context.

**Anatomy.** `.button-group` container; child `.button`s; optional `ButtonGroup.Separator` (`.button-group__separator`) placed inside every button except the first.

### Container
| Property | Value |
|---|---|
| Layout | inline-flex, centered, `h-auto`, `gap-0` (buttons touch) |
| Orientation | `horizontal` (flex-row, default) or `vertical` (flex-col) |
| Full width | `.button-group--full-width` = `w-full` |

### Child button overrides
- All child buttons: `rounded-none` (0px).
- Horizontal: first child `rounded-s-3xl` (24px on start side), last child `rounded-e-3xl` (24px end side). Only child: 24px all round.
- Vertical: first `rounded-t-3xl`, last `rounded-b-3xl`; only child 24px all round.
- Pressed state: scale transform removed (`transform: none`); colour change remains.
- Focus-visible: `z-index: 10` so the outward ring (2px + 2px gap) shows above neighbours.
- Sizes, heights, variants: same as Button (sections 1). Docs list group variants as primary, secondary, tertiary, ghost, danger; CSS also handles outline.

### Separator
| Property | Horizontal group | Vertical group |
|---|---|---|
| Position | absolute, `inset-inline-start: -1px`, `top: 25%` | absolute, `inset-inline-start: 25%`, `top: -1px` |
| Size | 1px wide, 50% of button height | 50% of button width, 1px tall |
| Fill | `currentColor` at `opacity: 0.15` | same |
| Radius | `rounded-sm` = 4px | same |
| Transition | opacity 150ms `ease` | same |
| Pointer | `pointer-events: none` | same |

Because it uses `currentColor`, the divider is white-ish (15%) on primary/danger and dark-ish (15%) on default/ghost.

### Outline variant inside a group (border de-duplication)
Horizontal: first button loses end border, last loses start border, middle loses both inline borders. Vertical: first loses bottom border, last loses top border, middle loses both block borders. This avoids 2px double borders; the group shows a single 1px `--border` line between buttons.

### States
Per Button (hover, pressed colour, disabled opacity 0.5 each). `isDisabled` on the group disables all; a child may set `isDisabled={false}` to override. Pending/selected/invalid: not specific to the group.

### Accessibility and mobile
Container has no role added in CSS; children are native buttons. Only direct children receive context props (buttons nested in Modal/Dropdown do not). At 375px, use `fullWidth` for a stretched segmented bar; each button keeps its 40px mobile height.

Sources: https://www.heroui.com/docs/react/components/button-group, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/button-group.css

---

## 3. CloseButton

**Purpose.** Small dismiss control for dialogs, modals, toasts, chips and similar. Wraps React Aria Button, default `aria-label="Close"`, default content is a built-in close (X) icon.

**Anatomy.** Single `.close-button` with one SVG (`data-slot="close-button-icon"`).

| Property | Value |
|---|---|
| Size | 24 x 24px (`h-6 w-6`), `shrink-0` |
| Padding | 4px (`p-1`) |
| Radius | `rounded-xl` = 12px (so a 24px control is a full circle) |
| Variant | `default` only: bg `--default`, text `--muted` |
| Icon | `size-4` = 16px, margin `-mx-0.5 my-0.5` (-2px / 2px), `pointer-events: none` |

### States
| State | Styling |
|---|---|
| Rest | bg `--default` (#EBEBEC / #27272A), fg `--muted` (#71717A / #9F9FA9) |
| Hover (pointer only) | bg `--default-hover` (#E1E1E2 / #2E2E31); foreground unchanged |
| Pressed | `transform: scale(0.93)`; no colour change defined |
| Focus-visible | `status-focused`: 2px `--focus` ring + 2px background-colour gap |
| Disabled | opacity 0.5, not-allowed, no pointer events |
| Pending | `status-pending` rules exist (pointer events off); no visual change |
| Invalid / selected | not applicable |

### Motion
| Property | Duration | Easing |
|---|---|---|
| transform | 250ms | `ease-out-quart` `cubic-bezier(0.165, 0.84, 0.44, 1)` |
| color | 150ms | `ease-out` |
| background-color | 100ms | `ease-out` |
| box-shadow | 150ms | `ease-out` |

### Accessibility and mobile
Default `aria-label="Close"`; override with `aria-label` for context. At 24px the hit area is below common 44px touch guidance; the `touch-target` utility (24px overlay) exists in the library but is not applied in `close-button.css`. Designers should pad the touch area (about 44px) in the host layout on mobile.

Sources: https://www.heroui.com/docs/react/components/close-button, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/close-button.css, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/close-button/close-button.tsx

---

## 4. ToggleButton

**Purpose.** A button with persistent on/off state (React Aria ToggleButton). Used for formatting toggles, filter chips-as-buttons, view switches.

**Anatomy.** Single `.toggle-button` with optional icon + label; inside a group may contain `ToggleButtonGroup.Separator`.

### Geometry
Identical to Button: height 40px (36px at 768px+), `rounded-3xl` 24px, `px-4`, `gap-2`, 14/20 medium. Sizes: `sm` 36/32px, `px-3`; `lg` 44/40px, 16/24 text. Icon-only: width equals height (`.toggle-button--icon-only`, sm 36/32, lg 44/40). Icons: same rule as Button (20px below 640px, 16px from 640px; 16px in `sm`), with the same -2px / 2px margins. Note: the toggle icon selector has no spinner exclusion.

### Variants and tokens
| Variant | Unselected bg | Unselected hover/pressed | Unselected fg |
|---|---|---|---|
| `default` | `--default` | `--default-hover` | `currentColor` |
| `ghost` | transparent | `--default` | `--default-foreground` |

Selected (both variants): bg `--accent-soft` (accent at 15% alpha light / 12% dark), hover and pressed `--accent-soft-hover` (20% / 16%), fg `--accent-soft-foreground` (#1E63AE light / #61A8FB dark). Selected values override variant values, so a selected `ghost` also gets the soft accent fill.

### States
| State | Styling |
|---|---|
| Rest | per variant |
| Hover (pointer only) | bg hover token (selected: `--accent-soft-hover`) |
| Pressed | bg pressed token; `scale(0.97)` (sm 0.98, lg 0.96) |
| Selected | `data-selected="true"`: soft accent bg and fg as above |
| Focus-visible | `status-focused` ring (2px accent, 2px gap), outside the pill. Inside a ToggleButtonGroup: inset ring, no offset (section 5). |
| Disabled | opacity 0.5, not-allowed, no pointer events |
| Pending | no pending rule in toggle-button.css (not applicable) |
| Invalid | not applicable |

### Motion
transform 250ms `ease`; background-color 100ms `ease-out`; box-shadow 100ms `ease-out`.

### Accessibility
React Aria ToggleButton: `aria-pressed` reflects selection; Space/Enter toggles. Icon-only needs `aria-label`. Selected state relies on colour only (soft tint), so pair with an icon change or label where the distinction matters.

### Mobile
Same 40px mobile height as Button (44px for `lg`). Selected tint is subtle (15% accent), check contrast on photos.

Sources: https://www.heroui.com/docs/react/components/toggle-button, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/toggle-button.css

---

## 5. ToggleButtonGroup

**Purpose.** Groups ToggleButtons into one control with single or multiple selection (React Aria ToggleButtonGroup). Each child needs a unique `id`.

**Anatomy.** `.toggle-button-group` container; child `.toggle-button`s; optional `ToggleButtonGroup.Separator` inside every button except the first.

### Container
| Property | Value |
|---|---|
| Layout | inline-flex, `w-fit`, centered, `gap-0` (attached default) |
| Orientation | horizontal (default) / vertical |
| Full width | `--full-width`: `w-full`, each child `flex-1` |
| Detached | `isDetached`: `gap-1` = 4px, every button back to `rounded-3xl` (24px), separators hidden |
| Selection | `selectionMode` single (default) or multiple; `disallowEmptySelection`; `size` propagated by context |

### Attached-mode shape
Same rules as ButtonGroup: children `rounded-none`; horizontal first `rounded-s-3xl`, last `rounded-e-3xl`; vertical first `rounded-t-3xl`, last `rounded-b-3xl`; single child fully rounded (24px).

### Differences from ButtonGroup
- Pressed: scale removed (`transform: none`), colour change stays.
- Focus-visible: **inset** ring, `--tw-ring-offset-width: 0px` + `ring-inset`: 2px `--focus` ring drawn inside the button bounds, no gap. (ButtonGroup uses an outward ring raised with z-10.)
- Separator: identical geometry to ButtonGroup separator (1px x 50% height, `top: 25%`, `inset-inline-start: -1px`; vertical: 50% x 1px, start 25%, top -1px; `currentColor` at 15% opacity; radius 4px; opacity transition 150ms `ease`).
- No outline-border de-duplication (ToggleButton has no outline variant).

### States
Per ToggleButton (section 4). Selected segment shows soft accent fill; neighbours stay `--default`. Group `isDisabled` disables all children (children may override with `isDisabled={false}`).

### Accessibility and mobile
Single mode behaves like a radio group of toggle buttons; React Aria handles roving selection. At 375px a 3 to 4 segment group of labels fits in `fullWidth`; icon-only segments are 40px wide each.

Sources: https://www.heroui.com/docs/react/components/toggle-button-group, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/toggle-button-group.css

---

## 6. Link

**Purpose.** Styled anchor with optional trailing icon (React Aria Link). Underline appears on hover by default.

**Anatomy.** `.link` root (inline-flex) containing text and optional `Link.Icon` (`.link__icon`, `data-slot="link-icon"`). Default icon is the built-in external-link arrow (`ExternalLinkIcon`).

### Base
| Property | Value |
|---|---|
| Display | inline-flex, `items-center`, `h-fit w-fit` |
| Font | `font-medium` 500; size and line-height inherited (not set in link CSS) |
| Colour | `--link` = `--foreground` (#18181B / #FCFCFC) |
| Underline | none at rest; decoration colour `--separator-tertiary` (#CDCDCE / #3C3C3F); thickness 1.5px; offset `underline-offset-4` = 4px |
| Radius | `rounded-xl` = 12px (visible only as the focus ring shape) |

### Icon
| Property | Value |
|---|---|
| Size | `0.75em` square (12px at 16px text) |
| Opacity | 60% at rest, 100% on hover, pressed and focus-visible |
| Default-icon spacing | `ms-1` = 4px start margin, `pb-1.5` = 6px bottom padding (nudges the arrow up toward the cap height) |
| Transition | opacity 150ms `ease-out` |

### States
| State | Styling |
|---|---|
| Rest | no underline, `--link` colour, icon 60% |
| Hover (pointer only) | `underline`, decoration `--muted` at 50% alpha, icon 100% |
| Pressed | `underline`, decoration `--muted` (full), icon 100% |
| Focus-visible | `status-focused` ring (2px accent + 2px gap, 12px radius), icon 100% |
| Disabled | `[aria-disabled="true"]`: opacity 0.5, not-allowed, no pointer events |
| Pending / invalid / selected | not applicable |

### Motion
color 100ms `ease`; background-color 150ms `ease`; box-shadow 150ms `ease-out`; opacity 100ms `ease-out`.

### Link as button
`.link.button` combination: `gap-0` and `no-underline` (so a Link carrying button classes does not underline).

### Accessibility and mobile
Native `<a>` via React Aria; `isDisabled` sets `aria-disabled`. No colour distinction from body text beyond weight (colour equals foreground), so the link is identified by weight, icon and hover underline only; on touch there is no hover underline. Consider an always-visible underline for mobile (Tailwind `underline` utility is the documented way). Inline links have a text-height hit area (no minimum size set).

Sources: https://www.heroui.com/docs/react/components/link, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/link.css, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/link/link.tsx

---

## 7. Dropdown

**Purpose.** A trigger (usually a Button) that opens a popover menu of actions or selectable options. Built on React Aria Menu + Popover. Supports sections, single/multiple selection, keyboard-shortcut hints, submenus, controlled open state and long-press trigger.

**Anatomy (from docs).**
```
Dropdown
  Dropdown.Trigger  (wraps a Button or custom element)
  Dropdown.Popover  (.dropdown__popover)
    Dropdown.Menu   (.dropdown__menu / .menu)
      Dropdown.Item (.menu-item)
        Label, Description, Kbd slot="keyboard", Dropdown.ItemIndicator
      Separator
      Dropdown.Section (.menu-section)
        Header, Dropdown.Item
      Dropdown.SubmenuTrigger
        Dropdown.Item (+ Dropdown.SubmenuIndicator)
        Dropdown.Popover > Dropdown.Menu > Dropdown.Item
```

### Root and trigger
| Part | Styling |
|---|---|
| `.dropdown` | flex column, `gap-1` (4px) |
| `.dropdown__trigger` | `inline-block`, no outline. When the trigger is a Button, Button styles apply. For a custom trigger: focus-visible = `status-focused` ring; disabled = opacity 0.5; pending = no pointer events; pressed = `scale(0.97)`. Transitions: transform 250ms `ease-out-quart`, background-color 150ms `ease`, box-shadow 150ms `ease-out`. |

### Popover container (`.dropdown__popover`)
| Property | Value |
|---|---|
| Background | `--overlay` (#FFFFFF / #18181B) |
| Radius | `min(32px, var(--radius-3xl))` = 24px |
| Shadow | `--overlay-shadow` (section 0) |
| Padding | 0 |
| Text | `text-sm` 14/20 |
| Min width | `md:min-w-55` = 220px from 768px up; none below |
| Max width | `max-w-[48svw]` (48% of small viewport width: 180px at 375px) |
| Scroll | `overflow-y: auto`, `overscroll-contain`, `scroll-py-1` (4px), thin scrollbar (`--scrollbar-width: thin`, thumb = foreground at 15%) |
| Transform origin | `--trigger-anchor-point` (the point on the popover nearest the trigger) |
| Focus | `outline: none` on the popover itself |
| Arrow (optional) | `[data-slot="popover-overlay-arrow"]` filled `--overlay`; rotated 180deg (placement bottom), -90deg (left), 90deg (right), 0deg (top). Arrow size: not found in CSS. |
| Offset from trigger | not found in CSS (React Aria default applies) |

### Popover motion
| Phase | Duration | Easing | Effect |
|---|---|---|---|
| Entering (`data-entering`) | 150ms | `ease` | fade from 0 opacity, zoom from scale 0.9 (`zoom-in-90`), plus 4px slide in from the trigger side: placement top slides from bottom 4px, bottom from top 4px, left from right 4px, right from left 4px |
| Exiting (`data-exiting`) | 100ms | `ease` | fade out, scale to 0.95 (`zoom-out-95`); pointer events off while closing |

Animation helper values (`animate-in`, `zoom-in-90`, `slide-in-from-*-1` = 0.25rem) come from the tw-animate-css utility set, not defined in the HeroUI files; the numbers above follow that library's conventions.

### Menu (`.dropdown__menu`, `.menu`)
| Property | Value |
|---|---|
| Layout | `relative`, flex column, `w-full`, `overflow-clip` |
| Gap between items | `gap-0.5` = 2px (`.dropdown__menu`); plain `.menu` uses `gap-1` = 4px |
| Padding | `.dropdown__menu` / `.menu`: `p-1` = 4px. Inside `.dropdown__popover`, `[data-slot="dropdown-menu"]` is overridden to `p-1.5` = 6px. Effective padding is 6px when the menu carries `data-slot="dropdown-menu"` (could not confirm the attribute is on the same element as `.dropdown__menu`). |
| Separator | `[data-slot="separator"]` inside the menu: `ms-[3%] w-[94%]` (94% width, centred). Separator element: 1px tall, `--separator` colour (#E4E4E7 / #212124), `rounded-sm`. |

### Menu item (`.menu-item`)
| Property | Value |
|---|---|
| Layout | `relative flex`, `w-full`, `items-center`, `justify-start` |
| Min height | `min-h-9` = 36px |
| Padding | `px-2` = 8px, `py-1.5` = 6px. In a Dropdown popover: `[data-slot="menu-item"]` sets `px-2.5` = 10px. |
| Gap | `gap-3` = 12px |
| Radius | `rounded-2xl` = 16px |
| Label | `data-slot="label"`: `text-sm` 14/20, `font-medium` 500, `--foreground`; `pointer-events: none`, `select-none`, `w-fit` |
| Description | `data-slot="description"`: `text-xs` 12/16, `--muted`, text-wrap, `select-none` |
| Keyboard hint | `Kbd` with `slot="keyboard"`; see Kbd section. Placement/spacing: not found in CSS. |
| Section header (`Header`) | `px-2 pt-1.5 pb-1` (8px / 6px / 4px), `text-xs` 12/16, `font-medium`, `--muted`, start-aligned, full width |
| Section (`.menu-section`) | flex column, `items-start`, `gap-0` |

### Item variants
| Variant | Styling |
|---|---|
| `default` | label `--foreground` |
| `danger` | label text `--danger` (#FF383C / #DB3B3E) and indicator `--danger`. Hover bg is the same `--default`. |

### Item states
| State | Styling |
|---|---|
| Rest | transparent bg |
| Hover (pointer only) | bg `--default` (#EBEBEC / #27272A) |
| Pressed | `scale(0.98)`; no colour change |
| Focus (keyboard, `data-focus-visible`) | `status-focused`: 2px `--focus` ring + 2px gap (gap coloured `--background`, which can read as a light outline against the overlay surface) |
| Selected | indicator visible (see below); no row background change in CSS |
| Disabled | `[data-disabled="true"]`: opacity 0.5, not-allowed, no pointer events |
| Pending / invalid | not applicable |

### Selection indicator (`.menu-item__indicator`)
| Property | Value |
|---|---|
| Box | 16 x 16px (`size-4`), absolute, `start-2` (8px from start), vertically centred, `--muted` colour |
| Checkmark SVG | 10px (`size-2.5`), viewBox 17x18, polyline `1 9 7 14 15 4`, stroke 2px, round caps and joins, dash-draw animation: `stroke-dasharray 22`, offset 66 (unselected) to 44 (selected), `stroke-dashoffset` transition 100ms linear |
| Dot SVG | 8px (`size-2`), filled circle; unselected `scale(0.7)` opacity 0; selected `scale(1)` opacity 1 |
| Indicator transition | 250ms (`transition` with `duration-250`); in `multiple` selection mode checkmark transition is 300ms (all), dot 250ms (all) |
| Item padding when indicator present | `ps-7` = 28px start padding (to clear the indicator). Note: in a Dropdown the item-level `px-2.5` override is a same-specificity rule and may win; ambiguous. |
| Submenu item | `data-has-submenu`: indicator moves to the end (`end-2` = 8px), item padding `ps-2 pe-7` (28px end) |
| Submenu chevron | `.menu-item__indicator--submenu`: `--muted`, svg `size-3` = 12px. (A second rule sets `[data-slot="submenu-indicator"] svg` to `size-3.5` = 14px; both exist, 12px is the more specific class rule on the indicator.) |

### Dropdown accessibility
Implements the ARIA menu pattern via React Aria: arrow keys, Home/End, typeahead (uses `textValue`), focus management, selection announcements (`aria-checked` / `aria-selected`), long-press trigger option (`trigger="longPress"`), submenu navigation. Disabled items stay in the list but cannot be activated. Trigger needs an accessible name when icon-only.

### Mobile (375px)
Popover max width is `48svw` = 180px at 375px, and the 220px min width only applies from 768px, so long labels wrap or truncate on phones unless overridden; plan menu item text length accordingly. Items are 36px minimum height (below typical 44px touch target; add vertical padding in the design if touch comfort matters). Hover state never shows on touch; pressed scale 0.98 is the feedback.

Sources: https://www.heroui.com/docs/react/components/dropdown, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/dropdown.css, .../menu.css, .../menu-item.css, .../menu-section.css, .../popover.css, .../header.css, .../label.css, .../description.css, .../separator.css, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/menu-item/menu-item.tsx

---

## 8. Toolbar

**Purpose.** Container for a set of related controls with arrow-key navigation (React Aria Toolbar). Used with Buttons, ButtonGroups, ToggleButtonGroups and separators.

**Anatomy.** `.toolbar` containing controls and optional `Separator`s.

| Property | Value |
|---|---|
| Layout | CSS grid, `w-fit`, `grid-flow-col`, `items-center`, `gap-2` = 8px |
| Horizontal (default) | `.toolbar--horizontal`: no extra rules |
| Vertical | `.toolbar--vertical`: `grid-flow-row`, `items-start`, `justify-start`; child `.button-group` is `justify-start` |
| Child vertical separator | `.separator--vertical`: `h-1/2` (half the toolbar height), `self-center` (separator itself is 1px wide, `min-h-2` = 8px, `--separator` colour) |
| Child horizontal separator | `.separator--horizontal`: `w-1/2`, centred (1px tall) |
| Attached (`isAttached`) | `.toolbar--attached`: radius `rounded-3xl` = 24px, bg `--surface` (#FFFFFF / #18181B), padding `p-1` = 4px, shadow `--overlay-shadow` (section 0) |

### States
The toolbar itself has no hover/pressed/focus/disabled styling; each child control keeps its own states. Keyboard: arrow keys move focus between controls (one tab stop for the toolbar).

### Accessibility and mobile
Provide `aria-label` or `aria-labelledby` (props listed in docs). Arrow-key navigation is a keyboard feature only. At 375px a horizontal toolbar is `w-fit` and does not wrap or scroll in CSS; with many controls it can overflow, so cap the control count or switch to a menu. The attached variant adds 4px padding and an overlay shadow, so it reads as a floating bar.

Sources: https://www.heroui.com/docs/react/components/toolbar, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/toolbar.css, .../separator.css

---

## 9. Kbd

**Purpose.** Displays a keyboard key or shortcut (for example in menu items or instructional text).

**Anatomy.** `.kbd` root (`<kbd>`) containing `Kbd.Abbr` (`.kbd__abbr`, `<abbr>` for modifier keys, with a `title`) and/or `Kbd.Content` (`.kbd__content`, key text such as K).

### Geometry and type
| Property | Value |
|---|---|
| Display | inline-flex, `items-center`, `whitespace-nowrap`, text centred |
| Height | `h-6` = 24px |
| Padding X | `px-2` = 8px |
| Radius | `rounded-lg` = 8px |
| Gap between children | `space-x-0.5` = 2px (reversed in RTL) |
| Word spacing | `-0.25rem` = -4px |
| Font | sans, `text-sm` 14/20, `font-medium` 500 |
| Colour | text `--muted` (#71717A / #9F9FA9); bg `--default` (#EBEBEC / #27272A) |
| `.kbd__abbr` | flex, centred, 100% width and height, `text-decoration: none` |
| `.kbd__content` | flex, centred |
| Variant `default` | as above |
| Variant `light` (`.kbd--light`) | bg transparent |

### Key glyph map (`kbd.constants.ts`)
command ⌘, shift ⇧, ctrl ⌃, option ⌥, enter ↵, delete ⌫, escape ⎋, tab ⇥, capslock ⇪, up ↑, right →, down ↓, left ←, pageup ⇞, pagedown ⇟, home ↖, end ↘, help ?, space ␣, fn "Fn", win ⌘, alt ⌥. The `title` text on each (accessible name) is the spelled-out key ("Command", "Shift", "Control", and so on).

### States
Static, non-interactive. No hover, pressed, focus, disabled, pending, selected, invalid or motion styling.

### Accessibility and mobile
Semantic `<kbd>` with `<abbr title>` for symbol keys so screen readers can read the key name. Keyboard hints are rarely meaningful on a phone; hide them under 768px in menu items.

Sources: https://www.heroui.com/docs/react/components/kbd, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/kbd.css, https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/kbd/kbd.constants.ts

---

## 10. Quick comparison

| | Button | ToggleButton | CloseButton | Kbd |
|---|---|---|---|---|
| Height (mobile / desktop) | 40 / 36 | 40 / 36 | 24 | 24 |
| Radius | 24 (pill) | 24 (pill) | 12 (circle) | 8 |
| Press scale | 0.97 (sm 0.98, lg 0.96) | same | 0.93 | none |
| Selected | n/a | accent-soft | n/a | n/a |
| Focus ring | 2px accent + 2px gap | same (inset 2px in group) | same | none |

## 11. Source URLs

Docs (HeroUI v3.2.6):
- https://www.heroui.com/docs/react/components/button
- https://www.heroui.com/docs/react/components/button-group
- https://www.heroui.com/docs/react/components/close-button
- https://www.heroui.com/docs/react/components/toggle-button
- https://www.heroui.com/docs/react/components/toggle-button-group
- https://www.heroui.com/docs/react/components/link
- https://www.heroui.com/docs/react/components/dropdown
- https://www.heroui.com/docs/react/components/toolbar
- https://www.heroui.com/docs/react/components/kbd

CSS (branch `v3`, base `https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/`):
- `components/button.css`, `button-group.css`, `close-button.css`, `toggle-button.css`, `toggle-button-group.css`, `link.css`, `dropdown.css`, `toolbar.css`, `kbd.css`
- `components/menu.css`, `menu-item.css`, `menu-section.css`, `popover.css`, `header.css`, `label.css`, `description.css`, `separator.css`, `spinner.css`
- `utilities/index.css` (status-focused, status-disabled, status-pending, focus-ring)
- `themes/shared/theme.css`, `themes/default/variables.css`
- React sources: `https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/{dropdown,menu-item,popover,close-button,kbd,link,button}/`

## 12. Not found, ambiguous, and docs-vs-CSS conflicts

Not found (no value in the sources I read):
- Dropdown popover offset from trigger (React Aria default, not set in HeroUI CSS) and popover arrow dimensions.
- Layout of label + description stacking inside a menu item (flex direction/gap not in CSS), and spacing of the `Kbd slot="keyboard"` inside an item.
- Tertiary Button foreground (inherits `currentColor`; the page text colour is not defined in these files).
- Link font size (inherited), CloseButton pending visuals, Figma file links (not extracted).
- `--ease-out` definition inside HeroUI files (it is the Tailwind v4 default `cubic-bezier(0, 0, 0.2, 1)`).

Ambiguous:
- Menu padding: `.dropdown__menu` p-1 (4px) vs `[data-slot="dropdown-menu"]` p-1.5 (6px).
- Menu item start padding with an indicator: `ps-7` (28px) vs dropdown's `px-2.5` override (equal specificity, order decides).
- Submenu chevron: 12px (`.menu-item__indicator--submenu svg`) vs 14px (`[data-slot="submenu-indicator"] svg`).
- Hex colours are my OKLCH to sRGB conversions of the source tokens, not values copied from the source.

Docs conflicts (CSS used):
- ToggleButton docs say selected = "accent background and foreground"; CSS uses `--accent-soft` bg and `--accent-soft-foreground`.
- Button docs prop table omits `danger-soft`, present in CSS and the Variants demo; ButtonGroup docs omit `outline`, present in CSS.
- Dropdown docs list `.dropdown__trigger[data-disabled]`; the CSS targets `:disabled` / `[aria-disabled="true"]`.
- Kbd docs describe a border in the customization snippet; `.kbd` CSS has no border.
