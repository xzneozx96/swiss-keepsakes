# ADR-004: Store media and tour PDFs in Neon Object Storage, in public buckets under versioned keys

Status: accepted
Date: 2026-10-26
Source: AD-5
Applies to: `api/src/platform/storage.ts`, `api/src/modules/content/`, `api/neon.ts`, `front-end/src/features/content/merchant/lib/media-library.ts`, `front-end/src/features/tours/`

Uses the vendor already planned in backend.md D14 (Neon Object Storage). Options C and D below would add a vendor or a dependency and are not recommended. The owner approved `sharp` as a new dependency for image variants on 2026-10-26 (gate D3). It is planned in backend.md D14 and enters `api/package.json` when the media story starts.

## Context
Merchants upload story photos, audio, and one PDF per tour (PRD Q19, AC51). Visitors download the PDF without an account. A replaced PDF must reach visitors within the O39 delay. The prototype reads photos and audio from bundled assets (`import.meta.glob('/src/assets/photos/*.jpg')`), which cannot serve merchant uploads.

Neon's documentation (read 2026-10-26) lists Object Storage in AWS Frankfurt, a `public_read` bucket access level, presigned PUT and GET URLs, and multipart upload, and says it implements a subset of the S3 API. Spike SP5 (public URL shape, CORS, cache headers, presigned PUT from a browser) has not run.

## Decision
We will store uploads in Neon Object Storage, as backend.md D14 plans, with these rules.

- Two buckets. `media` is `public_read` and holds published photos, audio and tour PDFs. `uploads` is private and takes direct browser uploads through a presigned PUT that the API issues after a staff permission check.
- The browser uploads to `uploads`. The API (or the worker, for images) validates type and size, creates image variants, and copies the result into `media` under a key that includes a content hash or version, such as `tours/{tourId}/guide-{version}.pdf`. A key is never overwritten.
- The `content` module owns the `media` rows (backend.md puts them in `catalog`, and this decision moves them). Other modules, such as `catalog` for keepsake photos, reference a media row by id. The cleanup job removes a key only when no module references it, and asks each module through its `index.ts`.
- Cache headers and `Content-Disposition` are set at upload time, because anonymous reads ignore the `response-*` overrides.
- A tour has exactly one PDF reference (AC51). Replacing the PDF moves the reference to the new key in one transaction. Old keys are removed by a worker job after a grace period.
- The owner decided that one PDF per tour covers all languages (gate D9, 2026-10-26). The PDF has no language field.
- The PDF link on the page is the public object URL. It needs no signing and no account, and it can be cached by the browser and any CDN.
- A tour that needs separate German and English guides puts both in the one PDF.
- **Amended 2026-10-28 (gate G-S6-S3CLIENT).** The API uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to talk to Neon Object Storage, which implements only a subset of the S3 API, and to sign presigned PUT and GET URLs. Hand-written SigV4 signing is security-sensitive and would be code we own and must keep correct, so we do not write it. Other S3 packages were not chosen, because spike SP5 already ran on these two (`spikes/package.json`, with `requestChecksumCalculation: 'WHEN_REQUIRED'` so the SDK adds no checksum headers that a presigned URL would have to carry; see `spikes/sp5-object-storage/README.md`). Both enter `api/package.json` in E2.7. Coordinator answer under the owner's delegation for Sprint 6, 2026-10-28.
- **Amended 2026-10-28 (gate G-S6-UPLOADROW).** No database row exists between the presign and the confirm. The `content.media` row is created at confirm, after the API has checked the object in `uploads`. An abandoned upload leaves only an object in `uploads`, which the cleanup job removes. Coordinator answer under the owner's delegation for Sprint 6, 2026-10-28.
- **Amended 2026-10-28 (gate G-S6-MEDIAFAIL).** When a file fails processing while a story or tour already references it, the media row stays `processing`, because the trigger `media_not_retired_while_used` (migration 0008) forbids retiring a referenced row. The worker purges the row's objects and raises a distinct alert. The runbook `docs/ops/media.md` tells the merchant to replace the file. Publishing a story, and saving a published tour (gate G-S6-TOURSAVE), refuse a `processing` file with a named 422. A `failed` media status is deferred to a later ticket, because it needs a migration. Coordinator answer under the owner's delegation for Sprint 6, 2026-10-28.
- **Amended 2026-10-28 (gate G-S6-CORS).** SP5's assumption that we set CORS for our origin does not hold. Neon Object Storage answers 404 `NoSuchBucket` to `PutBucketCors` and `DeleteBucketCors` on both buckets. `GetBucketCors` shows an existing wildcard rule (origins `*`; methods GET, PUT, POST, HEAD, DELETE), and a browser presigned PUT from localhost worked through it. Development accepts the wildcard, because presigned URLs gate writes. The owner raises the 404 with Neon. Locking CORS to the production origin is required before launch (E9.4). Coordinator answer under the owner's delegation for Sprint 6, 2026-10-28.

