# Story editor: one rich-text document per version, in three steps

- Date: 2026-10-28
- Status: decided by the owner on 2026-10-28 (gates G-EDITOR, G-EDITOR-STEPS, G-EDITOR-WHEN and G-EDITOR-MIG). The documents named below were updated the same day. The story editor is built in E4.3 (Sprint 8). The owner may review a Claude Design mock before then.
- Changes: `docs/adr/ADR-003`, `ADR-011` and `ADR-014` (amendment notes), `docs/specs/001-storytelling-pivot/architecture.md` (Deferred list, rule AD-4), `docs/specs/001-storytelling-pivot/data-model.md` (DM-3 and the story version CHECK), `docs/development-plan/delivery-plan.md` (new E2.13, rows E4.3 and E4.4, section 1), `docs/development-plan/screen-inventory.md` (M17)
- Related: `docs/decisions/2026-10-27-map-pins-and-events.md` (pins and blog categories, which the story editor links to)

## Why

The owner reviewed the current article editor (`articles/$articleId`) and found it too rigid for a writer. A story is a list of sections. Each section has a heading and a list of blocks, and a paragraph block holds plain text. A merchant cannot bold a word, put a link inside a sentence, quote a guest, write a list, or drop a photo between two sentences. ADR-003 knew this and deferred rich text. The owner now wants the writing experience of Medium, Substack and Ghost.

## References

- Medium and Substack. Writing happens on one page. The cover, the title and the body flow as one document. A toolbar appears on the selected text, and a plus control inserts media between paragraphs. Publishing is a separate, last step.
- Ghost (the Koenig editor and its publish flow). The body is one document. Settings such as tags and the excerpt sit in a side panel apart from the writing. Publishing opens its own step with a preview and the checks.

From these we take three things: one continuous writing surface, media between paragraphs, and settings and publishing kept apart from writing. We leave out Ghost's card library (bookmarks, product cards, HTML) and any raw HTML.

## Decision

1. The story body is one Tiptap (ProseMirror) JSON document per language version. It replaces sections of blocks.
2. The editor is one Tiptap editor with a formatting bar and inline media. Tiptap is already installed (`@tiptap/react`, `@tiptap/starter-kit` and `@tiptap/pm`, all 3.32) and used in `front-end/src/features/merchant/products/components/story-editor.tsx`. No new dependency.
3. The story editor has three steps. Step 1 is Write (cover, title, body). Step 2 is Details (language version, blog categories, pins, stay tag, interests, keepsakes, related stories). Step 3 is Review and publish (preview, the publish checks, publish).
4. This is recorded now and the editor is built in E4.3. The contract, the write validation, the public read and the seed move to the Sprint 6 story E2.13, so the shape is in place before the editor starts.
5. E2.13 edits migration `0008_content` in place (gate G-EDITOR-MIG, owner, 2026-10-28). See "Migration of existing data".

## Options considered

The editor and body model.

| Option | For | Against |
| --- | --- | --- |
| A. Tiptap, one document (chosen) | Already installed and in use. The JSON is ProseMirror JSON, a documented shape. The allow-list is short to state and to validate. The existing custom image node, which stores a key and not a `src`, carries over. | We build the formatting bar, the media insert control and the pin link ourselves. |
| B. Lexical | Fast, and backed by Meta. | A second editor library next to the one we have, so a new dependency. We would rewrite the existing custom node. The owner's rule is no new dependency. |
| C. BlockNote | Ships a Notion-style block interface. | A new dependency on top of Tiptap and ProseMirror. Its block model is close to our current blocks, so it changes little. |
| D. Keep sections and blocks, add marks inside paragraph blocks | Smallest contract change. | Two models stay: sections for structure and marks for text. A writer still cannot put a quote or a list between media. The owner asked for one document. |

The schema change to the published-version CHECK.

| Option | For | Against |
| --- | --- | --- |
| E. Edit `0008_content` in place (chosen, owner) | No later migration number moves. No dead `sections` rule stays in the history. Nothing is deployed that depends on the old file, and test databases are fresh on each run. | Applied migrations are normally immutable. A database that already ran the old 0008 now disagrees with the file. The Neon development branch has to be reset, and the snapshot has to be regenerated. |
| F. A new migration that swaps the CHECK (the first recommendation) | Keeps the rule that applied migrations never change. Works on a database that already ran 0008. | Takes a number, so migrations 0010 to 0015 in the plan move up by one, as they did for `0009_pin_model`. |

The owner chose E. It is safe only while no staging or production database exists, which is true today. After the first deploy, option F is the only choice.

## Body shape

