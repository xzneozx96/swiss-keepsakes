import type { Tx } from '../../../platform/db/client.ts'
import type { PublicKeepsakeReads, PublicKeepsakeRow, PublicKeepsakeSummary } from '../application/public-keepsakes.ts'
import type { Localized, LocalizedDoc } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface SummaryRow {
  id: string
  store_id: string
  slug: Localized
  name: Localized | null
  text: LocalizedDoc | null
  media_ids: string[]
  sku_ids: string[]
}

// Only `published` products: a draft, an unpublished and an archived keepsake have no row here, so none can leak. The
// variants for sale are the SKUs with status `published` (ADR-017).
const summary = sql`
  select p.id, p.store_id, p.slug, p.published->'name' as name, p.published->'text' as text,
         (select coalesce(array_agg(m.media_id::text order by m.position), '{}') from catalog.product_media m where m.product_id = p.id) as media_ids,
         (select coalesce(array_agg(s.id::text order by s.created_at, s.id), '{}') from catalog.skus s where s.product_id = p.id and s.status = 'published') as sku_ids
    from catalog.products p`

const published = sql`p.status = 'published' and p.published is not null and p.slug is not null`

function asSummary(row: SummaryRow): PublicKeepsakeSummary {
  return { id: row.id, storeId: row.store_id, slug: row.slug, name: row.name ?? {}, text: row.text ?? {}, mediaIds: row.media_ids, skuIds: row.sku_ids }
}

export function createPublicKeepsakeReads(): PublicKeepsakeReads<Tx> {
  return {
    async listPublished(tx) {
      const result = await tx.execute<SummaryRow & Record<string, unknown>>(sql`${summary} where ${published} order by p.created_at desc, p.id desc`)
      return result.rows.map(asSummary)
    },

    async findPublishedBySlug(tx, slug, language) {
      // The slug of the language asked for wins when both languages of different keepsakes hold the same text.
      const found = await tx.execute<SummaryRow & Record<string, unknown>>(sql`
        ${summary} where ${published} and (p.slug->>'en' = ${slug} or p.slug->>'de' = ${slug})
        order by (p.slug->>${language} = ${slug}) desc, p.created_at, p.id limit 1`)
      const row = found.rows[0]
      if (!row)
        return undefined
      const options = await tx.execute<{ id: string, name: Localized } & Record<string, unknown>>(sql`
        select id, name from catalog.product_options where product_id = ${row.id} order by position`)
      const values = await tx.execute<{ id: string, option_id: string, label: Localized } & Record<string, unknown>>(sql`
        select id, option_id, label from catalog.product_option_values where product_id = ${row.id} order by position`)
      const variants = await tx.execute<{ id: string, media_id: string | null, price_rappen: string | number } & Record<string, unknown>>(sql`
        select id, media_id, price_rappen from catalog.skus where product_id = ${row.id} and status = 'published' order by created_at, id`)
      const skuValues = await tx.execute<{ sku_id: string, option_id: string, value_id: string } & Record<string, unknown>>(sql`
        select sku_id, option_id, value_id from catalog.sku_option_values where product_id = ${row.id}`)
      return {
        ...asSummary(row),
        options: options.rows.map(option => ({ id: option.id, name: option.name, values: values.rows.filter(value => value.option_id === option.id).map(value => ({ id: value.id, label: value.label })) })),
        variants: variants.rows.map(variant => ({
          id: variant.id,
          mediaId: variant.media_id,
          // bigint comes back from node-postgres as a string.
          priceRappen: Number(variant.price_rappen),
          values: Object.fromEntries(skuValues.rows.filter(value => value.sku_id === variant.id).map(value => [value.option_id, value.value_id])),
        })),
      } satisfies PublicKeepsakeRow
    },
  }
}
