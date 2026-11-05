import type { KeepsakePageKey } from '../../src/modules/catalog/application/public-keepsakes.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createPublicKeepsakeReads } from '../../src/modules/catalog/adapters/public-repository.ts'
import { makeListKeepsakes } from '../../src/modules/catalog/application/public-keepsakes.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

// ADR-033: the keepsake list pages by keyset over `created_at desc, id desc`. Test files share one database and the list is
// global, so every test makes a store and a category of its own and filters by that category.
const list = makeListKeepsakes({ uow: createUnitOfWork(db), reads: createPublicKeepsakeReads(), media: { find: async () => [] } })

const unique = () => randomUUID().slice(0, 8)
const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

async function category(store: string, parentId: string | null = null): Promise<{ id: string, slug: string }> {
  const slug = `c-${unique()}`
  const { rows } = await pool.query<{ id: string }>(
    `insert into catalog.product_categories (store_id, name, slug, parent_id) values ($1, $2, $3, $4) returning id`,
    [store, JSON.stringify({ en: 'Paged', de: 'Seiten' }), slug, parentId],
  )
  return { id: rows[0]!.id, slug }
}

/** A published keepsake in both languages, made at `createdAt` (Postgres text, so microseconds survive), linked to these categories. */
async function keepsake(store: string, createdAt: string, categories: string[]): Promise<string> {
  const tag = unique()
  const { rows } = await pool.query<{ id: string }>(
    `insert into catalog.products (store_id, status, slug, published, created_at) values ($1, 'published', $2, $3, $4::timestamptz) returning id`,
    [store, JSON.stringify({ en: `k-${tag}`, de: `k-de-${tag}` }), JSON.stringify({ name: { en: `Knife ${tag}`, de: `Messer ${tag}` }, text: { en: rich('A knife'), de: rich('Ein Messer') } }), createdAt],
  )
  for (const id of categories)
    await pool.query(`insert into catalog.product_category_links (product_id, category_id, store_id) values ($1, $2, $3)`, [rows[0]!.id, id, store])
  return rows[0]!.id
}

async function walk(slug: string, limit: number | undefined) {
  const pages: Awaited<ReturnType<typeof list>>[] = []
  let after: KeepsakePageKey | null = null
  do {
    const found = await list({ language: 'en', category: slug, limit, after: after ?? undefined })
    pages.push(found)
    after = found.next
  } while (after)
  return pages
}

const at = (n: number, micros = 0) => `2091-01-01T00:00:${String(n).padStart(2, '0')}.${String(micros).padStart(6, '0')}Z`

describe('the public keepsake list pages by keyset', () => {
  it('[ADR-033] rows created at the same instant are walked once each, the id breaking the tie', async () => {
    const store = randomUUID()
    const c = await category(store)
    const ids: string[] = []
    for (let index = 0; index < 7; index += 1)
      ids.push(await keepsake(store, at(1), [c.id]))

    const pages = await walk(c.slug, 3)

    expect(pages.map(p => p.items.length)).toEqual([3, 3, 1])
    expect(pages.flatMap(p => p.items.map(i => i.id))).toEqual([...ids].sort().reverse())
    expect(pages.every(p => p.total === 7)).toBe(true)
  })

  it('[ADR-033] times less than a millisecond apart are walked once each, newest first', async () => {
    const store = randomUUID()
    const c = await category(store)
    const ids: string[] = []
    for (let index = 0; index < 6; index += 1)
      ids.push(await keepsake(store, at(1, 123_000 + index * 100), [c.id]))

    const pages = await walk(c.slug, 2)

    expect(pages.flatMap(p => p.items.map(i => i.id))).toEqual([...ids].reverse())
  })

  it('[ADR-033] exactly limit rows give no next page and no empty page after it', async () => {
    const store = randomUUID()
    const c = await category(store)
    for (let index = 0; index < 3; index += 1)
      await keepsake(store, at(index), [c.id])

    const pages = await walk(c.slug, 3)

    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({ next: null, total: 3 })
  })

  it('[ADR-033] a parent category includes a keepsake of its child, a child only its own, and an unknown slug nothing', async () => {
    const store = randomUUID()
    const parent = await category(store)
    const child = await category(store, parent.id)
    const other = await category(store)
    const inParent = await keepsake(store, at(1), [parent.id])
    const inChild = await keepsake(store, at(2), [child.id])
    await keepsake(store, at(3), [other.id])

    const asParent = await walk(parent.slug, undefined)
    const asChild = await walk(child.slug, undefined)
    const unknown = await walk(`none-${unique()}`, undefined)

    expect(asParent[0]!.items.map(i => i.id)).toEqual([inChild, inParent])
    expect(asParent[0]!.total).toBe(2)
    expect(asChild[0]!.items.map(i => i.id)).toEqual([inChild])
    expect(unknown[0]).toMatchObject({ items: [], total: 0, next: null })
  })

  it('[ADR-033] a keepsake in two categories of one parent shows and counts once', async () => {
    const store = randomUUID()
    const parent = await category(store)
    const a = await category(store, parent.id)
    const b = await category(store, parent.id)
    await keepsake(store, at(1), [a.id, b.id])

    const [page] = await walk(parent.slug, undefined)

    expect(page!.items).toHaveLength(1)
    expect(page!.total).toBe(1)
  })

  it('[ADR-033] total equals the length of a full read, and the pages join into the same list', async () => {
    const store = randomUUID()
    const c = await category(store)
    for (let index = 0; index < 9; index += 1)
      await keepsake(store, at(index, index), [c.id])

    const [whole] = await walk(c.slug, undefined)
    const paged = await walk(c.slug, 4)

    expect(whole!.total).toBe(whole!.items.length)
    expect(whole!.items).toHaveLength(9)
    expect(paged.flatMap(p => p.items.map(i => i.id))).toEqual(whole!.items.map(i => i.id))
    expect(paged.every(p => p.total === 9)).toBe(true)
  })

  it('[ADR-033] a draft keepsake is neither listed nor counted', async () => {
    const store = randomUUID()
    const c = await category(store)
    const shown = await keepsake(store, at(1), [c.id])
    const hidden = await keepsake(store, at(2), [c.id])
    await pool.query(`update catalog.products set status = 'archived' where id = $1`, [hidden])

    const [page] = await walk(c.slug, undefined)

    expect(page!.items.map(i => i.id)).toEqual([shown])
    expect(page!.total).toBe(1)
  })
})
