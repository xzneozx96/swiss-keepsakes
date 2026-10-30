# The keepsake catalog is linked screens: M11, M12 with N14 and N15, a variant page and Inventory N13

- Date: 2026-10-29
- Status: **approved on 2026-10-29** (approval given in chat by the owner, on the lab page `/lab/keepsake-editor`). Ten points stay open (see "Open points"). Prices, themes, colours and design rights are still mock data (O26).
- Changes: `docs/ux/keepsake-editor-design.md` (new), `docs/ux/story-editor-design.md` and `docs/decisions/2026-10-29-story-editor-design.md` (dated note), `docs/development-plan/screen-inventory.md` (S7, M11, M12, N13, N14, N15, D16), `docs/development-plan/delivery-plan.md` (E6.1, E6.2, E6.3), `docs/adr/ADR-027-generic-product-options-with-combination-key.md` and `docs/adr/ADR-022-medusa-study-keep-stock-per-sku-and-skip-purchasing-flags.md` (History lines), `docs/ux/design-system/project/components/Button/README.md` (dated note)
- Note of 2026-10-30: the owner decided that an archived variant cannot be restored (gate G-E62-RESTORE). The lab's "Restore as hidden" is not built, and the "Restore as hidden" rule in the follow-up work of E6.2 below is closed. Open point 11 says what follows for a duplicate.
- Source: the owner's approval of the lab page `/lab/keepsake-editor` on 29.10.2026
- Related: `docs/ux/keepsake-editor-design.md` (the full specification), `docs/decisions/2026-10-29-story-editor-design.md` (M17, whose flow M12 follows), `docs/decisions/2026-10-29-media-library-design.md` (N18, the photo picker), `docs/adr/ADR-017`, `ADR-027`, `ADR-009`, `ADR-016`, `ADR-022`, `docs/specs/001-storytelling-pivot/data-model.md` (DM-7)

## Why

Slice S7 had no design for the merchant catalog. The screen inventory listed M11 (the keepsake list), M12 (the editor), N13 (Inventory), N14 (options) and N15 (SKU combinations) as one group of Design rows. A coding agent built three first options on one lab page, `/lab/keepsake-editor`. A was cards, B was a Shopify-style matrix, and C was steps. The owner then asked for the structure of the Medusa admin: separate, linked screens instead of one big page. The agent rebuilt the lab that way, and the owner approved the result. The first options A, B and C are no longer in it.

Three Medusa features were judged to fit our model badly and were **not adopted**: shared global options, the separate inventory item model with several stock locations, and breadcrumbs.

## Decision

1. **Navigation.**
   - The sidebar has two items under Products, **Keepsakes** and **Inventory**. Pickup points stays.
   - There is no Options item and no product-categories item.
   - Every other screen is reached by clicking. A detail page shows a back arrow before its title, never a breadcrumb.
2. **Keepsakes list (M11, keepsakes only).** Each row has a thumbnail, the name, the number of variants with the number sold out, the status and a ⋯ menu. The button **Create** opens the create flow.
3. **The keepsake page (M12) follows the story editor's flow (M17).**
   - The **edit screen** is a column of cards edited in place: Name and text (with the shared language switch), Media, Options, Variants and the shipped `CommissionCard`.
   - Name, text, media and commission save by themselves. Options and variants save whole, so they open in the shared `SheetFrame` sheets N14 and N15 with Save and Cancel.
   - The **header** has a back arrow, the name on one line, the status as coloured text with a dot (no badge) with the save status beside it, and the button "Review and publish".
   - **Review and publish.** On a laptop it shows the guest page in the shared iPhone 16 Pro mockup, and the publish card (language switch, Publish or Unpublish, and the blocking checks apart from the warnings). On a phone it shows the preview only, with the publish bar pinned at the bottom.
4. **Options (N14) belong to one product.** ADR-027 already says so. The owner considered Medusa's shared options and chose per product on 2026-10-29. Revisit this when a second product line shares values. The Options card is a table: Option (the English name with the German under it), Values as small chips, Used by, and a ⋯ menu with Edit and Delete. Delete is refused while a variant uses the option.
5. **Variants (N15) are a table.**
   - Columns: the code, one plain-text column per option, the price, the stock on two lines ("4 available" or "Sold out", then "2 reserved"), and ⋯.
   - Status tabs: All, For sale, Sold out, Hidden and Archived, on the app's shared `PageTabs`.
   - Below 1280 px the design thumbnail is hidden.
