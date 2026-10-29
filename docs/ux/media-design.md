# Media library design: N18 "Photo wall"

- Status: **design approved** on 2026-10-29 (chat approval of the lab page `/lab/media`, option B). Upload limits are proposals, and four points are open (section 8).
- Screen: N18, the merchant media library at `/store/content/media`. Slice S4, Track 1, story E4.11.
- Read first: `docs/decisions/2026-10-29-media-library-design.md` (what was approved, what was rejected, the open points), `docs/adr/ADR-004-media-and-pdf-storage.md` (storage and versioned keys), `api/migrations/0008_content.sql` (`content.media`, `content.media_refs`), PRD AC32 and AC51, `docs/ux/pins-design.md` (the pins list N16 and editor N17, which use the same merchant frame).
- Visual reference: the lab page `/lab/media` (run the front end and open it). **The lab is a design reference, not product code.** It keeps state in React, uses mock data, shows the merchant dashboard in an iframe and stands in for some product pieces. Do not copy it. Build the screen in the product with the rules below.
- Lab files, under `front-end/src/features/lab/`: `media-library-screen.tsx` (the screen), `media-parts.tsx` (detail sheet, rows, preview, replace dialog), `media-actions.tsx` (Replace and Retire), `media-state.ts` (the in-memory library), `media-data.ts` (mock data and the pure rules), `media-rules.ts` (usage line, icons), `media-copy.ts` (all English wording), `media-shell.tsx` (merchant frame), `media-lab.tsx` (the lab page and its open points), `media-app.tsx` and `media-search-params.ts`. The route is `front-end/src/routes/lab.media.tsx`. The tests are `front-end/tests/lab-media.test.ts` and `front-end/tests/lab-media-render.test.tsx`.

## 1. What the screen is for

The merchant finds one file among hundreds, sees which pages use it, names and describes it, replaces it everywhere at once (AC51), and retires a file once nothing uses it. There is no delete. Files are photos, audio recordings and tour PDFs. The page sits in the merchant sidebar under Content, Media. On phones it sits in the Content tab row, like Places (N16).

The lab page shows six states at laptop (1280 px) and phone (375 px) width. A State control picks one: Normal, Loading, Empty, No match, Upload in progress and Retire refused.

## 2. Layout

Top to bottom, at every width:

1. **Header.** The title "Media", one line under it ("Photos, recordings and tour PDFs used by your stories, places and tours.") and the **Upload** button. On a laptop the button is at the right of the title. On a phone it is full width under the line and 44 px tall.
2. **Toolbar.** One row on a laptop, two on a phone.
3. **Filter chips** for the active filters, from the shared `FilterChips`.
4. **The list** for the active tab, then the **pager**.
5. **The selection bar**, only in Select mode with at least one file chosen.

### The toolbar

| Part | Laptop (from 1024 px) | Phone |
| --- | --- | --- |
| Kind tabs: Photos, Audio, PDFs | Fit their labels, on the left | Share the full width equally, one third each. A label never wraps |
| Search | At the right, up to 20 rem wide | Full width, under the tabs |
| Filter button | Right of search | Right of search |
| Select button | Right of the filter button | Right of the filter button, 44 px tall |

Each tab label is the kind and a count: "Photos · {n}". The count is every file of that kind, retired ones too, and does not change with search or filters. Changing the tab ends Select mode and clears the selection.

**Search** matches the file **name** only, in any case. It does not match the description or the file name of the last upload. Its placeholder and label are "Search by name". It has a clear button.

**Filter** has two groups. Each option shows how many files of the current tab it would give.

- **Use:** Unused, Only in drafts, On published pages. A file counts as "On published pages" when at least one page shows it in its published version. It counts as "Only in drafts" when pages use it but none in a published version.
- **Status:** Processing, Ready, Retired.

With no status chosen, all three statuses show, retired files too (see section 8).

### The photo wall (Photos tab)

