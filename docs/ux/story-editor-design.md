# Story editor design: M17, a mix on option B

- Status: **design approved** on 2026-10-29 (chat approval of the lab page `/lab/story-editor`). Nine points are open (section 13).
- Note of 2026-10-29 (owner, with the keepsake catalog design, `docs/decisions/2026-10-29-keepsake-catalog-design.md`). Three things change, and this note wins over the sections it names.
  - **The language switch is shared.** Section 5, item 1 ("Two buttons… a dot… Start this version") and the compact switch in the header of section 2 are now one component, `LanguageVersionSwitch` (lab page `/lab/language-switch`), which the keepsake editor uses too. It is the app's thin tabs with a status icon after each label, and one status line under them (the header keeps the compact EN and DE form with no line). A version that does not exist reads "Not started · choose to start it" instead of "Start this version". The arrow keys only move the focus. A click, Enter or Space chooses, so arrowing does not create a draft.
  - **The laptop preview is the iPhone 16 Pro mockup.** Section 2, "Review and publish, laptop", describes a phone outline with an 8 px border, 375 px wide and 756 px high. The preview now uses the shared `IPhoneMockup` (a titanium band, bezel, Dynamic Island and status bar, the screen 402 by 874 points, scaled down to fit the column and the window height). The story still scrolls inside it. The phone layout keeps the plain outline in the flow of the page.
  - **No breadcrumb.** The editor has a back arrow ("Back to Stories", "Back to writing") and never a breadcrumb, as every merchant detail page of the catalog.
- Note of 2026-10-30 (owner, gate G-E214-SLUG). ADR-014 is kept: story slugs stay per language with `UNIQUE (language, slug)`, and the schema and the API do not change. This note wins over the sections it names.
  - **The link is per language.** In section 6, the Link card help text "The same link for English and German." no longer holds, and neither does "All cards are shared by both languages" for the Link card. Each version has its own slug. When the merchant sets the English slug, the card prefills the German slug with the same value, and the merchant can change either one (E4.3). The "Shared by English and Deutsch." line over the Details cards holds for every card except Link.
  - **The switcher.** On a story page, the guest language switcher finds the other version through the story group, because its slug can differ (E4.4).
  - **Source.** The pattern is Payload CMS's localized slug (https://payloadcms.com/docs/v4/fields/slug.md): unique per locale, reusable across the locales of one document, and seeded in every locale on create.
- Screen: M17, the merchant story editor at `/store/content/articles/$articleId`. Slice S3, Track 1, story E4.3. The story list (`/store/content`) is not part of this design.
- Read first: `docs/decisions/2026-10-29-story-editor-design.md` (what was approved, what was rejected, the open points), `docs/decisions/2026-10-28-story-editor.md` (the body shape, the allow-list, the pin link and the server validation, which this design leaves as they are), `docs/adr/ADR-011-outbound-link-by-place.md` (pin links), `docs/adr/ADR-030-merchant-edited-map-and-blog-categories.md` and rule R5 of `docs/decisions/2026-10-27-map-pins-and-events.md` (categories), PRD §11.2 and §11.3, and AC30, AC31, AC32, AC33, AC87.
- Visual reference: the lab page `/lab/story-editor` (run the front end and open it). **The lab is a design reference, not product code.** It keeps one story in React state, uses mock data, draws the merchant dashboard around the editor in an iframe and stands in for some product pieces (the phone keyboard, the library, uploads). Do not copy it. Build the screen in the product with the rules below.
- Lab files, under `front-end/src/features/lab/`: `story-editor-screen.tsx` (header, Write, Review), `story-editor-parts.tsx` (cover and title, language switch, save status, checks, publish actions), `story-editor-tiptap.tsx` (the body editor, the bars, the media blocks), `story-editor-schema.ts` (the Tiptap schema, the allow-list), `story-editor-details.tsx` (the Details cards), `story-editor-categories.tsx`, `story-editor-ordered.tsx` (the drag list), `story-editor-sheets.tsx` (the pickers), `story-editor-picker.tsx` (the sheet frame), `story-editor-selected.tsx` (the selected mark), `story-editor-preview.tsx` (the preview), `story-editor-rules.ts` (pure rules and checks), `story-editor-state.ts` (the story in memory and autosave), `story-editor-guard.tsx` (leave guard), `story-editor-data.ts` (mock data), `story-editor-cards.ts`, `story-editor-shell.tsx` (merchant frame), `story-editor-lab.tsx` (the lab page and its notes), `story-editor-app.tsx` and `story-editor-search-params.ts`. The route is `front-end/src/routes/lab.story-editor.tsx`. The tests are `front-end/tests/lab-story-editor.test.ts`, `lab-story-editor-render.test.tsx` and `lab-story-editor-autosave.test.tsx`.

