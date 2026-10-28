# Media

Images, audio and tour PDFs live in Neon Object Storage (ADR-004), reached over the S3 API. A staff member asks the API for an upload, the browser PUTs the file straight into the private `uploads` bucket, and the API confirms it. A worker job then writes the public files into the `media` bucket and marks the `content.media` row `ready`. The code is in `api/src/modules/content/` (application, `adapters/media-*.ts`) and `api/src/platform/storage.ts`. The types, the size caps and the other fixed numbers are in one constant, `MEDIA_RULES` in `packages/domain/src/content/media.ts`.

## Settings

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3` and `AWS_REGION`, described in `api/.env.example`. The values come from the Neon console for the branch. Set all four or none. A partial setting stops startup and names the missing variables.
- With none set, the service still starts. Asking for an upload, confirming one and reading a `ready` row answer `503 storage-unavailable`. A row that is not `ready` can still be read, and every other route works. A worker without them fails each media job and retries it until it is dead-lettered.
- `MEDIA_GRACE_HOURS` is how long a replaced file stays before it is deleted. It is a whole number of at least 1 and defaults to 24.
- Never print the `AWS_*` values: not in a log, a ticket, a shell history line or a chat. When you check whether they are set, print only the names.
- Buckets: `uploads` is private and `media` is `public_read`. A public address is `${AWS_ENDPOINT_URL_S3}/media/<key>`. Keys never contain the bucket name.

## What is stored where

| Where | Key | What it is |
| :-- | :-- | :-- |
| `uploads` | `{storeId}/{uuid}.{ext}` | A raw upload that the browser PUT and nobody confirmed yet |
| `uploads` | `confirmed/{storeId}/{mediaId}/source.{ext}` | The checked bytes of a confirmed upload, waiting for the job. The job deletes it when it is done |
| `media` | `{storeId}/{mediaId}/original.{ext}` | The public file. An image is stored again in its own format with no metadata, never as uploaded, so a public photo carries no GPS |
| `media` | `{storeId}/{mediaId}/w{width}.webp` | An image variant at 320, 640, 1280 or 1920 pixels wide, never wider than the original |

The public files carry `Cache-Control: public, max-age=31536000, immutable`. A PDF also carries `Content-Disposition: inline`. A replaced file gets a new row and a new key, so no cached copy is ever stale.

## Limits

- Types: JPEG, PNG, WebP, MP3 (`audio/mpeg`) and PDF. SVG and anything else is refused with 422.
- Size caps: image 10 MiB, audio 30 MiB, PDF 25 MiB. The size and type are checked before the URL is issued, and again on the stored bytes at confirm (the magic bytes, not the declared type). A file that fails the second check is refused and removed from `uploads`.
- Pixel limit: 70 MP (70 million pixels, width times height). `sharp` refuses a larger image before it allocates memory for it, so the job fails and the file ends `retired` (below).
- A presigned PUT URL works for 15 minutes.

## Queues and retries

All four queues are created at every start, for every role, because confirm sends a job and a send to an unknown queue fails. Only the worker roles (`worker` and `all`) run the handlers.

| Queue | Job | Retries |
| :-- | :-- | :-- |
| `media-process` | Make the public files of one confirmed upload | 3 retries (4 attempts), exponential backoff from 30 s, so the last attempt runs about 2 to 4 minutes after the first. Then the job moves to `media-process-failed` |
| `media-process-failed` | Retire the row and remove its objects, then log the alert | The same policy as above |
| `media-retire` | Retire a replaced file after the grace period | The queue default |
| `media-sweep` | The hourly clean-up of `uploads` | A schedule, `17 * * * *` (minute 17 of every hour) |

The alert is one error line with `"event":"media.failed"`, the store id and the media id. It never holds a file name, a key or a URL. A failed delete of the confirmed source after the file is already `ready` logs one warning with `"event":"media.source-delete-failed"` and does not fail the job. Until Sentry arrives (E2.9), those lines are the alert.

## A row stuck in `processing`

A healthy row is `processing` for seconds, and for about 5 minutes at most while the job retries. A row older than 15 minutes is stuck:

```sql
select id, store_id, kind, storage_key, byte_size, created_at
from content.media
where status = 'processing' and created_at < now() - interval '15 minutes'
order by created_at;
```

Check, in this order:

1. Is a worker running? Look for `"msg":"started"` with `"role":"worker"` or `"all"` in its log. No worker means no job runs. Start it and the jobs run.
2. What does the job say? Look it up by the media id:

   ```sql
   select name, state, retry_count, start_after, output
   from pgboss.job
   where name in ('media-process', 'media-process-failed') and data->>'mediaId' = '<media id>'
   order by created_on;
   ```

   `created` or `retry` with a `start_after` in the future is a job that waits for its next attempt. `failed` or a copy in `media-process-failed` means the attempts ran out: the handler retires the row, so the row is `retired` and no longer `processing`. If both the job and the dead-letter copy are gone and the row is still `processing`, the job was lost, which only happens when someone deleted it.
3. Is storage reachable? A worker that cannot reach it, or has no `AWS_*`, fails every attempt. Fix the setting and restart. Later attempts succeed.
4. Is the confirmed source still there? The job needs `confirmed/{storeId}/{mediaId}/source.{ext}` in `uploads`. If the source is gone and the row is `processing`, the job can never succeed. Retire the row by hand with the statement in the next section and ask the merchant to upload the file again.

To run a stuck job again, send a new `media-process` job with `{"storeId": "...", "mediaId": "..."}` from a script that uses `createJobQueue`. The job is safe to repeat: it overwrites the same keys, and a row that is already `ready` only has its source deleted.

## A `retired` row after failed processing

A file the image library cannot decode, or one over the pixel limit, fails every attempt. After the last one the dead-letter handler sets the row `retired`, removes its objects from `media` and its source from `uploads`, and logs `media.failed`. A story or tour that tries to use the row is refused as `media-retired`. Nothing attaches it by accident, and nothing needs to be done for the row: it stays as a record. Ask the merchant to upload a fixed file, which makes a new row.

Find these rows with the alert line, or:

```sql
select id, store_id, kind, storage_key, retired_at
from content.media
where status = 'retired'
order by retired_at desc;
```

A row that was `ready` when its job was dead-lettered is not retired. The file was made and may be published, so only a leftover source is removed and no alert is logged.

To retire a row by hand (a lost job, a file that must go now), run this, then remove the objects whose key starts with `{storeId}/{mediaId}/` in `media`. Do it only for a row no tour or story references:

```sql
update content.media set status = 'retired', retired_at = now()
where id = '<media id>' and status <> 'retired';
```

## A failed file that a story or tour uses: `media.failed-in-use`

The dead-letter handler cannot retire a row that a story or tour uses, because the database refuses it. For such a row the handler leaves it `processing`, removes its objects from `media` and its source from `uploads`, and logs one error line, `media.failed-in-use`, with `storeId` and `mediaId`. The row never becomes `ready`, so a publish that uses it answers 422 `media-processing` for ever. This is also the cause when a merchant reports that publish never works.

Find the row and what uses it:

```sql
select id, store_id, kind, status, created_at from content.media where id = '<media id>';

