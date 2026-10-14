# Order cards: local lab candidates

Status: **L selected for the lab**, updated 2026-10-13. K and M remain
unapproved alternatives. The user selected L and requested a consistently white
surface and separate payment rows. Earlier layouts remain unapproved.
This record describes the K/L/M experiment at `/lab/order-cards`; it establishes
no production component or global design rule. Source inspection alone does
not establish visual acceptance.

## Inherited authority

The existing authority remains `docs/ux/design-system/project/tokens.json` and
the implemented HeroUI theme in `front-end/src/styles/theme.css`. Neither is
changed by this experiment. No root `DESIGN.md` or global design sidecar is
introduced.

The candidates use the existing semantic roles: warm page background
(`--background`), white surfaces (`--surface`), quiet secondary surface
(`--surface-secondary`), ink (`--foreground`), muted metadata (`--muted`), and
fine separators (`--separator`). Progress uses the existing info, success,
warning and danger roles with explicit status words. Payment remains an
independent fact; neutral, informational and successful payment states use
muted text, while warning and danger retain their semantic emphasis.

Shared details retain the established 4px spacing rhythm, rounded thumbnails,
medium/semibold UI emphasis, tabular quantities and totals, semantic hover
colors, and the existing focus-ring utility. K inherits `shadow-surface` and
`shadow-overlay`; L uses tonal layering and rules; M uses spacing and rules.
No new color or shadow primitive is added.

## Candidate decisions

| Candidate | Composition | Reason to compare |
| --- | --- | --- |
| K · Order sheet | Status first; guest and total on one line; complete gift rows; pickup and payment below a divider. White, softly elevated 16px-radius surface with 20px padding. | Gives each order a calm, self-contained reading sequence while keeping every gift visible. |
| L · Pickup ticket | Date tile, guest and pickup place on the same white surface as the gift body; total, payment status, amounts and due date each on their own row below a dashed rule. 16px-radius outlined surface. | Makes pickup timing the first scanning cue and keeps payment facts easy to read independently. |
| M · Open ledger | Pickup-date heading and count; unboxed orders separated by fine rules; guest and total, progress, complete gifts, pickup place, payment and reference. | Tests whether date grouping and typography can provide sufficient structure without individual card shells. |

All candidates share the same five sample orders, including a two-gift order.
L opens by default. Each preview is capped at 375px; the comparison becomes three columns at
1100px. Selecting a candidate shows it alone. Earlier directions remain
available as comparison material and are not treated as approved precedents.
Every order remains a single linked surface with visible keyboard focus.

## Scope and consistency notes

The palette, status vocabulary, imagery component, icons, order labels and
money/date formatting are inherited. The 375px previews, 1100px comparison
breakpoint, ticket geometry, 16px card corners, enlarged guest headings and
11px weekday label are local candidate choices, not additions to the system.
They require review alongside readability, long names, multiple gifts, payment
states and phone-width behavior before any production adoption.

One pre-existing authority mismatch is visible: `tokens.json` records
foreground, default foreground and focus as `#1a1a1a`, while `theme.css` uses
`#33312e` and aliases default foreground/focus to that ink. The CSS comment
attributes this to an owner request on 2026-10-13. The candidates inherit the
implemented theme; this record does not reconcile or overwrite either source.