## 1. What the screen is for

A merchant writes a story in English or German, saves it as a draft without thinking about it, checks it on a phone preview, and publishes one language at a time. A story has one document per language version (the body shape is in the 2026-10-28 record). Everything else, such as the link, the categories, the places and the keepsakes, is shared by both languages. The page sits in the merchant sidebar under Content, Stories. The editor draws its own top bar. On phones the merchant tab bar stays at the bottom.

The signed-in account is the author. The byline shows the account's display name. There is no author field and no author role.

The lab page shows twelve states at laptop (1280 px) and phone (375 px) width. A State control picks one:

| State | What it shows |
| --- | --- |
| Draft with content | "A morning on the Musegg wall", the English version as a draft with every allowed node and mark, and a raw link to the website of the pin Hotel am See, so the yellow pin-link warning shows. The German version is published |
| New story (empty) | English draft started, German not started. Review shows the four blocking checks |
| Writing on a phone | The phone bar above a drawn keyboard (a lab frame cannot open a real one) |
| Insert media | The insert sheet open on Photo |
| Pin link picker | The words "Zyt tower" are selected and the pin picker is open |
| Review and publish | The Musegg draft, ready to publish, with warnings |
| Review: blocked | The Hotel am See review with no check date. One check stops publishing and the Editorial review card is open |
| Review: editorial review | The Editorial review card open on an editorial review |
| Review: blog categories | The category sheet open on the Musegg story, tagged Old Town |
| Loading | The skeleton of the Write screen |
| Unsaved changes | The merchant pressed Back with unsaved edits and the confirm is open |
| German version (published) | The German version, live since 17 Oct. Edit it and the switch says "Published · edits not live" |

## 2. Layout and widths

The breakpoint is 1024 px (Tailwind `lg`, the shared `useIsWide`). "Laptop" means from 1024 px and "phone" means below it.

### The header (both screens)

A bar 64 px tall, sticky at the top of the page, with a blurred background and a line under it.

| Part | Write | Review and publish |
| --- | --- | --- |
| Back button (44 px, icon only) | "Back to Stories". With unsaved edits it opens the leave confirm (section 7) | "Back to writing". It returns to Write |
| Title line | The language name and the state of its version, for example "English · Draft" or "Deutsch · Published" | "Review and publish" |
| Save status (section 7) | Under the title line | Under the title line |
| Language switch | Laptop: a compact EN and DE switch in the header. Phone: not in the header, see below | None. The switch is on the publish card |
| Action | Laptop: the button "Review and publish". Phone: the button "Review" (44 px) | None |

On a phone the full language switch (language name and state, 44 px tall) sits above the two cards on Write.

### Write

One column, at most 760 px wide, centred. Two cards, one under the other, in the style of the pin editor's cards (`DetailCard` in N17): a 36 px icon tile, the title, then the content. On a phone the cards run the full width with square corners and a line above and below. From 1024 px they have rounded corners (`rounded-3xl`) and the surface shadow.

1. **Cover and title** (section 3).
2. **Story** (section 4). Its header shows the body facts on the right from 640 px, and below the editor on a phone.

### Review and publish, laptop

A grid with two columns. The left column fills the width. The right column is 440 px and has a line at its start.

- **Left: the preview.** It stays in view below the header and fills the window height. A line says "What guests will see, on a phone as most of them read. Scroll inside the phone." Under it sits a phone outline with a 8 px border, 375 px wide inside (391 px with the border). Its height is 756 px, or less to fit the window (`min(756px, 100dvh - 10rem)`). The story scrolls inside the phone. There is no laptop preview.
- **Right: the panel.** It stays in view and scrolls on its own. From the top: the **publish card** (section 5), then the heading "Details" with the line "Shared by English and Deutsch.", then the **Details cards** (section 6). The Details panel is always there and cannot be closed. Each card inside it can.

### Review and publish, phone

One column with 16 px gutters. Top to bottom:

1. The language switch with the title and link of that language (the head of the publish card).
2. A segmented switch **Details** and **Preview**, 44 px, sticky under the header. Preview opens first. Details opens first when something blocks publishing, and in the editorial review and category states.
3. The chosen part. Details shows the heading "Details", the shared line and the cards. Preview shows the story in a phone outline of the page's width, in the flow of the page, not at a fixed height.
4. A **publish bar**, fixed above the tab bar. It shows one line, "N things stop publishing" with a red icon, "Ready · N to look at" with a yellow icon or "Ready to publish" with a green icon, and the short Publish button. Pressing the line opens the checks above the bar (at most 42% of the window height). The checks open by themselves when something blocks publishing. Pressing Edit or Show closes them and jumps. A Show jump to a Details card also switches to Details.

## 3. The Cover and title card

- **Cover photo** (required, marked with a red star). A 16:9 area.
  - Empty: a dashed button, "Add a cover photo", with "From your media library, or upload one" under it. After the merchant pressed Review with something blocking, or jumped here from a check, an empty cover has a red dashed border and red text.
  - Set: the photo, with two buttons at its bottom-right corner: "Change cover" and a trash button "Remove cover". 44 px tall on a phone.
  - Both open the insert sheet limited to photos (section 8), titled "Cover photo", with the button "Use as cover". A new language version starts with the cover of the other version.
- **Title** (required). A serif field, at most 140 characters, 48 px tall on a phone. The placeholder is "A morning on the Musegg wall". The error is "Add a title to publish."
- **Excerpt** (required). A text area of two rows, at most 300 characters. Help: "Under the title, on story cards and in search results." and the count "{n} / 300". The error is "Add an excerpt to publish."
- **Byline note:** "Written by {account name}, the name of the account you are signed in with."

Errors show only after the merchant pressed Review with a blocking check, or used an Edit jump. Fields carry `lang` of the open language.

## 4. The Story card

The body is one Tiptap editor (decision 2026-10-28, same allow-list). The card shows a placeholder on an empty body: "Tell your story…" in English and "Erzählen Sie Ihre Geschichte …" in German. The text is 17 px on a 32 px line, with serif headings, so writing looks like reading. A pin link looks like a pale red highlighted word.

**Body facts** (computed, never entered): "{n} words · {m} min read · Contents: {k} sections", or "No contents list (needs 2 headings)". The rules are those of the 2026-10-28 record: 200 words a minute, at least 1 minute, the contents list holds the H2 headings and needs at least 2.

### The formatting bar, laptop

Always visible at the top of the card. It sticks 64 px from the top, under the header, while the text scrolls. It wraps to a second row if it must. From the start:

1. H2 ("Heading"), H3 ("Small heading"), Bold, Italic, Quote, Bulleted list, Numbered list.
2. A divider, then Link and Link a pin.
3. A divider, then the button **Insert** (a photo icon and the word). It opens the insert sheet on Photo.
4. At the end, Undo and Redo, each off when there is nothing to undo or redo.

Every tool is a 36 px button with a label for screen readers and a tooltip. A tool that applies at the cursor shows pressed (`aria-pressed`). A tool never takes the focus from the text, so the selection stays.

Under the bar, inside the same sticky block, sits one line of context when the cursor is on a link or a pin link (section 4, "Links").

### The bubble, laptop

When text is selected and the editor has the focus, a bubble opens above the selection with the same tools as the bar except Insert, Undo and Redo: the seven formatting tools, Link and Link a pin. It does not open for a selected photo, video or recording. There is no bubble on phones, where it would fight the phone's own selection menu.

### The "+" on an empty line, laptop

On an empty line a round "+" button shows at the start of the line, outside the text column (the text column has 48 px of room for it). Pressing it opens three round buttons, Photo, Video and Recording, and each opens the insert sheet on that tab.

### The bar, phone

No bubble and no "+" at the line. The bar is always visible while writing.

- It is fixed above the tab bar while the keyboard is closed. When the keyboard opens it moves to sit right above it (it follows `visualViewport`, written to the element and not to state, so scrolling does not re-render).
- Buttons are 44 px. From the start: "+" (insert a photo, video or recording), a divider, the seven tools, Link, Link a pin, a divider, Undo, and Done (it only shows while the editor has the focus, and it closes the keyboard). **The phone bar has no Redo** (open point 7).
- It scrolls sideways with its scrollbar hidden.
- The line of context for a link or a pin link shows above the buttons.

### Links

