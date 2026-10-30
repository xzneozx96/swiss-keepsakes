# Keepsake catalog design: M11, M12 with N14 and N15, the variant page and Inventory N13

- Status: **design approved** on 2026-10-29 (chat approval of the lab page `/lab/keepsake-editor`). Ten points are open (section 13). Prices, themes, colours and design rights are mock (O26).
- Screens: M11 (the keepsake list, `/store/products`), M12 (the keepsake page, new and edit, `/store/products/gifts/new` and `/store/products/gifts/$productId`), N14 (the options sheet), N15 (the variants table and its sheet), the variant page, N13 (Inventory, `/store/products/inventory`) and the inventory item page. Slice S7, Track 2, stories E6.1, E6.2 and E6.3. The guest product page C03 is not part of this design.
- Read first: `docs/decisions/2026-10-29-keepsake-catalog-design.md` (what was approved, what was rejected, the open points), `docs/ux/story-editor-design.md` (M17, whose flow M12 follows), `docs/adr/ADR-017`, `ADR-027` (options per product, the combination key), `ADR-009`, `ADR-016` (stock, held units, the CHECK), `ADR-022` (no locations), the data model `docs/specs/001-storytelling-pivot/data-model.md` (DM-7 and the catalog section), and PRD §7.0 to §7.2.
- Visual reference: the lab page `/lab/keepsake-editor` (run the front end and open it). The shared language switch has its own lab page, `/lab/language-switch`. **The lab is a design reference, not product code.** It keeps the shop in React state, uses mock data, draws the merchant dashboard around the screens in an iframe and stands in for some product pieces. Do not copy it. Build the screens in the product with the rules below. The lab's own state notes and open-points text are partly out of date. Where they disagree with this file, this file wins.
- Lab files, under `front-end/src/features/lab/`: `keepsake-editor-products.tsx` (M11), `keepsake-editor-product.tsx` (M12: the edit cards, the options and variants tables, the Review screen), `keepsake-editor-parts.tsx` (header, cards, switch, fields, status, checks, publish actions), `keepsake-editor-options.tsx` (N14), `keepsake-editor-sku.tsx` (N15 sheet and the shared bits), `keepsake-editor-create.tsx` (the create flow), `keepsake-editor-variant.tsx` (the variant page), `keepsake-editor-inventory.tsx` (N13 and the item page), `keepsake-editor-preview.tsx` (the guest-page stand-in), `keepsake-editor-rules.ts` (pure rules, refusal texts and publish checks), `keepsake-editor-state.ts` (the shop in memory, autosave), `keepsake-editor-data.ts` (mock data), `keepsake-editor-nav.ts`, `keepsake-editor-shell.tsx` (merchant frame), `keepsake-editor-lab.tsx` (the lab page), `keepsake-editor-app.tsx`, `keepsake-editor-search-params.ts`, `language-version-switch.tsx` and `iphone-mockup.tsx`. The routes are `front-end/src/routes/lab.keepsake-editor.tsx` and `lab.language-switch.tsx`. The tests are `front-end/tests/lab-keepsake-editor.test.ts`, `lab-keepsake-editor-render.test.tsx` and `lab-language-switch.test.tsx`.

## 1. What the screens are for