The body is stored under the key `body` inside the draft and the published document of a story version (ADR-014). The other fields stay: title, excerpt, author name and role, and cover. Two fields leave the document: `intro` and `readMinutes`.

The body is `{ "type": "doc", "content": [ ...nodes ] }`. Only the nodes and marks below are allowed. The server refuses everything else.

Nodes.

| Node | Attributes | Notes |
| --- | --- | --- |
| `paragraph` | none | Holds text and `hardBreak`. |
| `text` | none | Plain text, at most 20,000 characters per node. Carries the marks below. A `<` in a text node is text and is escaped when drawn. |
| `hardBreak` | none | A line break inside a paragraph. |
| `heading` | `level` 2 or 3 | No level 1, because the title is the page's H1. |
| `blockquote` | none | Holds paragraphs. |
| `bulletList`, `orderedList`, `listItem` | none | A list item holds paragraphs and nested lists. |
| `image` | `mediaId` (uuid), `alt` (up to 300), `caption` (up to 300) | Points at a media row by id and never by URL. This keeps the idea of the existing custom node: the renderer resolves the key, so a changed asset URL does not break a story. |
| `video` | `youtubeId` (11 characters), `title` (up to 300), `caption` (up to 300) | YouTube only, as today. Loads on play (AC32). |
| `audio` | `mediaId` (uuid), `title` (up to 300), `caption` (up to 300) | A recorded file, as today. |

The `image`, `video` and `audio` nodes are block nodes with no children. They sit at the top level of the document, between paragraphs. A caption is an attribute, so a figure holds no nested editor.

Marks.

| Mark | Attributes | Notes |
| --- | --- | --- |
| `bold` | none | |
| `italic` | none | |
| `link` | `href` | `https:`, `http:` or `mailto:` only. Drawn with `rel="noopener"` through the one anchor function of ADR-011. |
| `pinLink` | `pinId` (uuid) | Text that links to a pin. See "Links". |

Not allowed: heading levels 1 and 4 to 6, code, code block, strike, underline, horizontal rule, tables, any HTML node, and any unknown node, mark or attribute. The editor's StarterKit configuration turns off every extension that is not listed, so the toolbar cannot produce what the server refuses.

Limits. The serialised body is at most 200 KB, the nesting depth is at most 8, and there are at most 100 media nodes. These are first guesses that the E2.13 builder may tune (coordinator, 2026-10-28). They live in one constant in the contract package.

## Links

ADR-011 says a story names a pin by id, a typed URL is not used for a venue, and the editor warns on a raw URL that matches a pin's link host. That carries over as follows.

- The `pinLink` mark replaces the old pin reference block. The writer selects text and picks a pin from the store's pins. The mark stores the pin id only. A `pinLink` may target any pin of the store, whether or not the story tags it (coordinator, 2026-10-28).
- The one renderer resolves the pin when the page is drawn. If the pin is published and has an outbound link, the text links through the one anchor function, so a later affiliate link needs no story edit (AC63). If the pin has no link, the text links to the map with that pin selected (`/$lang/map?place=<slug>`). If the pin is not published, the text shows as plain text.
- When a `link` mark's host matches the host of a pin's outbound link, the editor shows a warning in Step 1 and offers to switch the mark to a `pinLink`. The warning does not block saving, as ADR-011 says. The server does not check it.
- The pins chosen in Step 2 stay the story's tagged places (`story_group_places`). A `pinLink` does not add a tag.

## Validation on the server

- The write endpoints (E2.6) accept `body` as a JSON object and check it against the allow-list with one strict schema in `packages/api-contract`. A recursive check walks the tree. The server refuses the following with a 422 and a problem body that names the path of the first fault:
  - an unknown node, mark or attribute
  - a heading level out of range
  - an `href` with another scheme
  - a body that is not an object, such as a string of HTML
  - a depth over the limit
  - a size over the cap
- The API never stores or returns HTML for a story body. No sanitiser is needed, because the renderer builds elements from nodes and treats text as text.
- The `image` and `audio` nodes and the cover go through the existing media rule (`checkStoryMedia`). The media must exist in the same store, must not be retired and must have the right kind. Media used in the body is listed in `content.media_refs`, as DM-3 says for every document.
- A draft may be incomplete. A body with one empty paragraph saves. Publishing keeps its rules: a title and a slug (AC30 does not change).

## How the public page renders it

The story page is server-rendered (ADR-001, E4.4). One function in `packages/domain/src/content/` walks the body JSON and returns React elements. It is a hand-written walker over the allow-list. It does not use Tiptap's HTML output, so the server loads no ProseMirror and builds no HTML strings. The same function draws the Step 3 preview and the draft preview route, so the preview and the page agree. Images use the variants of ADR-004. A video loads only on play (AC32). A node the walker does not know draws nothing. A test fails if the allow-list and the walker drift apart.

