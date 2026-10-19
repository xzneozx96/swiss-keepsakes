# SP5. Neon Object Storage in Frankfurt

**Status: Ready, needs keys: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION** (a branch credential on a Frankfurt Neon project with one private and one `public_read` bucket).

**Pass condition (architecture section 16).** Upload and public read both work. If presigned URLs aren't supported, switch to Cloudflare R2 (D14).

## What is ready

`spikes/sp5-object-storage/run.ts` checks the region, a presigned PUT and GET in a private bucket, the refusal of anonymous reads there, and a presigned PUT then anonymous GET in a `public_read` bucket. It was typechecked only and has not run against Neon. D14 stands unproven.

## Observed

Nothing yet. From the `neon-object-storage` skill: path-style addressing and SigV4 only, `public_read` objects are read at `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>`, presigned URLs work with the AWS SDKs. The skill does not say that presigned PUT URLs work, which is why the spike tests it.
