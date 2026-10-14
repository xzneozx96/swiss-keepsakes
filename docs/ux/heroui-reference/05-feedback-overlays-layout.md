# HeroUI v3 (React) - Feedback, Overlays, Layout, Typography: design specs

Scope: Alert, AlertDialog, Modal, Drawer, Popover, Toast, Tooltip, Skeleton, Spinner, ProgressBar, ProgressCircle, Meter, Card, Surface, Separator, ScrollShadow, Typography, EmptyState, Header.

## 0. How to read this file

- Source of truth is the component CSS in `heroui-inc/heroui` branch `v3`, `packages/styles/components/<name>.css`, plus the token files `packages/styles/themes/default/variables.css`, `packages/styles/themes/shared/theme.css`, `packages/styles/utilities/index.css`, `packages/styles/base/base.css`. All were fetched as raw files. The docs "Anatomy" and "API Reference" come from the docs MDX in the same repo (`apps/docs/content/docs/en/react/components/...`), which is the source of the heroui.com pages.
- Conversions used: 1 spacing unit = 4px (`--spacing: 0.25rem`). Radius tokens at default `--radius: 0.5rem` (8px): xs 2, sm 4, md 6, lg 8, xl 12, 2xl 16, 3xl 24, 4xl 32. Tailwind text sizes: xs 12/16, sm 14/20, base 16/24, lg 18/28, xl 20/28, 2xl 24/32, 3xl 30/36, 4xl 36/40. Weights: normal 400, medium 500, semibold 600, bold 700. `sm:` breakpoint = 640px.
- Hex values for OKLCH tokens were computed by converting the exact OKLCH values in `variables.css` (colour-mix steps done in OKLab as CSS specifies). They match the published HeroUI palette (accent #0485F7 etc.). Treat hex as derived, OKLCH as source.
- Every component's `.x__trigger`, focus, disabled behaviour uses the shared utilities: `status-focused` = 2px ring in `--focus` (= `--accent`), ring offset `--ring-offset-width` 2px, offset colour `--background`; `status-disabled` = opacity `--disabled-opacity` 0.5, cursor not-allowed, pointer-events none.
- The component CSS contains no borders on Alert, Card, Modal, Drawer, Popover, Toast. Elevation comes from shadows (light) and from an inset 1px light edge (dark overlays).

## 1. Design tokens used by these components

### 1.1 Colour tokens (default theme)

| Token | Light (OKLCH -> hex) | Dark (OKLCH -> hex) | Used by |
|---|---|---|---|
| `--background` | oklch(0.9702 0 0) -> #F5F5F5 | oklch(12% 0.005 285.823) -> #060607 | page, focus-ring offset |
| `--foreground` | `--eclipse` oklch(0.2103 0.0059 285.89) -> #18181B | `--snow` oklch(0.9911 0 0) -> #FCFCFC | text |
| `--surface` | `--white` #FFFFFF | oklch(0.2103 0.0059 285.89) -> #18181B | Alert, Card default, Toast, Surface |
| `--surface-secondary` | oklch(0.9524 0.0013 286.37) -> #EFEFF0 | oklch(0.257 0.0037 286.14) -> #232325 | Card/Surface secondary |
| `--surface-tertiary` | oklch(0.9373 0.0013 286.37) -> #EAEAEB | oklch(0.2721 0.0024 247.91) -> #262728 | Card/Surface tertiary, Skeleton |
| `--overlay` | #FFFFFF | oklch(0.2103 0.0059 285.89) -> #18181B | Modal, AlertDialog, Drawer, Popover, Tooltip |
| `--overlay-foreground` / `--surface-foreground` | = `--foreground` | = `--foreground` | |
| `--muted` | oklch(0.5517 0.0138 285.94) -> #71717A | oklch(70.5% 0.015 286.067) -> #9F9FA9 | descriptions, body text in dialogs |
| `--default` | oklch(94% 0.001 286.375) -> #EBEBEC | oklch(27.4% 0.006 286.033) -> #27272A | progress/meter track, code chip bg, icon-chip bg |
| `--default-foreground` | `--eclipse` #18181B | `--snow` #FCFCFC | "default" colour fills |
| `--border` | oklch(90% 0.004 286.32) -> #DEDEE0 | oklch(28% 0.006 286.033) -> #28282C | toast close border, tooltip arrow stroke (40%), blockquote |
| `--separator` | oklch(92% 0.004 286.32) -> #E4E4E7 | oklch(25% 0.006 286.033) -> #212124 | Separator, drawer handle bar |
| `--separator-secondary` | mix(surface 85%, surface-foreground 15%) -> #D8D8D8 | -> #343437 | Separator secondary |
| `--separator-tertiary` | mix(surface 81%, surface-foreground 19%) -> #CDCDCE | -> #3C3C3F | Separator tertiary |
| `--accent` | oklch(0.6204 0.195 253.83) -> #0485F7 | same -> #0485F7 | |
| `--success` | oklch(0.7329 0.1935 150.81) -> #17C964 | same | |
| `--warning` | oklch(0.7819 0.1585 72.33) -> #F5A524 | oklch(0.8203 0.1388 76.34) -> #F7B750 | |
| `--danger` | oklch(0.6532 0.2328 25.74) -> #FF383C | oklch(0.594 0.1967 24.63) -> #DB3B3E | |
| `--link` | = `--foreground` | = `--foreground` | Typography prose links |
| `--focus` | = `--accent` | = `--accent` | focus ring |
| `--backdrop` | rgba(0,0,0,0.5) | rgba(0,0,0,0.6) | modal/drawer/alert-dialog backdrop |

Soft status colours (Alert title/indicator, Toast title/indicator, AlertDialog icon chip):

| Token | Light | Dark |
|---|---|---|
| `--accent-soft` (bg) | accent at 15% alpha | accent at 12% alpha |
| `--success-soft` | success 15% | success 12% |
| `--warning-soft` | warning 15% | warning 12% |
| `--danger-soft` | danger 15% | danger 15% |
| `--accent-soft-foreground` | mix(accent 70%, foreground 30%) -> #1E63AE | mix(accent 80%, foreground 30%) -> #61A8FB |
| `--success-soft-foreground` | mix(success 80%, foreground 60%) -> #2B7745 | mix(success 80%, foreground 30%) -> #74D88F |
| `--warning-soft-foreground` | mix(warning 80%, foreground 70%) -> #855F2E | mix(warning 80%, foreground 30%) -> #F9CB86 |
| `--danger-soft-foreground` | mix(danger 70%, foreground 40%) -> #A43433 | mix(danger 80%, foreground 30%) -> #EB7872 |

Percentages that sum above 100% are normalised by CSS (e.g. 80+60), which is what the hex above reflects. With `data-vibrant-palette="true"` on an ancestor, every soft-foreground becomes mix(colour 92%, foreground 8%) (not computed to hex here). Soft backgrounds are translucent, so the rendered colour depends on what sits underneath (for Alert that is `--surface`).

### 1.2 Shadows

| Token | Light | Dark |
|---|---|---|
| `--surface-shadow` (utility `shadow-surface`: Alert, Card) | `0 2px 4px 0 rgba(0,0,0,.04), 0 1px 2px 0 rgba(0,0,0,.06), 0 0 1px 0 rgba(0,0,0,.06)` | `0 0 0 0 transparent inset` (none) |
| `--overlay-shadow` (utility `shadow-overlay`: Modal, Drawer, AlertDialog, Toast; used directly by Popover, Tooltip) | `0 2px 8px 0 rgba(0,0,0,.06), 0 -6px 12px 0 rgba(0,0,0,.03), 0 14px 28px 0 rgba(0,0,0,.08)` | `0 0 1px 0 rgba(255,255,255,.3) inset` |

### 1.3 Other tokens

| Token | Value |
|---|---|
| `--radius` | 0.5rem = 8px (xs 2, sm 4, md 6, lg 8, xl 12, 2xl 16, 3xl 24, 4xl 32) |
| `--disabled-opacity` | 0.5 |
| `--ring-offset-width` | 2px |
| `--border-width` | 1px |
| `--z-index-overlay` | 100000 (matches React Aria popovers; mount order decides stacking) |
| `--z-index-toast` | 100001 |
| `--scrollbar-thumb` | foreground at 15% in OKLCH mix; `--scrollbar-width: thin`; track transparent |
| `--ease-smooth` | `ease` |
| `--ease-out-quad` | cubic-bezier(0.25, 0.46, 0.45, 0.94) |
| `--ease-out-quart` | cubic-bezier(0.165, 0.84, 0.44, 1) |
| `--ease-out-fluid` | cubic-bezier(0.32, 0.72, 0, 1) |
| `--animate-spin-fast` | `spin 0.75s linear infinite` |
| `--animate-skeleton` | `skeleton 2s linear infinite` (keyframe: to translateX(200%)) |
| `--skeleton-animation` | `shimmer` (global default; options shimmer / pulse / none) |
| `--tooltip-delay`, `--tooltip-close-delay` | 1500ms, 500ms (see Tooltip for the conflicting prop default) |
| Font family | not found in the fetched CSS (inherited from the host app / Tailwind `font-sans`; `font-mono` used for code) |

## 2. Feedback components

### 2.1 Alert

Purpose: inline, persistent status message (info, success, warning, error). Not dismissible by itself; can contain buttons.

Anatomy: `Alert` (`.alert`) > `Alert.Indicator` (`.alert__indicator`, defaults to a status icon) + `Alert.Content` (`.alert__content`) > `Alert.Title` (`.alert__title`) + `Alert.Description` (`.alert__description`).

Variants: prop `status`: `default | accent | success | warning | danger` (default `default`). No sizes.

| Part | Spec |
|---|---|
| Root | flex row, items-start, justify-start, w-full, gap 16px, padding 16px horizontal / 12px vertical, bg `--surface`, shadow `--surface-shadow`, radius min(32, radius-3xl) = 24px. No border. |
| Indicator | flex centred, padding 4px, no selection. Default icon: box-content 16x16 (`data-slot="alert-default-icon"`), so the indicator box is 24x24. |
| Content | flex column, items-start, grows (`flex-grow`), full height. |
| Title | 14px / 24px (text-sm, leading-6), weight 500. |
| Description | 14px / 20px (text-sm default line height), weight 400, colour `--muted`. |

Status colours (indicator icon and title share the colour; description stays `--muted`; root bg stays `--surface` for every status):

| Status | Indicator + title colour (light / dark) |
|---|---|
| default | `--foreground` #18181B / #FCFCFC |
| accent | `--accent-soft-foreground` #1E63AE / #61A8FB |
| success | `--success-soft-foreground` #2B7745 / #74D88F |
| warning | `--warning-soft-foreground` #855F2E / #F9CB86 |
| danger | `--danger-soft-foreground` #A43433 / #EB7872 |

States: none on the base component (informational). Motion: none. Accessibility: render with an appropriate live region role when injected dynamically (docs do not prescribe one; the component is a plain container). Mobile 375px: full width of its container (fits 343px inside a 16px gutter); text wraps in the content column; keep indicator 24px.

Sources: https://www.heroui.com/docs/react/components/alert , https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/alert.css

### 2.2 Toast

Purpose: transient notification, stacked, auto-dismissed (4s default), triggered imperatively via `toast()`.

Anatomy: `Toast.Provider` (renders `.toast-region`) > `Toast` (`.toast`) > `Toast.Indicator` (`.toast__indicator`) + `Toast.Content` (`.toast__content`) > `Toast.Title` + `Toast.Description`; plus `Toast.ActionButton` (`.toast__action`) and `Toast.CloseButton` (`.toast__close-button`).

Variants (`variant`): `default | accent | success | warning | danger`. Methods: `toast()`, `toast.success/info/warning/danger`, promise (shows spinner indicator, then swaps icon).

| Part | Spec |
|---|---|
| Region | fixed, z-index 100001, pointer-events none. Width: `calc(100vw - 2rem)` on mobile (375px viewport = 343px); from 640px: auto with min-width `--toast-width` (Provider prop `width`, default 460px). Placements: `bottom` (default; left 50% centred), `bottom start`, `bottom end`, `top`, `top start`, `top end`; inset from edge 16px (bottom/top 16px, start/end 16px). |
| Toast | absolute within region, flex row, items-start, justify-start, gap 6px, padding 16px horizontal / 12px vertical, bg `--surface`, shadow `--overlay-shadow`, radius 24px. No border. |
| Indicator | padding 4px, colour `--overlay-foreground`; default icon box-content 16x16; spinner 16x16. Box = 24x24. |
| Content | flex column, grow, items-start, self-center. |
| Title | 14px / 20px, weight 500, colour `--overlay-foreground`. |
| Description | 14px / 20px, colour `--muted`. |
| Action | margin-top 8px on mobile (stacks below text), 0 from 640px. Accepts all Button props. |
| Close button | size 20x20, offset -4px top and -4px end (overhangs the corner), hidden (opacity 0, no pointer events) until the frontmost or expanded toast is hovered. Mobile: bg `--default`, no border, icon 14px. From 640px: bg `--overlay`, 1px border `--border`, icon 12px. Hover (hover-capable devices): bg `--default`. Fade 150ms `ease`. |

Variant colours: title colour `--accent-soft-foreground` (accent), `--success-soft-foreground`, `--warning-soft-foreground`, `--danger-soft-foreground`; indicator takes the same colour for success/warning/danger (accent has no indicator override, default shows `--overlay-foreground`). Default variant: title `--overlay-foreground`. Hex values: see 2.1.

Stack behaviour (Provider props): `maxVisibleToasts` 3, `gap` 12px, `scaleFactor` 0.05, `hotkey` Alt+T focuses/expands, `isExpanded`. Collapsed stack: non-front toasts take the front toast's height, content opacity 0, scaled down by `--scale-collapsed` and offset by `--offset-collapsed` (both computed in JS, exact per-index values not in the CSS). Expanded: scale 1, offset `--offset-expanded`.

Motion: transform 350ms `--ease-out-fluid` (cubic-bezier(0.32,0.72,0,1)); height 350ms same ease; opacity 150ms same ease; content fade 200ms. Enter: slides in from -100% of its own height in the stack direction (bottom stacks move up from below, top stacks move down). Exit: translate 250ms, opacity 150ms to 0; non-front exits scale 0.96 over 200ms. Promise icon swap: fade 150ms + scale from 0.92 over 200ms. All disabled under `prefers-reduced-motion`.

Accessibility: region is focusable (outline 2px `--focus`, offset 2px) and takes the Alt+T hotkey; each toast is focusable with the same ring; built on React Aria Toast (live region). Timers pause on hover/focus.

Mobile 375px: region width 343px, close button always the compact variant (reveals on press/hover), action sits under the text. Default placement bottom, 16px from the bottom edge (no safe-area handling in the CSS).

Sources: https://www.heroui.com/docs/react/components/toast , .../packages/styles/components/toast.css

### 2.3 Skeleton

Purpose: placeholder while content loads.

Anatomy: single element `.skeleton`; animation via modifier `--shimmer | --pulse | --none` (prop `animationType`, default `shimmer` or global `--skeleton-animation`).

| Part | Spec |
|---|---|
| Base | relative, overflow hidden, pointer-events none, radius sm = 4px, bg `--surface-tertiary` at 70% opacity (light ~#EAEAEB@70, dark ~#262728@70). Size is set by the consumer. |
| Shimmer | `::after` full-size band, gradient left-to-right `transparent -> --surface-tertiary -> transparent`, starts at translateX(-100%), animates to translateX(200%), 2s linear infinite. When a skeleton contains child skeletons, children's shimmer is removed and one parent `::before` overlay runs: gradient 90deg `transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%`, `mix-blend-mode: overlay`, z-index 10, same 2s animation. |
| Pulse | Tailwind `animate-pulse` (the CSS only applies the utility; Tailwind default is 2s infinite, opacity 1 -> 0.5 -> 1). |
| None | static. |

Accessibility: no ARIA in the CSS; mark the loading region with `aria-busy` on the container. Source note in the CSS: "Skeleton with parent are not visible" (known TODO).

Sources: https://www.heroui.com/docs/react/components/skeleton , .../components/skeleton.css

### 2.4 Spinner

Purpose: indeterminate loading indicator (also used inside Toast promise state and buttons).

Parts: `.spinner` root (SVG child; ring geometry lives in the TSX, not in the CSS - not found).

| Size | Box |
|---|---|
| sm | 16x16 |
| md (default) | 24x24 |
| lg | 32x32 |
| xl | 40x40 |

Colours (`color` prop, default `accent`): `current` (inherits text colour), `accent` #0485F7, `success` #17C964, `warning` #F5A524 (dark #F7B750), `danger` #FF383C (dark #DB3B3E). Motion: rotate 360deg, 0.75s linear infinite (`--animate-spin-fast`); disabled under reduced motion. Inline-flex, no shrink, pointer-events none.

Sources: https://www.heroui.com/docs/react/components/spinner , .../components/spinner.css

### 2.5 ProgressBar

Purpose: determinate or indeterminate progress of a task.

Anatomy: `ProgressBar` (`.progress-bar`) > `Label` (`[data-slot=label]`) + `ProgressBar.Output` (`.progress-bar__output`) + `ProgressBar.Track` (`.progress-bar__track`) > `ProgressBar.Fill` (`.progress-bar__fill`).

Layout: CSS grid, 2 columns `1fr auto`, rows "label output" / "track track", gap 4px, full width.

| Part | Spec |
|---|---|
| Label | 14px / 20px, weight 500, fit-content. |
| Output | 14px / 20px, weight 500, tabular numerals, right aligned in the auto column. Default text is a percent (`formatOptions` `{style:'percent'}`). |
| Track | relative, overflow hidden, bg `--default` (#EBEBEC light / #27272A dark). |
| Fill | absolute, start 0, full height, bg `--progress-bar-fill`; width transitions 300ms ease-out. |

| Size | Track height | Radius (track and fill) |
|---|---|---|
| sm | 4px | xs 2px |
| md (default) | 8px | sm 4px |
| lg | 12px | md 6px |

Colours (`color`, default `accent`): default = `--default-foreground` (#18181B / #FCFCFC), accent #0485F7, success #17C964, warning #F5A524 / #F7B750, danger #FF383C / #DB3B3E.

Indeterminate (no `aria-valuenow`): fill width 40%, translateX -100% -> 350% over 1.5s `cubic-bezier(0.65,0,0.35,1)` infinite. Disabled: opacity 0.5 for the whole control but the label keeps opacity 100%. Reduced motion: no animation or width transition.

Accessibility: React Aria ProgressBar (`role=progressbar`, `aria-valuenow/min/max`). Provide a `Label` or `aria-label`.

Sources: https://www.heroui.com/docs/react/components/progress-bar , .../components/progress-bar.css

### 2.6 ProgressCircle

Purpose: circular determinate/indeterminate progress.

Anatomy: `ProgressCircle` > `ProgressCircle.Track` (svg, `.progress-circle__track`) > `ProgressCircle.TrackCircle` (`stroke: --default`) + `ProgressCircle.FillCircle` (`stroke: --progress-circle-stroke`).

| Size | Track svg box |
|---|---|
| sm | 20x20 |
| md (default) | 28x28 |
| lg | 36x36 |

Colours (`color`, default `accent`): same set as ProgressBar (default uses `--default-foreground`). Track ring colour `--default`. Fill: `stroke-dashoffset` transitions 300ms ease-out. Indeterminate: whole track rotates 360deg in 1s linear infinite. Disabled opacity 0.5. Ring stroke width, radius and dash values are set in the TSX: not found.

Sources: https://www.heroui.com/docs/react/components/progress-circle , .../components/progress-circle.css

### 2.7 Meter

Purpose: static quantity within a known range (storage used, score). Same visual language as ProgressBar but never indeterminate, and it has no animation beyond the width transition.

Anatomy: `Meter` > `Label` + `Meter.Output` + `Meter.Track` > `Meter.Fill`. Grid, label/output rows, gap and typography identical to ProgressBar (label and output 14/20 weight 500, tabular numerals).

Sizes: sm track 4px radius 2px; md 8px radius 4px (default); lg 12px radius 6px. Track bg `--default`. Colours (`color`, default `accent`): default `--default-foreground`, accent, success, warning, danger. Fill width transition 300ms ease-out. Disabled opacity 0.5 (label stays 1). Accessibility: React Aria Meter (`role=meter`).

Sources: https://www.heroui.com/docs/react/components/meter , .../components/meter.css

## 3. Overlay components

Shared overlay facts (Modal, AlertDialog, Drawer): `useOverlayState()` hook controls open state. Backdrop is `fixed inset-0`, z-index 100000, height `--visual-viewport-height` (visual viewport so it tracks the mobile keyboard and URL bar), width 100%. Backdrop variants (prop `variant`, default `opaque`): `opaque` = bg `--backdrop` (rgba(0,0,0,0.5) light / rgba(0,0,0,0.6) dark); `blur` = same bg plus `backdrop-filter: blur(12px)` (Tailwind `backdrop-blur-md`); `transparent` = none. Dialog surface = bg `--overlay`, shadow `--overlay-shadow`, no border, no outline, padding 24px. Body scroll is locked while open; focus is trapped. No `env(safe-area-inset-*)` usage exists in any overlay CSS: safe-area handling is not found (they rely on visual-viewport height and the 16px container padding).

### 3.1 Modal

Purpose: focused dialog for forms and content that interrupts the page; dismissible.

Anatomy: `Modal` > `Modal.Trigger` + `Modal.Backdrop` (`.modal__backdrop`) > `Modal.Container` (`.modal__container`) > `Modal.Dialog` (`.modal__dialog`) > `Modal.CloseTrigger`, `Modal.Header` (`Modal.Icon` + `Modal.Heading`), `Modal.Body`, `Modal.Footer`.

Props: Backdrop `variant` opaque|blur|transparent, `isDismissable` true, `isKeyboardDismissDisabled` false. Container `placement` auto|center|top|bottom (default `auto`), `scroll` inside|outside (default `inside`), `size` xs|sm|md|lg|cover|full (default `md`).

| Part | Spec |
|---|---|
| Backdrop | see shared facts; flex row, centred. |
| Container | flex column, items-center, height = visual viewport height, width 100%, min-width 0, pointer-events none, padding 16px (mobile) / 40px from 640px, width fit-content from 640px. |
| Dialog | relative, flex column, w-full, bg `--overlay`, radius min(32, radius-3xl) = 24px, padding 24px, shadow overlay, pointer-events auto. |
| Placement | `auto`: dialog pushed to the bottom of the container on mobile (margin-top auto) and vertically centred from 640px. `center`: vertical centre. `bottom`: bottom. `top`: top. |
| Size (max-width on dialog) | xs 320px, sm 384px, md 448px (default), lg 512px, `cover` w/h 100% of container (so inset 16px mobile / 40px desktop), `full` w/h 100%, radius 0, no shadow, container padding 0. |
| Scroll inside | dialog max-height 100% of container, overflow clip; body scrolls (overflow-y auto, overscroll-contain, thin scrollbar). |
| Scroll outside | container becomes taller than viewport, the whole backdrop scrolls (aligned to top). |
| Header | flex column, gap 12px; icon sits above heading. |
| Icon (`.modal__icon`) | 40x40, centred, radius 24px (circular). Colours come from the consumer (AlertDialog has status variants; Modal icon has no built-in colours). |
| Heading | 16px / 24px (text-base), weight 500, colour `--foreground`. |
| Body | 14px, line-height 1.43 (20px), colour `--muted`. Has -3px margin / 3px padding so focus rings of inner controls are not clipped. |
| Footer | flex row, items-center, justify-end, gap 8px. |
| Spacing between sections | header -> body 8px; header -> footer 20px; body -> footer 20px. |
| Close trigger | absolute, top 16px, end 16px (CloseButton). |

Motion: backdrop fade-in 150ms ease-out, fade-out 100ms ease-out. Container enter 250ms `--ease-out-quad`: fade + scale from 1.05 to 1; `auto` placement on mobile also slides up from 4px below (slide-in-from-bottom-1), no slide from 640px; `top` slides from 4px above; `bottom` from 4px below; `center` no slide. Exit 100ms: fade + scale to 0.95. `full` size: no scale, no slide. Trigger press: scale 0.97 over 250ms `--ease-out-quart`. All animations off under reduced motion.

Accessibility: WAI-ARIA dialog, `role=dialog`, focus trap, Esc closes (unless disabled), `aria-label`/`aria-labelledby` required, scroll lock. Trigger focus ring per shared utility.

Mobile 375px: container padding 16px so dialog is 343px wide max, anchored to the bottom (`auto`) with all four corners 24px radius (it is a floating card, not an edge-attached sheet); use `Drawer` for a true bottom sheet. For long forms use `scroll=inside`.

Sources: https://www.heroui.com/docs/react/components/modal , .../components/modal.css

### 3.2 AlertDialog

Purpose: modal confirmation that demands an explicit choice (destructive confirm, unsaved changes). Same shell as Modal.

Anatomy: `AlertDialog` > `Trigger`, `Backdrop` > `Container` > `Dialog` > `CloseTrigger` (optional), `Header` (`Icon` + `Heading`), `Body`, `Footer`.

Differences from Modal:

- Defaults: `isDismissable` false, `isKeyboardDismissDisabled` true (no backdrop or Esc dismissal), `role="alertdialog"`.
- Sizes: xs, sm, md (default), lg, cover (no `full`; no scroll-outside).
- Dialog is `overflow: clip`, max-height 100%; body always scrolls inside (overflow-y auto, overscroll-contain).
- Icon (`AlertDialog.Icon`, prop `status`, default `danger`): 40x40, radius 24px, glyph box-content 20x20 (`data-slot=alert-dialog-default-icon`). Colours: default bg `--default` / text `--foreground`; accent bg `--accent-soft` / text `--accent-soft-foreground`; success, warning, danger likewise with their soft pairs (see 1.1).
- Layout, paddings (24px), radius (24px), heading (16/24, 500), body (14, 1.43, muted), footer (right-aligned, gap 8px), section gaps (8 / 20 / 20), close trigger (top 16, end 16), motion and backdrop: identical to Modal.

Mobile 375px: identical to Modal (bottom-anchored floating card, 343px max). Footer buttons stay in a row, right aligned.

Sources: https://www.heroui.com/docs/react/components/alert-dialog , .../components/alert-dialog.css

### 3.3 Drawer

Purpose: edge-attached panel (bottom sheet on mobile, side nav/filter panel). Supports drag-to-dismiss on handle, header and footer (body excluded so scrolling still works).

Anatomy: `Drawer` > `Trigger`, `Backdrop` (`.drawer__backdrop`) > `Content` (`.drawer__content`, prop `placement` bottom (default) | top | left | right) > `Dialog` (`.drawer__dialog`) > `Handle` (optional), `CloseTrigger` (optional), `Header` > `Heading`, `Body`, `Footer`.

| Part | Spec |
|---|---|
| Backdrop | opacity transitions 250ms `cubic-bezier(0.32,0.72,0,1)` (exit 200ms same ease), entering/exiting state opacity 0. Same colour variants as Modal. |
| Content | fixed inset 0, flex, height = visual viewport, pointer-events none; bottom: items-end; top: items-start; left: justify-start; right: justify-end. |
| Dialog (all) | flex column, bg `--overlay`, shadow overlay, padding 24px. |
| Bottom | full width, max-height 85vh, top-left and top-right radius min(32, radius-2xl) = 16px, bottom corners 0. |
| Top | full width, max-height 85vh, bottom-left and bottom-right radius 16px; extra bottom padding set to 8px (`pb-2`) so the handle sits at the bottom. |
| Left / Right | full height, width 320px (max 85vw), 384px from 640px, radius 0. |
| Handle | wrapper flex centred, padding-bottom 8px; bar 36px wide x 4px tall, radius xs 2px, colour `--separator` (#E4E4E7 light / #212124 dark). In a top drawer wrapper padding-bottom is 0. Handle -> header and handle -> body margin 0. |
| Header / Heading | flex column gap 12px; heading 16/24 weight 500 `--foreground`. |
| Body | flex-1, scrolls (overflow-y auto, overscroll-contain, thin scrollbar), 14px / 1.43 (20px), `--muted`, -3px margin / 3px padding focus-ring buffer. |
| Footer | flex row, justify-end, gap 8px. |
| Spacing | header -> body 8px; header -> footer 20px; body -> footer 20px. |
| Close trigger | absolute top 16px, end 16px. |

Motion: dialog `translate` from off-screen to 0 over 250ms `cubic-bezier(0.32,0.72,0,1)`; exit 200ms same curve (left -100% x, right 100% x, top -100% y, bottom 100% y). Reduced motion: no transitions. Trigger press scale 0.97.

Safe-area: none in CSS (no `env(safe-area-inset-bottom)`). Bottom drawer height is capped at 85vh (note: vh, not the visual-viewport var); consumers should add bottom padding for the home-indicator themselves. Not found in source.

Accessibility: WAI-ARIA dialog via React Aria Modal, focus trap, Esc closes when dismissable, scroll lock, `isDismissable={false}` disables backdrop click and drag.

Mobile 375px: bottom placement = 375px wide sheet, max 85% of viewport height; left/right drawer = 320px wide (85vw cap = 318.75px, so effectively 318.75px at 375px); handle bar centred at top with 8px below.

Sources: https://www.heroui.com/docs/react/components/drawer , .../components/drawer.css

### 3.4 Popover

Purpose: anchored floating panel with rich content (menus of settings, mini forms).

Anatomy: `Popover` > `Popover.Trigger` (`.popover__trigger`) + `Popover.Content` (`.popover`) > `Popover.Arrow` (optional) + `Popover.Dialog` (`.popover__dialog`) > `Popover.Heading` (`.popover__heading`) + content.

| Part | Spec |
|---|---|
| Content | bg `--overlay`, padding 0, base text 14px (text-sm), radius min(32, radius-3xl) = 24px, shadow `--overlay-shadow`, no border. Transform origin at the trigger anchor point. Placement default `bottom`, offset 8px, `shouldFlip` true. |
| Dialog | padding 16px, no outline. |
| Heading | weight 500. |
| Arrow | fill `--overlay`; rotated 180deg for bottom placement, -90deg for left, 90deg for right (top is the unrotated art). Arrow glyph size comes from the TSX: not found. |

Motion: enter 150ms `ease`: fade-in + scale from 0.9, plus 4px slide from the trigger side (placement top slides up from below, bottom from above, left from the right, right from the left). Exit 100ms: fade + scale to 0.95, pointer-events none. Trigger transitions: colour/bg 150ms ease, box-shadow 150ms ease-out; focus ring per shared utility.

Accessibility: React Aria Popover (dialog role inside, focus moves in, Esc and outside click close). Mobile 375px: no bottom-sheet conversion in the CSS; keep width within 343px and prefer Drawer or Modal for large content.

Sources: https://www.heroui.com/docs/react/components/popover , .../components/popover.css

### 3.5 Tooltip

Purpose: short hover/focus hint. Not interactive; do not put essential content in it.

Anatomy: `Tooltip` > `Tooltip.Trigger` (`.tooltip__trigger`) + `Tooltip.Content` (`.tooltip`) > `Tooltip.Arrow` (optional) + text.

| Part | Spec |
|---|---|
| Content | bg `--overlay`, padding 8px, text 12px / 16px (text-xs), max-width 320px (max-w-xs), `word-break: break-all`, radius min(32, radius-xl) = 12px, shadow `--overlay-shadow`. Text colour inherits (`--foreground`/`--overlay-foreground`). |
| Placement | default `top`; offset 3px (7px when arrow shown). |
| Arrow | fill `--overlay`, stroke `--border` at 40% alpha; rotation 180deg (bottom), -90deg (left), 90deg (right). Size not found (TSX). |
| Delay | API default `delay` 700ms, `closeDelay` 0 (docs). Theme variables also define `--tooltip-delay: 1500ms` and `--tooltip-close-delay: 500ms`; the docs and CSS do not say which wins, so verify before relying on either. |

Motion: enter 150ms `ease`: fade + scale from 0.9 + 4px slide from the trigger side; exit 100ms fade + scale to 0.95; `shouldSkipAnimation` skips both when moving between tooltips. Trigger focus ring per shared utility.

Accessibility: React Aria Tooltip (`role=tooltip`, shown on hover or keyboard focus). Mobile 375px: hover does not exist on touch, so tooltips are not a reliable carrier of information; use `trigger="focus"` or visible text. Keep text under the 320px max width.

Sources: https://www.heroui.com/docs/react/components/tooltip , .../components/tooltip.css

## 4. Layout components

### 4.1 Card

Purpose: grouped content container.

Anatomy: `Card` (`.card`) > `Card.Header` (`.card__header`) > `Card.Title` (`h3`, `.card__title`) + `Card.Description` (`p`, `.card__description`); `Card.Content` (`.card__content`); `Card.Footer` (`.card__footer`).

Variants (`variant`, default `default`): `transparent` (no bg, no shadow, no border), `default` (bg `--surface`), `secondary` (bg `--surface-secondary`), `tertiary` (bg `--surface-tertiary`).

| Part | Spec |
|---|---|
| Root | relative, flex column, gap 12px between header/content/footer, padding 16px, overflow visible, radius min(32, radius-3xl) = 24px, shadow `--surface-shadow` (light only; dark has none). No border. Text colour not set on the root (inherits). |
| Header | flex column (title above description, no gap). |
| Title | 14px / 24px (text-sm leading-6), weight 500, `--foreground`. |
| Description | 14px / 20px, `--muted`. |
| Content | flex column, flex-1, gap 4px. |
| Footer | flex row, items-center (no gap set; consumer spaces children). |

States: none (static). Interactive card: wrap with an anchor using `cardVariants().base()`; add your own hover/focus styling. Mobile 375px: width is whatever the parent gives; 16px padding is comfortable at 343px.

Sources: https://www.heroui.com/docs/react/components/card , .../components/card.css

### 4.2 Surface

Purpose: neutral background container that sets the elevation context (forms inside a Surface should use `variant="secondary"`). Exposes `SurfaceContext` with the current variant.

Anatomy: single `.surface` element. Root: relative, text `--foreground`.

| Variant (default `default`) | Background | Text |
|---|---|---|
| transparent | transparent | `--foreground` |
| default | `--surface` | `--surface-foreground` |
| secondary | `--surface-secondary` | `--surface-secondary-foreground` |
| tertiary | `--surface-tertiary` | `--surface-tertiary-foreground` |

No padding, radius, border or shadow is set (all consumer-defined). Sources: https://www.heroui.com/docs/react/components/surface , .../components/surface.css

### 4.3 Separator

Purpose: divider line.

| Part | Spec |
|---|---|
| Base | shrink-0, radius sm (4px), no borders, bg `--separator`. |
| Horizontal (default) | height 1px, width 100%. |
| Vertical | width 1px, min-height 8px, height auto, `align-self: stretch`. |
| Variants (`variant`) | `default` `--separator` (#E4E4E7 / #212124); `secondary` `--separator-secondary` (#D8D8D8 / #343437); `tertiary` `--separator-tertiary` (#CDCDCE / #3C3C3F). |

Accessibility: React Aria Separator (`role=separator`, `aria-orientation`). Sources: https://www.heroui.com/docs/react/components/separator , .../components/separator.css

### 4.4 ScrollShadow

Purpose: scroll container that fades its edges to hint at more content (a mask, not a drawn shadow).

Props: `orientation` vertical (default) | horizontal; `variant` fade; `size` 40 (px fade length); `offset` 0; `hideScrollBar` false; `isEnabled` true; `visibility` auto|both|top|bottom|left|right|none.

| Item | Spec |
|---|---|
| Variables | `--scroll-shadow-size` 40px, `--scroll-shadow-scrollbar-size` 10px (0px when hide-scrollbar), `--scroll-shadow-offset` 0px. |
| Container | relative; vertical: overflow-y auto; horizontal: overflow-x auto; thin themed scrollbar (`--scrollbar-thumb`). |
| Fade | CSS mask: transparent at the scrolled edge ramping to opaque over 40px; the scrollbar strip (10px) is masked separately so it stays visible. `data-top-scroll / bottom-scroll / top-bottom-scroll` (and left/right equivalents) choose the edges; in auto mode (browsers with scroll timelines) the fade length is derived from scroll position, 0 to 40px. RTL swaps horizontal gradients. |

Because it uses a mask, the root becomes a stacking context. For design tools: draw a gradient from page/surface colour to transparent 40px tall at the clipped edge(s).

Sources: https://www.heroui.com/docs/react/components/scroll-shadow , .../components/scroll-shadow.css

### 4.5 Header (no docs page found; CSS only)

`.header`: width 100%, padding 8px horizontal, 6px top, 4px bottom, text-align start, 12px / 16px, weight 500, colour `--muted`. Used as a section label inside menus and lists.

Source: .../packages/styles/components/header.css

### 4.6 EmptyState (no docs page found; CSS only)

`.empty-state`: padding 8px, 14px / 20px (text-sm), colour `--muted`. Nothing else is defined (no icon, illustration, centring or max width); layout is up to the consumer.

Source: .../packages/styles/components/empty-state.css

## 5. Typography

Component: `Typography` with prop `type` (default `body`), `align` (start|center|end|justify), `color` (`default` = `--foreground` | `muted` = `--muted`), `weight` (normal 400 | medium 500 | semibold 600 | bold 700 override), `truncate` (single line with ellipsis). Sub-components: `Typography.Heading` (`level` 1-6), `Typography.Paragraph` (`size` base|sm|xs), `Typography.Code`, `Typography.Prose` (styles raw HTML children). Base colour for everything: `--foreground` (#18181B light / #FCFCFC dark).

Font family: not found in these files (host app default; `font-mono` used for code).

### 5.1 Type styles (`.typography--*`)

| Style | Size / line-height | Weight | Letter spacing | Colour |
|---|---|---|---|---|
| h1 | 36px / 40px | 600 | -0.025em (tracking-tight) | `--foreground` |
| h2 | 30px / 36px | 600 | -0.025em | `--foreground` |
| h3 | 24px / 32px | 600 | -0.025em | `--foreground` |
| h4 | 20px / 28px | 600 | -0.025em | `--foreground` |
| h5 | 18px / 28px | 600 | -0.025em | `--foreground` |
| h6 | 16px / 24px | 600 | -0.025em | `--foreground` |
| body | 16px / 28px (leading-7) | inherits (400) | normal | `--foreground` |
| body-sm | 14px / 24px (leading-6) | 400 | normal | `--foreground` |
| body-xs | 12px / 20px (leading-5) | 400 | normal | `--foreground` |
| code | 14px / 20px, mono | inherits (400) | normal | `--foreground`, bg `--default`, padding 2px 6px, radius md 6px |

Colour modifier `muted` swaps text to `--muted` (#71717A / #9F9FA9).

### 5.2 Prose (`.typography-prose`, rich HTML)

| Element | Spec |
|---|---|
| h1-h6 | same sizes/weight/tracking as 5.1 (no margins defined) |
| p, li | 16px / 28px |
| code | as `code` above (14px mono, bg `--default`, 2px 6px, radius 6px) |
| a | weight 500, colour `--link` (= `--foreground`), underline, offset 4px |
| blockquote | margin-top 16px, inline-start border 4px `--border`, padding-start 16px, colour `--muted`, italic |
| ul / ol | margin 16px 0, disc / decimal, 8px between items, padding-start 24px |
| hr | margin 32px 0, border colour `--separator` |
| pre | margin 16px 0, overflow-x auto, radius xl 12px, bg `--default`, padding 16px, mono 14px, line-height relaxed (1.625 = about 22.75px) |
| strong | weight 600, `--foreground` |
| em | italic |
| img | margin 16px 0, radius 12px |

Other sizes used by overlays and feedback components (for consistency): dialog/drawer headings 16/24 weight 500; dialog body 14/20.02 muted; alert/card titles 14/24 weight 500; toast title 14/20 weight 500; tooltip 12/16; header 12/16 weight 500; empty state 14/20.

Sources: https://www.heroui.com/docs/react/components/typography , .../components/typography.css

## 6. Motion summary

| Component | Enter | Exit | Easing |
|---|---|---|---|
| Modal / AlertDialog backdrop | 150ms fade in | 100ms fade out | ease-out |
| Modal / AlertDialog container | 250ms fade + scale 1.05 -> 1 (+4px slide for auto/top/bottom) | 100ms fade + scale 1 -> 0.95 | `--ease-out-quad` |
| Drawer panel | 250ms translate | 200ms translate | cubic-bezier(0.32,0.72,0,1) |
| Drawer backdrop | 250ms opacity | 200ms opacity | cubic-bezier(0.32,0.72,0,1) |
| Popover / Tooltip | 150ms fade + scale 0.9 -> 1 + 4px slide | 100ms fade + scale 1 -> 0.95 | `ease` |
| Toast | 350ms translate/height, 150ms opacity | 250ms translate, 150ms opacity | `--ease-out-fluid` |
| Spinner | 0.75s linear loop | | |
| Skeleton shimmer | 2s linear loop | | |
| ProgressBar / Meter fill | width 300ms | | Tailwind default `--ease-out` (not defined in HeroUI files) |
| ProgressBar indeterminate | 1.5s loop | | cubic-bezier(0.65,0,0.35,1) |
| ProgressCircle indeterminate | 1s linear loop | | |
| Trigger press (Modal/Drawer/AlertDialog) | scale 0.97, 250ms | | `--ease-out-quart` |

Everything is switched off by `prefers-reduced-motion: reduce`.

## 7. Mobile (375px) cheat sheet

- Gutter inside Modal/AlertDialog container: 16px, so dialog max 343px wide; desktop gutter is 40px from 640px.
- Modal/AlertDialog `auto` placement is bottom-anchored on mobile with all-round 24px radius; Drawer bottom is the real edge-attached sheet (16px top radius, 85vh max, 36x4 handle).
- Toast region 343px wide (100vw - 32px), 16px from edge, stacked up to 3 visible.
- Overlays size to the visual viewport (`--visual-viewport-height`) so the on-screen keyboard shrinks them; no safe-area insets are applied.
- Tooltips are unreliable on touch; popovers have no mobile conversion.
- Minimum touch size: HeroUI ships a `touch-target` utility (24px overlay) for sub-24px controls such as the toast close button (20px).

## 8. Source index

- Docs (heroui.com, same content as repo MDX): `https://www.heroui.com/docs/react/components/<alert|alert-dialog|modal|drawer|popover|toast|tooltip|skeleton|spinner|progress-bar|progress-circle|meter|card|surface|separator|scroll-shadow|typography>`
- Component CSS: `https://raw.githubusercontent.com/heroui-inc/heroui/v3/packages/styles/components/<alert|alert-dialog|modal|drawer|popover|toast|tooltip|skeleton|spinner|progress-bar|progress-circle|meter|card|surface|separator|scroll-shadow|typography|empty-state|header>.css`
- Tokens: `.../packages/styles/themes/default/variables.css`, `.../packages/styles/themes/shared/theme.css`, `.../packages/styles/utilities/index.css`, `.../packages/styles/base/base.css`
- Docs MDX in repo: `.../apps/docs/content/docs/en/react/components/(feedback|overlays|layout|typography|utilities)/<name>.mdx`

## 9. Values not found

- Font family (sans/mono stack).
- Spinner ring SVG geometry (stroke width, arc length); ProgressCircle ring radius, stroke width and dash values (set in TSX, not CSS).
- Alert and Toast default status icon glyphs (TSX).
- Popover and Tooltip arrow glyph dimensions (TSX).
- Toast stacking offsets and scale per index (`--offset-collapsed`, `--offset-expanded`, `--scale-collapsed` are computed in JS; only `gap` 12px and `scaleFactor` 0.05 are known).
- Safe-area insets (`env(safe-area-inset-*)`) for Drawer, Modal and Toast: not used in the CSS.
- Exact easing for `--ease-out` used by ProgressBar, ProgressCircle, Meter (Tailwind built-in, not declared in the HeroUI token files).
- Which Tooltip delay is effective (700ms/0 prop defaults in docs vs 1500ms/500ms CSS variables).
- Label component styling inside ProgressBar/Meter beyond `text-sm font-medium` (Label CSS not part of this scope).
- Docs pages for EmptyState and Header (none exist in the docs tree; only CSS).
- Hex for the `data-vibrant-palette` soft-foreground variants (formula only).
