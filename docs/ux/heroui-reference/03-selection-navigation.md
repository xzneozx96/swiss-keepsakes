# HeroUI v3 reference 03: Selection and navigation components

Components: Select, ComboBox, Autocomplete, ListBox (Item, Section), TagGroup / Tag, Tabs, Accordion, Disclosure, DisclosureGroup, Breadcrumbs, Pagination.

Everything here is derived from the v3 branch CSS (the source of truth), `theme.css`, `variables.css`, `utilities/index.css`, and the component TSX for default icons. Values marked **not found** do not exist in those files.

## 0. Conventions and shared tokens

### 0.1 Unit conversion
- 1 spacing unit = 4px (`--spacing: 0.25rem`). `p-1`=4, `p-1.5`=6, `p-2`=8, `p-2.5`=10, `p-3`=12, `p-4`=16, `pe-7`=28, `size-3`=12, `size-4`=16, `size-5`=20, `size-9`=36.
- Text: `text-xs` 12/16, `text-sm` 14/20, `text-base` 16/24.
- `--radius: 8px`. radius-xs..4xl = 2, 4, 6, 8, 12, 16, 24, 32 px. `rounded-field` = `--field-radius` = radius x 1.5 = **12px**. Plain Tailwind `rounded` = 4px; `rounded-sm` here = radius-sm = 4px; `rounded-xl` = 12; `rounded-2xl` = 16; `rounded-3xl` = 24.
- Popover/panel radius everywhere: `min(32px, radius-3xl)` = **24px**.
- Fonts: HeroUI CSS sets no font family in these files (**not found**; inherits from the app).

### 0.2 Colour tokens (hex resolved from the oklch/color-mix definitions)
Hex values were computed from the oklch definitions (rounded to sRGB). Tokens defined as semi-transparent mixes are given as colour at alpha.

| Token | Light | Dark | Definition |
|---|---|---|---|
| `--background` | #F5F5F5 | #060607 | oklch(0.9702 0 0) / oklch(12% 0.005 285.823) |
| `--foreground` | #18181B | #FCFCFC | eclipse oklch(0.2103 0.0059 285.89) / snow oklch(0.9911 0 0) |
| `--surface` | #FFFFFF | #18181B | white / eclipse |
| `--overlay` (popover bg) | #FFFFFF | #18181B | white / oklch(0.2103 0.0059 285.89) |
| `--field-background` | #FFFFFF | #18181B | white / eclipse |
| `--field-foreground` | #18181B | #FCFCFC | |
| `--field-placeholder` | #71717A | #9F9FA9 | = `--muted` |
| `--muted` | #71717A | #9F9FA9 | oklch(0.5517 0.0138 285.94) / oklch(70.5% 0.015 286.067) |
| `--default` | #EBEBEC | #27272A | oklch(94% 0.001 286.375) / oklch(27.4% 0.006 286.033) |
| `--default-foreground` | #18181B | #FCFCFC | |
| `--default-hover` | #E1E1E2 | #2E2E31 | mix(default 96%, default-foreground 4%) |
| `--field-hover` | #F9F9F9 at 92% alpha | #1C1C1F at 92% alpha | mix(field-bg 90%, field-fg 2%); percentages sum to 92 so alpha = 0.92 |
| `--field-focus` | #FFFFFF | #18181B | = field-background |
| `--field-border` | transparent | transparent | and `--field-border-width: 0px`, so **no border is drawn by default** |
| `--field-border-hover` | #18181B at 10% alpha | #FCFCFC at 10% alpha | mix of transparent; invisible at 0px width |
| `--field-border-focus` | #18181B at 22% alpha | #FCFCFC at 22% alpha | invisible at 0px width |
| `--surface-hover` | #EAEAEA | #27272A | mix(surface 92%, surface-foreground 8%) |
| `--accent` / `--focus` | #0485F7 | #0485F7 | oklch(0.6204 0.195 253.83), same both themes |
| `--accent-foreground` | #FCFCFC | #FCFCFC | snow |
| `--accent-soft` | #0485F7 at 15% alpha | #0485F7 at 12% alpha | mix(accent 15% / 12%, transparent) |
| `--accent-soft-hover` | #0485F7 at 20% alpha | #0485F7 at 16% alpha | |
| `--accent-soft-foreground` | #1E63AE | #61A8FB | mix(accent 70%, foreground 30%) / mix(accent 80%, foreground 30%) |
| `--segment` (tab indicator) | #FFFFFF | #46464C | white / oklch(0.3964 0.01 285.93) |
| `--segment-foreground` | #18181B | #FCFCFC | |
| `--border` | #DEDEE0 | #28282C | oklch(90% 0.004 286.32) / oklch(28% 0.006 286.033) |
| `--separator` | #E4E4E7 | #212124 | oklch(92% 0.004 286.32) / oklch(25% 0.006 286.033) |
| `--danger` | #FF383C | #DB3B3E | oklch(0.6532 0.2328 25.74) / oklch(0.594 0.1967 24.63) |
| `--link` | #18181B | #FCFCFC | = foreground |
| `--disabled-opacity` | 0.5 | 0.5 | |

