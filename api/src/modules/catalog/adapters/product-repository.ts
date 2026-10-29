import type { Tx } from '../../../platform/db/client.ts'
import type { Localized, Product, ProductChanges, ProductDoc, ProductListRow, ProductRepository, ProductVariant } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface ProductRow {
  id: string
  store_id: string
  status: Product['status']
  slug: Localized | null
  draft: ProductDoc | null
  published: { name?: Localized, text?: Localized } | null
  commission_rate: number
  row_version: number
  created_at: Date
  updated_at: Date
}

interface VariantRow {
  id: string
  sku_code: string
  // bigint comes back from node-postgres as a string.
  price_rappen: string | number
  status: ProductVariant['status']
}

interface ListRow {
  id: string
  status: Product['status']
  draft: ProductDoc | null
  published: { name?: Localized } | null
  published_cover: string | null
  variant_count: number
  sold_out_count: number
  updated_at: Date
}

const columns = sql`id, store_id, status, slug, draft, published, commission_rate::float8 as commission_rate, row_version, created_at, updated_at`

const json = (value: unknown) => (value === null ? null : JSON.stringify(value))

// The same text in the same order, so a draft that was edited back to the live copy is no pending edit.
function docKey(doc: ProductDoc): string {
  return JSON.stringify({
    name: { en: doc.name.en ?? null, de: doc.name.de ?? null },
    text: { en: doc.text.en ?? null, de: doc.text.de ?? null },
    media: doc.media,
  })
}

