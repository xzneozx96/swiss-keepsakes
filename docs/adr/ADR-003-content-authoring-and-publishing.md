# ADR-003: Author stories, places, routes and tour guides in the in-app merchant editor, stored in Postgres

Status: accepted
Date: 2026-10-26
Source: AD-4
Applies to: `front-end/src/features/content/merchant/`, `front-end/src/features/merchant/`, `api/src/modules/content/`, `api/src/platform/http/`, `packages/api-contract/`

No new dependency, vendor or paid service. The owner chose the in-app editor over Payload, Sanity and Strapi (gate S2, 2026-10-26, after the Payload spike).

## Context
The merchant (Chị Ngọc, not a developer) must edit stories, map points, tour routes and PDFs at any time without a release (PRD §4.1, AC45). A visitor must see the change within a maximum delay that the owner has not set (O39). Authoring has to cover English and German versions, drafts, publishing, hiding, a preview, and linking stories to places and keepsakes.

The code already has an article editor in `features/content/merchant` that stores structured sections and blocks (paragraph, image, video, audio), a form-based tour editor, and Tiptap in `features/merchant/products/components/story-editor.tsx`. Stories are `Article` rows per language version with `draft` and `published` states.

## Decision
We will keep authoring in the app (owner gate S2). Merchant staff edit through the existing editor screens in the HeroUI dashboard, with the Tiptap editor extended for places, pins, routes and PDFs. Dashboard routes are `ssr: false` (ADR-001). The API stores drafts and published content in the `content` module's Postgres schema and serves it to visitors.

- Each content row has `draft` and `published` content in separate columns or rows, a `row_version` for `If-Match`, and an `updated_at`. Publishing copies draft to published in one transaction and writes the audit row (`audit_log`).
- A visitor reads only published content. The merchant preview reads the draft through an authenticated route.
- The body stays structured blocks (not Markdown, not HTML). Rich text inside a paragraph block is deferred (see the spine, Deferred).
- Staff permissions follow backend.md section 9: Owner and Manager can author. Super Admin cannot (PRD §5).
- **Delay (O39).** The owner set the target on 2026-10-26 (gate D5): a change shows to visitors in about 60 seconds typically, and in 5 minutes at most. The API serves documents with revalidation (ADR-001) and public JSON reads with `Cache-Control: public, max-age=30`, so the expected delay is about 30 seconds and well inside the target. A CDN or longer cache must keep the 5-minute cap.
- The editor refuses a publish that breaks a rule: a story pin without a published main story (AC43), a place without a type (AC68), a keepsake link that is not published (AC31).

## Consequences
- No new vendor, no second source of truth, and place data can sit next to reviews and keepsake links in one database.
- The editing effort is ours: a place editor with a map picker, a route editor, drag ordering, media and PDF upload. The editor must be usable by a non-technical merchant, and that usability is untested.
- Content backup is the database backup (Neon restore window, backend.md D2).
- Repository files are not the source of content. Seed data for development lives in migrations and seed scripts, as in backend.md section 14.

## Assumptions
- The merchant edits through the app on a phone or laptop and does not need offline editing.
- The block model covers the formats in PRD §11.2 (text, photos with captions, YouTube, audio). A required format that is not a block (tables, embedded maps) would need a new block type.
- Content volume stays in the hundreds of rows, so a cached read per request is enough.
- The owner's O39 target (60 seconds typical, 5 minutes cap, gate D5) stays in force. A tighter target would need `max-age=0` with revalidation, which costs more database reads.

## Considered options
- **A. In-app editor, Postgres (chosen).** Zero new vendor cost. Effort sits in extending editors. Risk: merchant usability, and editor bugs lose content (mitigated by drafts and `row_version`).
- **B. Markdown or MDX files in the repository.** Cheap to write for a developer. Every edit needs a commit, a build and a deploy, so AC45 fails for a non-technical merchant. Rejected.
- **C. Payload CMS 3, self-hosted on our Neon database (rejected by the owner, gate S2).** The spike (Payload 3.92.0, Next 16.3.3, Postgres 18.6) found it workable but costly. The admin is a Next.js app, so it adds a second deployable against the one-image rule (D3). `@payloadcms/db-postgres` pins `drizzle-orm` 0.45.2 and `pg` 8.20.0 exactly, while the repo uses `^0.45.4` and `^8.23.1`, and pnpm kept two `pg` copies. Ids are serial integers, not UUIDs. A story is one document with a locale table, not a translation group, so "a page exists only if German is published" (ADR-002) needs a field check. `schemaName` is experimental, and its migrations do not create the schema. The install brought about 500 packages and 854 MB. Better Auth sessions, role mapping and an S3-compatible media adapter did work.
- **D. Sanity (hosted, a new vendor, rejected).** Content leaves our database. Pricing read on 2026-10-26: Growth is USD 15 per seat per month, card only. Data may be stored in the EU, the US or regions where Sanity operates, per customer, and customer-controlled placement is not available yet.
- **E. Strapi 5 (rejected).** A standalone Node server with its own admin users. Community is free, Growth is USD 45 a month with 3 users and USD 15 per extra user, and the SSO add-on is USD 150 a month (the docs and the pricing page disagree on SSO). Schema sync at startup can drop unused columns.

## History
- 2026-10-26 proposed
- 2026-10-26 revised, still proposed, for owner gate S2 and the Payload spike
- 2026-10-26 accepted (gate DESIGN)
