# The keepsake editor is three steps, with options and variants on one step, as in Shopify

- Date: 2026-11-02
- Status: **decided on 2026-11-02** (owner, in chat). It is being built as T-008 in run `20261030-keepsake-editor-polish`. This record also writes down the editor decisions of 2026-10-30 and 2026-11-01. Until today they lived only in the run's `decisions.tsv`.
- Changes: `docs/ux/keepsake-editor-design.md` (dated note at the top), `docs/decisions/2026-10-29-keepsake-catalog-design.md` (dated note), `docs/development-plan/screen-inventory.md` (S7 M12, D16), `docs/development-plan/delivery-plan.md` (dated paragraph, E6.1).
- Source: the owner's answers of 2026-10-30 (gates G-KE-SHARED-HOME, G-KE-STEPS, G-KE-SAVE, G-KE-LIST), 2026-11-01 (keepsake removal, rich description, create at Review), and 2026-11-02, after watching Shopify's "How to add a product" video (help.shopify.com/en/manual/products/add-update-products).
- Related: ADR-003, ADR-014, ADR-017 and ADR-027 (none changed by this record). Run plan: `.factory/runs/20261030-keepsake-editor-polish/plans/one-page-editor-proposal.md`. Shopify frames: `.factory/runs/20261030-keepsake-editor-polish/evidence/shopify-reference/`.

## Why

The 2026-10-29 design (cards, with options and variants in sheets) became a stepped editor on 2026-10-30: Details, Options, Variants, Review and publish. On 2026-11-02 the owner still found options and variants off. Size with four values took four screens: the options list, the option page with its own Save, the variants list and the variant page. The price of a keepsake with no options hid behind the Variants step, and combinations had to be added by hand. The owner compared it with Shopify, where options are typed in place and the variants appear under them.

## Decisions

### Standing from 2026-10-30 and 2026-11-01

1. **One stepped editor** for a new and an existing keepsake, with the place editor's layout: the step list on the left and white blocks on the right (G-KE-STEPS). The step component is shared in `front-end/src/components` (G-KE-SHARED-HOME).
2. **An existing keepsake autosaves.** The bottom bar shows the save state with Back and Next (G-KE-SAVE).
3. **A new keepsake is created only at Review and publish**, by Publish or Save as draft. Until then it is held in the browser session.
4. **The Description is rich text**, one Tiptap document per language (ADR-003, amended 2026-11-01).
5. **Delete** removes a keepsake that was never sold and archives one that was (ADR-014 and ADR-017, amended 2026-11-01). Delete sits in the step bar.
6. **The Keepsakes list matches the Places list** (G-KE-LIST).

### New on 2026-11-02

7. **Three steps:** Details, **Options and variants**, Review and publish. The owner kept the steps rather than one long Shopify page.
8. **No options:** the step shows a Price block (price, SKU code, For sale or Hidden) for the single variant, edited in place.
9. **Options are typed in place** (Shopify):
   - option name with suggestions;
   - one row per value, with a drag handle and a delete icon;
   - an empty "Add another value" field under the last value;
   - Done collapses the option to its name and value chips.

   There is no separate option page.
10. **Every combination appears as values are added.** The merchant removes the unwanted ones, and removed combinations show as "Not sold: n · Add back".
    - A saved variant that is removed is archived, which is final (ADR-017).
    - The "Add all combinations" action goes.
    - Done saves the options and creates the new variants in one request.
11. **Variants:**
    - rows show price in place and status as coloured text;
    - with two or more options they are grouped by the first option;
    - selected rows can be changed together (price, For sale, Hidden, Archive) in one request;
    - Edit opens the variant sheet.
12. **Saving stays autosave.** The owner chose autosave over a Save bar.
13. **One EN/DE switch for the whole editor**, by the title. The tabs inside cards go.
14. **The step bar never covers the content.**
15. **No stock column.** Stock arrives with E6.3.

## Rejected

- **One long page for new and existing keepsakes** (Shopify). The owner kept the steps.
- **A guided create, then one page for editing** (Medusa).
- **A Save bar** with Discard and Save.
- **Every combination listed with a checkbox to untick** (Medusa).
- **Keeping the "Add all combinations" button.**
- **EN/DE tabs per card.**
