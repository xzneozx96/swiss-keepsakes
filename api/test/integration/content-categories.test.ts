import type { Tx } from '../../src/platform/db/client.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createCategoryRepository } from '../../src/modules/content/adapters/category-repository.ts'
import { mapDatabaseError } from '../../src/modules/content/adapters/database-errors.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createContentHttp } from './content-http.ts'
import { count, openTestDatabase } from './support.ts'

// Every sign-in is two round trips and several statements, which is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

// The category repository wrapper below reads a stale count, as a request does when a link is added after it.
const realCategories = createCategoryRepository()
let staleUseCount = false
const env = createContentHttp({ pool, db }, undefined, undefined, {
  ...realCategories,
  list: async (tx, storeId, kind) => {
    const rows = await realCategories.list(tx, storeId, kind)
    return staleUseCount ? rows.map(row => ({ ...row, useCount: 0 })) : rows
  },
})

type Kind = 'map' | 'blog'
interface Category { id: string, slug: string, name: { en: string | null, de: string | null }, parentId: string | null, position: number, childCount: number, useCount: number }

const table = (kind: Kind) => kind === 'map' ? 'map_categories' : 'blog_categories'

async function setup() {
  const store = await env.storeWithStaff()
  const url = (kind: Kind, suffix = '') => `/api/store/${store.storeId}/categories/${kind}${suffix}`
  const as = store.owner.headers
  const list = async (kind: Kind) => ((await (await env.call(url(kind), { headers: as })).json()) as { items: Category[] }).items
  const create = async (kind: Kind, body: object, headers = as) => env.call(url(kind), { method: 'POST', headers, body })
  const made = async (kind: Kind, body: object) => {
    const response = await create(kind, body)
    expect(response.status).toBe(201)
    return await response.json() as Category
  }
  return { ...store, url, as, list, create, made }
}

async function publicNames(kind: Kind) {
  const path = kind === 'map' ? '/api/public/map-categories?lang=en' : '/api/public/blog-categories?lang=en'
  const { items } = await (await env.call(path)).json() as { items: Category[] }
  return new Map(items.map(item => [item.id, item]))
}

