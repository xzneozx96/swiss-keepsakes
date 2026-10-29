import type { Tx } from '../../../platform/db/client.ts'
import type { MediaRecord, MediaRepository, MediaRow } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface Columns extends Record<string, unknown> {
  id: string
  store_id: string
  kind: MediaRecord['kind']
  storage_key: string
  content_type: string
  // bigint comes back from node-postgres as a string.
  byte_size: string | number
  sha256: string
  width: number | null
  height: number | null
  status: MediaRecord['status']
}

const columns = sql`id, store_id, kind, storage_key, content_type, byte_size, sha256, width, height, status`

function record(row: Columns): MediaRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    kind: row.kind,
    storageKey: row.storage_key,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    sha256: row.sha256,
    width: row.width,
    height: row.height,
    status: row.status,
  }
}

export function createMediaRepository(): MediaRepository<Tx> {
  return {
    async find(tx, storeId, ids) {
      // sql.param keeps the array one bound value; a bare array in the template would expand to a list.
      const result = await tx.execute<{ id: string, kind: MediaRow['kind'], status: MediaRow['status'] }>(sql`
        select id, kind, status from content.media
        where store_id = ${storeId} and id = any(${sql.param(ids)}::uuid[])`)
      return result.rows
    },
    async insert(tx, row, at) {
      const result = await tx.execute<Columns>(sql`
        insert into content.media (id, store_id, kind, storage_key, content_type, byte_size, sha256, status, created_at, updated_at)
        values (${row.id}, ${row.storeId}, ${row.kind}, ${row.storageKey}, ${row.contentType}, ${row.byteSize}, ${row.sha256}, 'processing', ${at}, ${at})
        returning ${columns}`)
      return record(result.rows[0]!)
    },
    async findById(tx, storeId, id, options) {
      const result = await tx.execute<Columns>(sql`
        select ${columns} from content.media
        where store_id = ${storeId} and id = ${id}
        ${options?.forUpdate ? sql`for update` : sql``}`)
      const row = result.rows[0]
      return row && record(row)
    },
    async markReady(tx, row, dims, at) {
      const result = await tx.execute<Columns>(sql`
        update content.media
        set status = 'ready', width = ${dims?.width ?? null}, height = ${dims?.height ?? null}, updated_at = ${at}
        where store_id = ${row.storeId} and id = ${row.id}
        returning ${columns}`)
      const updated = result.rows[0]
      return updated && record(updated)
    },
    async retire(tx, row, at) {
      const result = await tx.execute<Columns>(sql`
        update content.media
        set status = 'retired', retired_at = ${at}, updated_at = ${at}
        where store_id = ${row.storeId} and id = ${row.id}
        returning ${columns}`)
      const updated = result.rows[0]
      return updated && record(updated)
    },
    async isReferenced(tx, storeId, mediaId) {
      const result = await tx.execute<{ referenced: boolean }>(sql`
        select (
          exists (select 1 from content.tours where store_id = ${storeId} and (pdf_media_id = ${mediaId} or cover_media_id = ${mediaId}))
          or exists (select 1 from content.tour_stops where store_id = ${storeId} and media_id = ${mediaId})
          or exists (select 1 from content.places where store_id = ${storeId} and cover_media_id = ${mediaId})
          or exists (select 1 from content.place_photos where store_id = ${storeId} and media_id = ${mediaId})
          or exists (select 1 from content.media_refs where store_id = ${storeId} and media_id = ${mediaId})
        ) as referenced`)
      return result.rows[0]!.referenced
    },
  }
}