A grid of square tiles: 3 across on a phone, 4 from 640 px, 6 from 1024 px. The page size is **24**: four rows on a laptop and eight on a phone. Each tile has:

- The photo, with rounded corners (`rounded-xl`).
- The file **name** under it, one line, truncated, muted.
- An **"Unused"** badge at the bottom start of the photo when the file is ready and no page uses it.
- A status chip at the bottom start for a processing or retired file. A processing photo shows a spinner over a pale veil. A retired photo is greyed and half transparent.

Tapping a tile opens the detail sheet. In Select mode, tapping toggles it, the tile shows a circle at the top end (a check when chosen) and a ring when chosen.

### The lists (Audio and PDFs tabs)

A card with one row per file and dividers. The page size is the shared default, **10**. Each row has:

- A 48 px square thumbnail: the kind icon (music note or PDF) on the pale hero ground.
- The name (semibold, one line).
- The English description in muted text, or "No description".
- The usage line: "Unused" (muted), "3 pages · 2 published" or "1 page · draft only" (warning colour when no page is published). One page is "1 page".
- A status chip for processing or retired. A ready file has no chip.
- A **⋯ menu** (`RowActions`) with Details, Replace and Retire. Replace is off unless the file is ready. Retire is off while a page uses the file, and its label then carries the reason: "Retire (used on 3 pages)" or "Retire (used on 1 page)".

Tapping the row opens the detail sheet.

### Pagination

Use the shared `usePaged` and `Pager` (`front-end/src/components/list-pagination.tsx`). The page resets to 1 when the tab, search or filters change. The photo wall passes the page size 24. The lists use the default. The pager is compact on phones. It is not drawn while loading.

### The selection bar

In Select mode, once a file is chosen, a dark ink bar sticks to the bottom of the content (16 px above the viewport edge on a laptop, 80 px above it on a phone, clear of the tab bar). It shows:

- "{n} selected".
- "{k} in use, kept" when some chosen files are used by a page. Used files are kept, never retired.
- **Clear selection** (tertiary).
- **Retire {n}** (secondary, plain), where n counts only the files that can be retired. It is disabled when n is 0.

Retire opens the confirm dialog (section 5). Select works on the photo wall only (see section 8).

## 3. The detail sheet

One file opens in a sheet. On a laptop it comes from the right, 26 rem wide and full height. On a phone it comes from the bottom, with a handle, at most 560 px wide and centred. The heading is the file name. The sheet scrolls. Top to bottom:

1. **The refusal alert**, only in the "retire refused" state (section 4).
2. **The preview.** Replace and Retire sit over its **top-right corner** as two white pills, 44 px tall, each with an icon and a word. They are plain. They are hidden for a retired file.
   - A photo shows at 4:3, or 3:4 (at most 20 rem tall) for a portrait photo.
   - Audio shows the file name and an audio player.
   - A PDF shows the file name and an "Open PDF" button.
   - While Retire is refused, the reason sits directly under the preview and the Retire button points to it (`aria-describedby`). It reads "Used on {n} pages. Remove it from them, or replace it, before you can retire it." ("Used on 1 page. Remove it from there, or replace it, before you can retire it." for one page.) A processing file says "Wait until it is ready."
   - A retired file shows "Retired. Pages can no longer choose it, and it cannot come back." and all its fields are read-only.
