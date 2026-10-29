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

Scripts: `live-checks.ts` (S3 API probes and anonymous reads) and `browser-put.ts` (Playwright Chromium, headless, page at origin `http://localhost:3002` served through `page.route`). Both load `api/.env.local` with `node --env-file`, use the key prefix `sp5-e27-<timestamp>/`, delete what they create and print no `AWS_*` value. Logs in `.factory/runs/20261028-sprint-6/evidence/T-E2.7/`: `live-checks.log`, `browser-put.log` (its first line is the full command, run under `flock .../e2e.lock`), `browser-put.png`. Docs read: Neon `storage/s3-compatibility`, `storage/buckets`, `storage/objects`, `storage/troubleshooting`. Before any `PutBucketCors` attempt the script saves the existing rule and would restore it if a put succeeded; none did, and the log shows the rule unchanged at the end.

| Check | Result (all in `live-checks.log` unless noted) |
| --- | --- |
| Public URL | Anonymous GET of `${AWS_ENDPOINT_URL_S3}/media/<key>` returns 200. Pass. |
| Headers on anonymous read | `Cache-Control: public, max-age=31536000, immutable`, `Content-Type: application/pdf`, `Content-Disposition: inline` set on `PutObject` come back verbatim. Pass. |
| Deletion | After `DeleteObject`, anonymous GET is 404. Pass. Final listing of prefix `sp5-e27-` shows 0 objects in `uploads` and in `media`. |
| CORS rule for `http://localhost:3002` | **Blocked, accepted per G-S6-CORS.** See below. |
| Browser presigned PUT then read back | Passes (`browser-put.log`), but through the bucket's existing default CORS rule, not a rule we set. |

**CORS, what was tried.** The Neon S3 compatibility page lists `GetBucketCors`, `PutBucketCors` and `DeleteBucketCors` as supported and says preflight is handled automatically. In the log, on both `uploads` and `media`: `HeadBucket` is accepted and `ListBuckets` shows both buckets, but four `PutBucketCors` variants (four-field rule for the origin, minimal PUT rule, PUT and GET with `AllowedHeaders *`, wildcard origin) and `DeleteBucketCors` all return `NoSuchBucket` HTTP 404. `GetBucketCors` works and returns a rule we did not create, on both buckets: `[{"AllowedMethods":["GET","PUT","POST","HEAD","DELETE"],"AllowedOrigins":["*"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]`. Manual check, not logged by a script: `neon bucket --help` (CLI 8.8.0) lists `create`, `delete`, `list` and `object` only, and `neon config add|apply|init` and the `neon.ts` `buckets` block have no CORS option; none of the four docs pages describes one.

**CORS, accepted per G-S6-CORS.** The bucket's existing wildcard rule (origins `*`, methods GET, PUT, POST, HEAD and DELETE) is accepted for development. The 404 `NoSuchBucket` on `PutBucketCors` and `DeleteBucketCors` is raised with Neon by the owner. The production origin must be locked down before launch (launch checklist in `docs/ops/media.md`).

**Browser step.** The page origin was `http://localhost:3002`. The page's `fetch` PUT to a presigned `uploads` URL returned 200 and the presigned GET returned 200 with the same body; the GET response carried `access-control-allow-origin: *` (the log records it on the GET only). The same run's network log lists the PUT as `ERR_ABORTED`; that is most likely a Playwright event artefact, and the read-back of the same bytes is the proof that the PUT worked. The browser step worked because of the default wildcard rule above. Whether to rely on that default, or to use Cloudflare R2 or upload through the API (ADR-004 fallback), is an open decision.

**AC45 delay (calculated, not measured).** `api/src/modules/content/adapters/public-cache.ts` sets `max-age=30` on the public page reads and promises one browser cache and no shared cache. So a replaced PDF key reaches a guest within 30 s of that browser cache expiring and revalidating by ETag. About 60 s applies only if a shared cache (for example a CDN) also sits in front and keeps the page for its own 30 s. No API server was started; nothing here measured the delay. The PDF object itself is served with `max-age=31536000, immutable` under a new key per version, so the stale window is the page response, not the PDF.
