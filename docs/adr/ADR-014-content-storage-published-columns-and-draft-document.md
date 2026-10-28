# ADR-014: Store content as published columns plus one draft document, and keep slugs as per-language unique values

Status: accepted
Date: 2026-10-26
Source: DM-3, DM-4
Applies to: `api/src/modules/content/`, `api/src/modules/catalog/`, `packages/domain/src/content/`, `packages/api-contract/`

**Amended 2026-10-27 (G11).** AC43 is retired (pins publish without a story, AC85), so the two rejections below cite AC51 and AC68 instead. The storage choice itself is unchanged.

No new dependency, vendor or paid service. This fills the storage choice that ADR-003 left open ("separate columns or rows") and the slug rule of ADR-002. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, sections DM-3 and DM-4.

## Context
ADR-003 requires a draft and a published state for stories, places and tours, a `row_version` for `If-Match`, and a publish step that checks required fields. ADR-002 requires one address per language version, a slug that is unique per type and language across the platform, and no version in a language that lacks its required fields.

Public reads need typed, indexable fields (slug, status, coordinates, tags, main story, PDF) and joins. Body text changes shape often (new block types) and cannot hold a foreign key. A story version is one row per language. A place, tour and keepsake hold their localized text as `{en?, de?}`.

## Decision
We will split each publishable row into structure and text.

- **Structure is saved directly.** Typed columns and child rows (type, coordinates, tags, main story, cover and PDF references, route stops, keepsake and related links, SKU prices) change when the merchant saves. CHECKs and foreign keys keep them valid at all times.
- **Text has a draft.** Each story version, place, tour and product has `published jsonb` (what visitors see) and `draft jsonb` (the pending edit). Publishing copies `draft` to `published` and clears `draft` in one transaction, bumps `row_version`, and writes the `platform.audit_log` row. Required keys are checked by CHECK constraints written with `IS TRUE`, because a NULL inside a CHECK passes.
- **A story version exists per language** as the row `(group_id, language)`. A place, tour or product has a slug map `{en?, de?}` and a localized name with the same keys, so a language exists exactly when both are present.
- **Slugs** are `UNIQUE (language, slug)` on story versions. For slug maps they are partial unique expression indexes per language, `((slug->>'en')) WHERE slug ? 'en'`, and the same for `de`. A slug may be set while drafting, so a collision shows at once, and it must be set to publish. Each key present must hold a non-empty lower-case string.
- **Media inside documents** are listed in `content.media_refs` (media id, owner, slot). The use case replaces the owner's rows on save and publish. A trigger refuses to retire a media row while a document or a cover, PDF or stop-photo column uses it. Those columns have their own foreign keys, and the key carries the media kind, so an image cannot be a PDF. Keepsake photos in `catalog.product_media` hold plain media ids, and the cleanup job asks `catalog` before it removes a file.

## Consequences
- Public reads, sitemap, hreflang and the map need no JSON search. Text stays flexible for new node types. Amended 2026-10-28 (gate G-EDITOR): a story body is one Tiptap (ProseMirror) document under the key `body` of the `draft` and `published` jsonb, and a new node type is an addition to the API's allow-list. The column types do not change.
- The editor handles two shapes (draft document and published columns), and publish is real work in a use case.
- A third language needs a new expression index for slugs, which is a migration the owner approves anyway (PRD 4.1).
- Slug changes after the first publish are not modelled. A changed slug breaks the old URL. The open question in the data model recommends locking the slug after first publish.

## Assumptions
- Content stays in the hundreds of rows, so reading `published->>'title'` in lists is cheap.
- Visitors read only `published` and the typed columns. Only staff routes read `draft`.
- Only English and German exist in Phase 1 (PRD Q22).
- The `media_refs` rows are rewritten inside the same transaction as the save. A code path that skips this lets a media row be retired while in use, and the orphan check finds it. A save that adds a reference at the very moment of a retire can slip past the trigger, and the grace period of ADR-004 covers that case.

## Considered options
- **Revision rows** (one row per draft and per published copy). Fully typed drafts, but every child table needs a revision key, and the public query must pick the latest published row. Rejected as heavier than the data volume needs.
- **Shadow `draft_*` tables.** Same cost as revision rows, plus duplicated constraints. Rejected.
- **Two jsonb documents and no typed columns.** Simplest publish, but no constraints on slug, main story or PDF. Rejected, because AC51 and the pin publish rules (AC68, AC85) need typed columns.
- **Draft everything, including structure.** Uniform, but the structural rules (AC51, AC68) would then hold only on the published projection and need a second set of checks on drafts. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-27 amended (gate G11, `docs/decisions/2026-10-27-map-pins-and-events.md`)
- 2026-10-28 amended (gate G-EDITOR, `docs/decisions/2026-10-28-story-editor.md`)
