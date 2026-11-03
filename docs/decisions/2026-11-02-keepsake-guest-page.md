# The guest keepsake page takes the new keepsake shape, and the editor preview will reuse it

- Date: 2026-11-02
- Status: **decided on 2026-11-02** (owner, in chat). Step 1, the guest page, is being built as T-015 in run `20261030-keepsake-editor-polish`. Step 2, the editor preview, waits for the owner's approval of step 1.
- Changes: C03 (`front-end/src/routes/_guest/$lang/gifts/$slug.tsx`, `features/catalog/components/gift-detail.tsx`, `features/catalog/hooks/use-gift-detail.ts`). The screen-inventory row S7 C03 said "not designed"; this record is its design.
- Related: ADR-017, ADR-021, ADR-027; AC30, AC52, AC53, AC55. E6.4 (sprint 9) still moves the page to the API and server rendering.

## Why

The editor's Review and publish step shows a phone preview (`features/keepsakes/components/keepsake-preview.tsx`) that was built as a stand-in for C03. It does not look like the guest page. The guest page is still on demo data and has the old keepsake shape: one flat list of variants, engraving, a plain-text story and a linked long story. The owner wants one page, adjusted to the new shape first, then reused as the preview.

## Decisions

1. **Order of work.** Adjust the guest page first. The owner checks it in the browser. After approval, the editor preview renders the same component.
2. **Options are chosen in the add sheet**, as today. The sheet shows one choice per option (Size, Colour, …). A combination that is not sold, or is sold out, can't be picked (AC52, AC53). The price in the bar follows the chosen combination, and a variant's photo moves to the front of the gallery when it is chosen.
3. **Engraving goes**, from the highlights and from the sheet (AC55).
4. **Highlights keep Pickup and add "Pay on delivery".** Pay later and Engraving go.
5. **About shows the rich-text description.** The long-story teaser and its sheet go: a keepsake has no story field, and stories link to keepsakes from the story side (E6.9).
6. **Ratings show "New"** until product ratings exist (E5.5, sprint 15): the rating stat says New, the review count is 0, and the Reviews section shows its empty state.
7. **The subtitle under the name goes.** It named the category, which guests never see (ADR-021), and the option names, which the sheet now shows.
8. **Kept as they are:** the photo gallery and its top buttons, the seller row, the language notice (AC30), the fold-out sections (pickup places, pickup date, cancellation, payment), the sticky price bar, the sold-out bar, quantity, pickup date and place in the sheet.

### Later on 2026-11-02 (owner, after seeing the page)

9. **The seller row goes.**
10. **The stats row goes** (earliest pickup, rating, review count). One quiet line under the name replaces it: "New · No reviews yet", and later the stars, average and count. It links to Reviews.
11. **No reviews is the shared `EmptyState`**, on the keepsake and tour pages alike.

## Rejected

- **Options on the page** (Shopify, Etsy). The owner kept them in the add sheet.
- **Hiding ratings until they exist.**
- **Removing the Highlights block.**