## Migration of existing data

There is no production, staging or deployed data. Two places hold the old shape.

The database schema. `api/migrations/0008_content.sql` has a CHECK on `content.story_versions`, `story_versions_published_fields_check`, that asks for `jsonb_typeof(published->'sections') = 'array'` on a published version. The owner chose to edit 0008 in place (gate G-EDITOR-MIG, 2026-10-28). E2.13 does the following.

1. It replaces that line in `0008_content.sql` with a check that `published->'body'` is an object and `published->'body'->>'type'` is `doc`. No later migration number changes.
2. It brings the drizzle journal and the 0008 snapshot in step with the edited file, using the repo's usual drizzle-kit flow. The migrator hashes each migration file, so a database that applied the old 0008 now holds an unknown hash, and `pnpm db:check-branch` reports it.
3. It resets or rebuilds the schema of the Neon development branch. Test databases are built fresh on each run and need no step.

No row is rewritten, because the column is `jsonb` and no story rows exist.

The prototype and the seed. The prototype's stories and E2.12's `db:seed` hold sections of blocks. One pure function, `sectionsToBody`, in `packages/domain/src/content/`, maps them and has a test. `db:seed` calls it. The mapping:

- `intro` becomes the first paragraphs of the body.
- A section with a heading becomes a `heading` node of level 2. A section with no heading adds no node.
- A paragraph block becomes `paragraph` nodes. A blank line starts a new paragraph, and a single newline becomes a `hardBreak`.
- An `image`, `video` or `audio` block becomes the node of the same name with the same attributes. The `alt` of an image starts empty.
- Section ids are dropped. Anchor ids come from the heading text at render time.
- `readMinutes` is dropped.

Running the seed twice changes nothing. The seed keys each story on its slug and language and writes the same document.

## Contents list and reading time

E4.4 and AC32 need a contents list and a reading time. Both come from the body and neither is stored.

- The contents list holds the level 2 headings in order. Each gets an anchor id made from its text, with a counter added to keep ids unique. Level 3 headings get anchors but stay out of the list. A story with fewer than two level 2 headings shows no contents list.
- The reading time is the word count of the text nodes divided by 200 words a minute, rounded up, with a minimum of 1 minute. Media nodes add nothing.
- One function in `packages/domain/src/content/` computes both, and the page and the preview use it.

## What the three steps hold

| Step | Fields | Rule |
| --- | --- | --- |
| 1. Write | Cover, title, excerpt, author name and role, body | Saves a draft. The formatting bar, the media insert control and the pin link live here. |
| 2. Details | Language version, blog categories, pins, stay tag, interests, keepsakes, related stories | The existing rules stay: up to 6 keepsakes, up to 3 related stories shared by both languages (AC33), and categories only from the E4.18 list (AC87). |
| 3. Review and publish | Preview, the publish checks, the publish action | Shows the checks the editor refuses today (AC30, AC31) and the draft preview (D6, `ssr:false`). |

## What this changes

- ADR-003. The body bullet changes from structured blocks with rich text deferred to one Tiptap document. The block-model assumption changes with it.
- ADR-011. The pin reference block becomes the `pinLink` mark.
- ADR-014. The body is one document under `body`, and "new block types" becomes "new allow-list entries".
- The spine. The Deferred item for rich text points here, and AD-4 no longer says "structured blocks".
- The data model. DM-3 and the `story_versions` published CHECK change.
- The delivery plan. New story E2.13 (3 points, Sprint 6). E4.3 and E4.4 change. The Platform release counts 40 points instead of 37.
- The screen inventory. The M17 row describes the three steps.

## Decided by the coordinator (2026-10-28)

- The caps (200 KB, depth 8, 100 media nodes) are first guesses. The E2.13 builder may tune them.
- `intro` folds into the body. `excerpt` stays and serves lists and the page head.
- Author name and role sit in Step 1.
- A `pinLink` may target any pin of the store.

## Open questions

- Other video hosts, tables and embedded maps. ADR-003 says a new format needs a new node. None is planned.
- The Claude Design mock. The owner may review one before Sprint 8. It can change the layout of the steps and not the body shape.
- Not checked. The behaviour of each Tiptap 3.32 extension was not run in this session. The E4.3 builder confirms that the editor cannot output a node outside the allow-list.
- Not checked. The exact drizzle-kit command that regenerates the 0008 snapshot, and how the Neon development branch is reset, were not run. The E2.13 builder follows the repo's own steps.
