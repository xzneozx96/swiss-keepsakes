# HeroUI v3 reference 04: Date, data display and colour components

Scope: Calendar, RangeCalendar, DateField, DatePicker, DateRangePicker, TimeField, Table, Badge, Chip, Avatar, AvatarGroup, ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, ColorSwatchPicker.

Version: docs show HeroUI v3.2.6. CSS read verbatim from branch `v3` on 2026-10-13. Where the docs prose and the CSS disagree, this file follows the CSS (see "Doc vs CSS discrepancies" at the end).

## 0. Conventions and shared tokens

- Spacing: 1 unit = 4px (`--spacing: 0.25rem`). text-xs 12/16, text-sm 14/20, text-base 16/24.
- Radius at default `--radius: 8px`: xs 2, sm 4, md 6, lg 8, xl 12, 2xl 16, 3xl 24, 4xl 32. `rounded-field` = `--radius-field` = 1.5 x radius = 12px.
- Popover/overlay/table-root radius: `min(32px, calc(var(--radius) * 2.5))` = 20px.
- Disabled: `--disabled-opacity: 0.5`, cursor `not-allowed`, pointer-events none (utility `status-disabled`).
- Focus ring (`status-focused`): 2px ring in `--focus` (= `--accent`) preceded by a 2px gap in `--background` (`--ring-offset-width: 2px`). So 2px gap + 2px ring, 4px total outside the element.
- Field focus ring (`status-focused-field`): 2px ring in `--focus`, no gap.
- Invalid field (`status-invalid-field`): 1px solid outline `--danger`; when focused, 2px ring `--danger`, no gap.
- Default transition easing token `--ease-smooth` = `ease`. `--ease-out` is used throughout the CSS but is NOT defined in theme.css or variables.css (not found). It resolves to the Tailwind default `cubic-bezier(0, 0, 0.2, 1)`; treat that as an assumption.
- All transitions carry `motion-reduce:transition-none`.
- Hover rules are wrapped in `@media (hover: hover)` so touch devices never show hover.

### Token values, resolved

oklch values are verbatim from `themes/default/variables.css`. Hex values are my conversion (oklch to sRGB, `color-mix(in oklab)` evaluated, rounded). Treat hex as accurate to about 1 step per channel.

| Token | Light oklch | Light hex | Dark oklch | Dark hex |
|---|---|---|---|---|
| `--background` | oklch(0.9702 0 0) | #F5F5F5 | oklch(12% 0.005 285.823) | #060607 |
| `--foreground` | `--eclipse` oklch(0.2103 0.0059 285.89) | #18181B | `--snow` oklch(0.9911 0 0) | #FCFCFC |
| `--surface` | `--white` | #FFFFFF | oklch(0.2103 0.0059 285.89) | #18181B |
| `--surface-secondary` | oklch(0.9524 0.0013 286.37) | #EFEFF0 | oklch(0.257 0.0037 286.14) | #232325 |
| `--surface-tertiary` | oklch(0.9373 0.0013 286.37) | #EAEAEB | oklch(0.2721 0.0024 247.91) | #262728 |
| `--overlay` | `--white` | #FFFFFF | oklch(0.2103 0.0059 285.89) | #18181B |
| `--muted` | oklch(0.5517 0.0138 285.94) | #71717A | oklch(70.5% 0.015 286.067) | #9F9FA9 |
| `--default` | oklch(94% 0.001 286.375) | #EBEBEC | oklch(27.4% 0.006 286.033) | #27272A |
| `--default-foreground` | eclipse | #18181B | snow | #FCFCFC |
| `--border` | oklch(90% 0.004 286.32) | #DEDEE0 | oklch(28% 0.006 286.033) | #28282C |
| `--separator` | oklch(92% 0.004 286.32) | #E4E4E7 | oklch(25% 0.006 286.033) | #212124 |
| `--accent` / `--focus` | oklch(0.6204 0.195 253.83) | #0485F7 | same | #0485F7 |
| `--accent-foreground` | snow | #FCFCFC | snow | #FCFCFC |
| `--success` | oklch(0.7329 0.1935 150.81) | #17C964 | same | #17C964 |
| `--success-foreground` | eclipse | #18181B | eclipse | #18181B |
| `--warning` | oklch(0.7819 0.1585 72.33) | #F5A524 | oklch(0.8203 0.1388 76.34) | #F7B750 |
| `--warning-foreground` | eclipse | #18181B | eclipse | #18181B |
| `--danger` | oklch(0.6532 0.2328 25.74) | #FF383C | oklch(0.594 0.1967 24.63) | #DB3B3E |
| `--danger-foreground` | snow | #FCFCFC | snow | #FCFCFC |
| `--field-background` | `--white` | #FFFFFF | oklch(0.2103 0.0059 285.89) | #18181B |
| `--field-placeholder` | `--muted` | #71717A | `--muted` | #9F9FA9 |

Derived tokens (formulas verbatim, results in my conversion). The same formulas apply in light and dark unless shown otherwise.

| Token | Formula | Light | Dark |
|---|---|---|---|
| `--default-hover` | mix(default 96%, default-foreground 4%) | #E1E1E2 | #2E2E31 |
| `--accent-hover` | mix(accent 90%, accent-foreground 10%) | #3592F9 | #3592F9 |
| `--success-hover` | mix(success 90%, success-foreground 10%) | #21B55D | #21B55D |
| `--warning-hover` | mix(warning 90%, warning-foreground 10%) | #DC952A | #DEA54C |
| `--danger-hover` | mix(danger 90%, danger-foreground 10%) | #FF5551 | #E15451 |
| `--surface-hover` | mix(surface 92%, surface-foreground 8%) | #EAEAEA | #27272A |
| `--separator-secondary` | mix(surface 85%, surface-foreground 15%) | #D8D8D8 | #343437 |
| `--separator-tertiary` | mix(surface 81%, surface-foreground 19%) | #CDCDCE | #3C3C3F |
| `--border-secondary` | mix(surface 78%, surface-foreground 22%) | #C6C6C7 | #434345 |
| `--border-tertiary` | mix(surface 66%, surface-foreground 34%) | #A8A8A9 | #5C5C5F |
| `--field-hover` | mix(field-background 90%, field-foreground 2%); percentages sum to 92%, so the result is 92% alpha | #F9F9F9 at 92% alpha | #1C1C1F at 92% alpha |

### How the soft colours are computed

Soft = a translucent tint of the status colour, used as a background; soft-foreground = the status colour pulled toward the foreground colour so text reads on the tint. `*-soft-hover` is the same tint with +5 points alpha (light) or +4 points (dark). All mixes are `color-mix(in oklab, ...)`. When mix percentages sum to more than 100 they are normalised (for example 70 + 40 = 110 gives 63.6% / 36.4%).

Light theme:

| Token | Formula | Result |
|---|---|---|
| `--default-soft` | default 50%, transparent | #EBEBEC at 50% alpha |
| `--default-soft-foreground` | default-foreground | #18181B |
| `--default-soft-hover` | default 60%, transparent | #EBEBEC at 60% alpha |
| `--accent-soft` | accent 15%, transparent | #0485F7 at 15% alpha (about #DFEEFF on white) |
| `--accent-soft-foreground` | accent 70%, foreground 30% | #1E63AE |
| `--accent-soft-hover` | accent 20%, transparent | #0485F7 at 20% (about #D5E8FF on white) |
| `--success-soft` | success 15%, transparent | #17C964 at 15% (about #E5F8E8 on white) |
| `--success-soft-foreground` | success 80%, foreground 60% | #2B7745 |
| `--success-soft-hover` | success 20%, transparent | #17C964 at 20% |
| `--warning-soft` | warning 15%, transparent | #F5A524 at 15% (about #FFF2E3 on white) |
| `--warning-soft-foreground` | warning 80%, foreground 70% | #855F2E |
| `--warning-soft-hover` | warning 20%, transparent | #F5A524 at 20% |
| `--danger-soft` | danger 15%, transparent | #FF383C at 15% (about #FFE5E2 on white) |
| `--danger-soft-foreground` | danger 70%, foreground 40% | #A43433 |
| `--danger-soft-hover` | danger 20%, transparent | #FF383C at 20% |

