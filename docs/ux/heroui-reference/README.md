# HeroUI v3 reference for Swiss Keepsakes UI design

Purpose: give the UI designer exact HeroUI v3 (React) component specs, plus the mapping from our approved tokens (`docs/ux/moodboard/type-and-colour.html`) onto HeroUI's theme. Rebuild HeroUI's components as specified; change only colour and font.

Status: design system built in Paper, file `swiss-keepsakes` (https://app.paper.design/file/01M4SQ6XAWY55W3T4BAXPBW5H3). Page Foundations: Colour, Type and shape. Page Components: 01 Buttons and actions, 02 Forms, 03 Selection and navigation, 04 Date and data, 05 Feedback, overlays, layout. Tokens live in the Paper file (Tailwind v4 names, e.g. `--color-accent`). 70 of 72 components are drawn; Form and DisclosureGroup have no HeroUI visual style and are described in text only. Departures from HeroUI defaults are marked in red notes on the sheets and logged in `docs/ux/decisions.tsv`.

## Licence and source of truth

- HeroUI v3 React is free and open source, Apache 2.0. Official Figma kit: "HeroUI Figma Kit V3" (linked from the HeroUI docs; not reviewed here).
- Source of truth is HeroUI's own CSS, saved verbatim here: `source-variables.css` (light and dark token values) and `source-theme.css` (radius scale, token wiring). Component CSS: `packages/styles/components/*.css` in `heroui-inc/heroui`, branch `v3`.
- The five spec files were extracted by subagents from that CSS and the docs MDX. Where docs prose and CSS disagree, the specs follow the CSS and list the differences.
- Hex values in the specs are the extractors' own OKLCH-to-sRGB conversions (about 1 step per channel off), not copied from source. Re-derive from `source-variables.css` if an exact hex matters.
- Spot-check done: Card padding, gap, radius and typography match `card.css`. The other files were not line-checked.

## Coverage

The HeroUI v3 React docs list 72 component pages in 15 categories (enumerated from `apps/docs/content/docs/en/react/components` on branch `v3`). Every one has a heading in the files below. The 6 colour components are brief, and EmptyState and Header (in the styles package, no docs page) are from CSS only. Heading presence was checked by script; spec depth was not audited per component.

## Files

| File | Components |
| --- | --- |
| `01-actions.md` | Button, ButtonGroup, CloseButton, ToggleButton, ToggleButtonGroup, Link, Dropdown, Toolbar, Kbd |
| `02-forms.md` | Input, TextArea, TextField, NumberField, SearchField, InputGroup, InputOTP, Label, Description, ErrorMessage, FieldError, Fieldset, Form, Checkbox, CheckboxGroup, RadioGroup, Switch, Slider |
| `03-selection-navigation.md` | Select, ComboBox, Autocomplete, ListBox, TagGroup, Tabs, Accordion, Disclosure, DisclosureGroup, Breadcrumbs, Pagination |
| `04-date-data-display.md` | Calendar, RangeCalendar, DateField, DatePicker, DateRangePicker, TimeField, Table, Badge, Chip, Avatar, AvatarGroup, colour components |
| `05-feedback-overlays-layout.md` | Alert, AlertDialog, Modal, Drawer, Popover, Toast, Tooltip, Skeleton, Spinner, ProgressBar, ProgressCircle, Meter, Card, Surface, Separator, ScrollShadow, Typography, EmptyState, Header |

Every file ends with a "values not found" list. Do not guess those values; decide them as design choices and record the decision.

## Token mapping: our theme onto HeroUI

| HeroUI token | Our value | Note |
| --- | --- | --- |
| `--accent` | `#D52B1E` | Brand red. Actions only. `--accent-foreground` white (5.0:1) |
| `--background` | `#F7F7F5` | |
| `--surface`, `--overlay`, `--field-background` | `#FFFFFF` | |
| `--foreground` | `#1A1A1A` | |
| `--muted` | `#5E5E5A` | Our "ink 2" |
| `--default` | `#EFEFEC` | Our "muted" |
| `--border`, `--separator` | `#DCDCD7` | Our "line" |
| `--success` / soft | `#17663A` / `#E3F1E8` | |
| `--warning` / soft | `#854D0E` / `#FEF3C7` | |
| `--danger` / soft | `#9A3412` / `#FDECE5` | Overdue and error. Brick, never solid red. Use the soft variant with icon and words |
| info (extra, HeroUI has no info role) | `#1F5FA8` / `#E6EEF8` | |
| accent soft | `#FCE9E7` | Selected background |
| Fonts | Source Serif 4 (display, titles), Inter (UI, tabular numbers) | HeroUI defines no font family. Accepted, see Design decisions |

Notes:
- HeroUI derives `*-soft` as the status colour at 15% over transparent, and `*-soft-foreground` as a mix with `--foreground`. We have approved solid tints, so set them directly and check each soft foreground still reaches 4.5:1 on its tint.
- Our `--charcoal` `#4A4A48` has no HeroUI equivalent. Use it for secondary text or drop it.
- Our draft uses 16px card radius and pill buttons. HeroUI at `--radius` 8px gives cards 24px and buttons 24px (`radius-3xl`). Decide whether to keep HeroUI's radii or lower `--radius`; changing `--radius` rescales every component.
- Dark mode: HeroUI ships a dark theme. The UX spec defines only light. Out of scope unless asked.

## Facts that affect our screens

- Primary button is `--accent`; use one per context. Secondary is `--default` grey. Danger is solid `--danger`; for overdue and refund-failed states use `danger-soft` variants so brick never becomes a large solid fill.
- Fields draw no border by default (width 0, transparent). We chose a visible border (Design decisions, item 3), so set the field border tokens.
- Read-only has no styling in HeroUI. Confirmed date and place on order details (C15, M04) need a designed read-only treatment, or use plain text rather than a disabled field.
- On phones Input is 40px tall with 16px text, but SearchField and NumberField are fixed 36px. Check clipping at 375px.
- Overlays ignore `env(safe-area-inset-*)`. Bottom sheets (C05, M08, M09, M10) need home-indicator padding added by us.
- No pull-to-refresh, bottom tab bar, stepper, timeline, price/quantity stepper (NumberField is the nearest), image carousel, star rating or map. Spec items that need these are custom: order timeline (C15, C16), progress steps (C21), rating (C18), money table (use Table), departure picker (C10, use ListBox or custom rows).
- Disabled opacity is 0.5 across components. Check that disabled text still reads at the moods' contrast.
- Tooltip delay conflict: docs say 700ms open and 0 close, `variables.css` says 1500ms and 500ms. Pick one.
- Motion: most transitions use `--ease-out`, undefined in HeroUI's files. Extractors assumed Tailwind v4's `cubic-bezier(0,0,0.2,1)`.

## Component to spec mapping (UX spec §10.2 shared components)

| Need | HeroUI part | Gap |
| --- | --- | --- |
| Two status labels (progress, payment) | Chip, `soft` variant, by colour | Icon and words required by spec §5.5; Chip has no icon slot rule beyond content |
| Product / tour card | Card + Card.Header/Content/Footer, Button, Chip | Image area and price row are custom |
| Date field | DateField / DatePicker + Calendar | Our "ngày nhận hợp lệ" disabled-date state: Calendar unavailable cell |
| Money table | Table | No zebra, no empty state default, no tabular-number rule; add `tabular-nums` |
| Transaction history | Table or ListBox rows | Custom timeline for order status |
| Confirm money action | Drawer (mobile) / AlertDialog (desktop) | Safe-area padding |
| Login sheet, 6-digit code (C05) | Drawer + InputOTP + Button | Resend countdown is custom |
| Tour counter by age group (C10) | NumberField | 36px height caveat |
| Filters and categories (C02) | TagGroup or ToggleButtonGroup | |
| Hold timer, 15 min (C12) | ProgressBar or text + Alert | Timer text is custom |
| Loading (spec §5.5: skeletons) | Skeleton | |
| Toasts, banners | Toast, Alert | |
| Merchant reports (M21) | Meter, ProgressBar, Table | No chart components in HeroUI |
| Language tabs EN/DE (M12, M13) | Tabs | |

## Design decisions (accepted 2026-10-13, logged in `docs/ux/decisions.tsv`)

1. Fonts: Source Serif 4 for display and titles, Inter for all UI and tabular numbers, as in `type-and-colour.html`.
2. Radius: HeroUI default, `--radius` 8px (buttons, tabs, cards, popovers 24px; fields 12px).
3. Fields: visible border, kept soft at user request. Text-like fields (input, select, date, OTP): `--field-border: #C4C4BF`, hover `#A6A6A1`. Checkbox and radio controls: separate `--control-border: #8E8E89` (3.3:1, WCAG 1.4.11, because the edge is the only sign of an unchecked control). Focus = accent ring. Invalid border: `--danger`.
4. Icons: the soft 3D travel icon set from the moodboard. HeroUI ships no icons; small UI glyphs (chevrons, close, check) stay as line icons.
5. Screen copy: English and German. No Vietnamese for now.
