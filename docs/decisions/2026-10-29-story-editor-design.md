# The story editor M17 is a mix on option B: a calm Write page and a Review page with a phone preview

- Date: 2026-10-29
- Status: **approved on 2026-10-29** (approval given in chat by the owner, on the lab page `/lab/story-editor`). It changes only the layout of the editor and adds the owner answers below. Nine points stay open (see "Open points").
- Note of 2026-10-29 (later the same day): the owner approved the keepsake catalog design (`docs/decisions/2026-10-29-keepsake-catalog-design.md`). Two shared pieces replace the editor's own. The language switch is the shared `LanguageVersionSwitch` (design A: thin tabs with a status icon and one status line, arrow keys only move the focus, a click or Enter chooses), and the laptop preview is the shared iPhone 16 Pro mockup in place of the phone outline. The editor has a back arrow and no breadcrumb. Decision points 1, 6 and 14 keep their meaning. `docs/ux/story-editor-design.md` carries the note and names the sections it changes
- Note of 2026-10-30: the owner answered open points 4 and 5. The byline names the person who last saved the story, taken from the signed-in account, and the editor keeps sending that account's display name as `authorName`. ADR-014 is kept: story slugs stay per language, `UNIQUE (language, slug)` (gate G-E214-SLUG, final decision of 2026-10-30, which replaces an earlier option A of the same day). The editor's Link card prefills the German slug from the English one (E4.3), and the guest language switcher finds the other version through the story group (E4.4). This is the common pattern: Payload CMS makes a localized slug unique per locale, lets the same value repeat across one document's locales, and seeds every locale on create (https://payloadcms.com/docs/v4/fields/slug.md). Neither answer changes the schema. Each point carries its answer below.
- Changes: `docs/ux/story-editor-design.md` (new), `docs/decisions/2026-10-28-story-editor.md` (dated note), `docs/development-plan/screen-inventory.md` (S3, M17, D15), `docs/development-plan/delivery-plan.md` (E4.3), `docs/adr/ADR-030-merchant-edited-map-and-blog-categories.md` (History line)
- Source: the owner's approval of the lab page `/lab/story-editor` on 29.10.2026
- Related: `docs/ux/story-editor-design.md` (the full specification), `docs/decisions/2026-10-28-story-editor.md` (the body shape, the allow-list and the pin link, which this record leaves as they are), `docs/adr/ADR-011-outbound-link-by-place.md`, `docs/adr/ADR-030-merchant-edited-map-and-blog-categories.md`

## Why

The 2026-10-28 decision fixed what a story is made of: one Tiptap document per language version, an allow-list of nodes and marks, a `pinLink` mark, and three steps (Write, Details, Review and publish). It said that a design could change "the layout of the steps and not the body shape". Slice S3 had no design for the editor. A coding agent built three options on one lab page, `/lab/story-editor`, on the merchant frame. A was steps like the pin editor N17. B was a page in the style of Medium and Substack. C was a canvas in the style of Ghost with a side panel. The owner did not pick one. The owner chose a mix on B, and A and C were deleted from the lab.

## Decision

The editor has two screens, Write and Review and publish. Details are no longer a step. They sit on the Review screen as cards.

