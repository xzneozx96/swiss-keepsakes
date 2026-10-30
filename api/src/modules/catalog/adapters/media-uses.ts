import type { Tx } from '../../../platform/db/client.ts'
import type { Localized, MediaUses } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface Columns extends Record<string, unknown> {
  media_id: string
  product_id: string
  name: Localized | null
  published: boolean
  cover_media_id: string | null
}

const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

// Keepsake photos are plain media ids (ADR-013). A photo is held by a keepsake in two places: `product_media` (the
// live photos, written at publish) and the draft document (`draft.media`, the photos of the next publish).
export function createMediaUses(): MediaUses<Tx> {
  return {
    async list(tx, storeId) {
      const result = await tx.execute<Columns>(sql`
        with held as (
          select m.product_id, m.media_id, true as live
            from catalog.product_media m where m.store_id = ${storeId}
          union all
          select p.id, d.media_id::uuid, false
            from catalog.products p
            cross join lateral jsonb_array_elements_text(coalesce(p.draft->'media', '[]'::jsonb)) as d(media_id)
           where p.store_id = ${storeId} and d.media_id ~ ${uuidPattern}
        )
        select h.media_id, h.product_id,
               coalesce(p.draft->'name', p.published->'name') as name,
               (p.status = 'published' and bool_or(h.live)) as published,
               coalesce(
                 case when p.draft is not null then (p.draft->'media'->>0) end,
                 (select c.media_id::text from catalog.product_media c where c.product_id = p.id order by c.position limit 1)
               ) as cover_media_id
          from held h
          join catalog.products p on p.id = h.product_id
         group by h.media_id, h.product_id, p.id
         order by h.media_id, h.product_id`)
      return result.rows.map(row => ({
        mediaId: row.media_id,
        productId: row.product_id,
        name: row.name ?? {},
        published: row.published,
        coverMediaId: row.cover_media_id,
      }))
    },
  }
}
