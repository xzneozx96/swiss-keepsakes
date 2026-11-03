# Bulk selection: checkboxes and the shared ActionBar

Read this before you add an action that works on several rows, tiles or items at once. The owner set this pattern on 2026-11-03: "since now we have a table, introduce selectable checkboxes, then use the action bar component to perform the action. Remember this pattern."

## The pattern

1. **The rows can be ticked.** Each row or tile has a checkbox, and the list has a "Select all" checkbox. Select all is checked, unchecked or indeterminate.
   - **Tables:** pass `selection` to the shared `DataTable` (`front-end/src/components/data-table.tsx`). It uses HeroUI's table selection (`selectionMode="multiple"`, `Checkbox slot="selection"`) and adds the checkbox column and the header's Select all. `isSelectable` keeps a row from being ticked; that row shows no checkbox.
   - **Lists that are not a table** (the variant rows, the media wall): a HeroUI `Checkbox` on each item, and the shared `Check` (`components/check.tsx`) for Select all, as in the cart.
2. **The actions sit in the shared `ActionBar`** (`front-end/src/components/action-bar.tsx`). It shows while at least one row is ticked, with the count, the actions and a clear button.
   - An action that removes or deletes has `tone: 'danger'` and asks first through the shared confirm dialog.
   - One bulk action sends one request.
   - When an action can't apply to every ticked row, the bar's `note` says how many it skips ("2 in use, kept").
3. **One selection at a time on a screen.** When a screen has two selectable lists, ticking in one clears the other, so only one ActionBar shows. The variants block and its archived table do this.
4. **Place the ActionBar last** in its block or screen. Its spacer keeps the floating bar off the last row.

## Don't

- **No "Delete all", "Archive all" or "Select" buttons** under or above a list. Select all plus the ActionBar replaces them.
- **No feature-made bulk bar.** Reuse `ActionBar`. If it lacks something, extend the shared component.
- **No per-row icon in place of selection for bulk work.** A row may still have its own icon actions (Edit, Delete) for the one row.

## Where it is used

- `features/media/components/media-screen.tsx`: the photo wall.
- `features/keepsakes/components/variants-block.tsx`: the variant rows (price, For sale, Hidden, Delete or Archive) and the archived table (Delete for never-sold variants).

## Related

- `heroui-and-styling.md`, "Reuse shared UI and match loading layouts".
- `docs/decisions/2026-11-02-keepsake-editor-steps.md`, items 18 and 24.