### 0.3 Shared shadows
| Token | Light | Dark |
|---|---|---|
| `--overlay-shadow` (all popovers) | `0 2px 8px 0 rgba(0,0,0,.06), 0 -6px 12px 0 rgba(0,0,0,.03), 0 14px 28px 0 rgba(0,0,0,.08)` | `0 0 1px 0 rgba(255,255,255,.3) inset` (hairline inner glow, no drop shadow) |
| `--field-shadow` (primary field/trigger) | `0 2px 4px 0 rgba(0,0,0,.04), 0 1px 2px 0 rgba(0,0,0,.06), 0 0 1px 0 rgba(0,0,0,.06)` | `0 0 0 0 transparent inset` (none) |
| `--surface-shadow` (tab indicator) | `0 2px 4px 0 rgba(0,0,0,.04), 0 1px 2px 0 rgba(0,0,0,.06), 0 0 1px 0 rgba(0,0,0,.06)` | `0 0 0 0 transparent inset` (none) |

### 0.4 Shared state utilities (from `utilities/index.css`)
| Utility | Effect |
|---|---|
| `status-focused` (focus-visible on non-field controls: items, tabs, tags, pagination, accordion trigger, disclosure trigger) | 2px ring in `--focus` (#0485F7), **plus a 2px offset gap filled with `--background`** (ring offset 2px, `ring-offset-background`). Visually: element, 2px page-colour gap, 2px blue ring, 4px total outside the element. |
| `status-focused-field` (text input in ComboBox) | 2px ring in `--focus`, **no offset** (ring touches the field). |
| `status-invalid-field` | Unfocused: 1px solid `--danger` outline, ring-offset-width 3px. Focused / focus-visible / focus-within: 2px `--danger` ring, offset 0. |
| `status-disabled` | opacity 0.5, cursor `not-allowed`, pointer-events none. |
| `touch-target` | transparent 24x24 pseudo-element centred on the control (WCAG 2.5.8). |
| `scrollbar` | thin themed scrollbar: thumb = foreground at 15% alpha, transparent track. |

### 0.5 Shared motion
| Name | Value |
|---|---|
| `--ease-smooth` | `ease` |
| `--ease-out-quad` | cubic-bezier(0.25, 0.46, 0.45, 0.94) |
| `--ease-out-quart` | cubic-bezier(0.165, 0.84, 0.44, 1) |
| `--ease-out-fluid` | cubic-bezier(0.32, 0.72, 0, 1) |
| `--ease-out` (used as `var(--ease-out)`) | not defined in HeroUI files; this is the Tailwind v4 built-in, cubic-bezier(0, 0, 0.2, 1) (from Tailwind, not verified in HeroUI source) |
| Reduced motion | every transition has `motion-reduce:transition-none` |

### 0.6 Shared popover panel (Select, ComboBox, Autocomplete)
| Property | Select / ComboBox | Autocomplete |
|---|---|---|
| Background | `--overlay` (#FFFFFF / #18181B) | same |
| Radius | 24px | 24px |
| Shadow | `--overlay-shadow` | same |
| Text | `text-sm` 14/20 | same |
| Panel padding | 0 | 0 left/right/bottom, **8px top** (`pt-2`) |
| Width | min-width = trigger width (`--trigger-width`) | exactly = trigger width, max = trigger width |
| Height | scrolls vertically (`overflow-y-auto`, `overscroll-contain`, `scroll-py-1`); explicit max-height **not found** in the CSS (comes from React Aria available-space logic) | panel `overflow:hidden`, flex column; inner list `max-h 320px`, scrolls |
| Inner ListBox | padding 6px (`p-1.5`) | padding 6px, max-height 320px |
| Item horizontal padding inside panel | 10px (`px-2.5`) | 10px |
| Offset from trigger | **not found** (not set in HeroUI CSS or in select/combo-box/autocomplete TSX; React Aria default applies) | not found |
| Default placement | `bottom` | `bottom` |
| Transform origin | `--trigger-anchor-point` | same |
| Enter | 150ms `ease`, fade-in from 0, zoom-in from 95%, slide 4px toward final position (from top for `bottom` placement, from bottom for `top`, etc.) | 250ms `--ease-out-fluid`, same fade/zoom/slide |
| Exit | 100ms `ease`, fade-out, zoom-out to 95%, pointer-events none | 100ms `--ease-out-quad`, same |
| Arrow | `fill: --overlay`; rotated 180deg (bottom), -90deg (left), 90deg (right) | same |
| Stacking | z-index 100000 (`--z-index-overlay`, React Aria portal) | same |

The generic `.popover` (used for Popover, not for the pickers) is the same panel but `zoom-in-90` on enter, padding 0, and `.popover__dialog` adds 16px padding.

---

## 1. Select

**Purpose.** Collapsible list of options; user picks one (or many with `selectionMode="multiple"`). Button trigger plus popover ListBox. Built on React Aria `Select`.

### Anatomy
`Select` (root, flex-col, gap 4px) > `Label` (optional) / `Select.Trigger` (button) > `Select.Value`, `Select.ClearButton` (optional), `Select.Indicator` / `Description` / `Select.Popover` > `ListBox` > `ListBox.Item` (`Label`, `Description`, `ListBox.ItemIndicator`), `ListBox.Section` (`Header`, items), `Separator`.

### Variants and sizes
| Variant | Trigger background | Shadow |
|---|---|---|
| `primary` (default) | `--field-background` | `--field-shadow` |
| `secondary` | `--default` (#EBEBEC / #27272A) | none |

No size prop. `fullWidth` makes root and trigger 100% wide. Default width is content-driven (**not found**; doc examples use 256px).

### Trigger specs
| Property | Value |
|---|---|
| Layout | inline-flex, `relative isolate` |
| Min height | 36px (`min-h-9`); content 20px line + 8px+8px padding = 36px |
| Padding | 12px horizontal, 8px vertical; **28px inline-end** when the indicator exists (`pe-7`) |
| Radius | 12px (`rounded-field`) |
| Background | `--field-background` |
| Border | width `--border-width-field` = **0px**, colour transparent |
| Shadow | `--field-shadow` |
| Text | 14/20 `--field-foreground` (value slot: **16/24 below 640px**, 14/20 at `sm` and up) |
| Placeholder | `--field-placeholder` (= muted) |
| Cursor | pointer |
| Label to trigger gap | 4px |
| Description | hidden while invalid |

### Value slot
`flex-1 text-start`, wraps long text. Inside it the list-box item indicator is hidden (`display:none`), so the checkmark never shows in the trigger.

### Indicator (chevron)
16x16 `IconChevronDown` (16 viewBox, filled glyph, 1.5px stroke weight), absolutely positioned: `inset-y 0`, `end 8px`, vertically centred. Colour `--field-placeholder`. Rotates 180deg when open (`data-open`), 150ms transition.

### Clear button (optional)
20x20 (`size-5`), padding 4px, radius 12px, colour `--muted`, transparent bg, icon 14x14 (`size-3.5`, `CloseIcon`, 16-viewBox glyph). Pointer target expanded 2px each side (24px). Rendered as `span`. Hidden (`opacity 0`, no pointer events) when `data-empty`; fades 150ms `ease` otherwise. Hover bg `--default-hover` (only on hover-capable devices). Pressed `scale(0.93)`.

### States (trigger)
| State | Styling |
|---|---|
| Default | as above |
| Hover (`@media (hover:hover)`; not applied while the clear button is hovered) | bg `--field-hover` (#F9F9F9 at 92% / #1C1C1F at 92%); border colour changes but border width is 0, so invisible. Secondary: bg `--default-hover` (#E1E1E2 / #2E2E31) |
| Focus-visible | `status-focused`: 2px #0485F7 ring + 2px `--background` offset gap; bg `--field-focus` (#FFFFFF / #18181B). Secondary: bg `--default` |
| Pressed | no separate style |
| Open | chevron rotated 180deg; no trigger style change |
| Invalid | 1px `--danger` outline, offset 3px; focused: 2px `--danger` ring; bg `--field-focus` |
| Disabled | opacity 0.5, not-allowed cursor, no pointer events |
| Transitions | bg 150ms `ease`, border-colour 150ms `ease`, box-shadow 150ms `--ease-out` |

### Popover and list
See 0.6. Select popover: min-width = trigger, 24px radius, `--overlay-shadow`, list padding 6px, items 10px side padding. In single-select the item indicator transition is disabled (popover closes immediately); in multi-select the checkmark animates (see ListBox).

### Motion
Chevron 150ms, popover enter 150ms / exit 100ms (0.6), clear button 150ms opacity, trigger bg/border 150ms.

### Accessibility
React Aria Select, ARIA listbox pattern: full keyboard navigation, typeahead, screen-reader selection announcements, focus management, disabled states, native form integration (`name`, `autoComplete`). `isRequired` adds a red `*` after the label (label.css: `ms-0.5`, `--danger`). Invalid label turns `--danger`. Clear button renders as a `span` inside the trigger button (avoids nested buttons).

### Mobile (375px)
Value text renders at 16px (prevents iOS zoom). Trigger min-height 36px is below a 44px touch guideline; clear button visible box 20px with 24px target. Popover width equals the trigger, so a full-width select (`fullWidth`) gives a full-width list. Hover styles only apply on hover-capable pointers, so touch devices get no hover tint.

### Sources
- https://www.heroui.com/docs/react/components/select
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/select.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/select/select.tsx

---

## 2. ComboBox

**Purpose.** Text input plus a filterable popover list (type to filter, pick one; or multiple selection via `ComboBox.Value`). Built on React Aria `ComboBox`.

### Anatomy
`ComboBox` (root flex-col gap 4px) > `Label` / `ComboBox.InputGroup` (relative, inline-flex, items-center) > `Input` + `ComboBox.Trigger` (chevron button) / `ComboBox.Value` (selected summary, multi-select) / `Description` / `ComboBox.Popover` > `ListBox` (same item anatomy as Select).

### Variants and sizes
`primary` / `secondary` (same prop as Select; secondary uses the Input secondary styling). `fullWidth`. No size prop. Default width **not found**.

### Input (uses `.input`, shared with TextField)
| Property | Value |
|---|---|
| Padding | 12px x 8px; **28px inline-end** when followed by the trigger |
| Radius | 12px |
| Background | `--field-background` |
| Border | 0px (transparent) |
| Shadow | `--field-shadow` |
| Text | 16/24 below 640px, 14/20 from `sm` |
| Height | 36px (20 line + 16 padding) at desktop; 40px (24 + 16) at <640px given the 16px base text |
| Placeholder | `--field-placeholder` |
| Hover (not focused) | bg `--field-hover` |
| Focus | `status-focused-field`: 2px #0485F7 ring, no offset gap; bg `--field-focus` |
| Invalid | `status-invalid-field` (1px danger outline; 2px danger ring on focus) |
| Disabled | opacity 0.5, not-allowed |
| Transitions | bg 150ms `ease`, border 150ms `ease`, box-shadow 150ms `--ease-out` |

### Trigger button (chevron)
Absolutely positioned at `end 0`, full input height, vertically centred, right padding 8px (`pe-2`), no border/bg. Icon 16x16 `IconChevronDown`. Colour `--field-placeholder`; hover colour `--field-foreground`. Open: icon rotates 180deg (150ms). Pressed: opacity 0.7. Focus-visible: 2px #0485F7 ring + 2px background offset, radius 4px. Disabled: opacity 0.5, not-allowed.

### Value slot (multi-select summary)
`text-sm` 14/20, `--field-foreground`, placeholder colour when empty, hidden if empty; list-box indicator hidden inside it.

### Popover
See 0.6 (Select/ComboBox column). Single-select only: the checkmark transition is disabled. `menuTrigger` default `focus` (opens on focus), also `input` / `manual`.

### Motion
Same as Select (popover 150/100ms, icon 150ms).

### Accessibility
ARIA combobox pattern; keyboard navigation, typeahead, announcements for selection and input change, focus management, form integration, custom values (`allowsCustomValue`). `formValue` default `key`.

### Mobile (375px)
Input text 16px (no iOS zoom), so field height becomes 40px. Trigger target is the full input height and 36px (approx) wide. Popover equals field width.

### Sources
- https://www.heroui.com/docs/react/components/combo-box
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/combo-box.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/input.css

---

## 3. Autocomplete

**Purpose.** A Select-style trigger whose popover contains a search field plus a filtered list (single or multiple). Use for long option lists. Filtering is wired through `Autocomplete.Filter` (with `useFilter`'s `contains` / `startsWith`).

### Anatomy
`Autocomplete` (root flex-col gap 4px) > `Label` / `Autocomplete.Trigger` > `Autocomplete.Value`, `Autocomplete.ClearButton`, `Autocomplete.Indicator` / `Description` / `Autocomplete.Popover` > `Autocomplete.Filter` > `SearchField` (`SearchField.Group`, `SearchField.SearchIcon`, `SearchField.Input`) + `ListBox` > items. Optional `[data-slot="empty-state"]` for no results.

### Variants and sizes
`primary` (shadow) and `secondary` (bg `--default`, no shadow). `fullWidth`. No size prop.

### Trigger
Identical spec to Select trigger (36px min height, 12/8 padding, 28px inline-end padding with indicator, 12px radius, `--field-shadow`, 0px border, 14/20 text with 16px value text on mobile). States identical: hover `--field-hover`, focus-visible 2px ring + offset, invalid, disabled. Indicator 16x16 chevron, `end 8px`, rotates on open, pointer cursor.

### Clear button
20x20, padding 4px, radius 12px, icon 14x14, `--muted`, hover bg `--default-hover`, pressed `scale(0.93)`, hidden when `data-empty`, 150ms opacity fade. (No 24px touch overlay, unlike Select.)

### Popover (differs from Select)
See 0.6, Autocomplete column. Layout (top to bottom): 8px top padding, search field (`px-3` 12px, `py-1` 4px, does not shrink), list (max-height 320px, scrolls, padding 6px). Search field geometry (from search-field.css): group height 36px (`h-9`), radius 12px, bg `--field-background`, `--field-shadow`, 16px search icon with `ms-3` (12px) start margin, input `px-3 py-2`, text 16/24 on mobile and 14/20 at `sm`; clear-button 20px, `me-2`. Empty state: centred 14/20 text in `--overlay-foreground` at 60% opacity (padding **not found**). Virtualised rows are width `calc(100% - 12px)` so they stay inside the list padding.

### Motion
Popover enter 250ms `--ease-out-fluid` (fade 0 to 1, zoom 95% to 100%, 4px slide); exit 100ms `--ease-out-quad`. Indicator 150ms.

### Accessibility
React Aria Autocomplete with SearchField for filtering; arrow keys move through the filtered list while focus stays in the search field; Escape closes. Disabled, invalid, required handled like Select.

### Mobile (375px)
Popover = trigger width, so on a 375px screen full width minus page gutter. 320px list max-height plus search row (about 44px) plus 8px top padding fits within a 667px viewport but not alongside a keyboard; React Aria shrinks the panel (the `min-h-0` flex column lets the list scroll in a constrained popover). Search input 16px text avoids iOS zoom.

### Sources
- https://www.heroui.com/docs/react/components/autocomplete
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/autocomplete.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/search-field.css

---

## 4. ListBox (with ListBox.Item and ListBox.Section)

**Purpose.** Standalone or embedded (Select / ComboBox / Autocomplete) selectable list. `selectionMode`: `none` / `single` (default) / `multiple`. Supports `onAction`, sections, descriptions, virtualisation, `variant: default | danger`.

### Anatomy
`ListBox` > `ListBox.Item` (`Label`, `Description`, `ListBox.ItemIndicator`), `ListBox.Section` (`Header`, items), `Separator`.

### List container
| Property | Value |
|---|---|
| Layout | `relative w-full overflow-clip`, padding 4px (6px when inside a Select/ComboBox/Autocomplete popover) |
| Gap between children | 4px (`> * + * { margin-top: 4px }`, not flex-gap) |
| Horizontal separator inside | 94% wide, margin-left 3% (centred) |

### Item
| Property | Value |
|---|---|
| Layout | flex, items-center, justify-start, gap 12px, `relative` |
| Min height | 36px; width 100% |
| Padding | 8px horizontal, 6px vertical (10px horizontal inside picker popovers); **28px inline-end** when an indicator exists |
| Radius | 16px (`rounded-2xl`) |
| Label slot | not clickable, `w-fit`, `select-none` (label type: 14/20 medium `--foreground`, from label.css) |
| Description slot | not clickable, wraps (description type: 12/16 `--muted`, from description.css) |
| Cursor | pointer |

### Item states
| State | Styling |
|---|---|
| Default | transparent bg |
| Hover (hover-capable devices) | bg `--default` (#EBEBEC / #27272A) |
| Pressed | `transform: scale(0.98)`, transform transition 250ms `--ease-out-quart` |
| Focus-visible | `status-focused`: 2px #0485F7 ring + 2px `--background` offset (the list is `overflow-clip`, so the ring may clip at list edges; popover padding of 6px absorbs it) |
| Selected | no background change; the item indicator checkmark appears (see below) |
| Disabled | opacity 0.5, not-allowed, no pointer events |
| Danger variant | label and indicator colour `--danger` (#FF383C / #DB3B3E) |
| Transitions | transform 250ms `--ease-out-quart`; box-shadow 150ms `--ease-out` |

### Item indicator (checkmark)
Container 16x16 (`size-4`), absolute, `end 8px`, vertically centred, colour `--default-foreground` (danger: `--danger`). Inner checkmark glyph 10x10 (`size-2.5`), draws in via `stroke-dashoffset` over 250ms linear when selected; other transitions 300ms. Container transition 250ms. Disabled in single-select pickers.

### Section
`.list-box-section`: flex column, align-start, gap 0. Header typography and separator spacing: **not found** in list-box-section.css (header styling is not defined in these files; check `Header` / `Separator` components).

### Motion
Press scale 250ms, checkmark draw 250ms, all removed under `prefers-reduced-motion`.

### Accessibility
ARIA listbox pattern; arrow-key navigation, typeahead, selection announcements, focus management, disabled items. Provide `aria-label` or `aria-labelledby` on a standalone ListBox. Items need `textValue` when children are not plain text.

### Mobile (375px)
Row height 36px is under the 44px touch target; use `min-h` overrides or description lines to enlarge. Press scale gives tactile feedback. Hover tint is suppressed on touch.

### Sources
- https://www.heroui.com/docs/react/components/list-box
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/list-box.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/list-box-item.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/list-box-section.css

---

## 5. TagGroup and Tag

**Purpose.** A focusable list of labels that can be selected and/or removed. Selection: `none` (default) / `single` / `multiple`. `onRemove` auto-renders a remove button.

### Anatomy
`TagGroup` (flex-col, gap 4px) > `Label` / `TagGroup.List` (flex, wrap, gap 6px) > `Tag` (`Tag.RemoveButton` optional) / `Description` / `ErrorMessage` (both padded 4px).

### Sizes (prop on TagGroup, inherited by Tags)
| Size | Padding (x / y) | Text | Height | Radius |
|---|---|---|---|---|
| `sm` | 8 / 2 px | 12/16 | 20px | 12px |
| `md` (default) | 8 / 4 px | 12/16 | 24px | 12px |
| `lg` | 10 / 6 px | 14/20 | 32px | 16px |

Tags: inline-flex, items-center, gap 4px, `font-medium` (500), `select-none`. Icons inside are 12x12 (`size-3`).

### Variants
| Variant | Background | Text | Hover (unselected, enabled) |
|---|---|---|---|
| `default` | `--default` #EBEBEC / #27272A | `--default-foreground` #18181B / #FCFCFC | `--default-hover` #E1E1E2 / #2E2E31 |
| `surface` | `--surface` #FFFFFF / #18181B | `--surface-foreground` #18181B / #FCFCFC | `--surface-hover` #EAEAEA / #27272A |

### States
| State | Styling |
|---|---|
| Selected | bg `--accent-soft` (#0485F7 at 15% light, 12% dark), text `--accent-soft-foreground` (#1E63AE / #61A8FB); hover bg `--accent-soft-hover` (20% / 16%) |
| Focus-visible | `status-focused` 2px #0485F7 ring + 2px background gap |
| Pressed | no style defined |
| Disabled | opacity 0.5, not-allowed, no pointer events |
| Transitions | colour, scale, opacity, bg 100ms `ease`; box-shadow 100ms `--ease-out` |

### Remove button
Glyph 12x12 (`size-3`), inherits text colour, with an invisible 24x24 `touch-target`. On `sm` the overlay extends about 2px past the tag; the 6px list gap absorbs it. Default icon: the 16-viewBox `CloseIcon` scaled to 12px (inferred; the tag.tsx source was not read).

### Motion
100ms colour / opacity / background fades; `transform-gpu`, origin centre; removed under reduced motion.

### Accessibility
React Aria TagGroup: grid-style keyboard navigation (arrows between tags), Delete/Backspace removes a focused tag when `onRemove` is set, selection announced, remove button has its own accessible label. Give the group a visible `Label` or an `aria-label`.

### Mobile (375px)
Wrapping list with 6px gaps; `md` 24px height is small for touch, but the remove target is enlarged to 24x24. Prefer `lg` (32px) when tags are the primary control. On a 375px viewport tags wrap onto new lines.

### Sources
- https://www.heroui.com/docs/react/components/tag-group
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/tag-group.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/tag.css

---

## 6. Tabs

**Purpose.** Switch between panels of related content. `variant`: `primary` (default, pill container with a filled sliding indicator) or `secondary` (underline). `orientation`: `horizontal` (default) / `vertical`. `align`: `center` (default) / `start` / `end` (alignment of content inside each tab).

### Anatomy
`Tabs` (flex, gap 8px) > `Tabs.ListContainer` (`relative`) > `Tabs.List` (inline-flex, padding 4px) > `Tabs.Tab` (`Tabs.Separator` optional, `Tabs.Indicator`) / `Tabs.Panel`. When the list overflows, `ListContainer` shows two 16x16 chevron buttons (`scroll-prev` / `scroll-next`) over a `ScrollShadow` (size 64).

### Layout
| Property | Horizontal | Vertical |
|---|---|---|
| Root | flex-col, gap 8px | flex-row, gap 8px |
| List | `w-max min-w-full`, row | column, gap 4px, each tab min-width 80px |
| Panel margin | top 16px | start 16px |
| Panel | width 100%, padding 8px, no outline | same |

### Primary variant (default)
| Part | Spec |
|---|---|
| List container | bg `--default` (#EBEBEC / #27272A), radius `calc(--radius x 2.5)` = **20px** |
| List padding | 4px; list height = 4 + 32 + 4 = 40px (horizontal) |
| Tab | height 32px (`h-8`), width 100%, padding 0 16px, radius 24px (full pill at 32px height), text 14/20 medium, colour `--muted` (#71717A / #9F9FA9), content centred |
| Tab selected | text `--segment-foreground` (#18181B / #FCFCFC); separators on the selected tab and the next tab fade to opacity 0 |
| Indicator | fills the selected tab (absolute, 100% x 100%), bg `--segment` (#FFFFFF light / #46464C dark), radius 24px, `--surface-shadow` (light: soft 3-layer; dark: none), z-index -1 behind the label |
| Separator | 1px wide, 50% of tab height, 25% from the top, at the tab's start edge, colour `--muted` at 25% alpha, radius 4px (`rounded-sm` = radius-sm) |
| Vertical separator | 1px tall, 90% wide, start 5%, top 0 |

### Secondary variant
| Part | Spec |
|---|---|
| List container | transparent, radius 0, **1px bottom border** `--border` (#DEDEE0 / #28282C) horizontal; **1px start border** vertical |
| List padding | 0 |
| Tab | radius 0; selected text `--foreground` |
| Indicator | radius 0, bg `--accent` (#0485F7), no shadow; horizontal: 2px tall, pinned to bottom; vertical: 2px wide, full height, start edge |
| Separators | hidden |

### Tab states
| State | Styling |
|---|---|
| Default | text `--muted` |
| Hover (not selected, not disabled, hover-capable) | opacity 0.7 |
| Pressed | not defined |
| Focus-visible | `status-focused` (2px #0485F7 ring, 2px background-colour gap) |
| Selected | text colour change plus sliding indicator |
| Disabled | opacity 0.5, not-allowed, no pointer events |
| Transitions | colour, bg 150ms `ease`; box-shadow 150ms `--ease-out`; opacity 150ms `ease` |

### Overflow chevrons
Buttons 16x16, round, transparent, colour `--foreground`, horizontal: 4px from start/end edge, vertically centred; vertical: 4px from top/bottom, horizontally centred. Visible only when ScrollShadow reports more content in that direction. Hover opacity 0.7 (150ms). Focus-visible `status-focused`. Chevron glyph size inside the button: **not found**.

### Motion
Indicator slides: 250ms, properties `translate, width, height`, easing `--ease-out-fluid` (cubic-bezier(0.32, 0.72, 0, 1)). Panel exit: absolute-positioned so it does not push content. All removed under reduced motion.

### Accessibility
React Aria Tabs: ARIA tablist/tab/tabpanel, arrow-key navigation (left/right horizontal, up/down vertical), Home/End, roving tabindex, `aria-selected`, disabled tabs skipped. `Tabs.List` requires `aria-label`. RTL: chevrons flip.

### Mobile (375px)
List is `w-max min-w-full`, so many tabs overflow and scroll horizontally with edge chevrons and scroll shadows rather than wrapping. Tab height 32px (list 40px) is below the 44px touch guideline; each tab width is 100% of the list, so labels set the minimum width. Vertical orientation uses min tab width 80px, which usually does not suit a 375px viewport; prefer horizontal.

### Sources
- https://www.heroui.com/docs/react/components/tabs
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/tabs.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/tabs/tabs.tsx

---

## 7. Accordion

**Purpose.** Vertically stacked collapsible sections; one or many open (`allowsMultipleExpanded`, default false). Variants: `default` (flat) and `surface` (card background). Built on React Aria Disclosure group.

### Anatomy
`Accordion` (width 100%, `contain: layout style`) > `Accordion.Item` (relative, no border) > `Accordion.Heading` (flex) > `Accordion.Trigger` > `Accordion.Indicator` / `Accordion.Panel` > `Accordion.Body` (`.accordion__body-inner`).

### Spec
| Part | Value |
|---|---|
| Trigger | flex, justify-between, items-center, padding 16px all round, text 14/20 medium, start-aligned; height about 52px (20 + 32) |
| Indicator | 16x16, `ms-auto`, colour `--muted`, rotates **-180deg** when expanded, 250ms transition |
| Body | text 14/20 (`.accordion__body`), inner padding 16px left/right/bottom, 0 top, colour `--muted` |
| Item separator | 1px line at the item bottom (pseudo-element), full width, radius 2px, colour `--separator` (#E4E4E7 / #212124); **none** on the last item; hidden if `hideSeparator` |
| Panel | opacity 0 collapsed, 1 expanded; height animates from 0 to `--disclosure-panel-height` |

### Surface variant
| Part | Value |
|---|---|
| Container | bg `--surface` (#FFFFFF / #18181B), radius 24px |
| Separator | inset: starts at 3%, width 94%, colour `--surface-foreground` at 6% alpha |
| Trigger hover | bg `--default` (#EBEBEC / #27272A) |
| First item trigger | top corners 24px radius |
| Last item trigger | bottom corners 24px radius, but only when that item is collapsed |

### Trigger states
| State | Styling |
|---|---|
| Hover (hover-capable, not expanded) | bg = `--foreground` at 3% alpha (default variant: color-mix foreground 3% over transparent) ; surface variant: `--default` |
| Pressed | not defined |
| Focus-visible | `status-focused` (2px #0485F7 ring + 2px background gap) |
| Expanded | no hover tint; indicator rotated -180deg |
| Disabled | opacity 0.5, not-allowed |
| Transitions | opacity 150ms `--ease-out`; box-shadow 150ms `--ease-out` |

### Motion
Panel: height 200ms `--ease-out-quad`, opacity 200ms `--ease-out`; `will-change: height, opacity` while expanded. Indicator 250ms. Removed under reduced motion.

### Accessibility
Heading plus button pattern: `Accordion.Heading` wraps `Trigger`; `aria-expanded` on the trigger, panel labelled by it. Enter/Space toggles, Tab moves between triggers (React Aria Disclosure group). Disabled via `isDisabled` on group or item.

### Mobile (375px)
Full-width stack; 52px trigger height gives a comfortable touch target. Use `surface` on a page background to read as a card. Body text 14px muted; long text wraps.

### Sources
- https://www.heroui.com/docs/react/components/accordion
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/accordion.css

---

## 8. Disclosure

**Purpose.** A single show/hide content region with a custom trigger (any button). Unstyled by default beyond animation; supply your own Button as the trigger (`slot="trigger"`).

### Anatomy
`Disclosure` (relative) > `Disclosure.Heading` (flex) > `Disclosure.Trigger` (inline-block) > `Disclosure.Indicator` / `Disclosure.Content` > `Disclosure.Body`.

### Spec
| Part | Value |
|---|---|
| Trigger | inline-block, pointer; no padding, background or typography of its own (supplied by the Button used) |
| Indicator | 16x16, `ms-auto`, colour inherits (`text-inherit`), rotates **-180deg** expanded, 250ms |
| Content | opacity 0 / 1; height from 0 to `--disclosure-panel-height`; overflow clipped |
| Body | padding 8px |

### States
| State | Styling |
|---|---|
| Focus-visible (trigger) | `status-focused` (2px #0485F7 ring + 2px background gap) |
| Disabled | opacity 0.5, not-allowed |
| Expanded | indicator rotation, content visible (`aria-hidden="false"`) |
| Hover / pressed | none in this CSS (owned by the Button) |

### Motion
Content: height 200ms `--ease-out-quad`, opacity 200ms `--ease-out`. Indicator 250ms. Removed under reduced motion.

### Accessibility
React Aria Disclosure: trigger is a button with `aria-expanded` and `aria-controls`; content is a region labelled by the trigger. Space/Enter toggle.

### Mobile (375px)
Inherits whatever Button size is used (Button default height not captured here). Content spans the container width.

### Sources
- https://www.heroui.com/docs/react/components/disclosure
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/disclosure.css

---

## 9. DisclosureGroup

**Purpose.** Wraps several `Disclosure`s so that at most one (default) or many (`allowsMultipleExpanded`) are expanded; controlled via `expandedKeys`.

### Anatomy
`DisclosureGroup` > `Disclosure id="..."` (Heading > Trigger > Indicator, Content).

### Spec
Only `.disclosure-group { width: 100%; contain: layout style; }`. No spacing, gap, border or background is defined (gaps between disclosures: **not found**; style in the host). Child Disclosure specs apply (section 8). `isDisabled` disables all children.

### Accessibility, motion, mobile
As Disclosure. On 375px the group fills the container width.

### Sources
- https://www.heroui.com/docs/react/components/disclosure-group
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/disclosure-group.css

---

## 10. Breadcrumbs

**Purpose.** Show the page hierarchy as a trail of links; the last item (no `href`) is the current page.

### Anatomy
`Breadcrumbs` (flex row, items-center, gap 6px) > `Breadcrumbs.Item` (`.breadcrumbs__item`: flex, no shrink, gap 4px, centred) containing the link (`.breadcrumbs__link`) and a separator (`.breadcrumbs__separator`). Default separator: 16-viewBox `IconChevronRight` rendered at 12x12.

### Spec
| Part | Value |
|---|---|
| Link | 14/20, font-weight 500, colour `--muted` (#71717A / #9F9FA9), no underline, opacity 1 |
| Link hover | underline (colour unchanged) |
| Current link (`data-current`) | colour `--link` (= foreground, #18181B / #FCFCFC) |
| Separator | 12x12, colour `--muted`, rotated 180deg in RTL |
| Sizes / variants | none |

### States
Hover underline only (also keyed to `data-hovered`). Focus-visible, pressed, disabled: **not found** in breadcrumbs.css (`isDisabled` exists as a prop; its styling is not defined here).

### Motion
None.

### Accessibility
React Aria Breadcrumbs: `nav` landmark, ordered list, `aria-current="page"` on the last item, keyboard navigable links.

### Mobile (375px)
`shrink-0` items do not wrap or truncate; long trails overflow the container (no overflow handling in CSS). Consider showing only the last two levels or truncating on narrow screens in the host app. Link target height is 20px (text line), below touch guidelines.

### Sources
- https://www.heroui.com/docs/react/components/breadcrumbs
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/breadcrumbs.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/breadcrumbs/breadcrumbs.tsx

---

## 11. Pagination

**Purpose.** Page navigation with previous/next, numbered page buttons, ellipsis and an optional results summary.

### Anatomy
`Pagination` (nav) > `Pagination.Summary` / `Pagination.Content` (list) > `Pagination.Item` > `Pagination.Link` / `Pagination.Previous` + `Pagination.PreviousIcon` / `Pagination.Next` + `Pagination.NextIcon` / `Pagination.Ellipsis`.

### Layout
| Part | Value |
|---|---|
| Root | flex, width 100%, **column** (centred) below 640px, **row** with `justify-between` from `sm` (640px); gap 16px |
| Summary | flex, items-center, gap 8px, text 14/20 `--muted`; `self-start` on mobile, centred vertically from `sm` |
| Content | flex, items-center, gap 4px; `self-start` on mobile, centred from `sm` |
| Item | inline-flex wrapper |

### Sizes (class `.pagination--sm | --md | --lg`; `md` default)
Size values change at the `md` breakpoint (768px): the larger size is used below 768px (touch), the smaller from 768px.

| Size | Link / ellipsis box (<768px / >=768px) | Text | Nav (Prev/Next) padding | Pressed scale | Summary text |
|---|---|---|---|---|---|
| `sm` | 32 / 28 px | 12/16 | 8px | 0.98 | 12/16 |
| `md` | 36 / 32 px | 14/20 | 10px | 0.97 | 14/20 |
| `lg` | 40 / 36 px | 16/24 | 12px | 0.96 | 16/24 |

### Link (page number)
Square `size`, radius 24px (full pill/circle), font-weight 500, no-wrap, `inline-flex` centred. Nav buttons: auto width, padding as above, gap 6px, icon + text; chevron icons 16x16 (`IconChevronLeft` / `IconChevronRight`), flipped 180deg in RTL.

| State | Styling |
|---|---|
| Default | bg transparent, text `--default-foreground` (#18181B / #FCFCFC) |
| Hover (hover-capable) | bg `--default-hover` (#E1E1E2 / #2E2E31) |
| Pressed | bg `--default-hover`, `scale(0.97)` (size-specific, above) |
| Active page (`data-active` / `aria-current="page"`) | bg `--default` (#EBEBEC / #27272A); hover and pressed bg `--default-hover` |
| Focus-visible | `status-focused` (2px #0485F7 ring + 2px background gap) |
| Disabled | opacity 0.5, not-allowed, no pointer events |
| Transitions | transform 250ms `ease`; bg 100ms `--ease-out`; box-shadow 100ms `--ease-out` |

### Ellipsis
Same box as a link, `text-sm` (size-specific), colour `--muted`, `select-none`, `aria-hidden`.

### Accessibility
`nav` with `aria-label="pagination"`; active page `aria-current="page"`; Tab through every control; built on React Aria Button (`onPress`, not `onClick`); ellipsis hidden from AT; disabled communicated via `isDisabled`.

### Mobile (375px)
Root stacks vertically, summary above, controls below, both left-aligned (`self-start`). Link boxes are 36px at 375px (`md`), 32px from 768px. With 7+ items at 36px plus 4px gaps (about 40px each) the row reaches 280px, which fits 375px; more items than that overflow (no wrap defined), so collapse with ellipsis.

### Sources
- https://www.heroui.com/docs/react/components/pagination
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/pagination.css
- https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/pagination/pagination.tsx

---

## 12. Shared source URLs
- Tokens: https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/themes/shared/theme.css and https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/themes/default/variables.css
- Utilities (focus ring, disabled, touch-target): https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/utilities/index.css
- Popover: https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/popover.css
- Label / Description: https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/label.css and `description.css`
- Icons (16x16 viewBox): https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/react/src/components/icons.tsx

## 13. Values not found
- Popover offset (gap between trigger and panel) for Select, ComboBox, Autocomplete.
- Select and ComboBox popover max-height (not in CSS; React Aria computes it).
- Default (uncontrolled) widths of Select, ComboBox, Autocomplete (doc examples use 256px only).
- `ListBox.Section` header typography and spacing.
- Autocomplete empty-state padding.
- Tabs overflow chevron glyph size; rendered tab widths (CSS gives `w-full`).
- Breadcrumbs focus-visible, pressed and disabled styling.
- DisclosureGroup spacing between disclosures; Disclosure trigger visuals (supplied by Button).
- Font family and font files.
- `--ease-out` is not defined in HeroUI files (Tailwind built-in assumed).
- Tag remove-button default icon (inferred, tag.tsx not read).