Dark theme (different percentages):

| Token | Formula | Result |
|---|---|---|
| `--default-soft` / `-hover` | default 50% / 60%, transparent | #27272A at 50% / 60% |
| `--default-soft-foreground` | default-foreground | #FCFCFC |
| `--accent-soft` | accent 12%, transparent | #0485F7 at 12% (about #1C2432 on surface) |
| `--accent-soft-foreground` | accent 80%, foreground 30% | #61A8FB |
| `--accent-soft-hover` | accent 16%, transparent | #0485F7 at 16% (about #1D2839 on surface) |
| `--success-soft` / `-hover` | success 12% / 16%, transparent | #17C964 at 12% / 16% (about #1F2A24 on surface) |
| `--success-soft-foreground` | success 80%, foreground 30% | #74D88F |
| `--warning-soft` / `-hover` | warning 12% / 16%, transparent | #F7B750 at 12% / 16% (about #2E2923 on surface) |
| `--warning-soft-foreground` | warning 80%, foreground 30% | #F9CB86 |
| `--danger-soft` / `-hover` | danger 15% / 20%, transparent | #DB3B3E at 15% / 20% (about #332021 on surface) |
| `--danger-soft-foreground` | danger 80%, foreground 30% | #EB7872 |

Optional vibrant palette (`[data-vibrant-palette="true"]`): all four soft-foregrounds become `mix(status 92%, foreground 8%)`. Not default.

For a design tool: build the soft fills as the status colour with the stated alpha (not a flattened colour) so they work on any surface. The "on white / on surface" hex values are approximate flattening for reference only (browsers composite in sRGB, so they can differ by a few steps).

Shadows:

| Token | Light | Dark |
|---|---|---|
| `--surface-shadow` | 0 2 4 0 rgba(0,0,0,.04), 0 1 2 0 rgba(0,0,0,.06), 0 0 1 0 rgba(0,0,0,.06) | none (0 0 0 0 transparent inset) |
| `--field-shadow` | same three layers as surface | none |
| `--overlay-shadow` | 0 2 8 0 rgba(0,0,0,.06), 0 -6 12 0 rgba(0,0,0,.03), 0 14 28 0 rgba(0,0,0,.08) | 0 0 1 0 rgba(255,255,255,.3) inset |

---

## 1. Calendar

Source: `components/calendar.css`, `components/calendar-year-picker.css`. Docs: https://www.heroui.com/docs/react/components/calendar

**Purpose.** Single-month (or multi-month, week, day-strip) date grid for choosing one date or several (`selectionMode="multiple"`). Built on React Aria Calendar.

**Anatomy.**

| Part | Class | Notes |
|---|---|---|
| Root | `.calendar` | 252 x auto, `container-type: inline-size` |
| Header | `.calendar__header` | flex row, space-between |
| Heading | `.calendar__heading` | month + year, or `Calendar.YearPickerTrigger` |
| Year picker trigger | `.calendar-year-picker__trigger` + `__trigger-heading` + `__trigger-indicator` | optional, replaces heading |
| Nav buttons | `.calendar__nav-button`, icon `.calendar__nav-button-icon` | previous / next |
| Grid | `.calendar__grid` | 7 columns |
| Grid header | `.calendar__grid-header` > `.calendar__header-cell` | weekday labels |
| Grid body | `.calendar__grid-body` | rows of day cells |
| Cell | `.calendar__cell` | the day circle itself (one element) |
| Cell indicator | `.calendar__cell-indicator` | optional 3px dot |
| Year grid (overlay) | `.calendar-year-picker__year-grid` > `__year-cell` | 3 columns |

**Variants / sizes / colours.** No size or colour props. Layout modes: month (default), `visibleDuration={{weeks:n}}` (class `.calendar--week-view`), `visibleDuration={{days:n}}` (`.calendar--day-view`), multiple months via `offset` on Grid/Heading. Fixed-width: `w-63 max-w-63` = 252px. Single accent colour only.

**Dimensions (px).**

| Element | Value |
|---|---|
| Root width | 252 (max 252) |
| Column width | 252 / 7 = 36 |
| Day cell | 36 x 36 (`aspect-square size-full`), radius 24 (rounded-3xl) so it renders as a circle |
| Day text | 14/20, weight 500, centred |
| Header row | `flex items-center justify-between px-0.5 pb-4`: 2px side padding, 16px bottom padding; row height 24 (nav button height) |
| Heading | `flex-1 text-sm font-medium` 14/20 weight 500, left aligned |
| Nav button | 24 x 24, radius 16 (circle), icon 16 x 16, icon colour `--accent-soft-foreground` |
| Weekday cell | `pb-2` 8px bottom padding, 12/16 weight 500, colour `--muted`, centred; height 24 |
| Gap header to first week | `mt-1` = 4px on first body row |
| Row gap / column gap | 0 (cells touch; circles are the visible shape) |
| Cell indicator | 3 x 3, radius 2, 4px from cell bottom, horizontally centred, colour `--muted` (`--accent-foreground` when cell selected) |
| Total height, 6-week month | 24 header + 16 gap + 24 weekday + 4 + 6 x 36 = 284 |
| Total height, 5-week month | 248 |

**Cell states (`.calendar__cell`).**

| State | Selector | Styling |
|---|---|---|
| Default | | transparent bg, text `--foreground` (inherited), 14/20 weight 500 |
| Hover | `:hover` (hover-capable devices), not selected | bg `--default` |
| Pressed | `:active` / `data-pressed` | bg `--default`, `transform: scale(.95)`; if selected, bg `--accent-hover` |
| Focus visible | `:focus-visible` | focus ring: 2px `--focus` ring with 2px `--background` gap |
| Today | `data-today="true"` | bg `--accent-soft`, text `--accent-soft-foreground`; hover (not selected) bg `--accent-soft-hover` |
| Selected | `data-selected="true"` | bg `--accent`, text `--accent-foreground`. Wins over Today (declared later) |
| Outside month | `data-outside-month="true"` | text `--muted`, opacity .5 |
| Selected + outside month | | bg `--default` (text stays muted at .5 opacity) |
| Unavailable | `data-unavailable="true"` | opacity .5, cursor not-allowed, no pointer events. No strikethrough |
| Disabled | `data-disabled` / `:disabled`, not outside-month | opacity .5, not-allowed, no pointer events, `text-decoration: line-through` |
| Read-only | grid `aria-readonly="true"` | cells `pointer-events: none` (no visual change) |
| Invalid | prop `isInvalid` | no dedicated CSS found in calendar.css (not found) |

Nav button states: hover bg `--default` (icon stays `--accent-soft-foreground`); pressed `scale(.95)`; focus ring as above; disabled opacity .5. While the year picker is open the nav buttons fade to opacity 0 and ignore pointer events.

**Year picker (calendar-year-picker.css).**

