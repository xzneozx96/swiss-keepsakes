Swiss Keepsakes sells keepsakes and tours from Lucerne makers to travellers, mostly on a phone. The interface is HeroUI v3 with two changes only: our colours and our two typefaces. Build every screen from these components and tokens; do not invent new shapes.

## Principles

- Use HeroUI geometry as specified on each component card. Change colour and type only; where a card lists "Our changes", those departures are agreed and apply everywhere.
- Design for 375px first with a 16px side gutter. Controls are 40px tall on phones (`breakpoint-md` and up: 36px).
- One primary action per screen or sheet. Secondary and tertiary actions use the grey `color-default` fill.
- Status is always a tint, an icon and words. Never colour alone (UX spec §5.5).

## Colour

- Page ground is `color-background`; cards and sheets sit on `color-surface` / `color-overlay` with `shadow-surface` / `shadow-overlay`, no borders.
- Text is `color-foreground`; meta text is `color-muted`. Both pass 4.5:1 on `color-background` and `color-surface`.
- `color-accent` (Swiss red) means action or selection: primary buttons, the selected day, the active tab line, slider fill. Never use it for errors, decoration or large areas.
- Overdue and errors use `color-danger` (brick), shown as `color-danger-soft` with `color-danger-soft-foreground`, an icon and words. Brick is never a solid fill: destructive buttons use the ink `color-destructive` with `color-destructive-foreground`.
- Status roles: `color-success` paid or confirmed; `color-warning` due or on hold; `color-danger` overdue or failed; `color-info` waiting or in progress. Each has a `-soft` background and a `-soft-foreground` text token.
- Selected states use `color-accent-soft` with `color-accent-soft-foreground`, plus a 12px check icon and a 1px `color-selected-border` outline, so selection never depends on hue alone.
- Fields, checkboxes and radios have a 1px (`border-width-field`) `color-field-border`, 3:1 on white and on the page ground. Fields stay 40px on phones: 7px vertical padding + 24px line + 2px border.
- Focus is a 2px `color-focus` (ink) ring with a 2px gap; on fields the ring sits flush. Ink keeps focus distinct from the brick invalid state.
- Never place the red next to a cross or shield emblem.

## Type

- `display`, `title` and `card-title` (Source Serif 4, weight 500) are for places, products and stories only: page heroes, product and tour names, story titles.
- Everything inside components (buttons, fields, chips, tables, dialogs) is Inter at HeroUI sizes: `ui` 14/20, `caption` 12/16; field text is 16px on phones.
- `heading` (Inter 600) titles UI sections; `body` (15/22) is running text; `label` (13/18) is meta.
- Prices, dates and quantities use tabular figures (`numbers`, or the `.num` class). Format money as `CHF 1’249.00` and dates as `14.10.2026`.

## Shape and space

- Radii follow HeroUI's `--radius` 8px scale: buttons, cards, popovers and dialogs `radius-3xl` (24px); fields `radius-xl` (12px); chips and list items `radius-2xl` (16px).
- Spacing is the 4px HeroUI unit (`spacing-1` … `spacing-16`). Card padding `spacing-4`; dialog and drawer padding `spacing-6`.
- Disabled controls use `opacity-disabled` (50%).

## Content

- Copy is English and German. Write German as used in Switzerland: "ss", never "ß" (Grusskarte, gemäss).
- Say what happens and what it costs: "CHF 54.00 bezahlen", "Platz reserviert · noch 12:40 Min.". Errors say what went wrong and keep entered data.
- Empty states: one sentence and one next action.

## Iconography

- Line icons (1.6px stroke, round caps) at 16px in controls and 20px in buttons on phones are placeholders in the same style HeroUI uses.
- Illustrations and empty states use a soft 3D travel icon set. The set is not yet chosen or licensed; cards show a labelled slot.

## Patterns

- Recording or adjusting a payment opens a sheet (Drawer on phones, Modal on desktop) that states the amount and the consequence before saving.
- Cancelling or refunding opens an AlertDialog: tertiary "keep" button and an ink destructive button, with the amount and the consequence in the body.
- On narrow screens (below 360px) stack sheet and dialog footer buttons full width, primary on top.
- Loading uses Skeleton, never a full-page spinner.
- Long lists and tables on phones become stacked rows; Table is for merchant desktop.

## Reading the cards

- Each card shows one component on the shared `.ds-stage`. Grey monospace text (`.ds-note`) names states and sizes; it is annotation, not part of the component.
- Cards are drawn at phone sizes unless they say desktop.

## Not carried over

- No logo yet: set the name in plain type.
- Font files are hosted by Google Fonts (Inter, Source Serif 4); none are stored here.
- One light theme only; HeroUI's dark theme is not designed.
- The 3D icon set is not sourced.
- Form and DisclosureGroup have no visual of their own in HeroUI; see Fieldset and Disclosure.
