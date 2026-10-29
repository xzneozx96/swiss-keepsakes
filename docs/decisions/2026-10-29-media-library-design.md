# The media library N18 is option B "Photo wall"

- Date: 2026-10-29
- Status: **approved on 2026-10-29** (approval given in chat by the person who made the request, on the lab page `/lab/media`). Four points stay open (see "Open points"). The upload limits are proposals that the merchant must confirm.
- Changes: `docs/ux/media-design.md` (new), `docs/ux/pins-design.md`, `docs/decisions/2026-10-28-pins-and-map-design.md`, `docs/development-plan/screen-inventory.md` (S4, N18, D10, D14), `docs/development-plan/delivery-plan.md` (E4.11), `docs/specs/001-storytelling-pivot/data-model.md` (note under DM-3), `docs/adr/ADR-004-media-and-pdf-storage.md` (History line)
- Note of 2026-10-30: the owner confirmed the upload limits (gate G-E411-LIMITS): 20 MB for a photo, 50 MB for audio (M4A is allowed) and 30 MB for a PDF. Decision 8 and open point 1 carry the answer.
- Source: the requester's approval of the lab page `/lab/media` on 29.10.2026
- Related: `docs/ux/media-design.md` (the full specification), `docs/decisions/2026-10-28-pins-and-map-design.md` (N16 and N17, which N18 sits beside), `docs/adr/ADR-004-media-and-pdf-storage.md`

## Why

Slice S4 had designs for the guest map, the pin card, the pins list and the pin editor. The media library N18 (story E4.11) was the one merchant screen of the slice that had no design. It has to let a merchant find one file among hundreds, see which pages use it, replace it everywhere at once (AC51), and clear out files nothing uses. A coding agent built three options on one lab page, `/lab/media`, on the same merchant frame as the pins list. The requester chose B.

## Decision

1. **Option B "Photo wall".** Three tabs: Photos, Audio and PDFs, each with a count. Photos show as a wall of tiles with the name under each tile. Audio and PDFs show as lists. A Select mode with a selection bar clears out many files at once. One file opens in a detail sheet.
2. **Options A and C are rejected and were deleted from the lab.** A was a table with a detail panel. C organised files by where they are used.
3. **Toolbar.** On a laptop the tabs fit their labels and sit on the left, in one row with search, the filter button and Select on the right. On a phone the three tabs share the width equally and a label never wraps.
4. **Search matches the file name only**, not the description.
5. **A media row gets a name.** It starts as the uploaded file name and the merchant can change it in the detail sheet. A blank name is refused. `content.media` has no name column today. This is a schema change (see "Follow-up").
6. **Pagination uses the shared `usePaged` and `Pager`** (`front-end/src/components/list-pagination.tsx`). `usePaged` got an optional page size. The photo wall shows 24 a page and the audio and PDF lists the default 10.
7. **No uploads card.** An accepted file appears at once at the top of its kind tab as "Processing", then turns "Ready". An upload batch gives one toast for the accepted files and one for the refused files. A refused file never enters the list.
8. **Upload limits (proposals, to confirm).** Photos: JPEG, PNG or WebP, up to 20 MB. Audio: MP3 or M4A, up to 50 MB. PDF: up to 30 MB. Nobody has decided these. **Confirmed 2026-10-30 (gate G-E411-LIMITS):** the limits stand as written.
9. **The detail sheet** opens from the right on a laptop and from the bottom on a phone. From the top:
   - The preview, with **Replace** and **Retire** as white pills over its top-right corner. While Retire is refused, the reason sits under the preview.
   - "Where it is used": one row per page with a 48 px thumbnail of the page, its title, a muted line (kind, language for a story, and the slot) and a chevron. The rows are grouped "On published pages (N)" and "Only in drafts (N)".
   - **Name.**
   - **Description**: the merchant-facing word for the alt text, in EN and DE. The code keeps the name `alt`.
   - **Info**: label and value rows (Uploaded as, Type, File size, Dimensions or Duration, Added, Version).
10. **Replace keeps the kind and makes a new version.** Before the merchant confirms, the dialog says how many pages change (AC51).
11. **Retire is the only removal. There is no delete.** Retire is refused while any page uses the file. The selection bar retires only the unused files of a selection and keeps the ones in use.
12. **Destructive style.** The design system (`docs/ux/design-system/project/components/Button/README.md`) allows the ink destructive button only inside an AlertDialog. So only the confirm button "Retire file" is ink. The buttons that open the dialog (Retire on the preview and Retire in the selection bar) stay plain. The confirm dialog passes its own Cancel label.