| Element | Value |
|---|---|
| Trigger | `flex flex-1 items-center justify-start gap-1 rounded-lg` (8px radius), focus ring on focus-visible |
| Trigger heading | 14/20 weight 500, colour switches to `--accent-soft-foreground` when open |
| Trigger indicator | 12px text-size chevron, colour `--accent-soft-foreground`; rotates 90deg when open (150ms) |
| Year grid | absolutely positioned over the day grid; `grid-template-columns: repeat(3, 1fr)`, `gap-1` 4px, `p-1` 4px, scrollable (`overflow-y-auto`), thin themed scrollbar. Column width = (252 - 8 - 8) / 3, about 78.7px |
| Year cell | height 32, `px-2.5` 10px, radius 24, 14/20 weight 500 |
| Year cell hover (not selected) | bg `--default`, text `--default-foreground` |
| Year cell selected | bg `--accent`, text `--accent-foreground`; hover bg `--accent-hover` |
| Year cell focus | focus ring |
| Default year window | `visibleYears` = min-to-max span or 20 |

**Layout variants.**
- Week view and day view: cells become `aspect-square size-auto w-full place-self-center`. Day view splits header and body into two separate 7-column grids so fewer than 7 weekday headers align left.
- Multiple months: stack several `Calendar.Grid offset={n}` side by side; each grid is its own 252px block (root width limit applies per root, so set a wider wrapper).

**Motion.**

| Element | Property | Duration / easing |
|---|---|---|
| Cell | transform (press scale) | 250ms ease-out |
| Cell | box-shadow (focus ring) | 100ms ease-out |
| Nav button | transform 250ms, background-color 100ms, box-shadow 100ms, opacity 150ms | ease-out |
| Day grid to year picker | day grid opacity 150ms, visibility delayed 150ms; year grid fades in 200ms with 50ms delay (staggered to avoid ghosting) | ease-out |
| Year trigger indicator | transform | 150ms ease-out |
| Year cell | colour, scale, opacity, bg 100ms `ease`; shadow 100ms ease-out | |

**Accessibility.** React Aria: grid role, arrow-key navigation, PageUp/PageDown by month (visible duration), Shift+PageUp/Down by year, Home/End, `aria-label` required on root (docs examples use "Event date"). Unavailable and disabled dates are announced by React Aria. Focus ring is visible on keyboard focus only. Visible `data-focused` hides the CSS ring so React Aria's focus management is used. RTL: nav icons flip (`rtl:rotate-180`).

**Mobile (375px).** Root is a fixed 252px (fits, centre it with 61.5px each side or place in a 12px-padded popover, 276px total). Day cells are 36px, below the 44px touch recommendation; nav buttons are 24px (below WCAG 2.5.8 minimum only by size; no touch-target extension in the CSS). Consider a design-side wrapper with larger hit zones, but the library does not provide one. Hover styles are suppressed on touch; pressed state (scale .95 + `--default` bg) is the touch feedback.

---

## 2. RangeCalendar

Source: `components/range-calendar.css` (+ year picker css above). Docs: https://www.heroui.com/docs/react/components/range-calendar

**Purpose.** Calendar for a contiguous start-end range (`RangeValue<DateValue>`); supports anchor-based unavailable dates and `allowsNonContiguousRanges`.

**Anatomy.** Same as Calendar, except a day cell is two nested elements: `.range-calendar__cell` (wrapper that paints the range band) containing `.range-calendar__cell-button` (the 36px circle). Parts: Header, Heading, NavButton, Grid, GridHeader, HeaderCell, GridBody, Cell, CellIndicator, YearPickerTrigger/Heading/Indicator/Grid/GridBody/Cell.

**Dimensions (px).** Identical to Calendar for root (252), header (24 + 16 gap), nav button (24, radius 12 here, still a circle; icon 16), weekday cell (12/16 muted, pb 8), first-row `mt-1` 4, and cell indicator. Differences:

| Element | Value |
|---|---|
| Cell wrapper | `mx-0 my-[2px]`, `p-0`, radius 24; width 36 |
| Cell button | 36 x 36, radius 24, 14/20 weight 500, text `--foreground` |
| Row pitch | 36 + 2 + 2 = 40 (4px vertical gap between week bands) |
| Total height, 6-week month | 24 + 16 + 24 + 4 + 6 x 40 = 308 (the first row's `mt-1` adds to 4 on top of its own 2px margin) |

**Cell states.**

| State | Selector | Styling |
|---|---|---|
| Default | | button transparent, text `--foreground` |
| Hover (not selected) | `:hover` | button bg `--default` |
| Pressed | `:active` | button `scale(.9)` (200ms); start/end caps bg `--accent-hover` |
| Focus visible | | wrapper z-index 2; button shows the focus ring (2px ring + 2px gap) |
| Today | `data-today` | button bg `--accent-soft`, text `--accent-soft-foreground`; hover (not selected) button bg `--accent-soft-hover` |
| Range middle | `data-selected="true"`, not outside-month | wrapper bg `--accent-soft`, radius 0, full 36px wide band, 36px tall (2px margin above and below); button text stays `--foreground`. (`data-selection-in-range` is documented as a state but the CSS styles the middle through `data-selected`) |
| Row start of a band (first column, or after a disabled cell) | selected, `td:first-child` | start-side corners radius 8 (rounded-ss/es-lg); if also range start, 24 |
| Row end of a band (last column, or before a disabled cell) | selected, `td:last-child` | end-side corners radius 8; if also range end, 24 |
| Range start cap | `data-selection-start="true"`, not outside-month | z-index 2; button bg `--accent`, text `--accent-foreground`; wrapper start-side corners radius 24 (end side square, band continues) |
| Range end cap | `data-selection-end="true"`, not outside-month | same button styling; wrapper end-side corners radius 24 |
| Start = end (one-day range) | both attributes | both caps apply; the commented-out `rounded-full` rule is not active |
| Outside month | `data-outside-month` | text `--muted`, opacity .5 |
| Selected outside month (not a cap) | | wrapper bg `--default` at 20% alpha (`bg-default/20`) |
| Unavailable | `data-unavailable` | opacity .5, not-allowed, no pointer events |
| Disabled | `data-disabled`, not outside-month | opacity .5, no pointer events, line-through |
| Invalid (`isInvalid`) | | no dedicated CSS found (not found) |
| Read-only | grid `aria-readonly` | cells non-interactive |

**Band geometry for the designer.** Draw each week's band as a continuous strip of `--accent-soft` 36px tall, running cell-to-cell with no gaps; round the strip's left end to 24 at range start, 8 at the left edge of a week (when range continues from the previous row), and mirror on the right. Start and end days are solid `--accent` 36px circles on top of the band.

**Year picker, motion, a11y, mobile.** Same as Calendar, except: cell button transition is `scale 200ms ease-out`; wrapper transitions box-shadow and border-colour 100ms ease-out. Keyboard: Enter starts the range, a second Enter ends it; Escape cancels an in-progress selection. Mobile: width 252px, row pitch 40px (36px touch target; slightly more forgiving vertically than Calendar). In a DateRangePicker popover keep it at 252 + 24 = 276px wide.

---

## 3. DateField

Source: `components/date-field.css`, `components/date-input-group.css`. Docs: https://www.heroui.com/docs/react/components/date-field

**Purpose.** Segmented keyboard-editable date input (month / day / year segments) with label, description and error.

**Anatomy.**

| Part | Class / slot | Notes |
|---|---|---|
| Root | `.date-field` | `flex flex-col gap-1` (4px between label, group, description/error) |
| Label | `Label` (`data-slot="label"`) | `w-fit` |
| Group | `.date-input-group` (+ `--primary` / `--secondary`, `--full-width`) | the visible field box |
| Prefix | `.date-input-group__prefix` | optional icon |
| Input | `.date-input-group__input` (`DateField.Input`) | holds the segments |
| Input container | `.date-input-group__input-container` | scrollable wrapper for start/end inputs |
| Segment | `.date-input-group__segment` | one per month/day/year/literal |
| Suffix | `.date-input-group__suffix` | optional icon/button |
| Description | `Description` | hidden while the field is invalid |
| FieldError | `FieldError` | shown when invalid |

**Variants.** `primary` (default; with `--field-shadow`) and `secondary` (no shadow, bg `--default`, for use on Surface). `fullWidth` makes the root `w-full`.

**Sizes.** No size prop. Fixed group height 36.

**Group dimensions and styling (`.date-input-group`).**

| Property | Value |
|---|---|
| Height | 36 (`h-9`), inline-flex, items centre, `overflow-hidden` |
| Radius | 12 (`rounded-field`) |
| Background | `--field-background` (light #FFFFFF, dark #18181B) |
| Text | 14/20 (`text-sm`), colour `--field-foreground` (light #18181B, dark #FCFCFC) |
| Border | width `--field-border-width` = 0px, colour `--field-border` = transparent (no visible border by default) |
| Shadow | `--field-shadow` (light: 3-layer soft shadow; dark: none) |
| Input padding | `px-3 py-2` = 12 / 8; input text-base (16px) below 640px viewport, `sm:text-sm` (14px) at 640px and up |
| Segment gap | 1px (`gap-px`) |
| With prefix | prefix `ms-3` 12px start margin, input start padding drops to `ps-2` 8px |
| With suffix | suffix `me-3` 12px end margin, input end padding `pe-2` 8px |
| Prefix / suffix colour | `--field-placeholder` (`--muted`), `pointer-events: none` (re-enabled inside DatePicker / DateRangePicker so the trigger works) |

**Group states.**

| State | Styling |
|---|---|
| Hover (not focus-within) | bg `--field-hover` (light #F9F9F9 at 92% alpha, dark #1C1C1F at 92% alpha), border-colour `--field-border-hover` (border width is 0 so no visible change) |
| Focus within | 2px `--focus` ring, no gap. Suppressed when the focus is on a DatePicker/DateRangePicker trigger (the trigger draws its own ring) |
| Invalid | 1px solid `--danger` outline; bg `--field-focus` (= field background); on focus a 2px `--danger` ring. Border colour references `--color-field-border-invalid`, which is **not defined** in theme.css/variables.css (not found) |
| Disabled | opacity .5, not-allowed, no pointer events |
| Secondary variant | bg `--default` (#EBEBEC / #27272A), hover `--default-hover`, focus `--default`; no shadow; invalid same as primary but bg `--default` |

**Segment states (`.date-input-group__segment`).** Segment: inline-block, `px-0.5` 2px, radius 6 (`rounded-md`), `text-end`, no wrap.

| State | Styling |
|---|---|
| Default | text inherits `--field-foreground` |
| Literal (the "/" separators) | padding 0, text `--muted` |
| Placeholder (`data-placeholder`) | text `--field-placeholder` (`--muted`) |
| Focused segment | bg `--accent-soft`, text `--accent-soft-foreground` |
| Disabled segment | opacity .5 |
| Invalid segment | text `--danger`; focused: bg `--danger-soft`, text `--danger-soft-foreground` |

**Motion.** Group: background-color 150ms `ease`, border-color 150ms `ease`, box-shadow 150ms ease-out.

**Accessibility.** Segmented spinbuttons: Up/Down changes value, Left/Right moves segment, Backspace clears, type digits to fill. Label via `Label` or `aria-label`. `validationBehavior` defaults to `native`. Description is hidden (`display: none`) when `aria-invalid` so the error replaces it. `isRequired` sets `data-required`.

**Mobile.** Input text is 16px under 640px to avoid iOS zoom-on-focus. 36px height is under 44px; add vertical room in the layout if tap accuracy matters. Segments are narrow tap targets (about 2px horizontal padding), so mobile users usually use DatePicker's calendar instead.

---

## 4. DatePicker

Source: `components/date-picker.css` (+ date-input-group, calendar). Docs: https://www.heroui.com/docs/react/components/date-picker

**Purpose.** DateField plus a calendar popover opened from a trigger icon.

**Anatomy.** `DatePicker` (`.date-picker`: `inline-flex flex-col gap-1`) > `Label` + `DateField.Group` (> `DateField.Input` + `DateField.Suffix` > `DatePicker.Trigger` (`.date-picker__trigger`) > `DatePicker.TriggerIndicator` (`.date-picker__trigger-indicator`)) + `DatePicker.Popover` (`.date-picker__popover`) > `Calendar`.

**Dimensions.**

| Element | Value |
|---|---|
| Field group | as DateField: 36px tall, radius 12 |
| Trigger | `inline-flex w-full items-center rounded-field p-1 text-sm` = 4px padding, radius 12 |
| Trigger indicator | 16 x 16 (`size-4`), colour `--field-placeholder` (`--muted`); default glyph is IconCalendar, replaceable |
| Trigger overall | 16 + 4 + 4 = 24 square hit area, sitting in the suffix with 12px end margin |
| Popover | width fit-content, bg `--overlay` (light #FFFFFF, dark #18181B), padding 12 (`p-3`), radius 20 (`min(32px, 2.5 x radius)`), shadow `--overlay-shadow`, scrolls vertically if needed with hidden scrollbar |
| Popover content | a Calendar: 252px wide, so popover is 276px wide |
| Popover calendar nav icons | `rotate-0` override (RTL flip disabled inside popover) |

**States.**

| State | Styling |
|---|---|
| Trigger focus-visible | focus ring (2px `--focus` + 2px `--background` gap) |
| Trigger disabled | opacity .5, not-allowed, no pointer events |
| Trigger open | `data-open="true"` available (no dedicated style in CSS) |
| Trigger hover | no dedicated CSS (docs list hover as available state but none is styled) |
| Field states | see DateField (invalid, focus-within, disabled, variants) |

**Motion.** Trigger: box-shadow 150ms ease-out. Popover enter (`data-entering`): fade 0 to 1 + scale 95% to 100% over 150ms `ease`, plus a 4px slide from the side opposite the placement (placement bottom: slides down from -4px; top: up from +4px; left/right: 4px). Transform origin at the trigger anchor point. Exit: 100ms `ease`, scale 100% to 95%, fade out, pointer events disabled. Reduced motion disables transitions.

**Accessibility.** Trigger button labels the popover; Calendar needs its own `aria-label` ("Choose date" in docs). Escape closes; focus returns to trigger. Popover is non-modal dialog semantics through React Aria.

**Mobile (375px).** Popover 276px wide fits, anchored under the field. Field is `inline-flex`; set full width in the layout (`fullWidth` on the group) for a 375 screen minus gutters.

---

## 5. DateRangePicker

Source: `components/date-range-picker.css`. Docs: https://www.heroui.com/docs/react/components/date-range-picker

**Purpose.** Start/end date inputs plus a RangeCalendar popover.

**Anatomy.** `DateRangePicker` (`.date-range-picker`, `inline-flex flex-col gap-1`) > `Label` + `DateField.Group` > `DateField.InputContainer` (`.date-input-group__input-container`) > [`DateField.Input slot="start"`, `DateRangePicker.RangeSeparator` (`.date-range-picker__range-separator`), `DateField.Input slot="end"`] + `DateField.Suffix` > `DateRangePicker.Trigger` (`.date-range-picker__trigger`) > `TriggerIndicator`; then `DateRangePicker.Popover` (`.date-range-picker__popover`) > `RangeCalendar`.

**Dimensions and styling.** Identical to DatePicker, with these additions:

| Element | Value |
|---|---|
| Range separator | `px-1` (4px each side), text `--field-placeholder`, not selectable; glyph is the library's en dash/separator (glyph not specified in CSS) |
| Start input | `flex-none`, end padding 0 (`pe-0`) |
| End input | start padding 0 (`ps-0`) |
| Input container | `flex flex-1`, `width: fit-content`, `overflow-x: auto`, scrollbar hidden, items centred |
| Popover | same as DatePicker: 12px padding, radius 20, overlay shadow, 276px wide with a 252px RangeCalendar |

States, motion and accessibility: same as DatePicker and DateField; the calendar inside follows RangeCalendar states. Mobile: the two inputs plus separator need about 250-280px at 14-16px text (exact width depends on locale format; not specified); use `fullWidth` at 375.

---

## 6. TimeField

Source: `components/time-field.css` (root only; the group reuses `date-input-group.css`, because `components/index.css` imports only `time-field.css` and `date-input-group.css` for these). Docs: https://www.heroui.com/docs/react/components/time-field

**Purpose.** Segmented time input (hour, minute, optional second, AM/PM).

**Anatomy.** `TimeField` (`.time-field`: `flex flex-col gap-1`; `.time-field--full-width` = `w-full`) > `Label` + `TimeField.Group` > (`TimeField.Prefix`) + `TimeField.Input` > `TimeField.Segment` + (`TimeField.Suffix`) + `Description` + `FieldError`.

**Visual spec.** Every group, segment, prefix and suffix rule is the DateField spec (section 3): 36px tall, radius 12, bg `--field-background`, 12/8px input padding, segment radius 6 with 2px side padding, focused segment `--accent-soft` fill with `--accent-soft-foreground` text, placeholder `--muted`, invalid `--danger`. Variants `primary` / `secondary`; `fullWidth`. Invalid hides the description.

Note on inference: the class names TimeField.Group applies are not shown in time-field.css; I derived the shared styling from the import list. Verify in the react package if pixel certainty is needed.

Motion, a11y and mobile: same as DateField. Hour cycle is locale-driven (`hourCycle` prop overrides); `granularity` hides/shows seconds.

---

## 7. Table

Source: `components/table.css`. Docs: https://www.heroui.com/docs/react/components/table

**Purpose.** Structured tabular data on React Aria Table: sorting, selection, expandable tree rows, resizable columns, infinite load, virtualisation, drag and drop.

**Anatomy.**

| Part | Class | Element |
|---|---|---|
| Root | `.table-root` (+ `--primary` / `--secondary`) | grid wrapper (named `table-root` because `table` is a Tailwind utility) |
| Scroll container | `.table__scroll-container` | horizontal scroll, thin scrollbar |
| Resizable container | `.table__resizable-container` | `Table.ResizableContainer` |
| Content | `.table__content` | `<table>`: `w-full border-separate border-spacing-0 text-sm` |
| Header | `.table__header` | `<thead>` |
| Column | `.table__column` | `<th>` |
| Sortable header | `.table__sortable-column-header` + `.table__sortable-column-indicator` | label + chevron |
| Column resizer | `.table__column-resizer` | drag handle |
| Body | `.table__body` | `<tbody>` |
| Row | `.table__row` | `<tr>` |
| Cell | `.table__cell` | `<td>` |
| Footer | `.table__footer` | div under the table (pagination etc.) |
| Load more | `.table__load-more`, `.table__load-more-content` | sentinel row |

**Variants.**
- `primary` (default): root bg `--surface-secondary`, padding `px-1 pb-1` (4px sides and bottom, 0 top), radius 20. The header sits flush on this grey, the body cells are `--surface` cards on top, so the body reads as a white card inside a grey frame.
- `secondary`: no root bg/padding/radius. Header cells each get bg `--surface-secondary`, header row transparent, first/last header cell rounded 16 on outer corners (so the header is a standalone pill). Body cells transparent with a bottom border on every row, hover `--default` at 50% alpha, body has no shadow and no rounded corners.

No size prop. Colours: none; everything uses neutral tokens plus accent for focus, resize and drop states.

**Spacing and type.**

| Element | Padding | Type | Colour | Other |
|---|---|---|---|---|
| Column header (`th`) | `px-4 py-2.5` = 16 / 10 | 12/16, weight 500, left aligned (`text-start`) | `--muted` (light #71717A, dark #9F9FA9) | row height 10 + 16 + 10 = 36 |
| Header background | | | `--surface-secondary` (light #EFEFF0, dark #232325) | `border-b` 1px `--separator` at 50% alpha on the thead (note: `border-separate` tables ignore borders on `thead` and `tr`, so this likely does not render) |
| Column separator | | | `--separator` | `::after` 1px wide x 16px tall, radius 4, vertically centred at the cell's right edge. Not drawn on the last column |
| Body cell (`td`) | `px-4 py-3` = 16 / 12 | 14/20, weight 400 | `--foreground`; vertical-align middle | row height 12 + 20 + 12 + 1px border = 45 |
| Cell background | | | `--surface` (light #FFFFFF, dark #18181B) | |
| Cell border | | | `border-b` 1px `--separator-tertiary` at 50% alpha (light #CDCDCE at 50%, dark #3C3C3F at 50%) | |
| Row | | | | `border-b` 1px `--separator` at 50% on the `tr`; last row 0 (not rendered under border-separate; the visible line is the cell border) |
| Footer | `px-4 py-2.5` = 16 / 10 | | | flex, items centre; sits on the root's grey |
| Load-more row | `py-3` 12, text centred | | | content: `flex items-center justify-center gap-2 py-2` (gap 8, padding 8) |
| Tree column cell | `padding-inline-start: calc(1rem * --table-row-level)` = 16px per level (level starts at 1, so 16 at the first level) | | | |

Corner rounding (primary): the four outer body corner cells have radius `min(32px, radius-2xl)` = 16px; the table content is `overflow-clip`; the root is 20px. Virtualised bodies round the body element itself (16px, overflow clip).

Striping: **none**. There is no zebra-stripe style in the CSS (not found). Row separation is only the 1px cell bottom border.

**Row and cell states.**

| State | Selector | Styling |
|---|---|---|
| Hover | `.table__row:hover .table__cell` (hover-capable) | cell bg `--surface` at 40% alpha. On primary this lets the grey root show through (light blends to about #F5F5F6, i.e. slightly greyer than white; dark about #1F1F21) |
| Selected | `data-selected="true"` | cell bg `--surface` at 10% alpha (light about #F1F1F2, dark about #222223 over the grey root, so selected rows look close to header grey). In secondary, the cell background is `--surface` at 10% over the page. Selection is mainly signalled by the checkbox |
| Disabled | `aria-disabled` / `data-disabled` | opacity .5, not-allowed, no pointer events |
| Row focus-visible | keyboard focus | one continuous inset 2px `--focus` ring across the row: first cell gets start + top + bottom, last cell end + top + bottom, middle cells top + bottom; outer corners rounded 8 (`rounded-s-lg` / `rounded-e-lg`); a single-cell row gets a full 2px inset ring, radius 8 |
| Cell focus-visible | | inset 2px `--focus` ring, radius 8 |
| Column focus-visible | | inset 2px `--focus` ring, radius 8 |
| Dragging | `data-dragging` | opacity .5 |
| Drop target | `data-drop-target` | cell bg `--accent-soft` |
| Secondary hover | | cell bg `--default` at 50% alpha (light #EBEBEC at 50%, dark #27272A at 50%) |

**Sorting.**
- Sortable column: `data-allows-sorting="true"`, cursor pointer; hover text colour changes `--muted` to `--foreground`.
- Header content: `.table__sortable-column-header` is `flex items-center justify-between` (label left, chevron right).
- Indicator: chevron-up icon in a 12 x 12 grid box (`size-3`), pointing up = ascending; `data-direction="descending"` rotates it 180deg. Transition: transform 100ms ease-out. Shown only when a sort direction is set (`showIndicator` default true); a custom indicator element can replace the chevron.
- Unsorted columns show no indicator.

**Selection.** `selectionMode` `none` | `single` | `multiple`. Select-all and per-row controls are HeroUI Checkbox with `slot="selection"` placed in a leading column (checkbox spec is outside this file). No special selected-row accent; see Selected above.

**Column resizing.** Handle: absolutely positioned at the column end, 1 x 16 px, radius 4, bg `--separator`, hit area widened with 8px transparent horizontal padding (box-content), `cursor: col-resize`. Hover or resizing: becomes 2px wide, full column height, bg `--accent`. Focus-visible: 2px wide, full height, bg `--focus`. The `::after` separator is removed when a resizer exists.

**Empty state.** No default styling in the CSS and no built-in default message found. `Table.Body renderEmptyState={() => ...}` renders whatever you provide in a body row (not found: default padding or text style). Design the empty state yourself; centre it inside the 16px-padded card.

**Async / infinite scroll.** `Table.LoadMore` renders a sentinel row; its content is centred with a Spinner, row padding 12 plus content padding 8, gap 8.

**Virtualisation.** `TableLayout` defaults: row height 48, heading height 48, loader height 48, drop indicator 2, gap 0, padding 0. Use 48px rows when you design a virtualised table (the non-virtualised row is 45px).

**Motion.** Sort chevron rotation 100ms ease-out. No row hover transition is defined in table.css (colour changes are instant).

**Accessibility.** Real table semantics (`<table>` with `th scope`); `aria-label` required on `Table.Content`. Arrow keys move between cells, Space/Enter toggles selection, sort via Enter/Space on the column. `isRowHeader` marks the identifying column. Focus ring is inset so it never clips in `overflow-clip` containers. Disabled rows keep readable contrast at 50% opacity only.

**Mobile (375px).** Table scrolls horizontally inside `.table__scroll-container`; the root is a `grid` with `minmax(0,1fr)` so the card never pushes the page wider. Set minimum column widths in design (not defined by the library). Sticky first column is not provided. Hover styles do not apply on touch. 45px row height is touch-friendly for row-level selection; header at 36px is tighter.

---

## 8. Badge

Source: `components/badge.css`. Docs: https://www.heroui.com/docs/react/components/badge

**Purpose.** Small count, status or dot indicator anchored to a corner of another element (avatar, icon button). For a standalone label use Chip.

**Anatomy.** `Badge.Anchor` (`.badge-anchor`, `relative inline-flex shrink-0`) wraps the target element plus `Badge` (`.badge`, optional `Badge.Label` `.badge__label` with `px-0.5` = 2px; plain text and numbers are wrapped automatically). No children means a dot.

**Variants.** `primary` (default, solid), `secondary` (default-coloured bg, coloured text), `soft` (tinted bg).

**Colours.** `default` (default), `accent`, `success`, `warning`, `danger`.

**Sizes (min box; content can grow it).**

| Size | Min height x width | Radius | Text |
|---|---|---|---|
| `sm` | 16 x 16 | 12 (rounded-xl) | 10px, line-height 1.34 (13.4px), weight 500 |
| `md` (default) | 28 x 28 | 24 (rounded-3xl) | 12px, line-height 1.34 (16.1px), weight 500 |
| `lg` | 32 x 32 | 16 (rounded-2xl) | 14px, line-height 1.43 (20px), weight 500 |

All: `inline-flex items-center justify-center`, `gap-0.5` (2px), `shrink-0`, border 1px solid `--badge-border` = `--background` (a cut-out ring in the page background colour, not the surface colour), `background-clip: padding-box`. Dot badge: an empty badge is just the min box (sm 16px, md 28px, lg 32px); no dedicated smaller dot size exists in the CSS (not found).

**Colour matrix** (bg / text):

| Colour | Primary | Secondary | Soft |
|---|---|---|---|
| default | `--default` / `--default-foreground` | `--default` / `--default-foreground` | `--default-soft` / `--default-soft-foreground` |
| accent | `--accent` / `--accent-foreground` | `--default` / `--accent-soft-foreground` | `--accent-soft` / `--accent-soft-foreground` |
| success | `--success` / `--success-foreground` | `--default` / `--success-soft-foreground` | `--success-soft` / `--success-soft-foreground` |
| warning | `--warning` / `--warning-foreground` | `--default` / `--warning-soft-foreground` | `--warning-soft` / `--warning-soft-foreground` |
| danger | `--danger` / `--danger-foreground` | `--default` / `--danger-soft-foreground` | `--danger-soft` / `--danger-soft-foreground` |

Resolve to hex using the token tables in section 0. Soft backgrounds are translucent, so over a photo avatar the tint shows the image through.

**Placement (default top-right).** The badge is absolutely positioned at the corner of the anchor and shifted outward by 25% of its own size:
- `top-right`: top 0, right 0, translate(25%, -25%)
- `top-left`: top 0, left 0, translate(-25%, -25%)
- `bottom-right`: bottom 0, right 0, translate(25%, 25%)
- `bottom-left`: bottom 0, left 0, translate(-25%, 25%)

**States.** None (non-interactive). No hover, focus or disabled styling.

**Motion.** None.

**Accessibility.** Plain span; the count or status is not announced as live content. Add visually hidden text or an `aria-label` on the anchor (for example "5 unread"); a dot-only badge conveys nothing to screen readers on its own. Do not rely on colour alone.

**Mobile.** Sizes are not responsive. md is 28px which is large next to a 32px sm avatar; use `sm` (16px) on small avatars or icon buttons.

---

## 9. Chip

Source: `components/chip.css`. Docs: https://www.heroui.com/docs/react/components/chip

**Purpose.** Compact non-interactive label for a status, category or tag. (For selectable or removable chips use TagGroup.)

**Anatomy.** `Chip` (`.chip`: `inline-flex w-fit shrink-0 items-center gap-0.5 rounded-2xl`, 2px gap, radius 16) > optional icons + `Chip.Label` (`.chip__label`, `px-0.5` 2px horizontal padding; plain text is wrapped automatically).

**Variants.** `primary` (solid), `secondary` (default, default-grey bg), `tertiary` (transparent bg), `soft` (tinted bg).

**Colours.** `default`, `accent`, `success`, `warning`, `danger`.

**Sizes.**

| Size | Padding (x / y) | Text | Height | Radius |
|---|---|---|---|---|
| `sm` | 4 / 0 | 12 (leading 20) weight 500 | 20 | 16 |
| `md` (default) | 8 / 2 | 12 (leading 20) weight 500 | 24 | 16 |
| `lg` | 12 / 4 | 14 (leading 20) weight 500 | 28 | 16 |

Base line-height is `leading-5` = 20px. Radius 16 yields a full pill at all three heights.

**Colour matrix** (bg / text). Base: bg `--chip-bg` = `--default`, text `--chip-fg` = currentColor, overridden per colour:

| Colour | Primary | Secondary (default variant) | Tertiary | Soft |
|---|---|---|---|---|
| default | `--default` / `--default-foreground` | `--default` / `--default-foreground` | transparent / `--default-foreground` | `--default-soft` / `--default-soft-foreground` |
| accent | `--accent` / `--accent-foreground` | `--default` / `--accent-soft-foreground` | transparent / `--accent-soft-foreground` | `--accent-soft` / `--accent-soft-foreground` |
| success | `--success` / `--success-foreground` | `--default` / `--success-soft-foreground` | transparent / `--success-soft-foreground` | `--success-soft` / `--success-soft-foreground` |
| warning | `--warning` / `--warning-foreground` | `--default` / `--warning-soft-foreground` | transparent / `--warning-soft-foreground` | `--warning-soft` / `--warning-soft-foreground` |
| danger | `--danger` / `--danger-foreground` | `--default` / `--danger-soft-foreground` | transparent / `--danger-soft-foreground` | `--danger-soft` / `--danger-soft-foreground` |

Tertiary has no border in the CSS (the tertiary variant is just text on transparent). Default variant is `secondary`.

**States.** None. Chip is a static span with no hover, pressed, focus or disabled styles.

**Motion.** None.

**Accessibility.** Not focusable. Do not use it as a button. Status meaning needs text, not just colour. Icons inside should be decorative (`aria-hidden`).

**Mobile.** md is 24px tall, lg 28px; fine for display but too small to be a touch target, which is consistent with it being non-interactive.

---

## 10. Avatar

Source: `components/avatar.css`. Docs: https://www.heroui.com/docs/react/components/avatar

**Purpose.** User or entity image with an initials/icon fallback.

**Anatomy.** `Avatar` (`.avatar`: `relative flex shrink-0 items-center justify-center overflow-hidden`, bg `--default`) > `Avatar.Image` (`.avatar__image`: absolute, fills, `aspect-square`) + `Avatar.Fallback` (`.avatar__fallback`: fills, centred, bg `--default`, 14/20 weight 500). The fallback shows until the image loads (optional `delayMs` to avoid flash).

**Sizes.**

| Size | Box | Radius | Fallback text |
|---|---|---|---|
| `sm` | 32 | 16 (circle) | 12/16 |
| `md` (default) | 40 | 24 (circle) | 14/20 |
| `lg` | 48 | 24 (circle) | 16/24 |

All sizes render circular. `--avatar-size` is set to 2rem / 2.5rem / 3rem for AvatarGroup masking.

**Variants and colours.**
- `default`: fallback bg `--default` for every colour; text colour by `color`:
  - `default`: `--default-soft-foreground` (light #18181B, dark #FCFCFC)
  - `accent`: `--accent-soft-foreground`; `success`: `--success-soft-foreground`; `warning`: `--warning-soft-foreground`; `danger`: `--danger-soft-foreground`
- `soft`: avatar bg transparent; the fallback gets the tinted bg and matching text:
  - accent: `--accent-soft` / `--accent-soft-foreground`; success: `--success-soft` / `--success-soft-foreground`; warning: `--warning-soft` / `--warning-soft-foreground`; danger: `--danger-soft` / `--danger-soft-foreground`; default: `--default-soft` / `--default-soft-foreground`.

**States.** None (not interactive). Image fades in over 250ms (`transition-opacity duration-250`).

**Accessibility.** Give `Avatar.Image` an `alt` (name) or leave empty and put the name in nearby text; fallback initials should not be the only identification for screen readers. Image has `loading` (`eager`/`lazy`) pass-through.

**Mobile.** Sizes are fixed. 40px md is a common list-row size; 32px sm for dense UI.

---

## 11. AvatarGroup

Source: `components/avatar-group.css`. Docs: https://www.heroui.com/docs/react/components/avatar-group

**Purpose.** Stacked (overlapping) or grid layout of avatars with an optional overflow count.

**Anatomy.** `AvatarGroup` (`.avatar-group`: `inline-flex items-center`) > `Avatar`s + optional `AvatarGroup.Count` (`.avatar-group__count`, an Avatar with a Fallback, `shrink-0`, shows e.g. "+3"; not truncated by `max`).

**Props that matter for design.** `size` (`sm`/`md`/`lg`, passed to children), `color`, `variant` (`default`/`soft`), `max` (cuts avatars and auto-adds a count), `isGrid`, `overlap` (`clip` default or `ring`).

**Dimensions.**

| Token / element | Value |
|---|---|
| `--avatar-group-overlap` | 0.5rem = 8px (negative inline-start margin on every avatar after the first, so each avatar covers 8px of its neighbour) |
| `--avatar-group-seam` | 2px |
| Visible step between avatar centres | avatar size - 8 (md: 32px; sm: 24px; lg: 40px) |
| Grid layout (`--grid`) | `flex-wrap gap-3` = 12px gap, no overlap |

**Overlap styles.**
- `ring`: each avatar and the count get `box-shadow: 0 0 0 2px var(--background)`, a solid 2px outline in the page background colour (it will show as a visible ring on any surface that is not `--background`). `position: relative`; later avatars stack above earlier ones.
- `clip` (default): every avatar except the last gets a radial-gradient mask that cuts a crescent where the next avatar sits: circle centred at (100% + size/2 - 8px, 50%) with radius size/2 + 2px, transparent inside. This leaves a 2px transparent gap between avatars with no ring colour dependency, so it works on any background. Fallback text in clipped avatars is nudged: `padding-inline-end: 8px x 0.35 = 2.8px` so initials sit optically centred in the visible part. In RTL the cut centre flips.

**States.** None; the group has no default `role`. Pass `role="group"` plus `aria-label` when the stack means something (assignees, viewers).

**Motion.** None.

**Accessibility.** Add `role="group"` with a label; overflow count text (for example "+3") should be paired with an accessible name like "and 3 more". Child avatars need alt text.

**Mobile.** Stack steps are small (24px at sm); 8px overlap on 32px avatars hides 25% of each. Use `isGrid` when avatars must be tappable individually.

---

## 12. Colour components (brief)

Docs: `https://www.heroui.com/docs/react/components/{color-area,color-field,color-picker,color-slider,color-swatch,color-swatch-picker}`. CSS: `components/color-*.css`.

### ColorSwatch
- Anatomy: single element `.color-swatch`, `relative box-border size-8 shrink-0`. Background is the current colour layered over a checkerboard (`repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%)` at 16 x 16px cells) so transparency shows. Inner hairline: `box-shadow: inset 0 0 0 1px rgba(0,0,0,.1)`.
- Shape (default `circle`) and size:

| Size | Box | Circle radius | Square radius |
|---|---|---|---|
| `xs` | 16 | 8 | 6 (rounded-md) |
| `sm` | 24 | 12 | 6 |
| `md` (default) | 32 | 16 | 6 |
| `lg` | 36 | 24 | 6 |
| `xl` | 40 | 24 | 6 |

- Non-interactive; no states.

### ColorArea
- Anatomy: `.color-area` (root) > `.color-area__thumb`. Root: `w-full max-w-56` (max 224px), square (`aspect-ratio: 1/1`), radius 16, background from React Aria gradient (`--color-area-background`), inner hairline `inset 0 0 0 1px rgba(0,0,0,.1)`.
- Props: `colorSpace` (rgb/hsl/hsb), `xChannel`, `yChannel`, `showDots` (adds a dot-grid overlay: radial dots `rgba(255,255,255,.2)` 1px radius on an 8 x 8px grid), `isDisabled`.
- Thumb: 16 x 16, radius 12 (circle), fill = current colour (`--color-area-thumb-color`), 3px solid white border, ring `0 0 0 1px rgba(0,0,0,.1)` + inset hairline; dragging grows it to 20 x 20 (width/height 150ms ease-out); focus-visible: focus ring (2px + 2px gap); disabled: opacity .5.
- A11y: two-axis slider (arrow keys on both channels). Root disabled: opacity .5.

### ColorSlider
- Anatomy: `.color-slider` grid (areas "label output" over "track"; `gap-1` 4px) > `Label` (14/20 weight 500), `.color-slider__output` (14/20 weight 500, tabular-nums), `.color-slider__track` > `.color-slider__thumb`.
- Horizontal: track height 20 (`h-5`), width `calc(100% - 1.25rem)` (20px narrower), radius 0, inset 1px top/bottom hairlines `rgba(0,0,0,.1)`. End caps: pseudo-elements 10px wide (0.625rem), full height, outside the track at each end, left cap radius 16 on its outer corners (start colour over checkerboard), right cap likewise with end colour, hairline borders; together the track with caps spans the full width with rounded ends.
- Vertical: track width 20, height `calc(100% - 1.25rem)`, caps 10px tall; layout rows: output / track / label, `gap-2` 8px.
- Thumb: 16 x 16, radius 16, 3px white border, `--shadow-overlay`, cursor grab (grabbing while dragging). Focus-visible: z-index 10 + focus ring. Disabled thumb: bg `--default`, cursor default. Root disabled: opacity .5 but label stays at opacity 1. Thumb transition: transform 250ms, box-shadow 150ms.
- Channels: hue, saturation, lightness, brightness, alpha, red, green, blue. Alpha track shows the checkerboard.

### ColorField
- Root `.color-field`: `flex flex-col gap-1`; `--full-width`; description hidden when invalid. Group is `.color-input-group`: identical metrics to the date input group (36px tall, radius 12, bg `--field-background`, shadow `--field-shadow`, input `px-3 py-2`, 16px text under 640px and 14px from 640px, prefix `ms-3`, suffix `me-3`, placeholder `--field-placeholder`). Hover bg `--field-hover`; focus-within 2px `--focus` ring; invalid 1px `--danger` outline (border colour token `--color-field-border-invalid` not defined, not found); disabled opacity .5. Variants `primary` (default) and `secondary` (bg `--default`, hover `--default-hover`, no shadow).
- Typical composition: a `ColorSwatch` in the prefix slot, hex text input. Channel editing via `colorSpace` + `channel`.

### ColorPicker
- Anatomy: `.color-picker` (inline-flex) > `.color-picker__trigger` (inline-flex, `gap-3` 12px, radius 4, 14/20 text, focus ring, disabled opacity .5; contains a ColorSwatch and Label) + `.color-picker__popover`.
- Popover: min-width 248 (`min-w-62`), padding `px-2 pt-2 pb-3` = 8 / 8 / 12, bg `--overlay`, radius 20, shadow `--overlay-shadow`, `flex flex-col gap-3` (12px), scrolls with hidden scrollbar. Typically holds ColorArea + ColorSlider(s) + ColorField/Swatch picker. Enter/exit animation identical to DatePicker popover (fade + zoom 95% + 4px slide, 150ms in / 100ms out).

### ColorSwatchPicker
- Anatomy: `.color-swatch-picker` (`flex flex-wrap items-center gap-2`, 8px gap; `--stack` = column) > `Item` (`.color-swatch-picker__item`) > `Swatch` (`.color-swatch-picker__swatch`) + `Indicator` (`.color-swatch-picker__indicator`, a checkmark).
- Item: 32 x 32 (md), radius 16 (circle), `border-2 border-transparent`. Sizes: `xs` 16 (radius 8, 1px border), `sm` 24 (radius 12, 2px border), `md` 32 (radius 16, 2px border), `lg` 36 (radius 24, 3px border), `xl` 40 (radius 24, 3px border). `variant="square"`: item radius 12 at md/lg/xl, 8 at sm, 6 at xs; inner swatch radius 8 (6 at xs; selected swatch radius 6 at sm).
- States: hover (hover-capable devices) swatch scales to 1.1; selected: item border colour = the swatch colour, shadow `--field-shadow`, inner swatch shrinks to scale .77 revealing a white-ish gap ring; focus-visible: focus ring; disabled: opacity .5. Checkmark indicator: 1/3 of the item size, white (black on light colours via `data-light-color`), scales 0 to 1 over 150ms when selected. Swatch transform 100ms ease-out; item border-colour/box-shadow 100ms ease-out.

Mobile for colour components: ColorArea is up to 224px square, sliders full width with 16px thumbs (3px border incl.), so thumbs are small touch targets (16-20px); the popover min width 248px fits within 375px.

---

## 13. Doc vs CSS discrepancies

- Chip docs: "`.chip--secondary` - Secondary variant with border". The CSS has no border for secondary; it is the default-grey fill only. Followed the CSS.
- Badge docs: "`.badge--secondary` - Secondary variant with default background". Matches CSS.
- Table docs sample CSS (`bg-gray-100`, etc.) is illustrative customisation, not the real defaults. Real defaults are in section 7.
- RangeCalendar docs list a `data-selection-in-range` state; the CSS styles the middle of the range via `data-selected` (excluding start/end caps via their own selectors).
- Calendar customisation snippet (`w-72`, `p-3`, border) is an example, not the default; default width is 252px with no border, padding or shadow on the root.

## 14. Values not found (do not guess)

- `--ease-out` (and `--color-field-border-invalid`) definitions: neither is in theme.css or variables.css. `--ease-out` falls back to Tailwind's default easing; the invalid border colour has no resolved value (the 1px `--danger` outline from `status-invalid-field` is what shows).
- Default text/layout for the Table empty state (`renderEmptyState` content is user-supplied).
- Table zebra striping (none exists), and a visible default for the `thead` bottom border (declared but ineffective in `border-separate`).
- Dedicated dot-badge size (an empty badge is just the size's min box).
- Invalid-state styling for Calendar / RangeCalendar cells (`isInvalid`, no CSS rules).
- DatePicker / DateRangePicker trigger hover and open styles (only focus-visible and disabled are styled).
- The range separator glyph in DateRangePicker.
- Exact width of the DateRangePicker field (depends on locale format).
- TimeField group classes were inferred from the CSS import list, not read from a TimeField-specific rule.
- Touch-target extension for calendar cells and nav buttons (none provided).

## 15. Source URLs

Docs:
- https://www.heroui.com/docs/react/components/calendar
- https://www.heroui.com/docs/react/components/range-calendar
- https://www.heroui.com/docs/react/components/date-field
- https://www.heroui.com/docs/react/components/date-picker
- https://www.heroui.com/docs/react/components/date-range-picker
- https://www.heroui.com/docs/react/components/time-field
- https://www.heroui.com/docs/react/components/table
- https://www.heroui.com/docs/react/components/badge
- https://www.heroui.com/docs/react/components/chip
- https://www.heroui.com/docs/react/components/avatar
- https://www.heroui.com/docs/react/components/avatar-group
- https://www.heroui.com/docs/react/components/color-area
- https://www.heroui.com/docs/react/components/color-field
- https://www.heroui.com/docs/react/components/color-picker
- https://www.heroui.com/docs/react/components/color-slider
- https://www.heroui.com/docs/react/components/color-swatch
- https://www.heroui.com/docs/react/components/color-swatch-picker

CSS (base `https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/`):
- `components/calendar.css`, `components/calendar-year-picker.css`, `components/range-calendar.css`
- `components/date-field.css`, `components/date-input-group.css`, `components/date-picker.css`, `components/date-range-picker.css`, `components/time-field.css`
- `components/table.css`, `components/badge.css`, `components/chip.css`, `components/avatar.css`, `components/avatar-group.css`
- `components/color-area.css`, `components/color-field.css`, `components/color-input-group.css`, `components/color-picker.css`, `components/color-slider.css`, `components/color-swatch.css`, `components/color-swatch-picker.css`
- `utilities/index.css` (focus-ring, status-focused, status-invalid-field, status-disabled definitions)
- `themes/shared/theme.css`, `themes/default/variables.css` (tokens and soft-colour formulas)
- React source checked for Badge and Table sort indicator: `packages/react/src/components/{badge,table,time-field}/*.tsx`