3. **Processing note**, for a processing file: "Building the sizes guests see. This takes a few seconds; you can leave the page."
4. **Where it is used.** A list, not cards.
   - With no page: "No page uses this file."
   - Two groups, each with a count in its heading: **On published pages (N)** and **Only in drafts (N)**. The drafts group has the note "Guests do not see these yet."
   - One row per page. A story's EN and DE versions are two pages. A draft and a published reference on the same page and language are one page. A page counts as published when its published version shows the file.
   - A row is a 48 px thumbnail of the page (a pin's photo, or a story's or tour's cover, or a placeholder icon), the page title, a muted line and a chevron. The whole row is a link. The muted line reads kind, then language for a story, then what the file is on that page: "Story · EN · cover", "Tour · tour PDF", "Place · extra photo · 2 of 3 · Order in the pin editor".
   - The lab shows a toast "Would open {name}." instead of leaving the frame. Where a row goes in the product is open in the spec. Use the page's editor.
5. **Name** (a text field). Help: "Search finds files by this name. It starts as the uploaded file name." A blank name is invalid: "Give the file a name."
6. **Description.** The heading is "Description", not "alt text". Two fields, English and German. A photo's note reads "Says what the photo shows, for guests who use a screen reader. Every pin and story that shows this photo uses it." For audio and PDFs it reads "Says what the file is, for guests who use a screen reader or cannot play it." An empty field shows "No description". When German is empty and English is not, the German field says "Guests reading German see no description yet." One **Save name and description** button (secondary) saves both. It is disabled until something changed, and while the name is blank. The toast is "Name and description saved." A retired file has no Save button. The code keeps the field name `alt`.
7. **Info.** Label and value rows with dividers: **Uploaded as** (the file name of the latest upload), **Type** (content type), **File size**, **Dimensions** (photos only, "4032 × 3024", "Size pending" while processing) or **Duration** (audio only, "0:13"), **Added** (short date) and **Version** ("v1"). A file name wraps only at its whole words: show its hyphens as non-breaking hyphens.

Replace never changes the name. It changes "Uploaded as", the size, the version and the picture.

## 4. States

| State | Behaviour |
| --- | --- |
| Normal | Photos tab open, the wall holds the first 24 files, newest first |
| Loading | The toolbar shows. Twelve grey square tiles hold the wall's shape (3, 4 or 6 across) so nothing jumps. No pager, whatever the tab |
| Empty | A new shop with no files: the empty state with a photo icon and "No files yet. Upload photos, recordings or tour PDFs; several at once is fine." The Upload button stays in the header |
| No match | The search or a filter matches no file: the empty state with a search icon and "No file matches. Try another word or clear the filters." The lab shows it with the search "fondue" |
| Upload in progress | The accepted files are in the list at once, at the top of their kind tab, each with a spinner and the chip "Processing". They turn Ready when their sizes are built. There is no uploads card |
| Retire refused | See below |
| Processing file | Replace is off. Retire is off, with "Wait until it is ready." |
| Retired file | Greyed. Chip "Retired". No Replace or Retire. Read-only fields |
| Photo with no description | The list row says "No description" |

**Retire refused.** The merchant asked to retire a file that was unused, and a moment before, someone added it to the German draft of a story. The database refused. The sheet opens on that file with a danger alert at the top: the title "Not retired" and "While you were deciding, it was added to the draft of "{name}" ({lang}). A file in use cannot be retired." The alert has a dismiss button. Retire is now off, with the reason under the preview. In every state, Retire on a used file is off and the reason sits beside it.

## 5. Actions

### Upload

The **Upload** button picks several files at once. The input accepts JPEG, PNG, WebP, MP3, M4A and PDF (the lab also accepts `.heic` so the refusal can be shown). The kind comes from the file's type.

**Limits (confirmed by the owner on 2026-10-30, gate G-E411-LIMITS):** photos JPEG, PNG or WebP up to 20 MB. Audio MP3 or M4A up to 50 MB. PDF up to 30 MB. The type is checked first, then the size.

- An accepted file appears at once at the top of its kind tab, Processing, with its name set to the uploaded file name.
- A refused file never enters the list.
- A batch gives **one toast for the accepted files** ("3 files uploaded. They show as processing until their sizes are built." or the one-file form) and **one toast for the refused files** ("2 files refused: {name}, {reason}; {name}, {reason}."). The reasons are "type not accepted (JPEG, PNG, WebP, MP3, M4A or PDF)" and "too large (max {n} MB)".

### Replace

1. The merchant taps **Replace** (on the preview or in a row's ⋯ menu).
2. A dialog "Replace {name}?" says how many pages change before anything happens (AC51): "Every page that uses it shows the new file: {published} published and {drafts} only in drafts ({pages} in all). Guests see the change on the published ones at once." With no page: "No page uses it yet, so nothing changes for guests." A PDF adds "A tour has exactly one PDF; the new file takes its place."
3. The buttons are **Cancel** and **Choose new file**. Choose new file opens the file dialog.
4. The new file must be the same kind. Otherwise a toast says "Not replaced: {file}, Choose a file of the same kind ({kind})." A wrong type or too large a file is refused with the upload reasons.
5. An accepted file makes version n + 1 and the file shows Processing. Then the toast says "Version {n} is live on {pages} pages." or, with no page, "Version {n} uploaded."
6. The storage key is new and versioned, and is never overwritten (ADR-004).

### Retire

There is no delete. Retire is refused while any page uses the file, a published page or a draft. The check lives in the database too (a trigger on `content.media`), so the screen shows the reason and the API enforces it.

- **One file.** Retire on the preview or in the ⋯ menu opens a confirm dialog: the title "Retire {name}?", the text "No page uses it. Retired files leave the library and the pickers, and cannot come back.", the buttons **Cancel** and **Retire file**. The toast is "{name} retired."
- **Many files.** In Select mode the bar's Retire retires only the unused files of the selection. The dialog title is "Retire {n}". Its text is the same sentence, then "{k} in use, kept." when some are used. The confirm button is "Retire file". The toast is "{n} files retired. {k} in use were kept."
- **Destructive style.** The design system allows the ink destructive button only inside an AlertDialog (`docs/ux/design-system/project/components/Button/README.md`). So only **Retire file** inside the dialog is ink. The buttons that open the dialog (Retire on the preview, in the ⋯ menu and in the selection bar) stay plain. The dialog is the shared `ConfirmDialog`, which passes its own Cancel label and starts focus on Cancel.

## 6. Rules

- **Pages.** A page is a pin, a tour, or one language version of a story. Count pages, not references. A draft and a published reference on one page and language are one page.
- **Where used** comes from `content.media_refs` (owner kinds story version, place and tour; slot draft or published). Keepsake photos (`catalog.product_media`) are not in it, and the lab leaves them out (section 8, point 2).
- **Retire check.** Refused for a processing file, a retired file, and a file with at least one page. Order of reasons: retired, processing, in use.
- **Replace** is allowed only for a ready file, and keeps the kind. A tour has exactly one PDF.
- **Search** is on the name only. The name starts as the uploaded file name. A renamed file is found by the new name and not by the old one.
- **Order.** Newest upload first, then by file name.
- **No price, no booking.** Nothing on this screen shows money.
- **Sizes.** `fileSize` shows MB with one decimal from 1,000,000 bytes, KB below. `duration` shows m:ss.

## 7. Build notes (E4.11)

- **Route.** `/store/content/media`, `ssr:false`. Put any value the route's `validateSearch` reads in the feature's `lib/search-params.ts` (AGENTS.md rule 1).
- **Name column.** `content.media` has no name column. Add `name text NOT NULL`, fill it from the uploaded file name, and refuse a blank name in the API and the form. See the decision record for the follow-up.
- **Reuse.** Use these components, not new ones:
  - `usePaged` and `Pager` from `components/list-pagination.tsx`.
  - `FilterButton`, `FilterChips` and `filterGroup` from `components/filter-bar`.
  - `RowActions`, `StatusChip`, `EmptyState` and `Media`.
  - `ConfirmDialog` and `useConfirm` for Retire, and `AlertDialog` for the Replace dialog.
  - The HeroUI `Drawer` for the sheet, `Tabs`, `SearchField`, `Skeleton`, `TextField` and `Alert`.
  - The merchant frame and the sticky Content tab row, as N16 does.
- **Data.** Read with the feature query hooks and change with `useCommand` (AGENTS.md rule 4). The lab's `useLibrary` is in-memory and is not the model for it.
- **Icons.** Add `Gallery`, `FilePdf` and any icon the lab imports from `reicon-react` to `components/icons.ts` as plain re-exports (AGENTS.md rule 2). The lab imports `Gallery` and `FilePdf` straight from the library.
- **Server data.** The lab filters in the browser. With 600 to 1,500 files, the API should filter, search and page on the server. Counts in the tabs and in the filter options then come from the API too.
- **German.** Put the strings in the app's dictionary in both languages. The lab has English only.
- **Shared components.** `Pager`, the filter controls and the search clear button take their labels from the app language, not the lab copy. `RowActions` has no destructive item style. `PhotoSheet` and `AudioSheet` (the pickers) must hide retired and processing files. There is no PDF picker.
- **Accessibility.** Tiles are buttons named by the file name, `aria-pressed` in Select mode. Targets are 44 px on phones. The Retire reason is tied to the button.
- **Tests to write.** Playwright `[E4.11][AC51]` in EN and DE at 375 px and 1280 px, covering:
  - Replace shows the page count, then the new version reaches every page that uses the file.
  - Retire is off for a file that a published page or a draft uses, and the reason shows.
  - A retire that loses the race shows the "Not retired" alert.
  - The selection bar retires only the unused files and keeps the used ones.
  - A refused upload never appears in the list, and one toast covers each batch.
  - Search finds a file by its name and not by its description.
  - The tabs at 375 px fill the width and no label wraps.
  - The unit tests in `front-end/tests/lab-media.test.ts` and the render cases in `lab-media-render.test.tsx` are a source of cases.

## 8. Open points

1. **Upload limits** (20, 50 and 30 MB, and the accepted types) are the designer's proposal. The merchant must confirm them. **Confirmed 2026-10-30 (gate G-E411-LIMITS):** 20 MB for a photo, 50 MB for audio (M4A is allowed) and 30 MB for a PDF.
2. **Keepsake photos are not counted as uses.** `catalog.product_media` is not in `media_refs`. The lab leaves keepsakes out of where-used and out of the Retire check, so photos that only keepsakes use (29 in the lab data) show "Unused" and can be retired. A retire would take the photo off those keepsakes. E4.11 has to solve it, for example by asking `catalog` before a retire, as the cleanup job of ADR-004 does. In the lab, the toast after Replace counts keepsake pages, while the Replace dialog and the sheet do not.
3. **The only description?** The lab treats the N18 description as the only alt text of a file. The pin editor (N17) and the story image node, which carry their own today, would show it read-only. The other choice is a default that a pin or story may override.
4. **Pin photo order.** The lab leaves the order of a pin's extra photos to the pin editor (N17). A where-used row of an extra photo says "Order in the pin editor". Nobody has checked that N17 does it.
5. **Retired files.** The Retire dialog says retired files "leave the library and the pickers". The lab keeps them in the list with a "Retired" chip, greyed, and a Status filter can show or hide them. Decide whether the library hides them by default.
6. **Select on Audio and PDFs.** The Select button shows on every tab, but only the photo wall selects. Hide it on the other tabs or add selection to the lists.
7. **Selection wording.** The bar's button reads "Retire {n}" and the confirm button reads "Retire file" for one file or many. Check the wording with the merchant.
8. **Not tested:** the lab page on a real phone, with a screen reader and with reduced motion. German copy does not exist.
9. **Where a where-used row goes.** The lab only shows a toast.

## 9. Rejected

- **A. Table with a detail panel.**
- **C. Organised by where files are used.**
- A search that matches the description as well.
- An uploads card that lists files while they upload.
- A delete button.
- The word "alt text" on screen. The merchant sees "Description".