6. **Sparse SKU rules the screens show.**
   - A duplicate combination is refused.
   - A value that a variant uses can't be deleted.
   - A new option needs a value for every variant, in the same save ("Give all" fills them at once).
   - A keepsake with no options has one variant.
   - Stock can't go below the reserved units.
7. **The create flow** has Details, Options, Variants and Stock, then the button "Create keepsake" Every combination is offered ticked, and the merchant unticks the ones that are not sold. It is the owner's approved pick; the rejected three-step flow was deleted from the lab.
8. **The variant page** is its own page, not a sheet (the owner's pick). It shows the option values, the code, the price and the status, a Media card, and a Stock box in label and value rows (In stock, Reserved by orders, Available in bold) with a button to open the inventory item.
9. **Inventory (N13)** has a list and an item page.
   - The **list** has search and the tabs All, In stock and Sold out (`PageTabs`). The In stock figure is edited in place with the shared `QuantityBox`.
   - The **inventory item page**, which the owner kept, has Details, Reserved by orders (order, guest, quantity) and Associated variant. There is one stock figure per variant and no locations (ADR-022).
10. **Wording.** "Reserved", not "held". "In stock", not "on hand". "Adjust stock". The data and the code keep `held` and `onHand` (`inventory.stock_items.on_hand`), so the rename is for the screen text only.
11. **Style rules applied.**
    - Destructive actions use the danger style: ⋯ items through the new optional `isDanger` on the shared `RowActions`, trash buttons in `danger-soft`, and the shared confirm with the ink button.
    - ⋯ menus fit their content.
    - Cards are rounded white boxes with a 16 px gutter on phones.
    - Fields keep the app's standard height.
12. **The shared language switch** (design A, approved the same day) is one component for the story editor and the keepsake editor. It uses the app's thin tabs with a status icon and one status line. The arrow keys only move the focus. A click, Enter or Space chooses, so arrowing creates no draft. Its lab page is `/lab/language-switch`.

## Shared changes made in this round

- `front-end/src/components/row-actions.tsx`: the new optional `isDanger` on an action puts the item in the danger tone, and the menu is `w-max` (as wide as its longest label, at most the window width minus 2rem).
- `front-end/src/components/data-table.tsx`: the pinned Actions header takes the card's colour (`bg-surface`) in the card variant, and keeps `bg-surface-secondary` in the page variant.
- `front-end/src/features/lab/language-version-switch.tsx`: the shared language switch. The story editor uses it too.
- `front-end/src/features/lab/iphone-mockup.tsx`: the iPhone 16 Pro mockup, 402 by 874 points, scaled to fit. The keepsake editor uses it, and the story editor's preview now uses it instead of its own phone outline.

The last two live under `features/lab` today. Product code can't import from the lab, so the build moves both to `front-end/src/components/`.

## What it changes

- **Spec:** `docs/ux/keepsake-editor-design.md` is what a coding agent reads when it builds E6.1, E6.2 and E6.3.
- **Inventory:** M12, N13, N14 and N15 are "Design approved", and so is the M11 row of S7. Slice S7 is "Partly approved", because the guest product page C03 is not designed. D16 records this decision.
- **Plan:** E6.1, E6.2 and E6.3 point to the spec.
- **Story editor:** a dated note in `docs/ux/story-editor-design.md` and in the 2026-10-29 story editor record says that the switch and the preview are now the shared ones, and that the editor has no breadcrumb.
- **ADR-027 and ADR-022:** a History line each. The decisions stand.
- **Button README:** a dated note says that destructive actions outside a dialog now use the danger tone.
- **PRD:** no change (see "Not changed").

## Follow-up product work (not done here)

- **E6.1.** The list needs the variant count and the sold-out count per keepsake. The editor autosaves the draft with `row_version` and `If-Match` (ADR-014). The publish checks of the spec belong in the write validation too, because the database constraints do not hold them (a full language, a photo, a variant on sale).
- **E6.2.** The options save with every variant's new values in one request, and the API returns the problems the lab shows. Archiving a variant that has reserved units is refused, and the API must refuse it too. The lab lets the merchant restore an archived variant as hidden, with its code, price and stock. No story or AC in the plan names this, so E6.2 needs the rule. **Answered 2026-10-30 (gate G-E62-RESTORE):** an archived variant cannot be restored.
- **E6.3.** Setting stock below the reserved units is refused with the number of units. The item page needs a query for the open reservations: order reference, guest, accepted date and quantity. The order reference on the item page opens the order once an order screen exists. The lab shows a toast.
- **Shared pieces.** Move the language switch and the iPhone mockup out of `features/lab` (above). Use `RowActions` with `isDanger` for every destructive menu item (Delete option, Archive).
- **Copy.** The lab has English only. German copy does not exist.
- **Tests.** The lab's cases in `front-end/tests/lab-keepsake-editor.test.ts`, `lab-keepsake-editor-render.test.tsx` and `lab-language-switch.test.tsx` are a source. The spec lists the Playwright cases.

## Open points

Decided here only as far as the lab shows.

1. **O26.** The theme list, the colour list, the design rights and every price are mock. The twelve themes are the client's concepts, and the SwissCard in the create flow is an example.
2. **A photo per theme value.** The data model has no field for it, because photos belong to the product (`catalog.product_media`). The lab shows a design thumbnail per theme from a lab-only table. Should a theme value carry its own photo?
3. **The payment deadline and the preparation time.** The screen inventory lists a payment deadline for M12, and products have `preparation_hours` (O22). Neither is on these screens. Where do they live?
4. **Keepsake photos are not uses in the media library** (N18 open point 2). A photo that only a keepsake uses shows as unused there and can be retired, which takes it off the keepsake.
5. **Shared component limits.** The `QuantityBox` number field is about 28 px wide, so a three-digit stock figure is tight. The ⋯ button is 36 px on phones, and the shared tabs are 32 px, both below the 44 px target.
6. **The variants preview is a stand-in.** It is drawn from the keepsake's data. The real guest product page C03 is still to be edited, and the preview follows it then.
7. **Settled 2026-10-29: four steps.** The create flow has four steps (Details, Options, Variants, Stock), with the button "Create keepsake" on the last one. An earlier note called it five, counting Create.
8. **Settled 2026-10-29: "variant".** The refusals of a used value or option now say "variants" (for example "Used by 2 variants (VX-S-LION, VX-L-LION)"), like the rest of the screens. "SKU code" stays the name of the code field.
9. **German is optional.** A German option name or value may stay empty, and the publish card then warns. ADR-027 assumes labels exist in both languages. The design is looser than the ADR, and the ADR text is unchanged.
10. **Screens without ids.** The variant page and the inventory item page have no id in the screen inventory. The counts of S7 do not include them. They need an id, or a note under N13 and N15, when the build is planned.
11. **Settled 2026-10-30: no restore (gate G-E62-RESTORE).** An archived variant cannot be restored. The unique combination key counts archived variants, so an archived combination stays taken, and the refusal for an archived twin ("Restore it instead") has no action to point to. E6.2 sets the wording of that refusal.

Not verified: a phone with a real keyboard or touch, a screen reader, reduced motion, and a list with many variants (the lab has 10 of 36 combinations).

## Not changed

- **PRD** (`docs/PRD/Swiss_keepsakes_PRD.md`). §7.0 to §7.2 say that generic options stay in the data, that a SKU has its own stock set by the merchant, that a combination with stock 0 can't be chosen, and that one full language is enough to publish. The design does all four. The PRD names no screen of this catalog, no button and no wording. The colour list stays open (O26).
- **Data model** (`docs/specs/001-storytelling-pivot/data-model.md`, DM-7). The screens read and write the tables as they stand. The one gap is open point 2.
- **ADR-017, ADR-009, ADR-016.** The design shows their rules and changes none.

## Rejected

- **A. Cards, B. a Shopify-style matrix, C. steps.** The first three options. The owner asked for Medusa's structure instead.
- **Shared global options** (Medusa). Options stay per product.
- **A separate inventory item model with several stock locations** (Medusa). One stock figure per variant. The item page is a screen over that one row.
- **Breadcrumbs.** A back arrow does the job.
- **An Options item and a product-categories item in the sidebar.**
- **The three-step create flow.** The four-step flow is the pick; the three-step flow was deleted from the lab.
- **A variant sheet in place of the variant page.** The variant has its own page; the sheet view was deleted from the lab.
- **A status badge in the page header.** The status is coloured text with a dot.