The merchant keeps the keepsake catalog. The shop sells Victorinox knives, so today it holds one keepsake with options Size and Theme. The model is generic, so a second line (the lab's example is a SwissCard with Colour and Theme) needs no new screen.

The merchant:

- opens a keepsake from the list or creates one,
- writes its name and text in English or German, picks its photos and sets the commission, all of which save by themselves,
- defines options and their values, and chooses which combinations are sold (the variants),
- reads and sets stock in Inventory, where the units reserved by orders are visible,
- checks the guest page in a phone preview, and publishes.

The catalog is a set of linked screens, as in the Medusa admin. Each screen is reached by clicking, and the sidebar has two items for it, **Keepsakes** and **Inventory**, under Products (Pickup points stays). There is no Options item and no product-categories item.

| Screen | Reached from | Back arrow goes to |
| --- | --- | --- |
| Keepsakes list (M11) | Sidebar, Keepsakes | none |
| Keepsake, edit (M12) | A row of the list, or the end of the create flow | the list ("Back to Keepsakes") |
| Keepsake, review and publish | The button "Review and publish" | the edit screen ("Back to editing") |
| New keepsake (create flow) | The list's Create | the list ("Back to Keepsakes") |
| Variant page | A row of the variants table | its keepsake ("Back to {keepsake name}") |
| Inventory list (N13) | Sidebar, Inventory | none |
| Inventory item | A row of the inventory list, or "Open inventory item" on the variant page | Inventory ("Back to Inventory"), or the variant when opened from it ("Back to the variant {code}") |

No screen has a breadcrumb. A list has no back arrow. The sidebar highlights Keepsakes on the keepsake, create and variant pages, and Inventory on the list and the item page (also when the item was opened from a variant).

The lab page shows 17 states at laptop (1280 px) and phone (375 px) width. A State control picks one (section 10).

## 2. Layout and widths

The breakpoint is 1024 px (Tailwind `lg`, the shared `useIsWide`). "Laptop" means from 1024 px and "phone" below it. Below 1280 px (`xl`) some table cells give way (sections 5 and 7).

- **Cards** are the `ReadCard` look of the lab: a rounded white box (`rounded-3xl`, surface shadow), a 36 px icon tile, the title, and an optional button or ⋯ menu on the right. On a phone the card has a 16 px gutter on both sides.
- **The edit screen** is one column, at most 880 px wide, centred.
- **Page headers** (list, variant, item) show the back arrow (44 px, icon only) if the screen has one, the title on one line (cut with an ellipsis, the full text in the `title` attribute) and, under it, one status line. The page's button sits on the right.
- **Fields** keep the app's standard height. Buttons are 44 px tall on phones.
- **Destructive actions** use the danger style (section 11).

## 3. The Keepsakes list (M11)

Keepsakes only. There are no Tours, Stays or Experiences tabs and no category filter.

- **Header.** The title "Keepsakes" and the button **Create** (a plus icon, 44 px tall on phones).
- **Laptop.** A `DataTable` (card variant) with the columns Keepsake (a 44 px thumbnail of the first photo and the name, both opening the keepsake), Variants and Status, and a pinned Actions column with ⋯ (Edit).
- **Phone.** A list. Each row is the thumbnail, the name (two lines at most) and the line under it, and ⋯. The lab shows no status on a phone row.
- **Variants** reads "{n} variants" ("1 variant" for one) and, when some are sold out, " · {k} sold out". Archived variants are not counted.
- **Status** is the status chip: "Published", "Published · edits not live" or "Draft".
- **Empty.** "No keepsakes yet."

A keepsake created in the create flow joins the list as a draft.

## 4. The keepsake page, edit screen (M12)

### The header

A sticky bar at least 64 px tall, with a blurred background and a line under it.

- The back arrow (44 px): "Back to Keepsakes". With unsaved edits it opens the leave confirm (section 9).
- The name on one line, small and semibold ("Untitled keepsake" when empty).
- Under it, one line: the **status** as coloured text with a dot (no badge), a "·", and the **save status**. The status is "Published" (green), "Published · edits not live" (yellow) or "Draft" (muted, an empty ring). A coloured dot or ring goes with the text, so colour is never the only signal.
- On the right, the button "Review and publish" (on a phone, "Review").

This is the only place where the page shows the status. There is no badge.

### The cards

In this order, in one column. The cards for Options and Variants are tables, not forms.

1. **Name and text.** The shared language switch (section 8) with its line "One full language is enough to publish. Readers of the other see it with a note." Then Name (a field, at most 90 characters) and Text (a text area of 6 rows, at most 1200 characters, with a counter) for the chosen language. Both are required in at least one language. The placeholders are the Victorinox example. With a blocked publish attempt, the empty fields show "Add a name in English or German to publish." and "Add the text in the same language as the name."
2. **Media.** The keepsake's photos in order, from the media library (N18). The first is the cover and says "Cover". Each row has the photo, its name, a grip (drag, or the arrow keys on the grip, the same list as the story editor's ordered lists), and a remove button. The button **Add photo** opens the N18 picker for photos only. A photo already on the keepsake is not added twice. With no photo the card says "No photos yet. Add one from the media library to publish; the first is the cover." (danger colour after a blocked attempt).
3. **Options.** The options table (section 5) and the button **Add option**.
4. **Variants.** The variants table (section 6) and the button **Create**, which shows only when the keepsake has at least one option.
5. **Commission.** The shipped `CommissionCard` (`features/merchant/products/components/gift-editor`), used as it is. The editor caps the rate at 50% (`MAX_COMMISSION`, as `products.commission_rate`).

The page has no payment-deadline field. See open point 3.

### What saves by itself, and what saves whole

- **Autosave.** Name, text, media and commission are the draft. They save 1.5 s after the last edit.
- **Saved whole.** Options and variants never autosave, because the database counts every variant's values against the options at commit (ADR-027). They open in sheets with Save and Cancel (section 7), and a save is one write, or a refusal with the reasons.
- **Stock** is never edited on this screen. It is read-only here and edited in Inventory and in the create flow (section 12).

## 5. The Options card and N14

### The table

| Part | Laptop | Phone |
| --- | --- | --- |
| Option | The English name, with the German name under it (smaller, muted, `lang="de"`). "No German name" when empty | The same, in a 6.5 rem column |
| Values | Small chips (`Chip`, size sm, secondary), one per value, wrapping onto as many lines as needed. A chip shows the short label, the part before " · " ("Small" for "Small · 58 mm Classic SD") | The chips under the name, then "Used by {n} variants" |
| Used by | "{n} variants" ("1 variant"), counting archived variants too | In the Values column |
| ⋯ | Edit, Delete (the danger item) | The same |

With no option, the card says "No options: this keepsake is sold as one variant."

### Edit and Delete

- **Edit** opens N14 on that option.
- **Delete** is refused while any variant uses the option (archived ones too). The refusal is an alert above the table: "Can’t delete {option}. Used by {n} variants ({codes}). Every variant has one of its values." The codes show three at most, then "and {k} more". An option no variant uses asks first, with the shared confirm: title "Delete the option {name}?", text "Its values go too. No variant uses them.", button "Delete option" (the ink button, section 11).

### The options sheet N14

The shared `SheetFrame` at every width. **Add option** opens it with one new, empty option and one empty value, titled "Add an option". Edit opens it on one option, titled "Edit {option}". Cancel and the close button leave without saving.

Top to bottom:

1. A line. For an edit: "Values in the order guests see them. German names are optional; without one, German readers see the English." For a new option: "Name it, add its values, and give every existing variant one of them. It all saves together."
2. The problems, if a save was refused: "Not saved. {n} things need a fix: {texts}." in an alert.
3. **One block per option shown** (an edit shows that option, and any new one):
   - The option's name, with a danger-soft trash button "Delete the option {name}".
   - Two fields, "Option name (English)" and "Option name (German)" (placeholders "Size, Theme, Colour…" and "Grösse, Motiv, Farbe…").
   - A switch "Show a colour swatch for each value". Turning it on gives each value the swatch `#888888`, and turning it off removes the swatches.
   - The values in order. Each value is a block with a grip (drag, or the arrow keys on the grip), the colour swatch (a colour input, 44 px, only when swatches are on), the name, and a danger-soft trash button. Under them two fields, "English" and "German (optional)".
   - The button **Add a value**.
4. For each **new option**, once one of its values has a name: the section "A {option} for each of your {n} variants" (section 7, "A new option needs a value for every variant").
5. The footer: **Save options** (off until something changed) and **Cancel**. A save shows the toast "Options saved." and closes the sheet.

### N14 rules

- Each option and each value needs a name in English or German: "Name the option in English or German." and "Name the value in English or German."
- An option needs at least one value: "{option} needs at least one value."
- A swatch is `#` and six hexadecimal digits: "A colour is # and six digits or letters a–f, like #c8102e." (the check `product_option_values_swatch_check`).
- A value that a variant uses can't be deleted. The refusal sits at the value: "Can’t delete {value}. Used by {n} variants ({codes}). Archive or change those first." Archived variants count, because the unique key ignores the status.
- Two variants may not end up on one combination: "{code} and {code} would both be {combination}."
- A new option keeps every variant's other values. The save is refused until every variant, archived ones too, has a value of it (section 7).
- The values keep their order, and the order is what guests see.

## 6. The Variants card and N15

### The tabs

The shared `PageTabs` (not sticky here), with a count on each: **All**, **For sale**, **Sold out**, **Hidden**, **Archived**.

| Tab | Shows |
| --- | --- |
| All | Every variant that is not archived |
| For sale | Variants with the status For sale and units available |
| Sold out | Variants with the status For sale and no unit available |
| Hidden | Variants with the status Hidden |
| Archived | Archived variants |

A sold-out variant is one that is not archived and has no unit available. Available is the units in stock minus the units reserved, never below 0.

### The table

| Column | Content |
| --- | --- |
| Variant | The design thumbnail (44 px, with the colour swatch if the keepsake has one), and the SKU code in monospace. Both open the variant page. **Below 1280 px the thumbnail is hidden**, because the column is too narrow for both |
| One column per option | The value as plain text, the short label. "–" when missing. No badge |
| Price | CHF, right-aligned. "–" when 0 |
| Stock | Two lines (section below), and a status chip for a hidden or archived variant |
| ⋯ | Edit (opens the variant page), "Hide from guests" or "Put on sale", Archive (danger). An archived variant has "Restore as hidden" only |

**Stock on two lines** (`StockLines`). The first line is "{n} available", or "Sold out" in the danger colour and medium weight. The second line is "{k} reserved" in muted text, only when some units are reserved. The two lines never wrap and are never joined with a dot.

**Phone.** A list. Each row is the variant title ("Small / Pilatus", the short labels joined by " / ") over a muted line with the code, the price and "hidden" or "archived" (joined by " · "), and the two stock lines on the right, then ⋯.

Under the table a muted line says "Only these combinations are sold: {n} of {m} possible. Stock is set in Inventory." (with no option, "With no options, the keepsake has exactly one variant.").

An empty tab says "No variants here." (All: "No variants yet.").

### Row actions

- **Hide from guests** and **Put on sale** change the status at once and show the toast "{code}: hidden." or "{code}: for sale.".
- **Archive** keeps the variant for old orders. It is refused while units are reserved: "Can’t archive {code}. {n} units are reserved by open orders. Archive it once they are handed over or released." The toast on success is "{code}: archived.".
- **Restore as hidden** brings an archived variant back as hidden, with its code, price and stock. The toast is "{code}: hidden.". Adding the same combination again is refused and points to Restore (below).
  - **Decided 2026-10-30 (gate G-E62-RESTORE): an archived variant cannot be restored.** The build has no Restore as hidden. Every mention of Restore in this spec, in the row menu, on the variant page and in the refusal for an archived twin, is superseded. See open point 10.

### The variant sheet