1. **Write is B's calm page**, as two cards in A's style. "Cover and title" holds the cover, the title and the excerpt, all three required. "Story" holds the body. The header has Back, the EN and DE language switch with the state of each version, the save status and the button "Review and publish". There is no Details button.
2. **Formatting.** The Story card has a formatting bar that is always visible. It sticks under the header while the text scrolls. It holds H2, H3, bold, italic, quote, bulleted list, numbered list, link, pin link, Insert (photo, video, recording), undo and redo, and shows which tools are active. On a laptop the same tools also appear in a bubble on selected text ("keep it, good UX", owner). A "+" on an empty line inserts media on a laptop. On a phone there is no bubble. The bar is always visible, sits above the tab bar while the keyboard is closed and above the keyboard while the merchant types, and scrolls sideways with its scrollbar hidden.
3. **No author fields.** The byline is the display name of the signed-in account. The author role is removed everywhere. This changes the 2026-10-28 line "Author name and role sit in Step 1".
4. **Autosave everywhere.** There is no Save draft button. A draft saves itself after the last edit. Leaving with unsaved edits asks first, with the shared confirm.
5. **Review and publish is C's layout.** A phone preview sits on the left at a fixed phone height, with the story scrolling inside it, and the preview stays in view. There is no laptop preview. On the right come the publish card, then Details as a side panel that is always visible and cannot be closed.
6. **The publish card starts with the language switch** (English with its state, Deutsch with its state). It is the same language state as the switch in the Write header, and the preview follows it. Under the switch the card says "Title, text and cover are per language", shows the title and link of the chosen language, then the action (Publish, Unpublish or Publish changes for that language), then the checks of that language, each with an Edit or Show jump.
7. **Publish checks.** Four things stop publishing: the cover, the title, the excerpt and the link (the slug). For an editorial review the place and the check date also stop it. Everything else only warns, for example a missing caption, a photo with no description or a link to a pin's website. The other language is never required (AC30).
8. **Details are eight collapsible cards**, each in A's style with a one-line summary when closed. A card opens by default when it holds a problem. The cards are Link, Editorial review, Blog categories, Places, Stay, Interests, Keepsakes and More to discover. Details are shared by both languages. The panel says so ("Shared by English and Deutsch"). The Language version card of the 2026-10-28 list is gone, because the switch now sits in the Write header and on the publish card. The link (slug) belongs in Details and is shared by both languages.
9. **Ordered lists use the app's drag pattern.** Keepsakes and More to discover reorder with `useStopDrag`, reused as is from the tour itinerary editor: a grip, the arrow keys on the grip, and a remove button. Places have no order and keep a plain list.
10. **Pickers use the app's selected pattern**: a red border and a red tick at the top-right corner, or a red numbered circle where order counts. Every picker opens in the shared `SheetFrame` at every width. No sheet opens on top of another sheet. Pickers open only from a page.
11. **Keepsakes.** The picker offers all published keepsakes. Today the shop sells only Victorinox knives, so that is what it shows. More can follow. The PRD says knives (see open point 8).
12. **Blog categories.** The chosen categories show as chips. A sub-category chip reads "Old Town in Swiss history". A "Choose categories" button, like "Choose keepsakes", opens the shared sheet with a search field and the tree. A sub-category hangs under its parent with the curved connector of the category editor N23, and each row shows the English name with the German name under it. The rules follow ADR-030 and its rule R5 (a parent covers items tagged only with its sub-categories):
    - Picking a sub-category tags the story with that sub-category only. Its parent shows as included, not as a chip of its own.
    - Picking a parent that is already included through a sub-category replaces the sub-category.
    - Picking a child of a chosen parent replaces the parent.
    - A parent never selects its children.
13. **No partner label on hotel reviews.** The open question O33 (labelling affiliate or partner links) is answered for the editor with none. A label can be added later without editing a story, as ADR-011 intends.
14. **Phone Review.** The language switch is at the top, then a segmented switch "Details" and "Preview", then one of the two. The checks summary and Publish stay pinned at the bottom, above the tab bar.
15. **Options A and C are rejected and were deleted from the lab.** See "Rejected".

## What the mix takes from each option

