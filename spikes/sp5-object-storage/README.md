# SP5. Neon Object Storage in Frankfurt

**What it proves.** The API can issue a presigned upload URL through the S3 API, and a published object in a `public_read` bucket is readable anonymously.

**Pass condition (architecture section 16).** Upload and public read both work. If presigned URLs aren't supported, switch to Cloudflare R2 (D14).

## Run

```sh
npx tsx spikes/sp5-object-storage/run.ts
```

Checks: region is `eu-central-1`; presigned PUT into the private bucket; presigned GET returns the same bytes; anonymous GET of a private object is refused; presigned PUT into the public bucket; anonymous GET of that object returns the bytes. Uploaded objects are deleted at the end. A failed presigned PUT means D14 moves to Cloudflare R2.

Setup (once, on a spike branch):

```ts
// neon.ts
import { defineConfig } from '@neon/config/v1'
export default defineConfig({ buckets: { 'sp5-private': {}, 'sp5-public': { access: 'public_read' } } })
```

then `neon deploy` and copy the credential from `neon env pull`.

## Keys

`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` (the names Neon injects), optional `SP5_BUCKET_PRIVATE`, `SP5_BUCKET_PUBLIC`.

## Vendor guidance applied

- `neon-object-storage`: `forcePathStyle: true` (path-style and SigV4 only); the public object URL is `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>`; credentials are branch-scoped, so use the spike branch; Frankfurt (`aws-eu-central-1`) is a supported region. The skill recommends the Files SDK. The script uses the AWS client directly because SP5 asks about presigned S3 URLs and D14's fallback uses the same S3 client.
- `requestChecksumCalculation: 'WHEN_REQUIRED'` keeps the SDK from adding checksum headers that a presigned URL would have to carry.
