import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { storyKeepsakeLinksStep } from '../../scripts/seed-story-keepsakes.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const quiet = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
afterAll(() => quiet.mockRestore())

const storyDoc = JSON.stringify({ title: 'T', excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [] } })

async function product(store: string, code: string, status: 'published' | 'draft' = 'published'): Promise<string> {
  const slug = { en: `p-${randomUUID().slice(0, 8)}` }
  const published = status === 'published' ? { name: { en: code } } : null
  const { rows } = await pool.query<{ id: string }>(
    `insert into catalog.products (store_id, status, slug, published, draft) values ($1, $2, $3, $4, $5) returning id`,
    [store, status, status === 'published' ? JSON.stringify(slug) : null, published && JSON.stringify(published), JSON.stringify({ name: { en: code } })],
  )
  await pool.query(`insert into catalog.skus (store_id, sku_code, product_id, price_rappen, status) values ($1, $2, $3, 100, $4)`, [store, code, rows[0]!.id, status])
  return rows[0]!.id
}

describe('[E4.4][AC31] the story-keepsake link seed over the database', () => {
  it('[E4.4][AC31] AC-5: run twice, each new link exists once and a link already there is not changed', async () => {
    const store = randomUUID()
    const g = (await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])).rows[0]!.id
    const slug = `seed-${randomUUID().slice(0, 8)}`
    await pool.query(`insert into content.story_versions (store_id, group_id, language, status, slug, published, published_at) values ($1, $2, 'en', 'published', $3, $4, now())`, [store, g, slug, storyDoc])
    const a = await product(store, `SEEDA-${randomUUID().slice(0, 6)}`)
    const codeA = (await pool.query<{ sku_code: string }>('select sku_code from catalog.skus where product_id = $1', [a])).rows[0]!.sku_code
    const codeB = `SEEDB-${randomUUID().slice(0, 6)}`
    const b = await product(store, codeB)
    const draft = await product(store, `SEEDD-${randomUUID().slice(0, 6)}`, 'draft')
    const person = await product(store, `SEEDP-${randomUUID().slice(0, 6)}`)
    await pool.query('insert into content.story_keepsake_links (group_id, store_id, position, product_id) values ($1, $2, 1, $3)', [g, store, person])
    const specs = [{ story: slug, keepsakes: [codeA, codeB, 'NO-SUCH-CODE'] }]
    const rows = async () => (await pool.query<{ position: number, product_id: string }>('select position, product_id from content.story_keepsake_links where group_id = $1 order by position', [g])).rows

    expect(await storyKeepsakeLinksStep(pool, store, { dry: false, specs })).toBe(0)
    const first = await rows()
    expect(await storyKeepsakeLinksStep(pool, store, { dry: false, specs })).toBe(0)
    const second = await rows()

    expect(first).toEqual([{ position: 1, product_id: person }, { position: 2, product_id: a }, { position: 3, product_id: b }])
    expect(second).toEqual(first)
    expect(first.map(r => r.product_id)).not.toContain(draft)
  })

  it('[E4.4][AC31] a dry run writes nothing', async () => {
    const store = randomUUID()
    const g = (await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])).rows[0]!.id
    const slug = `seed-${randomUUID().slice(0, 8)}`
    await pool.query(`insert into content.story_versions (store_id, group_id, language, status, slug, published, published_at) values ($1, $2, 'en', 'published', $3, $4, now())`, [store, g, slug, storyDoc])
    const code = `SEEDC-${randomUUID().slice(0, 6)}`
    await product(store, code)

    expect(await storyKeepsakeLinksStep(pool, store, { dry: true, specs: [{ story: slug, keepsakes: [code] }] })).toBe(0)

    expect((await pool.query('select 1 from content.story_keepsake_links where group_id = $1', [g])).rowCount).toBe(0)
  })
})