- **Link.** The Link tool opens a small form: the address field (`type="url"`), Apply, Remove (only on an existing link) and Cancel. Apply accepts `https:`, `http:` and `mailto:` through `safeHref`. Otherwise the field shows "Use a web address (https://…) or an email (mailto:…)." With nothing selected, Apply inserts the address as linked text. Enter applies.
- **Link a pin.** The tool opens the pin picker (section 8) titled "Link a pin". With text selected, the text links to the pin and any plain link on it is replaced. With nothing selected, the pin's name goes in at the cursor as linked text. A pin link does not tag the place. The picker says so.
- **On a pin link** the line of context reads "Pin link: {name}", then "(not published: plain text for guests)" when the pin is not published, then the buttons Change and Remove.
- **The pin-website warning (ADR-011).** A plain link whose host matches the host of a pin's outbound link (with or without `www.`) shows a yellow note: "“{text}” links to {host}, the website of your pin {name}. A pin link follows the pin if its website changes." The buttons are **Switch to pin link** (every plain link to that address becomes a pin link) and **Keep** (hides the note for that address). The note never blocks saving or publishing. It also appears as a warning in the publish checks.

### Media blocks

A photo, a video and a recording are blocks at the top level of the document, between paragraphs. The schema keeps them out of quotes and lists. Each is a figure with a selected ring, a remove button (44 px on a phone) and an inline **caption** field. A video also has a title field and a recording a title field. The caption is an attribute, so a figure holds no second editor. A new photo takes the library description as its `alt`.

Where a block goes: on an empty line it takes the place of that line. Otherwise it goes after the top-level block that holds the cursor, never inside a quote or a list.

## 5. The publish card

The card is the first thing in the right column (laptop) and the head of the page (phone). The language switch on it is the same state as the switch in the Write header, and the preview follows it.

From the top:

1. **The language switch.** Two buttons, "English" and "Deutsch". Each shows a dot (green when published, yellow when a draft, an empty circle when not started) and a line: "Published 17 Oct" (or "Published · edits not live" after an edit), "Draft", or "Start this version" when it does not exist. Pressing "Start this version" makes an empty draft with the cover of the other language and opens it.
2. **The line** "Title, text and cover are per language."
3. **The title and link of the chosen language.** The title in serif ("Untitled story" when empty). Under it, `/{lang}/stories/{slug} · guests see it within about a minute`.
4. **The action** (on a laptop, a stack of full-width buttons):
   - A draft shows **Publish English** or **Publish Deutsch**.
   - A live version with no edits shows **Unpublish** (tertiary).
   - A live version with edits not yet live shows **Publish changes (EN)** or **Publish changes (DE)** above **Unpublish**.
   - Publish is off while any check blocks. A line under it reads "Fix what stops publishing first."
   - Publish shows the toast "{English or Deutsch} version published. Guests see it within about a minute."
   - Unpublish opens the shared confirm: "Unpublish the {language} version?", "Guests stop seeing it at once, and links to it show the other language or a not-found page. It stays here as a draft.", with the ink button "Unpublish". The toast is "{language} version is a draft again."
5. **The checks of that language** (section 9), under a line.

## 6. The Details cards

Eight cards, in this order. Each is a collapsible card in A's style (the pin editor's `DetailCard`): a header button of at least 56 px with the icon tile, the title, a problem icon when it holds a problem (red "Stops publishing", yellow "To look at"), and a chevron. When the card is closed, a one-line summary sits under the title. When it is open, the body shows.

A card **opens by default when it holds a problem** (a blocking check or a warning that names it). The lab's State control also opens the card the state is about. A check's Show jump opens its card and scrolls it into view below the header.

| Card | Closed summary | Open content |
| --- | --- | --- |
| Link | "/stories/{slug}" or "Not set" | See below |
| Editorial review | "No, a story", or "{place} · checked {date}" or "{place} · no check date" | See below |
| Blog categories | The chosen category names, or "None" | Section 6.1 |
| Places | The pin names, or "None" | See below |
| Stay | The chosen label | See below |
| Interests | The chosen labels, or "None" | See below |
| Keepsakes | "{n} of 6" | See below |
| More to discover | "{n} of 3", with " · the newest stories" when none | See below |

All cards are shared by both languages.