**Create** (the card's button) opens the shared `SheetFrame` titled "Create variant", with the footer **Create variant** and **Cancel**. The variant page's ⋯ Edit opens the same sheet titled "Edit {variant title}", with **Save** and **Cancel**. The sheet does not carry the stock. It has, top to bottom:

1. One chip group per option, the values as chips in the app's selected style (a red border and a red tick at the corner). A value with no name yet is left out.
2. The error for the values, in an alert.
3. **SKU code** (monospace, upper-cased as typed). With every option chosen and no code, a line "Use VX-S-SWAN" fills it in.
4. **Price** (a CHF number field) with the line "Guests see it on the keepsake page only."
5. **Status**, two radio cards: **For sale** ("Guests can pick it") and **Hidden** ("Not on the keepsake page"). An archived variant has no status choice.

A save shows the error at its field, or the toast "{code} created, 0 in stock. Set its stock in Inventory." (new) or "{code} saved.". A keepsake with no option shows "No options yet, so this keepsake has one variant. Add an option (size, theme, colour…) to sell more than one." in place of the chips.

## 7. Sparse SKU rules

Only the sold combinations exist as variants (ADR-017). A missing combination is not a variant, and a guest can't pick it. The database holds the rules, and the screens say them at the control, in the merchant's words, before the save. The lab's `keepsake-editor-rules.ts` is the source of the texts.

| Rule | What the screen does |
| --- | --- |
| **Each combination once.** A duplicate is refused. Archived variants count (the unique key ignores the status) | "{combination} is already sold as {code}. Each combination is sold once." For an archived twin: "{combination} is already {code}, archived. Restore it instead." |
| **A value in use can't be deleted** (ADR-027) | The refusal names the variants (section 5) |
| **A new option needs a value for every variant**, in the same save | The sheet asks for it (below). The save is refused until every variant has one |
| **No options gives one variant** | "A keepsake without options has one variant only ({code}). Add an option to sell more." |
| **Stock never goes below the reserved units** (`CHECK (held <= on_hand)`, ADR-016) | "{n} unit(s) is/are reserved by orders, so stock can’t go below the {n} reserved." |
| **A code is unique in the shop** (`skus_store_sku_code_key`) | "{code} is already used in your shop." Codes of other keepsakes count |
| **A code is letters and digits joined by - _ or .** (`skus_sku_code_check`) | "Letters and digits, joined by - _ or . (like VX-S-SWAN)." An empty code: "Add a SKU code." |
| **A price above CHF 0** | "Add a price above CHF 0." |
| **A variant has a value of every option** | "Choose a {option} and a {option}." |

### "Give all"

When a new option has at least one named value, the N14 sheet adds the section "A {option} for each of your {n} variants". It says "Every variant needs one, in this save." and "{k} still need one." or "All set.". Under it:

- **Give all:** one button per named value. A button gives every variant that value (archived variants too).
- One row per variant: its thumbnail, the code, the other values ("Small · Swan on the lake", plus " · archived"), and the chips of the new option to choose from. A row that is still empty shows "{code} needs a {option}." after a refused save.

## 8. The shared language switch

One component, `LanguageVersionSwitch`, for the story editor and the keepsake editor. It knows nothing of stories or keepsakes. The caller passes the languages (`id`, `label`, `short`) and a status (`text`, `tone`) for each.

- **Tabs.** The app's thin-pill `Tabs` (`TabRow`), with the status icon after each label. The tones are success, warning, muted and danger, and each has its own icon shape, so the status never reads by colour alone. The icon carries a screen-reader text, ", {status}".
- **One status line** under the tabs: the icon and "{Language} · {status}". The tabs are equal in width.
- **Compact** (the story editor's header) shows "EN" and "DE" and no line.
- **Keyboard.** The arrow keys only move the focus. A click, Enter or Space chooses (`keyboardActivation="manual"`). Choosing may start a version in the story editor, so arrowing must not create a draft.
- **On the keepsake page** the statuses are the language's completeness: "Complete" (success), "Missing text" or "Missing name" (warning), and "Not written" (muted). The labels are "English" and "Deutsch".

The keepsake page uses the switch in two places, the Name and text card (it chooses the language of the two fields) and the Review screen (it chooses the language of the preview and the publish card). They are two separate states.

## 9. Save, autosave and leaving

As M17 (`docs/ux/story-editor-design.md`, section 7), with the keepsake's own fields.

- **Autosave.** There is no Save draft button. Name, text, media and commission save 1.5 s after the last edit. The save runs about 0.7 s in the lab. The real save writes the draft with `row_version` and `If-Match` (ADR-014).
- **Save status**, in the header under the name, with `aria-live="polite"`: "Unsaved changes" in the warning colour with a dot, "Saving…", or "Saved {time}" with a green tick.
- **A published keepsake that was edited** keeps the guests' copy. The status says "Published · edits not live" until the merchant presses **Publish changes**.
- **Leaving.** Back with saved edits leaves at once. Back with unsaved edits opens the shared `ConfirmDialog`: title "Leave without saving?", text "Your last edits are not saved yet. If you leave now, they are lost.", buttons **Keep editing** and **Leave without saving**.
- **Options, variants and stock** save at once, whole or refused, and have no unsaved state.

## 10. Review and publish

The button "Review and publish" in the header opens it. The header's back arrow says "Back to editing" and returns to the edit screen.

### Laptop

A grid of two columns. The left fills the width, and the right is 440 px wide with a line at its start. Both stay in view under the header.

- **Left: the preview.** A line says "What guests will see on a phone, as most of them shop. Scroll inside the phone." Under it is the shared **iPhone 16 Pro mockup** (`IPhoneMockup`): a titanium band, the bezel, the Dynamic Island, a status bar and the home indicator, with the screen at 402 by 874 points. The whole drawing scales down to fit its column and the window height, and the page scrolls inside the screen. The story editor's preview uses the same mockup.
- **Right: the publish card**, and under it a line "The preview is a stand-in built from this keepsake’s data. The guest page (C03) is designed in its own slice."

### The publish card

From the top:

1. The **language switch** (section 8) with the line "The preview follows the switch. Name and text are per language."
2. The **name** of the chosen language, in serif ("Untitled keepsake" when empty). Under it a line: "Goes live in English and German.", "Goes live in {language}. {Other} readers see it with a note." or "Needs a name and text in one language.". Under that, the link `/{lang}/gifts/{slug} · guests see it within about a minute` (see open point 10).
3. The **action**. A draft has **Publish** (off while a check blocks). A published keepsake with edits has **Publish changes**. A published keepsake has **Unpublish** (the danger-soft button). While a check blocks, a line says "Fix what stops publishing first.".
4. The **checks** (below).

**Publish** shows the toast "Published in {languages}. Guests see it within about a minute.". **Unpublish** asks first with the shared confirm: title "Unpublish this keepsake?", text "Guests stop seeing it at once and can’t order it. Open orders stay as they are. It stays here as a draft.", button "Unpublish". The toast after it is "The keepsake is a draft again.".

### The checks

Blocking checks come first, each with a red icon and the text jump **Edit**. The heading says "{n} things stop publishing" ("1 thing stops publishing"), or "Ready to publish" with a green line "Name, text, photos and a variant on sale are all set. The other language is never required.".

Blocking (publishing stops):

- **No full language.** "Add the name and the text in English or German." A language is full when its name and its text are both filled in. One full language is enough (AC30).
- **No photo.** "Add at least one photo."
- **A variant needs a fix.** "{n} variants need a fix (code, price or values)." or "1 variant needs a fix (code, price or values)." Archived variants are not checked.
- **No variant on sale** (only when no variant needs a fix). "Put at least one variant on sale."

Warnings (publishing still works), each with a yellow icon and the text jump **Show**. The heading says "{n} to look at (publishing still works)".

- **The other language is missing.** "No {Language} name and text: {Language} readers see the {other} with a note." The language names are English and German in this text.
- **A label misses a language.** "{n} option names or values miss a language." ("1 option name or value misses a language.")
- **Sold out.** "{n} sold out ({codes}): guests see them and can’t pick them."
- **Hidden.** "{n} hidden ({codes}): guests don’t see them." ("it" for one)
- **Commission is 0%.** "Commission is 0 %: partners earn nothing on it."

Edit and Show return to the edit screen and scroll to the card the check names (`basics`, `photos`, `options`, `variants`, `commission`). A blocked attempt shows the errors at the fields.

### Phone

One column with 16 px gutters, and only the preview, no Details part. Top to bottom:

1. The language switch with its line.
2. The preview as a plain card (391 px at most, with a border and rounded corners) in the flow of the page. The phone has no mockup, because the screen is already a phone.
3. The **publish bar**, fixed above the tab bar (64 px). It shows one line, "{n} things stop publishing" with a red icon, "Ready · {n} to look at" with a yellow icon or "Ready to publish" with a green icon, and the short buttons. Pressing the line opens the checks above the bar (at most 42% of the window height). The checks open by themselves when something blocks publishing. Edit and Show close them and jump. The buttons are Publish or Publish changes, and Unpublish (shown only when there are no unpublished edits).

### The preview

A stand-in built from the keepsake's data (open point 6). It shows the first photo, the name, the price of the chosen variant, one group of cards for each option (the name over the price, the chosen one with the red border and tick, a sold-out combination struck through, "Not sold" for a missing combination) and the text. Only variants for sale appear. It does not react to taps. When the chosen language has no name or text it says "Shown in {other language}: no {language} text yet.". With no variant for sale it says "No variant is for sale.". It shows the keepsake's price, which the guest lists never do (AC54).

## 11. The create flow

**Create** on the list opens a focused flow, not the keepsake page (Medusa's create). On a laptop it is a page in the shell with the steps in a row. On a phone it is full screen over the tab bar, with the title and "Step {n} of {m} · {name}" at the top and **Back** and **Next** pinned at the bottom. The back arrow asks before it drops what was typed: the confirm "Discard this keepsake?" with the text "What you entered for this keepsake is not saved anywhere yet." and the buttons **Keep editing** and **Discard keepsake**.

The steps:

1. **Details.** Name and text (the shared language switch and fields) and Photos (the same ordered list and **Add photo** as the edit screen). Next needs a name in one language: "Add a name in English or German to create the keepsake."
2. **Options.** A card "Options" with the line "What a guest chooses between, like colour and theme, in this order. None is fine: the keepsake is then one variant." and the N14 option blocks, with **Add an option**. Nothing is saved yet. Next is refused with the problems of section 5.
3. **Variants.** The card "{n} of {m} combinations ticked" ("One variant" with no option). **Every combination is offered, ticked, and the merchant unticks the ones that are not sold.** Only the ticked rows become variants, and the merchant can add other combinations later. Each row has a checkbox "Sell {title}", the thumbnail and title, a SKU code (suggested, as "VX-S-SWAN") and a price. A ticked row's code and price are edited in place. An unticked row says "Not sold". With more than one ticked row, a box "Price for all ticked" and the button **Apply** set one price at once. Next is refused with "Tick at least one combination.", or with the code and price errors at the rows.
4. **Stock.** The card "Opening stock" with the line "Units you have now, per ticked variant. At 0 guests see it sold out; the others stay for sale. Change it later in Inventory." One row per ticked variant with the thumbnail, the title, the code and a `QuantityBox` (0 to 9999).

The last step's button is **Create keepsake**. It creates a **draft** with a variant for each ticked row (published status, 0 reserved), shows the toast "{name} created as a draft with {n} variants." and opens the keepsake page. Publishing is a separate step there. The step row says "Details, Options, Variants, Stock" (open point 7). The footer button on every other step is "Next: {next step}".

## 12. The variant page

A row of the variants table opens it (the owner's pick: its own page, not a sheet).

- **Header.** The back arrow "Back to {keepsake name}", the title (the variant title, "Small / Pilatus") and the status line: "For sale" (green), "Sold out" (red), "Hidden" or "Archived" (muted), with the dot.
- **Details card** (⋯: Edit, "Hide from guests" or "Put on sale", Archive in the danger tone; an archived variant has "Restore as hidden" only). It has label and value rows: one row per option (the value as a small badge, "Missing" in the danger colour if empty), **SKU code** (monospace) and **Price**. Edit opens the variant sheet (section 6). The refusal to archive shows above the rows.
- **Media card.** The photo of the variant's theme, with a note. "No photo of its own: guests see the keepsake’s photos." when it has none. The lab draws the design from a lab-only table. A theme value has no photo in the data model (open point 2).
- **Stock box**, in the right column on a laptop (280 px) and under Details on a phone. Label and value rows: **In stock**, **Reserved by orders**, and **Available** in bold ("0, sold out" in the danger colour). Under them the button **Open inventory item** (secondary, 44 px on phones). It opens the inventory item page, and that page's back arrow returns to this variant.

Stock is read-only here. The merchant changes it in Inventory.

## 13. Inventory (N13)

Medusa's inventory, reduced to what ADR-022 keeps. One stock figure per variant and no locations. There is no purchasing flag and no sales channel.

### The list

- **Header.** The title "Inventory". No button.
- **The card** holds the shared `PageTabs` with a count on each, **All**, **In stock** and **Sold out**, and the search field on the same row ("Search code or name", up to 16 rem wide, with a clear button). Search matches the SKU code, the variant title and the keepsake name, in any case. **Archived variants are not listed.** A tab counts by availability: a variant is under Sold out when no unit is available, even if some are in stock and all are reserved.
- **Laptop.** A `DataTable` (card variant):

| Column | Content |
| --- | --- |
| Variant | The thumbnail, the title ("Small / Pilatus"), the keepsake's name, and below 1280 px the SKU code (monospace) |
| SKU code | Only from 1280 px |
| Reserved | The units reserved by orders, right-aligned |
| In stock | The shared **`QuantityBox`**, edited in place. It saves when the field is left, on Enter or on a step. The highest figure is 9999, the lowest 0 |
| Available | The figure, or "Sold out" in the danger colour and bold |
| ⋯ | Open item, Open variant |

- **Phone.** A list. Each row has the thumbnail, the title, the code and ⋯, and under them the two stock lines on the left and the `QuantityBox` on the right.
- **A refusal** shows under the box in the danger colour: "{n} unit(s) is/are reserved by orders, so stock can’t go below the {n} reserved." and "Enter a whole number, 0 or more.". The figure is not saved.
- **Empty.** "No variant matches “{query}”.", "Nothing is sold out." or "No variants in stock.".

### The inventory item page

- **Header.** The back arrow, the title "{code} · {variant title}", and the status line "{n} available" (green) or "Sold out" (red).
- **Details card** (⋯: **Adjust stock**). Rows: **SKU code**, **In stock**, **Reserved by orders**, **Available** (bold, "0, sold out" in the danger colour).
- **Reserved by orders card.** One row for each open reservation: the order reference as a link (`SK-1044`), a muted line "{guest} · accepted {date}", and "{n} reserved" on the right. A final row **Total** with "{n} reserved". With none: "Nothing is reserved. Units are reserved when an order is accepted, and released when it is handed over, cancelled or declined.". The reservations of a variant add up to its reserved figure (a test checks it). The order link opens the order once an order screen exists. The lab shows a toast.
- **Associated variant card.** A link with the thumbnail, the variant title and the keepsake name. It opens the variant page.

### Adjust stock

⋯ Adjust stock opens the shared `SheetFrame` titled "Adjust stock · {code}", with the footer **Save** and **Cancel**. It has the shared `QuantityStepper` labelled "In stock" with the hint "{n} reserved by orders", an error line, and the line "{n} would be available. At 0 guests see it sold out; the other variants stay for sale.". Save refuses a figure below the reserved units with the same text as above. A save shows "{code}: {n} in stock." and closes the sheet.

## 14. States of the lab page

| State id | What it shows |
| --- | --- |
| `products` | The Keepsakes list with the Victorinox keepsake. Create starts the create flow, and the new keepsake joins the list |
| `product` (Keepsake: edit) | The edit screen. 10 variants of 36 combinations: VX-L-SWAN sold out (both units reserved), VX-S-LION sold out at 0, VX-M-STEAMBOAT hidden, VX-S-OLDTOWN archived |
| `unsaved` | Edits not yet autosaved and Back pressed: the leave confirm is open |
| `newoption` | N14 open on a new Colour option. Eight variants have a colour, two do not, so Save is refused and names them. "Give all" fills every variant, and then Save works and the Variants table gets a Colour column |
| `inuse` | N14 open on Theme, with the refused delete of "Lion Monument" (used by VX-S-LION and VX-L-LION). Deleting "Furka Pass" works |
| `duplicate` | The Create variant sheet with Small and Swan on the lake, which VX-S-SWAN already is: refused at Save. Another theme creates the variant with 0 in stock |
| `review` | Review and publish, ready to publish, with warnings |
| `blocked` | Review of a draft with only an English name, no text and no photo. Two checks stop publishing and Publish is off. Edit jumps to the field. On a phone the pinned bar opens with the checks |
| `create-details` | The create flow, step Details, from an empty keepsake |
| `create-options` | The SwissCard example, step Options: Colour and Theme |
| `create-variants` | All 9 combinations, two unticked (Navy and Pilatus, Black and Chapel Bridge), codes suggested, CHF 39 set |
| `create-stock` | Step Stock. The last button creates the keepsake as a draft |
| `variant` | The variant page for Small / Pilatus (VX-S-PILATUS) |
| `inventory` | The Inventory list. Try 1 in stock for VX-L-SWAN: refused, 2 are reserved |
| `item` | The item page for VX-S-PILATUS: 5 in stock, 3 reserved (SK-1044 reserves 2, SK-1049 reserves 1), 2 available |
| `belowheld` | Adjust stock open on VX-L-SWAN with 1 typed while 2 are reserved by SK-1039: refused. 2 or more saves |
| `loading` | The skeleton of the edit screen: the header, then four cards of the real shape |

The owner picked the four-step create flow and the variant page for variant editing. The rejected alternatives (a three-step flow with stock set afterwards in Inventory, and a variant sheet over the keepsake page) were deleted from the lab on 2026-10-29. Do not build them.

The merchant lab frame shows the sidebar with its groups, and the phone shows the tab bar with More highlighted. These are frame, not design.

## 15. Rules

- **Generic options per product.** Each keepsake owns its options (ADR-027). Nothing is shared between keepsakes. A value belongs to one option, and an option to one keepsake.
- **A variant is a sold combination.** One value of each option, a SKU code unique in the shop, a CHF price above 0 in Rappen, and a status: for sale, hidden or archived. An archived variant stays for old orders and is never deleted.
- **Stock per variant.** In stock, reserved by orders, and available (in stock minus reserved, never below 0). In the data these are `on_hand` and `held` (ADR-016). The screens say "In stock" and "Reserved", and never "on hand" or "held". Stock can't go below the reserved units. Setting a variant to 0 sells that variant out and leaves the other variants of the design for sale (AC53).
- **One full language publishes** (AC30). The other language only warns. A German label may be empty (open point 9).
- **No engraving, no sub-category, no deposit or pay-later** (O28, Q23, AC55). No mock text offers engraving.
- **No price on guest lists** (AC54). The price shows only on the keepsake page and in its preview.
- **Names stay in one place.** The wording rule: "Reserved", never "held". "In stock", never "on hand". "Adjust stock".

## 16. Reused components

Use these, not new ones.

- `SheetFrame` for N14, the variant sheet, Adjust stock and the photo picker. `ConfirmDialog` and `useConfirm` for Delete option, Unpublish, Discard and the leave guard.
- `DataTable` (card variant) for the lists and the options and variants tables, `PageTabs` for the status and stock tabs, `RowActions` with `isDanger` for every ⋯ menu, `StatusChip`, `QuantityBox` and `QuantityStepper` for stock, `Media` for thumbnails.
- `LanguageVersionSwitch` (section 8) and `IPhoneMockup` (section 10). Both live in `features/lab` and must move to `front-end/src/components/` before the build.
- `CommissionCard` from `features/merchant/products/components/gift-editor`, as it is.
- The story editor's ordered list (`useStopDrag`, the grip, the arrow keys) for photos and option values, and the media library picker (N18) for photos.
- The HeroUI `Tabs`, `Chip`, `TagGroup`, `Radio`, `Switch`, `TextField`, `NumberField`, `SearchField`, `Checkbox`, `Skeleton` and `Button`.

Shared changes made in this round, all in the working tree:

- **`components/row-actions.tsx`.** The optional `isDanger` on an action puts the item in the danger tone (red text, not a solid fill). The menu is `w-max` with a `max-w-[calc(100vw-2rem)]`, so a menu near the screen edge keeps its labels on one line.
- **`components/data-table.tsx`.** The pinned Actions header takes the card's colour (`bg-surface`) in the card variant. It keeps `bg-surface-secondary` in the page variant.
- **The shared language switch** and **the iPhone mockup** (above).

**Destructive style.**

- ⋯ items use `isDanger`: Delete (option), Archive (variant).
- Trash buttons use `danger-soft`: delete an option, delete a value.
- The Unpublish button is `danger-soft`.
- The shared confirm keeps its ink confirm button. Per the design system, the ink button is only the confirm button inside a dialog (the Button README has the note of 2026-10-29).
- A refusal shows as a `danger-soft` alert with an icon at the control, as the lab does. Successes use a toast.

## 17. Copy

All English wording is in the lab files and in the sections above. The wording rules: "Reserved", never "held". "In stock", never "on hand". "Adjust stock". "Variant", and the refusal texts that say "SKU" are open point 8. German copy does not exist. Put the strings in the app's dictionary in both languages. Option names and values are data, in English and German, edited by the merchant.

## 18. Build notes (E6.1, E6.2, E6.3)

- **Routes.** `/store/products` (M11), `/store/products/gifts/new` and `/store/products/gifts/$productId` (M12), and `/store/products/inventory` (N13), all `ssr:false`. The variant page and the inventory item page need a route each. The lab has no routes for them (open point 10). Put any value a route's `validateSearch` reads in the feature's `lib/search-params.ts` (AGENTS.md rule 1).
- **Data.** Read with the feature query hooks and change with `useCommand` or, on a screen that saves and leaves, `useSubmit` (AGENTS.md rule 4). The lab's `useCatalog` keeps the shop in React state and is not the model. The real autosave writes the draft with `row_version` and `If-Match`. The options save is one request with every variant's new values. The stock write is `inventory.setOnHand`, refused below `held`.
- **Server.** The API holds the rules of section 7 and the publish checks of section 10 (a full language, a photo, a variant on sale, and variants without an error). The database holds the combination key, the unique code and the `CHECK (held <= on_hand)`. A refusal from the API returns the same texts, with the numbers.
- **Heavy parts.** The phone mockup and the preview load only on the Review screen. Keep them out of the edit screen's first load (AGENTS.md rule 9).
- **Reservations.** The item page lists the open reservations of a variant: order reference, guest, accepted date and quantity. Their sum is the reserved figure.
- **Skeletons.** The edit screen's skeleton has the shape of the header and four cards. The tables use the `DataTable` `isLoading` state (AGENTS.md rule 10).
- **Accessibility.** The grips have a label with the position, and a live region announces a move. The save status is a live region. Every check has a text jump, not only an icon. Targets are 44 px on phones, except the three limits of open point 5.
- **Tests to write.** Playwright `[E6.1][E6.2][E6.3][AC30][AC52][AC53][AC55][AC05]` in EN and DE at 375 px and 1280 px, covering:
  - A new keepsake is blocked by language, photo and a variant on sale, and Publish turns on when they are set (one full language is enough).
  - Name, text, media and commission autosave and show "Saved {time}". Leaving with unsaved edits asks first.
  - The create flow offers every combination ticked, creates only the ticked ones as a draft, and a keepsake with no options gets one variant.
  - A duplicate combination, a taken code and a missing price are refused at the field.
  - A used value and a used option can't be deleted, and the refusal names the variants.
  - A new option is refused until every variant has a value, and "Give all" fills them.
  - Archiving is refused while units are reserved. Setting stock below the reserved units is refused and names them.
  - Stock 0 sells that variant out and leaves the others for sale (AC53). Two holds on the last unit give one success (AC05).
  - The inventory list tabs and search, the In stock field saving in place, and the item page's reservations adding up to the reserved figure.
  - The destructive items use the danger style.
  - The unit tests in `front-end/tests/lab-keepsake-editor.test.ts`, the render cases in `lab-keepsake-editor-render.test.tsx` and the cases in `lab-language-switch.test.tsx` are a source of cases.

## 19. Open points

1. **O26.** The theme list (the client's twelve concepts), the colour list, the design rights and every price are mock. The SwissCard in the create flow is an example, not a decided product.
2. **A photo per theme value.** The data model has no field for it. The lab shows a design thumbnail from a lab-only table (`THEME_PHOTO`). Should a theme value carry its own photo?
3. **The payment deadline and the preparation time.** The screen inventory lists a payment deadline for M12, and products have `preparation_hours` (O22). Neither is on these screens.
4. **Keepsake photos are not uses in the media library** (N18 open point 2). A photo that only a keepsake uses shows as unused there and can be retired.
5. **Shared component limits.** The `QuantityBox` number field is about 28 px wide, so a three-digit stock figure is tight. The ⋯ button is 36 px on phones, and the shared tabs are 32 px, both below the 44 px target.
6. **The preview is a stand-in.** It is not the real guest product page C03, which is still to be edited. The preview follows C03 then.
7. **Settled 2026-10-29:** the create flow has four steps, with the button "Create keepsake" on the last.
8. **Settled 2026-10-29:** the screens and refusals say "variant"; "SKU code" stays the name of the code field.
9. **German is optional** for an option name or value, and ADR-027 assumes labels in both languages. The publish card warns. The ADR text is unchanged.
10. **Screens without ids.** The variant page and the inventory item page have no id in the screen inventory. The lab's link on the publish card reads `/{lang}/gifts/{slug}`, the route name of the code. The label on screen is Keepsakes. Also open: the phone list rows show no status (section 3), and the "Restore as hidden" rule has no story. **Settled 2026-10-30 (gate G-E62-RESTORE):** an archived variant cannot be restored, so "Restore as hidden" is not built. The unique combination key counts archived variants, so an archived combination stays taken, and E6.2 sets the wording of the refusal for an archived twin.

Not verified: a phone with a real keyboard or touch, drag of photos and values on a phone, a screen reader, reduced motion, the German UI, and a keepsake with many variants. The lab was not run against the real API.

## 20. Rejected

- **A. Cards, B. a Shopify-style matrix, C. steps.** The three first options.
- **Shared global options** (Medusa). Options stay per product.
- **A separate inventory item model with several locations** (Medusa). One stock figure per variant.
- **Breadcrumbs.** A back arrow instead.
- **An Options item and a product-categories item** in the sidebar.
- **The three-step create flow** (Options and variants on one step, stock set afterwards). Deleted from the lab.
- **A variant sheet** in place of the variant page. Deleted from the lab.
- **A status badge** in the page header. The status is coloured text with a dot.