select owner_kind, owner_id, owner_language, slot from content.media_refs where media_id = '<media id>';
select id, 'pdf' as slot from content.tours where pdf_media_id = '<media id>'
union all select id, 'cover' from content.tours where cover_media_id = '<media id>';
select tour_id, position from content.tour_stops where media_id = '<media id>';
select id from content.places where cover_media_id = '<media id>';
```

Fix: the merchant uploads the file again (a fixed file, or a smaller image) and attaches the new row in the story or tour, then saves. After that nothing uses the old row. Retire it by hand with the statement in the section above, or leave it for the retire job, which runs after a replace. No object is left to remove. Do not print `AWS_*` while you check.

## Replacing a file, and the retire job

Saving a tour with a different PDF queues one `media-retire` job for the old row, due `MEDIA_GRACE_HOURS` after the save. Until then the old file stays where it is, so a guest with the old address or a cached page still gets a PDF. Clearing the PDF of a draft tour, or saving the same PDF again, queues nothing.

When the job runs, it looks at the old row under a lock:

- A row that a tour or a story references again is left alone, with its files.
- Otherwise the row becomes `retired` and every object under `{storeId}/{mediaId}/` in `media` is deleted. A job that runs again after a failed delete finishes the deletes.
- A missing row is a no-op.

Changing `MEDIA_GRACE_HOURS` applies to jobs queued after the restart. A job already queued keeps its due time. To see what is waiting:

```sql
select data->>'mediaId' as media_id, start_after
from pgboss.job
where name = 'media-retire' and state in ('created', 'retry')
order by start_after;
```

## The clean-up sweep

The `media-sweep` job runs every hour, on the worker, and lists only the `uploads` bucket. It never touches `media`.

- An object outside `confirmed/` that is older than 24 hours is a raw upload that nobody confirmed (the browser PUT failed, the tab closed, the confirm was refused). It is deleted.
- An object under `confirmed/` that is older than 168 hours (7 days) is deleted. See the next section.

The sweep needs no database lookup. Age is the object's last-modified time as the bucket reports it.

## A leftover `confirmed/` source

The job deletes `confirmed/{storeId}/{mediaId}/source.{ext}` when it finishes, so a source that is still there is a sign. There are three causes:

- The job is still running or waiting. Look at the row. If it is `processing` and under 15 minutes old, wait.
- The delete failed after the file was `ready`. The log has `media.source-delete-failed`. The file is already public and nothing is wrong. The sweep removes the source after 168 hours.
- Confirm copied the source and then the database transaction rolled back. There is no row and no job for it. The sweep removes it after 168 hours. This is why the window is 7 days and not 24 hours: a live job finishes within minutes and its retries within about an hour.

To remove one earlier, delete only the object under `confirmed/{storeId}/{mediaId}/` in `uploads`, after you have checked in `content.media` that the row is `ready` or `retired`, or that no row has that id. Never delete a source whose row is `processing` and still has a job.

## CORS of the buckets

A browser PUT to a presigned URL needs the bucket to answer the CORS preflight. We could not set a rule. `PutBucketCors` and `DeleteBucketCors` answer `NoSuchBucket` (HTTP 404) on both buckets, even though `HeadBucket` works and both buckets are listed. Both buckets already carry a default rule that allows any origin (`*`) with the methods GET, PUT, POST, HEAD and DELETE, any header, and the `ETag` header, cached for 3000 seconds. A Chromium PUT from `http://localhost:3002` and the anonymous read back both worked through that rule (`spikes/sp5-object-storage/README.md`). Treat it as a Neon default that can change. If browser uploads fail with a CORS error in the console, check the rule first with `GetBucketCors`, which works, and tell the owner. ADR-004's fallback is Cloudflare R2, or an upload through the API.

This item is accepted per G-S6-CORS. The existing wildcard rule is accepted for development. The owner raises the `NoSuchBucket` 404 on `PutBucketCors` and `DeleteBucketCors` with Neon.

Launch checklist:

- [ ] Lock the CORS rule of both buckets down to the production origin. Do not launch with origin `*`.

## Clean-up of test objects

The development buckets are real. A live check uses a key prefix of its own for each run and deletes what it creates. Do not point a test at the buckets of a shared branch without a prefix.