## Consequences
- Public reads bypass the API, and versioned keys remove stale-cache problems, so the O39 delay for PDFs and images is the time it takes the page to point at the new key.
- Orphaned objects are possible when an upload is abandoned. A cleanup job on `uploads` and unreferenced `media` keys is needed.
- Image variants (`sharp`) run in the worker. Phase 1 may start with the originals plus a fixed set of widths.
- No CDN is in the path, and every view counts as egress against the plan allowance. If public reads are slow or costly, a CDN or Cloudflare R2 (D14's fallback) is the next step.
- Neon may answer `503 SlowDown` under heavy use. Clients back off and retry.
- A deleted object has no documented undelete, and lifecycle rules are stored but not run. Our own cleanup job is the only expiry.

## Assumptions
- Neon Object Storage `public_read` objects are reachable over HTTPS from browsers without a signed URL, and honour long `Cache-Control` headers. SP5 must confirm both.
- A presigned PUT works from a browser with CORS set for our origin. Amended 2026-10-28: it works through the bucket's existing wildcard rule, and we cannot set CORS through the API (see G-S6-CORS).
- Total storage stays in the low gigabytes in Phase 1 (11 tours, tens of stories). The free plan holds 5 GB per project. Paid storage was listed at about USD 0.023 per GB-month with no per-request fee (Neon plans page, read during the currency check).
- PDFs are small enough for a single-request upload (under 5 GiB, the documented limit).

## Considered options
- **A. Neon Object Storage, public bucket, versioned keys (chosen).** Already planned, same project and region as the database, no new vendor. Risk: the product is newer than S3 and R2, and implements an S3 subset.
- **B. Private bucket and a presigned GET for each download.** Keeps files closed, but a time-limited URL cannot be indexed, shared or cached, and the PDFs are free to everyone. Rejected.
- **C. Cloudflare R2 or AWS S3.** Mature, with a CDN option. Adds a second vendor and bill. It is the fallback if SP5 fails.
- **D. PDFs as `bytea` in Postgres.** One backup and no new service, but every download goes through the API and database, and database size grows with media. Rejected for photos and audio. Acceptable only for PDFs if SP5 fails and R2 is refused.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-28 amended (gate G-S6-S3CLIENT): the API uses the AWS SDK S3 client and presigner
- 2026-10-28 amended (gate G-S6-UPLOADROW): the media row is created at confirm, not at presign
- 2026-10-28 amended (gate G-S6-MEDIAFAIL): a referenced file that fails processing stays `processing`; publish and published-tour save refuse it
- 2026-10-28 amended (gate G-S6-CORS): bucket CORS cannot be set through the API; development uses the existing wildcard, production origin lock before launch
- 2026-10-29 note: the media library design (`docs/decisions/2026-10-29-media-library-design.md`) needs a `name` column on `content.media` and settles nothing here. The decision above stands
