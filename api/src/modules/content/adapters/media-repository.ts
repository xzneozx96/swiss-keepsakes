import type { Tx } from '../../../platform/db/client.ts'
import type { MediaRecord, MediaRepository, MediaRow } from '../ports.ts'
import { sql } from 'drizzle-orm'

export interface Columns extends Record<string, unknown> {
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
  name: string
  file_name: string
  alt: MediaRecord['alt']
  duration_seconds: number | null
  version: number
  created_at: string | Date
}

export const mediaColumns = sql`id, store_id, kind, storage_key, content_type, byte_size, sha256, width, height, status, name, file_name, alt, duration_seconds, version, created_at`
const columns = mediaColumns

export function record(row: Columns): MediaRecord {
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
    name: row.name,
    fileName: row.file_name,
    alt: row.alt ?? {},
    durationSeconds: row.duration_seconds,
    version: row.version,
    createdAt: new Date(row.created_at),
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
        insert into content.media (id, store_id, kind, storage_key, content_type, byte_size, sha256, name, file_name, status, created_at, updated_at)
        values (${row.id}, ${row.storeId}, ${row.kind}, ${row.storageKey}, ${row.contentType}, ${row.byteSize}, ${row.sha256}, ${row.name ?? null}, ${row.fileName ?? row.name ?? null}, 'processing', ${at}, ${at})
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
    async describe(tx, row, changes, at) {
      // The description is merged per language: a language that is left out keeps its text, an empty text clears it.
      const alt = { ...row.alt }
      for (const language of ['en', 'de'] as const) {
        const text = changes.alt?.[language]
        if (text === undefined)
          continue
        if (text === '')
          delete alt[language]
        else
          alt[language] = text
      }
      const result = await tx.execute<Columns>(sql`
        update content.media
        set name = ${changes.name ?? row.name}, alt = ${JSON.stringify(alt)}::jsonb, updated_at = ${at}
        where store_id = ${row.storeId} and id = ${row.id}
        returning ${columns}`)
      const updated = result.rows[0]
      return updated && record(updated)
    },
    async replace(tx, row, next, at) {
      const result = await tx.execute<Columns>(sql`
        update content.media
        set storage_key = ${next.storageKey}, content_type = ${next.contentType}, byte_size = ${next.byteSize}, sha256 = ${next.sha256},
            width = ${next.width}, height = ${next.height}, file_name = ${next.fileName}, version = version + 1, updated_at = ${at}
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
