# SP5. Neon Object Storage in Frankfurt

**Status: Answered on Neon (Frankfurt).** Run for real against the operator's project (eu-central-1, the branch credential in `api/.env.local` from `neon deploy`: `production` for the first run, `development` for the final run, same results), buckets `uploads` (private) and `media` (`public_read`). Both test objects were deleted afterwards (bucket listings under `sp5/` were empty).

**Pass condition (architecture section 16).** Upload and public read both work. If presigned URLs aren't supported, switch to Cloudflare R2 (D14).

## Observed (NEON)

`spikes/sp5-object-storage/run.ts`, AWS SDK v3, path-style, SigV4, `requestChecksumCalculation: 'WHEN_REQUIRED'`.

| Check | Result |
|---|---|
| Region | `eu-central-1` |
| Presigned PUT into `uploads` (private) | HTTP 200 |
| Presigned GET of that object | HTTP 200, same bytes |
| Anonymous GET of that object | **HTTP 403** (denied) |
| Presigned PUT into `media` (`public_read`) | HTTP 200 |
| Anonymous GET of that object at `${AWS_ENDPOINT_URL_S3}/media/<key>` | **HTTP 200**, same bytes, `content-type: text/plain` |

Answer: presigned PUT works, so D14 (Neon Object Storage, no Cloudflare R2 fallback) stands for upload and public read. Not measured: large files, multipart, CORS for a browser PUT, CDN in front of `media`, and upload timing from Fly.