**Link** (required to publish). A text field "Link" with the prefix "/en/stories/" or "/de/stories/" shown in front. Anything typed becomes a slug (lowercase, hyphens). Help: "The same link for English and German." When empty it reads "Needed to publish." and, when a title exists, offers a button "Use “{slug of the title}”". The input is 44 px tall on a phone.

**Editorial review.** A switch "This is an editorial review" with the help "Your review of one place. It names who checked the facts and when, and the place’s card on the map links to it." When on, a tinted block shows:
- **Place reviewed** (required). A 44 px photo, the pin name and "Change", or the button "Choose the place". It opens the pin picker "Place reviewed" (one pin). Choosing it also adds the pin to the story's places when it is missing.
- **Checked by.** Optional text. The placeholder is the account name. The preview shows the account name when it is empty.
- **Facts checked on** (required). A date field, not later than today.
- There is **no partner label** on hotel reviews (owner, 2026-10-29).

**Places.** Text: "The pins this story is about. Their cards on the map list it." A plain list, no order: a 44 px photo, the pin name, "Not published" when it is, and a remove button. The button "Choose places" or "Change places" opens the pin picker "Places in this story" (several pins, any pin of the store, done button "Save {n} place(s)"). When the text links to a pin that is not tagged, a note says "Linked in the text but not tagged: {names}. A pin link does not tag the place."

**Stay.** Three radio cards: Short stay ("In Lucerne for a few hours or a day"), Multi-day ("Staying one night or more"), Both ("Everyone"). Help: "Orders lists for each guest; nothing is hidden."

**Interests.** The five fixed interests as a two-column grid of tags that can be selected, in the app's selected pattern: History and culture, Food and drink, Lake and mountains, Shopping and keepsakes, Local activities.

**Keepsakes.** Text: "Up to 6 published keepsakes, in your order, shown without prices." The chosen ones sit in an ordered list (section 6.2). The button "Choose keepsakes · {n} of 6" opens the keepsake picker. The picker offers every published keepsake, as a grid of 2 columns (3 from 640 px) with a name under each photo. A chosen one has the red border and a red numbered circle with its place. An unpublished one is off, with "Not published". Once 6 are chosen the others are off and the line above says "6 chosen, the most a story can show. Remove one to add another." The done button is "Save {n} of 6". Today only Victorinox knives are published (open point 8).

**More to discover.** Text: "Up to 3 stories at the end. With none, guests see the newest. A story without the reader’s language is hidden." An ordered list (section 6.2). The button "Choose stories · {n} of 3" opens a list picker with a photo, the title and "EN published · DE missing" for each story, a red numbered circle on the chosen, and the done button "Save {n} of 3". A story that lacks a language shows "No {language}: hidden for those readers" in the list.

### 6.1 Blog categories

The card shows the chosen categories as chips, one line of help and a button.