| Option | Taken | Left out |
| --- | --- | --- |
| A. Steps like the pin editor N17 | The card style on Write and on Details. The collapsible cards with a summary line | Three separate steps. A step for Details. A Details button in the header |
| B. A Medium or Substack page | The calm writing page. The bubble on selected text. "+" on an empty line. This is the base | None of the page. The bar became always visible and sticky (the owner's change) |
| C. A Ghost canvas with a side panel | The Review layout: a phone preview on the left, the publish card and the side panel on the right | Writing on a canvas with a side panel. A laptop preview |

## What changes

- **Spec:** `docs/ux/story-editor-design.md` is what a coding agent reads when it builds E4.3.
- **The 2026-10-28 record** keeps its body shape, allow-list, links and validation. A dated note says that the layout is now designed, that the author role is gone, and that the publish rules are wider.
- **Inventory:** M17 (the editor row) is "Design approved". Slice S3 is "Partly approved" with M17 under "Approved screens", because C20 (the guest story page) is not approved. D15 records this decision.
- **Plan:** E4.3 points to the spec and carries the author, autosave and publish-check changes.
- **ADR-030:** one History line records that the editor applies R5 with replacement. The decision stands.
- **ADR-011, ADR-003, ADR-014:** no change. The pin link, the pin-website warning and the allow-list work as they did.
- **PRD:** no change (see "Not changed").
- **Data model:** no change (see "Not changed").

## Follow-up product work (not done here)

- **Remove the author role from the contract, the API and the seed (E2.13).** `packages/api-contract/src/content.ts` has `authorName` and `authorRole` (lines 144 and 145, 215 and 216). The API tests and the seed use them too. Both fields leave the document. The byline is read from the account.
- **Wider publish rules (E2.13, E2.6).** The 2026-10-28 record says "Publishing keeps its rules: a title and a slug". The owner now also requires the cover and the excerpt, and for an editorial review the place and the check date. The write validation must refuse a publish without them. The CHECK `story_versions_published_fields_check` asks only for a slug, a publish date, a title string and the body, so the API carries the extra rules unless the owner wants the database to carry them too.
- **Build `sectionsToBody` and the body walker in `packages/domain` (E2.13).** The lab has a lab-only `sectionsToBody` and a hand-written preview walker. The product uses the real ones, as the 2026-10-28 record describes.
- **Preview.** The preview draws C20 with its own components. See open point 1.
- **Shared pieces.** `VideoIcon` is imported straight from `reicon-react` in the lab and must go through `front-end/src/components/icons.ts` as a plain re-export (AGENTS.md rule 2). Tiptap stays behind `lazy(() => import(...))` (rule 9). The lab keeps its copy inline in the component files, and there is no German copy.
- **Tests.** The lab's cases in `front-end/tests/lab-story-editor.test.ts`, `lab-story-editor-render.test.tsx` and `lab-story-editor-autosave.test.tsx` are a source. The spec lists the Playwright cases.

## Open points

Decided here only as far as the lab shows.

1. **The preview's contents chips.** In the phone preview, C20's contents chips sit 56 px below the top of the phone, and the active chip does not follow the scroll inside the phone. C20's component listens to the page scroll. Fixing it means touching C20's component, so it is a C20 and E4.4 follow-up.
2. **Not verified in the lab:** touch drag on a real phone, the formatting bar above a real keyboard, typing captions and dragging media blocks, photo upload, and the category list with many categories. The lab was not tested with a screen reader or with reduced motion.
3. **Media ids.** The lab's image and audio nodes hold a library row id (for example `img-musegg-wall`). The real node holds a uuid.
4. **Whose name is the byline?** The account that created the story, or the account that saved it last. Where the story stores it is open too. The lab keeps one `author` on the story. **Answered 2026-10-30:** the account that saved the story last. The name comes from the signed-in account, and the editor keeps sending that account's display name as `authorName`.
5. **The link (slug) is shared, the data model is per language.** The lab and the owner treat the link as one value for English and German. `content.story_versions` has a `slug` per language version with `UNIQUE (language, slug)` (DM-4). Either the API writes the same slug into both versions, or the slug moves to the story group. E2.13 decides. **Answered 2026-10-30 (gate G-E214-SLUG):** ADR-014 is kept. Slugs stay per language with `UNIQUE (language, slug)`, and the schema and the API do not change. The editor's Link card prefills the German slug from the English one (E4.3), and the guest language switcher finds the other version through the story group (E4.4). Source of the common practice: Payload CMS, where a localized slug is unique per locale, the same value may be reused across one document's locales, and every locale is seeded on create (https://payloadcms.com/docs/v4/fields/slug.md).
6. **A parent and its child together.** Only the lab refuses a story tagged with both a parent and one of its sub-categories. The API (E2.6) may accept it. Decide whether it refuses too.
7. **Redo on phones.** The desktop bar has undo and redo. The phone bar has undo, a "+" and Done, and no redo.
8. **Keepsakes and the PRD.** PRD §11.2 says the merchant picks up to 6 published Victorinox knives, and AC31 allows only published ones. The owner's answer is all published keepsakes. For Phase 1 the two agree, because the shop sells only knives (PRD §7). The PRD needs a change only if the shop sells something else. The lab's mock data does not agree with the PRD. It still lists non-knife products (the Musegg story links `p-postcards`) and the picker offers them. Do not read the lab as a design for non-knife keepsakes.
9. **Editor wording the owner has not reviewed.** All English copy is the designer's. German copy does not exist.

## Not changed

- **PRD** (`docs/PRD/Swiss_keepsakes_PRD.md`). §11.2 says a story has an author who is a member of the store staff, with no role. It says the merchant edits at any time, with a draft and a publish, and names no Save draft button. §11.3 gives an editorial review a writer's name and a check date, which the design keeps (the field "Checked by", optional, and "Facts checked on", required). O33 stays open for labels in general. Nothing the design does contradicts the PRD for Phase 1.
- **Data model** (`docs/specs/001-storytelling-pivot/data-model.md`). It stores no author role for a story version. The only author columns are on comments and ratings. The follow-up above removes the role from the contract and the code, where it does exist.
- **ADR-011, ADR-003, ADR-014.** ADR-003 and ADR-014 do not name an author role. ADR-011 already says the editor warns on a raw URL and does not block.

## Rejected

- **A. Steps like the pin editor.** Three screens with Details as a step of its own.
- **C. A Ghost canvas with a side panel.** Writing on a canvas, with settings in a panel beside the text. Its Review layout is kept.
- **A second layout for blog categories.** The lab no longer holds it. The owner chose the chips, the button and the sheet.
- **A Save draft button.** Drafts save themselves.
- **Author name and role fields.**
- **A laptop preview** on the Review screen. The phone preview is the only one.
- **A Language version card in Details.**
- **A partner label on hotel reviews.**
