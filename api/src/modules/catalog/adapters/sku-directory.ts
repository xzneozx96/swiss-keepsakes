import type { Tx } from '../../../platform/db/client.ts'
import { sql } from 'drizzle-orm'

// The shapes the inventory module's SkuDirectory port asks for, written out here so the catalog never imports another
// module (ADR-013). main.ts hands this adapter to inventory; the two shapes fit structurally.
interface Localized { en?: string, de?: string }

export interface LiveSkuRow {
  skuId: string
  productId: string
  code: string | null
  keepsakeName: Localized
  variantTitle: Localized
  mediaId: string | null
  keepsakePhotoId: string | null
}

interface Columns extends Record<string, unknown> {
  sku_id: string
  product_id: string
  sku_code: string | null
  media_id: string | null
  name: Localized | null
  keepsake_photo: string | null
  labels: Localized[]
}

// "Small" for "Small · 58 mm Classic SD": how a value reads in a variant's title (design section 13).
const shortLabel = (label: Localized, language: 'en' | 'de'): string => (label[language] || label.en || label.de || '').split(' · ')[0] ?? ''

// The title in each language: the short labels of the variant's values in option order, joined by " / ". A language
// falls back to the other one for a label that has no text in it. Empty for a keepsake with no option.
export function variantTitle(labels: Localized[]): Localized {
  const title = (language: 'en' | 'de') => labels.map(label => shortLabel(label, language)).filter(Boolean).join(' / ')
  const [en, de] = [title('en'), title('de')]

  return { ...(en && { en }), ...(de && { de }) }
}

// The live variants of a store (status not archived) with the keepsake's name, the variant's title and the photo ids,
// read from the catalog's own tables. The keepsake name and first photo follow the list: the draft when there is one,
// else what is live.
export function createSkuDirectory() {
  return {
    async liveSkus(tx: Tx, storeId: string, skuIds?: string[]): Promise<LiveSkuRow[]> {
      const result = await tx.execute<Columns>(sql`
        select s.id as sku_id, s.product_id, s.sku_code, s.media_id,
               coalesce(p.draft->'name', p.published->'name') as name,
               coalesce(
                 case when p.draft is not null then (p.draft->'media'->>0) end,
                 (select c.media_id::text from catalog.product_media c where c.product_id = p.id order by c.position limit 1)
               ) as keepsake_photo,
               (select coalesce(jsonb_agg(v.label order by o.position), '[]'::jsonb)
                  from catalog.sku_option_values sv
                  join catalog.product_options o on o.id = sv.option_id
                  join catalog.product_option_values v on v.id = sv.value_id
                 where sv.sku_id = s.id) as labels
          from catalog.skus s
          join catalog.products p on p.id = s.product_id
         where s.store_id = ${storeId} and s.status <> 'archived'${skuIds ? sql` and s.id = any(${sql.param(skuIds)}::uuid[])` : sql``}
         order by s.created_at, s.id`)
      return result.rows.map(row => ({
        skuId: row.sku_id,
        productId: row.product_id,
        code: row.sku_code,
        keepsakeName: row.name ?? {},
        variantTitle: variantTitle(row.labels),
        mediaId: row.media_id,
        keepsakePhotoId: row.keepsake_photo,
      }))
    },
  }
}