## What it changes

- **Spec:** `docs/ux/media-design.md` is what a coding agent reads when it builds E4.11.
- **Inventory:** N18 is "Design approved". Slice S4 lists N18 under "Approved screens" and names the new spec. S4 stays "Partly approved" because N23 is not approved. D14 records this decision and D10 no longer says N18 is not designed.
- **Plan:** E4.11 points to the spec and carries the name column and the keepsake risk.
- **Pins design:** `docs/ux/pins-design.md` and `docs/decisions/2026-10-28-pins-and-map-design.md` said N18 was not designed. They now point here. N18 does not order a pin's extra photos (open point 4).
- **PRD:** no change. The PRD does not describe the media library screen. It states only the requirements AC32, AC45 and AC51, which this design meets.
- **ADR-004:** no change to the decision. One History line points here.

## Follow-up product work (not done here)

- **A `name` column on `content.media`** (E4.11). It is `text NOT NULL`, set at upload from the file name, and the API must refuse an empty or blank name. A migration adds it, and the existing rows take their upload file name. Search reads this column. The lab's `fileName` ("Uploaded as") is the name of the latest upload, so the table also needs a place for that file name, or a rule that Replace overwrites it. `content.media` stores only a `storage_key` today.
- **The where-used query and API** for the sheet: the pages that use a file, split into published and draft-only, with a page photo, title, kind, language and slot. This reads `content.media_refs`.
- **The retire check in the API.** The database trigger refuses a retire while a use exists. The API must return the page count, so the sheet can say it, and must handle the race the lab shows ("Retire refused": a draft took the file while the merchant decided).
- **Replace in the API.** A new versioned key, the version number, and the page count for the dialog (AC51).
- **Upload.** Several files in one request batch, the processing state, and the refusal reasons. The limits above go into `api/` and the form together.
- **Shared components.** `usePaged` already takes a page size. The lab's open points on the shared `Pager`, the filter controls and the search clear button (they take their labels from the app language) and on `RowActions` (no destructive item style) need a fix when the screen is built.
- **Pickers.** `PhotoSheet` and `AudioSheet` must hide retired and processing files. There is no PDF picker yet, and a tour needs one.
- **Tests** listed in `docs/ux/media-design.md`.

## Open points

Decided here only as far as the lab shows. The requester has not decided these.

1. **Upload limits.** 20, 50 and 30 MB, and the accepted types, are the designer's proposal. **Confirmed 2026-10-30 (gate G-E411-LIMITS):** 20 MB for a photo, 50 MB for audio (M4A is allowed) and 30 MB for a PDF.
2. **Keepsake photos are not counted as uses.** `catalog.product_media` is not in `media_refs`. The lab leaves keepsakes out of the where-used list and out of the retire check. So the 29 photos that only keepsakes use show "Unused" and can be retired, which would take the photo off those keepsakes. E4.11 has to solve this. One way is to ask `catalog` before a retire, as ADR-004's cleanup job does. In the lab, the toast after Replace counts keepsake pages while the Replace dialog and the sheet do not, so the two numbers differ for these photos (see `docs/ux/media-design.md`).
3. **Is the N18 description the only alt text?** The lab treats it as the only one. It would then show read-only in the pin editor (N17) and the story image node, which keep their own today. The other choice is a default that a pin or story may override.
4. **Who orders a pin's extra photos?** The lab leaves the order to the pin editor (N17). The "Where it is used" row of an extra photo says "Order in the pin editor". Nobody has checked that N17 does it.

Also open, as notes for the build:

- The shared `Pager`, the filter controls and the search clear button take their labels from the app language, not from the lab copy. In the lab they show English only.
- `RowActions` has no destructive item style. The Retire item in a row's menu looks like the other items.
- Retired files stay in the lab list with a "Retired" chip, and the Retire dialog says "Retired files leave the library and the pickers". The two disagree. Decide whether the library hides retired files by default.
- The Select button shows on the Audio and PDF tabs, but only the photo wall can select. Hide the button there or let the lists select too.
- German copy does not exist. Only the English text is in `front-end/src/features/lab/media-copy.ts`.
- Not tested on a real phone, with a screen reader or with reduced motion.

## Rejected

- **A. Table with a detail panel.**
- **C. Organised by where files are used.**
- **A search that matches the description** as well as the name.
- **An uploads card** that lists files while they upload.
- **A delete.** A file leaves by Retire only.