async function load(tx: Tx, storeId: string, productId: string, lock: boolean): Promise<Product | undefined> {
  const found = await tx.execute<ProductRow & Record<string, unknown>>(sql`
    select ${columns} from catalog.products where store_id = ${storeId} and id = ${productId}${lock ? sql` for no key update` : sql``}`)
  const row = found.rows[0]
  if (!row)
    return undefined
  const media = await tx.execute<{ media_id: string }>(sql`
    select media_id from catalog.product_media where store_id = ${storeId} and product_id = ${productId} order by position`)
  const variants = await tx.execute<VariantRow & Record<string, unknown>>(sql`
    select id, sku_code, price_rappen, status from catalog.skus where store_id = ${storeId} and product_id = ${productId} order by created_at, id`)
  return {
    id: row.id,
    storeId: row.store_id,
    status: row.status,
    slug: row.slug,
    draft: row.draft && { name: row.draft.name ?? {}, text: row.draft.text ?? {}, media: row.draft.media ?? [] },
    published: row.published && { name: row.published.name ?? {}, text: row.published.text ?? {} },
    publishedMedia: media.rows.map(m => m.media_id),
    commissionRate: row.commission_rate,
    variants: variants.rows.map(v => ({ id: v.id, skuCode: v.sku_code, priceRappen: Number(v.price_rappen), status: v.status })),
    rowVersion: row.row_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function reload(tx: Tx, product: Pick<Product, 'storeId' | 'id'>): Promise<Product> {
  return load(tx, product.storeId, product.id, false).then(found => found!)
}

export function createProductRepository(): ProductRepository<Tx> {
  return {
    async list(tx, storeId) {
      // soldOutCount is 0 until stock exists (E6.3 joins inventory.stock_items here).
      const result = await tx.execute<ListRow & Record<string, unknown>>(sql`
        select p.id, p.status, p.draft, p.published, p.updated_at,
               (select media_id from catalog.product_media m where m.product_id = p.id order by m.position limit 1) as published_cover,
               (select count(*) from catalog.skus s where s.product_id = p.id and s.status <> 'archived')::int as variant_count,
               0::int as sold_out_count
          from catalog.products p
         where p.store_id = ${storeId}
         order by p.created_at desc, p.id desc`)
      return result.rows.map((row): ProductListRow => ({
        id: row.id,
        name: (row.draft ?? row.published)?.name ?? {},
        status: row.status,
        hasUnpublishedEdits: row.status === 'published' && row.draft !== null,
        coverMediaId: row.draft ? row.draft.media?.[0] ?? null : row.published_cover,
        variantCount: row.variant_count,
        soldOutCount: row.sold_out_count,
        updatedAt: new Date(row.updated_at),
      }))
    },

    find: (tx, storeId, productId) => load(tx, storeId, productId, false),

    findForUpdate: (tx, storeId, productId) => load(tx, storeId, productId, true),

    async insert(tx, storeId, input, at) {
      const draft: ProductDoc = { name: input.name, text: input.text, media: input.media }
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into catalog.products (store_id, draft, commission_rate, created_at, updated_at)
        values (${storeId}, ${JSON.stringify(draft)}::jsonb, ${input.commissionRate}, ${at}, ${at})
        returning id`)
      const id = inserted.rows[0]!.id
      await tx.execute(sql`
        insert into catalog.skus (store_id, sku_code, product_id, price_rappen, status, created_at, updated_at)
        values (${storeId}, ${input.variant.skuCode}, ${id}, ${input.variant.priceRappen}, 'published', ${at}, ${at})`)
      return reload(tx, { storeId, id })
    },

    async save(tx, product, changes: ProductChanges, at) {
      const edited = changes.name !== undefined || changes.text !== undefined || changes.media !== undefined
      let draft: ProductDoc | null = product.draft
      if (edited) {
        const base: ProductDoc = product.draft ?? { name: product.published?.name ?? {}, text: product.published?.text ?? {}, media: product.publishedMedia }
        const next: ProductDoc = { name: changes.name ?? base.name, text: changes.text ?? base.text, media: changes.media ?? base.media }
        const live: ProductDoc | null = product.status === 'published' && product.published
          ? { ...product.published, media: product.publishedMedia }
          : null
        draft = live && docKey(live) === docKey(next) ? null : next
      }
      await tx.execute(sql`
        update catalog.products set
          draft = ${json(draft)}::jsonb,
          commission_rate = ${changes.commissionRate ?? product.commissionRate},
          row_version = row_version + 1, updated_at = ${at}
        where store_id = ${product.storeId} and id = ${product.id}`)
      return reload(tx, product)
    },

    async publish(tx, product, slug, at) {
      const doc: ProductDoc = product.draft ?? { name: product.published?.name ?? {}, text: product.published?.text ?? {}, media: product.publishedMedia }
      await tx.execute(sql`
        update catalog.products set status = 'published', published = ${JSON.stringify({ name: doc.name, text: doc.text })}::jsonb,
          draft = null, slug = ${JSON.stringify(slug)}::jsonb, row_version = row_version + 1, updated_at = ${at}
        where store_id = ${product.storeId} and id = ${product.id}`)
      await tx.execute(sql`delete from catalog.product_media where store_id = ${product.storeId} and product_id = ${product.id}`)
      if (doc.media.length > 0) {
        await tx.execute(sql`
          insert into catalog.product_media (product_id, store_id, position, media_id)
          select ${product.id}, ${product.storeId}, (t.ord)::int, t.id
            from unnest(${sql.param(doc.media)}::uuid[]) with ordinality as t(id, ord)`)
      }
      return reload(tx, product)
    },

    async unpublish(tx, product, at) {
      await tx.execute(sql`
        update catalog.products set status = 'draft', row_version = row_version + 1, updated_at = ${at}
        where store_id = ${product.storeId} and id = ${product.id}`)
      return reload(tx, product)
    },

    async slugsTaken(tx, language) {
      const result = await tx.execute<{ taken: string }>(sql`
        select slug->>${language}::text as taken from catalog.products where slug ? ${language}::text`)
      return new Set(result.rows.map(row => row.taken))
    },

    async saveVariant(tx, product, skuId, changes, at) {
      const updated = await tx.execute<{ id: string }>(sql`
        update catalog.skus set
          sku_code = coalesce(${changes.skuCode ?? null}::text, sku_code),
          price_rappen = coalesce(${changes.priceRappen ?? null}::bigint, price_rappen),
          status = coalesce(${changes.status ?? null}::text, status),
          updated_at = ${at}
        where store_id = ${product.storeId} and product_id = ${product.id} and id = ${skuId} and status <> 'archived'
        returning id`)
      return updated.rows.length > 0 ? reload(tx, product) : undefined
    },
  }
}
