# Table

Tabular data with sorting, selection and a footer; the money table for payments and reports on desktop, with a stacked row pattern for phones.

## Covers
HeroUI v3 `Table` (`ScrollContainer`, `Content`, `Header`, `Column`, sortable header and indicator, `ColumnResizer`, `Body`, `Row`, `Cell`, `Footer`, `LoadMore`).

## Spec
- Primary: root `color-surface-secondary`, padding 0 4px 4px, radius 20px; header sits on the grey; body cells on `color-surface`, outer body corners 16px.
- Secondary: no frame; header cells on `color-surface-secondary` as a pill (outer corners 16px); every row has a bottom border; hover `color-default` at 50%.
- Header cell: padding 16px x 10px, 12/16 500 `color-muted`, start aligned (36px row); column separator 1px x 16px `color-separator`, none on the last column.
- Body cell: padding 16px x 12px, 14/20 400 `color-foreground`, 1px bottom border (45px row). No zebra striping.
- Hover: cell `color-surface` at 40% over the grey. Selected: `color-surface` at 10%; selection is shown by a leading Checkbox.
- Sort indicator: 12px chevron, up = ascending, rotates 180deg descending (100ms); only on the sorted column.
- Focus: inset 2px `color-focus` ring across the row, radius 8px.
- Resizer: 1px x 16px, becomes 2px full height in `color-accent` on hover.
- Empty state: none built in; provide one (see EmptyState). Virtualised rows 48px.

## Our changes
- Amounts right aligned with tabular figures, formatted CHF 1’249.00.
- Status column uses the one status label: Chip `soft`, `lg` (28px), 14px icon and words. Rows grow to 45px+ around it (8px vertical cell padding in that column).
- Row lines use `color-separator`.
- Phones (C14): no table. Each order or booking is a stacked row on a surface card: name and amount on one line (amount right, tabular), reference and date in `caption`, then the progress label and the payment label.

## Use
- Payment history and ledgers on merchant desktop (M04, M07, M16), partner report (P02), reports (M21). Stacked rows for the customer's transaction list (C14).

## Don't
- Don't use Table at 375px; it scrolls sideways. Use the stacked rows.
- Don't colour whole rows to show status.