async function pinWith(storeId: string, categoryId: string, status: 'draft' | 'published' | 'hidden') {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.places (store_id, status, slug, latitude, longitude, published, first_published_at)
     values ($1, $2, $3, 47.05, 8.3, $4, $5) returning id`,
    [storeId, status, JSON.stringify({ en: `p-${randomUUID().slice(0, 8)}` }), JSON.stringify({ name: { en: 'Pin' }, tip: {} }), status === 'draft' ? null : new Date().toISOString()],
  )
  await pool.query('insert into content.place_categories (place_id, category_id, store_id) values ($1, $2, $3)', [rows[0]!.id, categoryId, storeId])
}

async function draftStoryWith(storeId: string, categoryId: string) {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [storeId])
  await pool.query(`insert into content.story_versions (store_id, group_id, language, status, slug, draft) values ($1, $2, 'en', 'draft', $3, $4)`, [storeId, rows[0]!.id, `s-${randomUUID().slice(0, 8)}`, JSON.stringify({ title: 'Draft', excerpt: '', authorName: '', authorRole: '', coverMediaId: null, body: { type: 'doc', content: [] } })])
  await pool.query('insert into content.story_categories (group_id, category_id, store_id) values ($1, $2, $3)', [rows[0]!.id, categoryId, storeId])
}

describe.each(['map', 'blog'] as const)('[E4.18][AC87] the %s category list over the real app and the database', (kind) => {
  it(`[E4.18][AC87] AC-1 create, rename, move and nest, each seen after a reload; AC-2 the public list shows each step on its next request`, async () => {
    const s = await setup()
    const walks = await s.made(kind, { name: { en: 'Walks', de: 'Wanderungen' } })
    const food = await s.made(kind, { name: { en: 'Food' } })
    expect(walks).toMatchObject({ slug: 'walks', position: 1, parentId: null, childCount: 0, useCount: 0 })
    expect(food).toMatchObject({ slug: 'food', position: 2, name: { en: 'Food', de: null } })
    expect((await s.list(kind)).map(c => `${c.name.en}:${c.position}`)).toEqual(['Walks:1', 'Food:2'])
    expect((await publicNames(kind)).get(food.id)).toMatchObject({ name: { en: 'Food', de: null }, position: 2, parentId: null })

    // Rename keeps the slug and replaces both languages.
    const renamed = await env.call(s.url(kind, `/${food.id}`), { method: 'PATCH', headers: s.as, body: { name: { de: 'Essen' } } })
    expect(renamed.status).toBe(200)
    expect(await renamed.json()).toMatchObject({ slug: 'food', name: { en: null, de: 'Essen' } })
    expect((await publicNames(kind)).get(food.id)).toMatchObject({ slug: 'food', name: { en: null, de: 'Essen' } })

    // A rename with both languages replaces both keys, over a name that already holds two.
    const both = await env.call(s.url(kind, `/${walks.id}`), { method: 'PATCH', headers: s.as, body: { name: { en: 'Local walks', de: 'Lokale Wanderungen' } } })
    expect(both.status).toBe(200)
    expect(await both.json()).toMatchObject({ slug: 'walks', name: { en: 'Local walks', de: 'Lokale Wanderungen' } })
    expect((await s.list(kind)).find(c => c.id === walks.id)).toMatchObject({ slug: 'walks', name: { en: 'Local walks', de: 'Lokale Wanderungen' } })
    expect((await publicNames(kind)).get(walks.id)).toMatchObject({ slug: 'walks', name: { en: 'Local walks', de: 'Lokale Wanderungen' } })
    expect((await pool.query(`select slug, name from content.${table(kind)} where id = $1`, [walks.id])).rows[0]).toEqual({ slug: 'walks', name: { en: 'Local walks', de: 'Lokale Wanderungen' } })

    // Move Food above Walks.
    const ordered = await env.call(s.url(kind, '/order'), { method: 'PUT', headers: s.as, body: { parentId: null, ids: [food.id, walks.id] } })
    expect(ordered.status).toBe(200)
    expect(((await ordered.json()) as { items: Category[] }).items.map(c => c.id)).toEqual([food.id, walks.id])
    expect((await publicNames(kind)).get(walks.id)).toMatchObject({ position: 2 })

    // Nest Walks under Food: it goes last there and the gap above closes.
    const nested = await env.call(s.url(kind, `/${walks.id}`), { method: 'PATCH', headers: s.as, body: { parentId: food.id } })
    expect(nested.status).toBe(200)
    expect(await nested.json()).toMatchObject({ parentId: food.id, position: 1 })
    const reloaded = await s.list(kind)
    expect(reloaded.map(c => `${c.name.en ?? c.name.de}${c.parentId ? '^' : ''}:${c.position}:${c.childCount}`)).toEqual(['Essen:1:1', 'Local walks^:1:0'])
    expect((await publicNames(kind)).get(walks.id)).toMatchObject({ parentId: food.id, position: 1 })

    // A patch that changes nothing (same parent) saves and answers 200.
    const same = await env.call(s.url(kind, `/${walks.id}`), { method: 'PATCH', headers: s.as, body: { parentId: food.id } })
    expect(same.status).toBe(200)
  })

  it('[E4.18][AC87] AC-3 the name is stored trimmed with no blank key; a name with nothing left is 422 and saves nothing', async () => {
    const s = await setup()
    const created = await s.made(kind, { name: { en: '  Walks  ', de: '   ' } })
    expect((await pool.query(`select name from content.${table(kind)} where id = $1`, [created.id])).rows[0]).toEqual({ name: { en: 'Walks' } })

    const blank = await s.create(kind, { name: { en: ' ', de: '' } })
    expect(blank.status).toBe(422)
    expect(await blank.json()).toMatchObject({ type: 'validation-failed', errors: [{ in: 'body', path: 'name' }] })
    const patch = await env.call(s.url(kind, `/${created.id}`), { method: 'PATCH', headers: s.as, body: { name: {} } })
    expect(patch.status).toBe(422)
    expect(await count(pool, `select count(*) from content.${table(kind)} where store_id = $1`, [s.storeId])).toBe(1)
    expect((await pool.query(`select name from content.${table(kind)} where id = $1`, [created.id])).rows[0]).toEqual({ name: { en: 'Walks' } })
    expect(await count(pool, `select count(*) from content.${table(kind)} where store_id = $1 and not (name ?| array['en','de'])`, [s.storeId])).toBe(0)
  })

  it('[E4.18][AC87] AC-4 delete: a free category goes (204); a sub-category, a published pin or a draft story still tagged keep it (409)', async () => {
    const s = await setup()
    const parent = await s.made(kind, { name: { en: 'Parent' } })
    const child = await s.made(kind, { name: { en: 'Child' }, parentId: parent.id })
    const tagged = await s.made(kind, { name: { en: 'Tagged' } })
    const free = await s.made(kind, { name: { en: 'Free' } })
    if (kind === 'map')
      await pinWith(s.storeId, tagged.id, 'published')
    else
      await draftStoryWith(s.storeId, tagged.id)

    const hasChild = await env.call(s.url(kind, `/${parent.id}`), { method: 'DELETE', headers: s.as })
    expect(hasChild.status).toBe(409)
    expect(await hasChild.json()).toMatchObject({ type: 'category-has-children' })
    const inUse = await env.call(s.url(kind, `/${tagged.id}`), { method: 'DELETE', headers: s.as })
    expect(inUse.status).toBe(409)
    expect(await inUse.json()).toMatchObject({ type: 'category-in-use' })
    expect((await s.list(kind)).find(c => c.id === tagged.id)).toMatchObject({ useCount: 1 })

    expect((await env.call(s.url(kind, `/${free.id}`), { method: 'DELETE', headers: s.as })).status).toBe(204)
    expect((await publicNames(kind)).has(free.id)).toBe(false)
    expect((await env.call(s.url(kind, `/${child.id}`), { method: 'DELETE', headers: s.as })).status).toBe(204)
    expect((await env.call(s.url(kind, `/${parent.id}`), { method: 'DELETE', headers: s.as })).status).toBe(204)
    expect((await s.list(kind)).map(c => `${c.name.en}:${c.position}`)).toEqual(['Tagged:1'])
    expect((await env.call(s.url(kind, `/${free.id}`), { method: 'DELETE', headers: s.as })).status).toBe(404)
  })

  it('[E4.18][AC87] AC-4 the race path: a link added after the count makes the database refuse, and the answer is 409 category-in-use, not 422', async () => {
    const s = await setup()
    const tagged = await s.made(kind, { name: { en: 'Tagged' } })
    if (kind === 'map')
      await pinWith(s.storeId, tagged.id, 'draft')
    else
      await draftStoryWith(s.storeId, tagged.id)

    // The repository itself refuses inside a transaction, with the error that maps to in-use.
    const error = await createUnitOfWork(db).run((tx: Tx) => realCategories.remove(tx, s.storeId, kind, tagged.id)).catch((e: unknown) => e)
    expect(mapDatabaseError(error)).toEqual({ reason: 'in-use' })

    // The route, with a list that was read before the link was added (useCount 0).
    staleUseCount = true
    try {
      const response = await env.call(s.url(kind, `/${tagged.id}`), { method: 'DELETE', headers: s.as })
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ type: 'category-in-use' })
    }
    finally {
      staleUseCount = false
    }
    expect(await count(pool, `select count(*) from content.${table(kind)} where id = $1`, [tagged.id])).toBe(1)
  })

  it('[E4.18][AC87] reorder: the ids must be exactly the siblings; three rows come back in the new order', async () => {
    const s = await setup()
    const [a, b, c] = [await s.made(kind, { name: { en: 'A' } }), await s.made(kind, { name: { en: 'B' } }), await s.made(kind, { name: { en: 'C' } })]
    const order = (parentId: string | null, ids: string[]) => env.call(s.url(kind, '/order'), { method: 'PUT', headers: s.as, body: { parentId, ids } })

    expect((await order(null, [c.id, a.id, b.id])).status).toBe(200)
    expect((await s.list(kind)).map(x => `${x.name.en}:${x.position}`)).toEqual(['C:1', 'A:2', 'B:3'])
    const wrong = await order(null, [a.id, b.id])
    expect(wrong.status).toBe(422)
    expect(await wrong.json()).toMatchObject({ type: 'validation-failed' })
    expect((await order(null, [a.id, a.id, b.id])).status).toBe(422)
    expect((await order(randomUUID(), [])).status).toBe(404)
    expect((await s.list(kind)).map(x => `${x.name.en}:${x.position}`)).toEqual(['C:1', 'A:2', 'B:3'])
  })

  it('[E4.18][AC87] AC-5 nesting rules: a sub cannot hold a category, a parent with children cannot become a sub, a category is not its own parent', async () => {
    const s = await setup()
    const a = await s.made(kind, { name: { en: 'A' } })
    const b = await s.made(kind, { name: { en: 'B' } })
    const sub = await s.made(kind, { name: { en: 'Sub' }, parentId: a.id })
    const patch = (id: string, parentId: string) => env.call(s.url(kind, `/${id}`), { method: 'PATCH', headers: s.as, body: { parentId } })

    const before = await s.list(kind)
    expect(await (await patch(b.id, sub.id)).json()).toMatchObject({ type: 'category-too-deep' })
    expect(await (await patch(a.id, b.id)).json()).toMatchObject({ type: 'category-parent-has-children' })
    expect(await (await patch(a.id, a.id)).json()).toMatchObject({ type: 'category-too-deep' })
    expect(await (await s.create(kind, { name: { en: 'X' }, parentId: sub.id })).json()).toMatchObject({ type: 'category-too-deep' })
    expect(await s.list(kind)).toEqual(before)
  })

  it('a parent from another store or from the other list is 404, and nothing is linked across', async () => {
    const s = await setup()
    const other = await setup()
    const otherKind: Kind = kind === 'map' ? 'blog' : 'map'
    const foreign = await other.made(kind, { name: { en: 'Elsewhere' } })
    const crossList = await s.made(otherKind, { name: { en: 'Other list' } })

    expect((await s.create(kind, { name: { en: 'New' }, parentId: foreign.id })).status).toBe(404)
    expect((await s.create(kind, { name: { en: 'New' }, parentId: crossList.id })).status).toBe(404)
    const mine = await s.made(kind, { name: { en: 'Mine' } })
    expect((await env.call(s.url(kind, `/${mine.id}`), { method: 'PATCH', headers: s.as, body: { parentId: foreign.id } })).status).toBe(404)
    // Another store's category cannot be touched through my store.
    expect((await env.call(s.url(kind, `/${foreign.id}`), { method: 'PATCH', headers: s.as, body: { name: { en: 'Mine now' } } })).status).toBe(404)
    expect((await env.call(s.url(kind, `/${foreign.id}`), { method: 'DELETE', headers: s.as })).status).toBe(404)
    expect((await other.list(kind))[0]).toMatchObject({ name: { en: 'Elsewhere' } })
  })

  it('two creates of the same name at once get two distinct slugs, never a 500', async () => {
    const s = await setup()

    const [first, second] = await Promise.all([s.create(kind, { name: { en: 'Walks' } }), s.create(kind, { name: { en: 'Walks' } })])

    expect([first.status, second.status]).toEqual([201, 201])
    const slugs = [(await first.json() as Category).slug, (await second.json() as Category).slug].sort()
    expect(slugs).toEqual(['walks', 'walks-2'])
    expect((await s.list(kind)).map(c => c.position)).toEqual([1, 2])
  })

  it('the same name in the other list or another store may use the same slug', async () => {
    const s = await setup()
    const other = await setup()

    expect((await s.made(kind, { name: { en: 'Walks' } })).slug).toBe('walks')
    expect((await other.made(kind, { name: { en: 'Walks' } })).slug).toBe('walks')
  })

  it('a create replayed with the same Idempotency-Key makes one category and writes one audit row', async () => {
    const s = await setup()
    const key = `cat-${randomUUID()}`

    const first = await env.call(s.url(kind), { method: 'POST', headers: s.as, body: { name: { en: 'Walks' } }, key })
    const again = await env.call(s.url(kind), { method: 'POST', headers: s.as, body: { name: { en: 'Walks' } }, key })

    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    const created = await first.json() as Category
    expect((await again.json() as Category).id).toBe(created.id)
    expect(await count(pool, `select count(*) from content.${table(kind)} where store_id = $1`, [s.storeId])).toBe(1)
    const audit = await pool.query<{ entity: string, action: string }>('select entity, action from platform.audit_log where entity_id = $1', [created.id])
    expect(audit.rows).toEqual([{ entity: `${kind}_category`, action: 'created' }])
  })

  it('[E4.18][AC87] AC-6 guest 401, no-membership and other-store staff 403 with no change, owner and manager 201', async () => {
    const s = await setup()
    const zug = await env.storeWithStaff()
    const stranger = await env.signIn()
    const body = { name: { en: 'Walks' } }

    expect((await env.call(s.url(kind), { method: 'POST', body })).status).toBe(401)
    expect((await env.call(s.url(kind))).status).toBe(401)
    expect((await s.create(kind, body, stranger.headers)).status).toBe(403)
    expect((await s.create(kind, body, zug.owner.headers)).status).toBe(403)
    expect((await env.call(s.url(kind), { headers: zug.owner.headers })).status).toBe(403)
    expect(await count(pool, `select count(*) from content.${table(kind)} where store_id = $1`, [s.storeId])).toBe(0)

    expect((await s.create(kind, body, s.manager.headers)).status).toBe(201)
    expect((await s.create(kind, body, s.owner.headers)).status).toBe(201)
    expect(await count(pool, `select count(*) from content.${table(kind)} where store_id = $1`, [s.storeId])).toBe(2)
  })
})
