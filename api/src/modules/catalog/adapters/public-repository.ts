import type { Tx } from '../../../platform/db/client.ts'
import type { KeepsakePageKey, PublicKeepsakeReads, PublicKeepsakeRow, PublicKeepsakeSummary } from '../application/public-keepsakes.ts'
import type { Localized, LocalizedDoc } from '../ports.ts'
import { sql } from 'drizzle-orm'
import { after as keysAfter, page } from '../../../platform/db/keyset.ts'
import { searchKey, searchOrder, searchTerm } from '../../../platform/db/search.ts'

interface SummaryRow {
  id: string
  store_id: string
  slug: Localized
  name: Localized | null
  text: LocalizedDoc | null
  media_ids: string[]
  sku_ids: string[]
  // `created_at` as text at full precision (UTC): the sort key of the page cursor.
  created_key: string
}

// The order of the keepsake list: `created_at`, then the product id, both newest first.
const keepsakeKey = [{ column: sql`p.created_at`, cast: 'timestamptz' as const }, { column: sql`p.id`, cast: 'uuid' as const }]

// Only `published` products: a draft, an unpublished and an archived keepsake have no row here, so none can leak. The
// variants for sale are the SKUs with status `published` (ADR-017).
const summary = sql`
  select p.id, p.store_id, p.slug, p.published->'name' as name, p.published->'text' as text,
         (select coalesce(array_agg(m.media_id::text order by m.position), '{}') from catalog.product_media m where m.product_id = p.id) as media_ids,
         (select coalesce(array_agg(s.id::text order by s.created_at, s.id), '{}') from catalog.skus s where s.product_id = p.id and s.status = 'published') as sku_ids,
         to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_key
    from catalog.products p`

const published = sql`p.status = 'published' and p.published is not null and p.slug is not null`

function asSummary(row: SummaryRow): PublicKeepsakeSummary {
  return { id: row.id, storeId: row.store_id, slug: row.slug, name: row.name ?? {}, text: row.text ?? {}, mediaIds: row.media_ids, skuIds: row.sku_ids }
}

export function createPublicKeepsakeReads(): PublicKeepsakeReads<Tx> {
  return {
    async searchPublished(tx, { q, limit, after }) {
      const term = q === null ? null : searchTerm(q)
      const text = sql`p.search_text`
      const tsv = sql`p.search_tsv`
      const where = sql`${published}${term ? sql` and ${term.matches(text, tsv)}` : sql``}`
      const counted = await tx.execute<{ n: number } & Record<string, unknown>>(sql`select count(*)::int as n from catalog.products p where ${where}`)
      const count = counted.rows[0]?.n ?? 0
      if (limit < 1 || count === 0)
        return { hits: [], count }
      // `score_key` is the text of the rank; ordering by `score` keeps the number.
      const found = await tx.execute<{ id: string, score_key: string } & Record<string, unknown>>(sql`
        with hits as (select p.id, 'keepsake'::text as kind, ${term ? term.score(text, tsv) : sql`0::float8`} as score from catalog.products p where ${where})
        select id, score::text as score_key from hits
         ${after ? sql`where ${keysAfter(searchKey, after)}` : sql``}
         order by ${searchOrder} limit ${limit + 1}`)
      return { hits: found.rows.map(row => ({ id: row.id, score: row.score_key })), count }
    },

    async pagePublished(tx, { category, limit, after }) {
      // A parent category includes its direct sub-categories, as the stories filter does. Both the page and the count run over this set.
      const filter = category === null
        ? sql``
        : sql` and exists (
            select 1 from catalog.product_category_links l
              join catalog.product_categories c on c.store_id = l.store_id and c.id = l.category_id
              left join catalog.product_categories parent on parent.store_id = c.store_id and parent.id = c.parent_id
             where l.product_id = p.id and (c.slug = ${category} or parent.slug = ${category}))`
      const result = await tx.execute<SummaryRow & Record<string, unknown>>(sql`
        ${summary} where ${published}${filter}${after ? sql` and ${keysAfter(keepsakeKey, after)}` : sql``}
        order by p.created_at desc, p.id desc${limit === undefined ? sql`` : sql` limit ${limit + 1}`}`)
      const counted = await tx.execute<{ total: number } & Record<string, unknown>>(sql`select count(*)::int as total from catalog.products p where ${published}${filter}`)
      const { items, next } = page(result.rows, limit, (row): KeepsakePageKey => [row.created_key, row.id])
      return { rows: items.map(asSummary), next, total: counted.rows[0]?.total ?? 0 }
    },

    async listPublishedByIds(tx, ids) {
      if (ids.length === 0)
        return []
      const result = await tx.execute<SummaryRow & Record<string, unknown>>(sql`${summary} where ${published} and p.id = any(${sql.param(ids)}::uuid[])`)
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