- **Chips.** Each chosen category is a removable chip. A sub-category chip reads "Old Town in Swiss history" (the name, then the parent in muted text). A parent that the story reaches only through a sub-category has **no chip**. A line under the chips says "Swiss history is included through Old Town." Without a choice the line says "A sub-category includes its parent. Choosing the parent instead puts the story in the general category."
- **Button.** "Choose categories", or "Change categories" once something is chosen. It opens the shared sheet at every width, like "Choose keepsakes".
- **The sheet.** Title "Blog categories". A search field "Search categories" that matches the English and German names. The tree under it. Done button "Save categories".
  - A parent row, then its sub-categories under it with a curved connector (the category editor N23's connector: a rounded corner of a 2 px line). Each row is a button of at least 44 px with the English name and the German name under it ("No German name yet" when there is none).
  - A chosen row has the red 2 px border and the red tick at its top-right corner. A parent that is included through a sub-category has a dashed border, a grey minus mark and the line "Included through {child}. Choose to use {parent} instead".
  - A search that matches a sub-category keeps its parent in view. A search that matches a parent shows all its sub-categories. No match reads "No category matches “{query}”."
- **Rules** (ADR-030 and R5). Choosing:
  1. a sub-category tags only that sub-category, and removes its parent from the chosen list (the parent is now only included);
  2. a parent that is included through a chosen sub-category replaces that sub-category (the story moves to the general category);
  3. a child of a chosen parent replaces the parent;
  4. a parent never selects its children;
  5. a chosen category again removes it.
  The pure function is `toggleCategory` in `story-editor-rules.ts`, with `includedParents`. The tests are in `lab-story-editor.test.ts`. No category is needed to publish (AC87). With none, the checks warn "No blog category: the story shows only under All."

### 6.2 Ordered lists

Keepsakes and More to discover use the app's drag pattern. The lab reuses `useStopDrag` from the tour itinerary editor (`front-end/src/features/merchant/products/components/itinerary/use-stop-drag`) as is, in the same way as the tour's keepsake list (`KeepsakesListSheet` in `sections-editor.tsx`).

- Each row: a grip button (44 px on a phone, 36 px on a laptop), a 44 px photo, the name (up to two lines) with a note under it, and a red trash button "Remove {name}".
- The grip drags the row by mouse, touch or pen. The arrow keys up and down on the grip move the row one place and keep the focus on the grip. Escape cancels a drag. A dashed red slot shows where a dragged row lands. The lifted row has a shadow.
- The grip's label reads "Move {name}, position {n} of {total}. Drag, or use the arrow keys." A live region says "{name} moved to position {n} of {total}."
- The note reads "Not published: hidden on the story" for a keepsake, and "No {language}: hidden for those readers" for a story.

## 7. Save, autosave and leaving

- **Autosave everywhere.** There is no Save draft button. A draft saves 1.5 s after the last edit. Text edits reach the story state 300 ms after the last key. Switching the language or leaving the screen hands over the last edits at once.
- **Save status**, in the header under the title line, with `aria-live="polite"`:
  - "Unsaved changes" in the warning colour with a dot, after an edit.
  - "Saving…" while the save runs.
  - "Saved {time}" with a green tick.
  - "Not saved yet" for a story that has no save.
- **A published version** that was edited keeps the guests' copy. The switch says "Published · edits not live" until the merchant presses Publish changes (ADR-014).
- **Leaving.** Back with saved edits leaves at once. Back with unsaved edits opens the shared `ConfirmDialog`: title "Leave without saving?", text "Your last edits are not saved yet. If you leave now, they are lost.", buttons **Keep editing** and **Leave without saving**. The confirm button is the only ink destructive button, as the design system allows only inside a dialog.

## 8. Pickers and sheets

Every picker is the shared `SheetFrame` at every width, with its action and Cancel in the footer. A sheet opens only from a page (Write, or a Details card), never from another sheet. All use the app's selected pattern: the red 2 px border and the red tick at the top-right corner, or a red numbered circle where order counts (`ChosenMark`).

| Picker | Opens from | Content | Done button |
| --- | --- | --- | --- |
| Insert (and Cover photo) | The Insert button, the "+" and the cover | Tabs Photo, Video, Recording (no tabs for the cover) | "Insert photo", "Insert video", "Insert recording", "Use as cover" |
| Link a pin | The pin tool | One pin from a searchable list of the store's pins | "Link this pin" |
| Place reviewed | Editorial review | One pin | "Link this pin" |
| Places in this story | Places | Several pins | "Save {n} place(s)" |
| Keepsakes | Keepsakes | A grid of published keepsakes | "Save {n} of 6" |
| More to discover | More to discover | A list of stories | "Save {n} of 3" |
| Blog categories | Blog categories | Search and the tree | "Save categories" |

**Insert.**
- **Photo.** The media library's photo wall (N18): a grid of 3 across (4 from 640 px) with the name under each tile, a search field "Search by name", and the button "Upload a photo" that adds a file to the library and chooses it. A photo that is still processing is off with a "Processing" chip. A chosen photo has the red border and tick.
- **Video.** A "YouTube link" field. A link that is not YouTube shows "This is not a YouTube link. Copy the address from the video’s Share button." A valid one shows the poster. A "Title" field. Help: "YouTube only. Guests load the video when they press play."
- **Recording.** A list of the library's recordings, each with the file name and its description ("No description" when empty), and "Upload a recording". The line above says "Recordings you made. Never AI voices."
- Upload checks use the media library's rules (`checkUpload`, N18). A refused file shows a toast.

**Pin picker.** A search field "Search your pins". Each row has the pin photo, its name and a line: its website for a published pin with one, "Opens on the map" for a published pin with none, and "Draft: shows as plain text until published" or "Hidden: shows as plain text" otherwise. Any pin of the store can be chosen, published or not.

## 9. Publish checks

The checks belong to the open language. The pure function is `publishChecks` in `story-editor-rules.ts`. Each check names where it is fixed, and has a jump: **Edit** for a field on Write, **Show** for a Details card or the publish card.

**They stop publishing** (red icon, bold text):

| Check | Text | Fixed in |
| --- | --- | --- |
| Cover | "Add a cover photo." | Write, cover |
| Title | "Add a title." | Write, title |
| Excerpt | "Add an excerpt." | Write, excerpt |
| Link | "Set the story’s link." | Details, Link |
| Review place (editorial review only) | "Choose the place this review is about." | Details, Editorial review |
| Review date (editorial review only) | "Add the day the facts were checked." | Details, Editorial review |

**They only warn** (yellow icon):

- The body has no text ("The story has no text yet.").
- A photo has no description for screen readers (the node's `alt` and the library description are both empty). "One photo has no description for screen readers." or "{n} photos have no description for screen readers."
- A photo, video or recording has no caption.
- A plain link goes to a pin's website (the text in section 4, "Links").
- A pin that the text links to is not published: "The pin {name} is not published, so its link shows as plain text."
- No blog category.
- A related story has no published version in this language.
- A chosen keepsake is not published: "{name} is not published and stays hidden on the story."
- The other language does not exist yet: "No {language} version yet: those readers see this one with a language notice." Show jumps to the publish card.

The list heading reads "{n} thing(s) stop(s) publishing" or "Ready to publish", and the warnings follow under "{n} to look at (publishing still works)". With nothing blocking, the first list holds one green line: "Cover, title, excerpt and link are all set. The other language is never required."

The other language is never required (AC30). A check with Edit sends the merchant back to Write, shows the field errors and scrolls to the field.

## 10. Preview

The preview is the guest story page (C20) drawn from the body document by a hand-written walker over the allow-list, as the 2026-10-28 record asks of the real renderer. A node the walker does not know draws nothing. It follows the open language.

- It reuses C20's own `ArticleBlocks` for photo, video and recording, and `ArticleContents` for the contents bar.
- From the top: the cover at 440 px tall with the title and the excerpt over a dark gradient, the byline (a round avatar and the account name), the date and the reading time (and for an editorial review "Facts checked {date} by {writer or account name}"), the contents bar (needs 2 H2 headings), the body, the published places as chips, "Keepsakes from this story" (published ones, no price), and "More to discover" (those that have the reader's language).
- Links: a plain link opens in a new tab with `rel="noopener"`. A pin link goes to the pin's website when it has one, otherwise to `/{lang}/map?place={slug}`. A pin that is not published draws plain text.

## 11. Rules

- **Body.** Exactly the allow-list of the 2026-10-28 record: nodes `paragraph`, `text`, `hardBreak`, `heading` (levels 2 and 3), `blockquote`, `bulletList`, `orderedList`, `listItem`, `image`, `video`, `audio`; marks `bold`, `italic`, `link`, `pinLink`. The editor's StarterKit turns off every other extension (strike, code, code block, underline, rule). Pasted content that uses other nodes is reduced to the allowed ones. A `javascript:` link is refused.
- **Limits.** Up to 6 keepsakes and 3 related stories (`MAX_ARTICLE_LINKS` and `MAX_RELATED_STORIES` in `packages/domain`). Adding past a limit changes nothing.
- **Author.** The byline is the account's display name. Nothing stores or shows a role.
- **Two language versions.** Title, excerpt, cover and body are per language. The link, the categories, the places, the stay tag, the interests, the keepsakes, the related stories and the editorial review are shared.
- **No price, no booking.** No price shows on the story or in the preview (AC54).

## 12. Build notes (E4.3)

- **Route.** `/store/content/articles/$articleId`, `ssr:false`. Put any value the route's `validateSearch` reads in the feature's `lib/search-params.ts` (AGENTS.md rule 1).
- **Tiptap loads lazily.** Keep `lazy(() => import(...))` for the body editor, and keep the pure rules (`story-editor-rules.ts` style) free of Tiptap so Details, Review and the page load without it (AGENTS.md rule 9).
- **Reuse.** Use these, not new ones:
  - `SheetFrame` for every picker, `ConfirmDialog` and `useConfirm` for Unpublish and the leave guard.
  - `useStopDrag` for the ordered lists, as the tour keepsake list does.
  - The media library's photo wall, search and upload rules (N18, E4.11).
  - C20's `ArticleBlocks` and `ArticleContents` in the preview.
  - The HeroUI `Tabs`, `SearchField`, `Switch`, `Radio`, `TagGroup`, `TextField`, `Skeleton` and `Button`.
  - The pin editor's `DetailCard` look for every card.
- **Icons.** The lab imports `Video` straight from `reicon-react`. Add it to `front-end/src/components/icons.ts` as a plain re-export (AGENTS.md rule 2).
- **Data.** Read with the feature query hooks and change with `useCommand` (AGENTS.md rule 4). The lab's `useStoryEditor` keeps one story in React state and is not the model. The real autosave writes the draft with `row_version` and `If-Match` (architecture AD-4, ADR-014).
- **Server.** The API checks the allow-list and the media ids (decision 2026-10-28). The widened publish rules (section 9) belong in the write validation too (open point 4 of the decision record).
- **German.** Put the strings in the app's dictionary in both languages. The lab has English only.
- **Accessibility.** Tools are buttons with labels and `aria-pressed`. Targets are 44 px on phones. Grips have a label with the position, and a live region announces a move. Save status is a live region. Every check has a text jump, not only an icon.
- **Tests to write.** Playwright `[E4.3][AC30][AC31][AC33][AC87]` in EN and DE at 375 px and 1280 px, covering:
  - A new story is blocked by its cover, title, excerpt and link, and Publish turns on when they are set.
  - An editorial review is also blocked by its place and check date.
  - A story publishes in one language only (AC30).
  - A draft saves itself and shows "Saved {time}", and leaving with unsaved edits asks first.
  - A published version edited shows "edits not live" until Publish changes.
  - The category rules of section 6.1, and the chips read "Old Town in Swiss history".
  - A keepsake list stops at 6 and a related list at 3, and both reorder with the arrow keys on the grip.
  - The pin-website warning offers a pin link, and the switch removes the warning.
  - Bold, a link, an H2 and a photo between two paragraphs survive a save and a reload.
  - On a phone the bar stays above the tab bar and above the keyboard, and the Review switch shows Details and Preview.
  - The unit tests in `front-end/tests/lab-story-editor.test.ts` and the render cases in `lab-story-editor-render.test.tsx` and `lab-story-editor-autosave.test.tsx` are a source of cases.

## 13. Open points

1. **The preview's contents chips.** In the phone preview, C20's contents chips sit 56 px below the top of the phone, and the active chip does not follow the scroll inside the phone. C20's component (`ArticleContents`) listens to the page scroll. Fixing it means touching C20's component, so it is a C20 and E4.4 follow-up.
2. **Not verified in the lab:** touch drag on a real phone, the bar above a real keyboard, typing captions and dragging media blocks, photo upload, and the category list with many categories. Not tested with a screen reader or with reduced motion.
3. **Media ids.** The lab's image and audio nodes hold a library row id, not a uuid. The real `sectionsToBody` and the body walker belong in `packages/domain` (E2.13).
4. **The byline.** Whose name: the account that created the story or the one that saved it last, and where it is stored. The contract still has `authorName` and `authorRole` (`packages/api-contract/src/content.ts`), which the E2.13 work removes.
5. **The link is per language.** `content.story_versions` has a `slug` per language version (DM-4). **Answered 2026-10-30 (gate G-E214-SLUG):** ADR-014 is kept, so each version keeps its own slug and the schema does not change. The Link card prefills the German slug from the English one, and the guest language switcher finds the other version through the story group (E4.4). See the note of 2026-10-30 at the top.
6. **A parent and its child together.** Only the editor refuses it today. Decide whether the API refuses it as well.
7. **Redo on phones.** The phone bar has no Redo.
8. **Keepsakes and the PRD.** PRD §11.2 says Victorinox knives. The owner's answer is all published keepsakes, which today are the knives. The lab's mock data still lists other products.
9. **Copy.** All English wording is the designer's, and German copy does not exist. Two lab comments are out of date: `story-editor-sheets.tsx` says a picker is a full-screen page on phones (the code uses `SheetFrame` at every width), and the open-points text on the lab page says "nine Details cards" (there are eight).

## 14. Rejected

- **A. Steps like the pin editor N17**, with Details as a step of its own.
- **C. A Ghost canvas with a side panel**, with writing on the canvas. Its Review layout is kept.
- **A second layout for blog categories.** The owner chose the chips, the button and the sheet.
- **A Save draft button.**
- **Author name and role fields.**
- **A laptop preview.**
- **A Language version card in Details.**
- **A partner label on hotel reviews.**
