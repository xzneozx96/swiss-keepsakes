# SP5. Neon Object Storage in Frankfurt

**What it proves.** The API can issue a presigned upload URL through the S3 API, and a published object in a `public_read` bucket is readable anonymously.

**Pass condition (architecture section 16).** Upload and public read both work. If presigned URLs aren't supported, switch to Cloudflare R2 (D14).

## Run

```sh
npx tsx spikes/sp5-object-storage/run.ts
```

Checks: region is `eu-central-1`; presigned PUT into the private bucket; presigned GET returns the same bytes; anonymous GET of a private object is refused; presigned PUT into the public bucket; anonymous GET of that object returns the bytes. Uploaded objects are deleted at the end. A failed presigned PUT means D14 moves to Cloudflare R2.

Buckets (default names `uploads` and `media`, as declared in the project's `neon.ts`):

```ts
// neon.ts
import { defineConfig } from '@neon/config/v1'
export default defineConfig({ buckets: { uploads: { access: 'private' }, media: { access: 'public_read' } } })
```

`neon deploy` writes the credential into `api/.env.local`. The credential is branch-scoped (currently `development`), so the test objects land in that branch's real buckets, under `sp5/`, and are deleted at the end.

## Keys

`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` (the names Neon injects), optional `SP5_BUCKET_PRIVATE` (default `uploads`), `SP5_BUCKET_PUBLIC` (default `media`).

## Vendor guidance applied

- `neon-object-storage`: `forcePathStyle: true` (path-style and SigV4 only); the public object URL is `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>`; credentials are branch-scoped, so use the spike branch; Frankfurt (`aws-eu-central-1`) is a supported region. The skill recommends the Files SDK. The script uses the AWS client directly because SP5 asks about presigned S3 URLs and D14's fallback uses the same S3 client.
- `requestChecksumCalculation: 'WHEN_REQUIRED'` keeps the SDK from adding checksum headers that a presigned URL would have to carry.

## Remaining checks, run 2026-10-29

Scripts: `live-checks.ts` (S3 API and anonymous reads) and `browser-put.ts` (Playwright Chromium, headless, page at origin `http://localhost:3002` served through `page.route`, run under `flock .../e2e.lock`). Both load `api/.env.local` with `node --env-file`, use the key prefix `sp5-e27-<timestamp>/`, delete what they create (a listing afterwards showed 0 leftovers in `uploads` and `media`), and print no `AWS_*` value. Logs: `.factory/runs/20261028-sprint-6/evidence/T-E2.7/` (`live-checks.log`, `browser-put.log`, `browser-put.png`). Docs read: Neon `storage/s3-compatibility`, `storage/buckets`, `storage/objects`, `storage/troubleshooting`.

| Check | Result |
| --- | --- |
| Public URL shape | `${AWS_ENDPOINT_URL_S3}/media/<key>` returns 200 anonymously. Pass. |
| Headers on anonymous read | `Cache-Control`, `Content-Type` and `Content-Disposition` set on `PutObject` come back verbatim (`public, max-age=31536000, immutable`; `application/pdf`; `attachment; filename="sp5-check.pdf"`). Pass. |
| Deletion | After `DeleteObject`, anonymous GET is 404. Pass. |
| Set a CORS rule for `http://localhost:3002` | **Failed (blocked).** See below. |
| Browser presigned PUT then read back | Passes, but only through the bucket's existing default CORS rule, not a rule we set. |

**CORS, what was tried.** The Neon S3 compatibility page lists `GetBucketCors`, `PutBucketCors` and `DeleteBucketCors` as supported, and says preflight is handled automatically. In practice, on both `uploads` and `media`: `PutBucketCors` (four rule variants, including the single minimal rule and the `*` origin) and `DeleteBucketCors` all return `NoSuchBucket` HTTP 404 ("The specified bucket does not exist"), while `HeadBucket` returns 200 and `ListBuckets` shows both buckets. `GetBucketCors` works and returns a rule we did not create: methods GET, PUT, POST, HEAD, DELETE; origins `*`; headers `*`; expose `ETag`; max age 3000. The `neon bucket` CLI (8.8.0: `create`, `delete`, `list`, `object`) and `neon.ts` `buckets` have no CORS option, and none of the four docs pages describes one. So the rule cannot be changed or restricted to the origin from here.

**Browser step.** The page origin was `http://localhost:3002`; `fetch` PUT to a presigned `uploads` URL returned 200 and the presigned GET returned 200 with the same body; the response carried `access-control-allow-origin: *`. Playwright's network log lists the PUT as `ERR_ABORTED` although the page's `fetch` saw 200 and the object read back (a Playwright event artefact for a request whose body is consumed by the page; the object existence proves it). This works because of the default wildcard rule above. Whether to rely on that default, or to use Cloudflare R2 or upload through the API (ADR-004 fallback), is an open decision.

**AC45 delay.** The page cache header is `max-age=30` (`api/src/modules/content/adapters/public-cache.ts`; read, not run: no API server was started). A replaced PDF key reaches a guest within 30 s of the page cache plus the guest browser's own copy of that page (also up to 30 s, then revalidated by ETag), so at most about 60 s in the worst case. Objects are published under new keys, and the `media` object itself is served with `max-age=31536000, immutable`, so the stale window is the page response, not the PDF.
