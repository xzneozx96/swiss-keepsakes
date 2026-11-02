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
16. **SKU codes are optional, as in Shopify (owner, 2026-11-02).**
    - A keepsake-level switch, "This keepsake has SKU codes", sits in the Price block and in the Variants block header. It is off for a new keepsake.
    - Off: no code field anywhere (Price block, rows, variant sheet), and new variants have no code. On: the code field shows, and each row shows its code as a small mono line (from `lg`, in a column of its own between the photo and the value chips, left-aligned, centred on the row, wrapping at "-" rather than truncating; on phones it stays under the chips).
    - New rows while it is on are prefilled with the keepsake code and the full value labels, upper case: `1.6795-XS-RED`. A clash gets `-2`. The merchant can edit every code.
    - The switch state is derived: on when any variant that is for sale or hidden has a code. A choice made before any code exists is kept in the editor. Archived variants keep their codes and do not count.
    - Turning it off asks ("Remove the SKU codes of all n variants?"), then clears the codes in one `PATCH .../variants`.
    - The code stays unique per shop when present (`UNIQUE (store_id, sku_code)`; NULLs are distinct). A refusal names a variant that has no code by its values.
17. **Option names are suggested from the shop's other keepsakes.** The fixed Size, Colour, Theme and Material list goes. The keepsake list items carry `optionNames`, so the editor reads no extra request, and with no other option in the shop there is no list.
18. **Bulk select is the cart's "Select all" checkbox** (checked, unchecked or indeterminate) in the Variants header. The Select dropdown goes.
19. **The variant sheet** has no empty-state text, Status is a Select (as in the Price block), and the footer has Archive on the left with Cancel and Save on the right.
20. **Colour swatches are removed** (owner: "redundant"): the UI, the draft logic, the contract (`swatch`), the API, and the column `catalog.product_option_values.swatch` with its CHECK (migration 0017; the dev branch held no stored swatch).
21. **Add another option is always visible** (up to five). With an option open it runs that option's Done first; a refused Done keeps the option open and opens no second one. The "Paste a list…" helper text goes; pasting a list still works.
22. **A variant has one photo** (owner, 2026-11-02), chosen from the keepsake's photos first, or the library with Upload a photo. `catalog.skus.media_id` is a plain id with no foreign key (ADR-013). The API refuses a file that is not an image in the store's library, and one that is retired or still processing. A photo the keepsake does not have yet joins the keepsake's photos. Keepsake photos do not count as media uses yet (open point 2 of the 2026-10-29 media decision); a variant photo does not either.

### Amended on 2026-11-02, later (owner, chat)

23. **Option changes are held in the browser and saved once, when the merchant leaves the step.** This amends 10 and 12. On a saved keepsake, Done, Add another option, Edit, a deleted value and a new order of the options change only the browser's draft. Done folds the option at once and sends no request.
    - **When it saves:** one `PUT .../options` (the options, the values the saved variants take of a new option, and the new variants) runs on Next, Back, a step in the step list, or leaving the editor. A refusal keeps the merchant on the step and opens the option it names with its errors; one that names no option shows in an alert.
    - **An option still open** when the merchant leaves asks to finish it with Done first, as a new keepsake does.
    - **Leaving the editor** with held options asks first, with the existing leave dialog. Leave saves the options first and goes only if the save is accepted.
    - **The step bar** says "Unsaved changes" while options are held.
    - **Rows to come:** the combinations the held options bring show as rows to come, as for a new keepsake. They take a price, a code and a photo, which go into `newVariants`. They have no status: the API makes a new variant for sale, so the For sale and Hidden actions are off for them until the save. "Not sold" and Add back work on the draft and send nothing.
    - **Saved variants** still save at once: price, status, code, photo and the bulk actions. A value or option that a variant uses (archived ones too) cannot be removed (ADR-017), so the options save never archives a variant.
    - **A new row has no status of its own (owner, 2026-11-02):** rows to come are always For sale. A merchant who wants one hidden sets its status on the saved row, after the save. The API does not change.
    - **Leaving by any route (T-019):** the leave dialog says what happens, "Save your changes?" with "Your changes are saved when you leave." and the buttons Keep editing and Save and leave. It opens for the editor's Back, for a link or the sidebar and for the browser's Back (the router's blocker); a tab close or a reload gets the browser's own prompt. Save and leave runs Done on an option that is still open, then saves; a refused Done or save keeps the merchant on the page. When the autosave itself could not save (a stale or failed save), the dialog says the edits are lost instead.
    - **Why:** on the dev database (Singapore) one options save took 2.1 s, and Done waited for it. The owner: make it optimistic and save once at the end, because the merchant may change their mind before it is saved.

### Amended on 2026-11-02, T-019 (owner)

24. **Option and variant rows have icons, and a variant is deleted when it was never sold.**
    - Option rows and variant rows show an Edit icon and a Delete icon (the Delete icon in the danger tone), each named after its row ("Edit Size", "Delete Size", "Delete XS / Red"). The Edit text button goes. The open option's own Delete option button stays: it deletes an option that was only just added, and a finished option is deleted from its row.
    - Deleting a variant is the keepsake's rule (ADR-014, ADR-017 amended 2026-11-02): a variant that no order line names is deleted and its combination shows in "Not sold · Add back"; one that an order line names is archived, which is final. The confirm dialog says which will happen, and for a selection that mixes both it gives the number of each. Orders are not built, so every variant deletes until E7.1 implements `soldSkuIds`.
    - The bulk bar's Archive and the variant sheet's Archive (left of the footer) are Delete, with the same rule.
    - One request does it: `status: removed`, on the single and the bulk variant routes.
    - **Icons tell the two apart:** a variant that will be deleted has the trash icon ("Delete XS / Red"), one that has orders the archive icon ("Archive XS / Red"); the bulk bar and the sheet footer follow the same rule.
    - **Archived variants that were never sold can be deleted** (an earlier rule archived them): the "N archived" list has a trash icon on each of them and "Delete all never sold"; a sold archived variant stays and has no icon. `removed` on an archived variant deletes it when no order line names it, and is refused otherwise.
    - **The in-use refusals count live and archived variants apart** ("Used by 3 live (A, B, C) and 9 archived variants"); only the live ones are named, so the number agrees with the rows on screen. A value's inline note does the same.

## Rejected

- **One long page for new and existing keepsakes** (Shopify). The owner kept the steps.
- **A guided create, then one page for editing** (Medusa).
- **A Save bar** with Discard and Save.
- **Every combination listed with a checkbox to untick** (Medusa).
- **Keeping the "Add all combinations" button.**
- **EN/DE tabs per card.**
