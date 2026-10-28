import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { count, openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

interface PgFailure { code?: string, constraint?: string, message?: string }

async function failure(promise: Promise<unknown>): Promise<PgFailure> {
  try {
    await promise
  }
  catch (error) {
    return error as PgFailure
  }
  throw new Error('the statement was expected to fail and succeeded')
}

type CategoryTable = 'map_categories' | 'blog_categories'

const tables: CategoryTable[] = ['map_categories', 'blog_categories']

function slugOf(): string {
  return `c-${randomUUID().slice(0, 8)}`
}

async function category(table: CategoryTable, store: string, options: { name?: object, slug?: string, parent?: string } = {}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.${table} (store_id, name, slug, parent_id) values ($1, $2, $3, $4) returning id`,
    [store, JSON.stringify(options.name ?? { en: 'Food' }), options.slug ?? slugOf(), options.parent ?? null],
  )
  return rows[0]!.id
}

async function draftPin(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('insert into content.places (store_id) values ($1) returning id', [store])
  return rows[0]!.id
}

async function publishPin(id: string): Promise<void> {
  await pool.query(
    `update content.places set status = 'published', first_published_at = now(), slug = $2, latitude = 47.05, longitude = 8.3, published = '{"name":{"en":"X"}}' where id = $1`,
    [id, JSON.stringify({ en: slugOf() })],
  )
}

async function storyGroup(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
  return rows[0]!.id
}

function tagPin(place: string, categoryId: string, store: string) {
  return pool.query('insert into content.place_categories (place_id, category_id, store_id) values ($1, $2, $3)', [place, categoryId, store])
}

function tagStory(group: string, categoryId: string, store: string) {
  return pool.query('insert into content.story_categories (group_id, category_id, store_id) values ($1, $2, $3)', [group, categoryId, store])
}

describe.each(tables)('[E2.11][AC87] %s', (table) => {
  it.each([
    ['an English-only name', { en: 'Food' }],
    ['a German-only name', { de: 'Essen' }],
  ])(`[E2.11][AC87] ${table} accepts %s`, async (_what, name) => {
    const store = randomUUID()

    const id = await category(table, store, { name })

    expect(await count(pool, `select count(*) from content.${table} where id = $1`, [id])).toBe(1)
  })

  it(`[E2.11][AC87] ${table} refuses an empty name`, async () => {
    const refused = await failure(category(table, randomUUID(), { name: {} }))

    expect(refused).toMatchObject({ code: '23514', constraint: `${table}_name_check` })
  })

  it(`[E2.11][AC87] ${table} accepts a child under a root and refuses a child under a child`, async () => {
    const store = randomUUID()
    const root = await category(table, store)
    const child = await category(table, store, { parent: root })

    const refused = await failure(category(table, store, { parent: child }))

    expect(refused).toMatchObject({ code: '23503', constraint: `${table}_parent_fkey` })
    expect(await count(pool, `select count(*) from content.${table} where store_id = $1`, [store])).toBe(2)
  })

  it(`[E2.11][AC87] ${table} refuses to delete a parent that has a child`, async () => {
    const store = randomUUID()
    const root = await category(table, store)
    await category(table, store, { parent: root })

    const refused = await failure(pool.query(`delete from content.${table} where id = $1`, [root]))

    expect(['23001', '23503']).toContain(refused.code)
    expect(await count(pool, `select count(*) from content.${table} where id = $1`, [root])).toBe(1)
  })

  it(`[E2.11][AC87] ${table} deletes an unused category`, async () => {
    const id = await category(table, randomUUID())

    await pool.query(`delete from content.${table} where id = $1`, [id])

    expect(await count(pool, `select count(*) from content.${table} where id = $1`, [id])).toBe(0)
  })

  it(`[E2.11][AC87] ${table} refuses the same slug in one store and accepts it in two`, async () => {
    const store = randomUUID()
    const slug = slugOf()
    await category(table, store, { slug })

    const refused = await failure(category(table, store, { slug }))
    await category(table, randomUUID(), { slug })

    expect(refused).toMatchObject({ code: '23505', constraint: `${table}_store_slug_key` })
    expect(await count(pool, `select count(*) from content.${table} where slug = $1`, [slug])).toBe(2)
  })
})

describe('[E2.11][AC87] a category in use', () => {
  it('[E2.11][AC87] a map category used by a pin cannot be deleted until the link row is removed', async () => {
    const store = randomUUID()
    const id = await category('map_categories', store)
    const place = await draftPin(store)
    await tagPin(place, id, store)

    const refused = await failure(pool.query('delete from content.map_categories where id = $1', [id]))
    expect(['23001', '23503']).toContain(refused.code)

    await pool.query('delete from content.place_categories where place_id = $1', [place])
    await pool.query('delete from content.map_categories where id = $1', [id])
    expect(await count(pool, 'select count(*) from content.map_categories where id = $1', [id])).toBe(0)
  })

  it('[E2.11][AC87] a blog category used by a story group cannot be deleted until the link row is removed', async () => {
    const store = randomUUID()
    const id = await category('blog_categories', store)
    const group = await storyGroup(store)
    await tagStory(group, id, store)

    const refused = await failure(pool.query('delete from content.blog_categories where id = $1', [id]))
    expect(['23001', '23503']).toContain(refused.code)

    await pool.query('delete from content.story_categories where group_id = $1', [group])
    await pool.query('delete from content.blog_categories where id = $1', [id])
    expect(await count(pool, 'select count(*) from content.blog_categories where id = $1', [id])).toBe(0)
  })

  it('[E2.11][AC87] a pin holds two map categories', async () => {
    const store = randomUUID()
    const place = await draftPin(store)

    await tagPin(place, await category('map_categories', store), store)
    await tagPin(place, await category('map_categories', store), store)

    expect(await count(pool, 'select count(*) from content.place_categories where place_id = $1', [place])).toBe(2)
  })

  it('[E2.11][AC87] a story group holds two blog categories', async () => {
    const store = randomUUID()
    const group = await storyGroup(store)

    await tagStory(group, await category('blog_categories', store), store)
    await tagStory(group, await category('blog_categories', store), store)

    expect(await count(pool, 'select count(*) from content.story_categories where group_id = $1', [group])).toBe(2)
  })

  it('[E2.11][AC87] a map category cannot tag a story group and a blog category cannot tag a pin', async () => {
    const store = randomUUID()
    const mapCategory = await category('map_categories', store)
    const blogCategory = await category('blog_categories', store)
    const group = await storyGroup(store)
    const place = await draftPin(store)

    const story = await failure(tagStory(group, mapCategory, store))
    const pin = await failure(tagPin(place, blogCategory, store))

    expect(story).toMatchObject({ code: '23503', constraint: 'story_categories_category_fkey' })
    expect(pin).toMatchObject({ code: '23503', constraint: 'place_categories_category_fkey' })
  })
})

describe('[E2.11][AC87] deleting a pin', () => {
  it('[E2.11][AC87] deleting a draft pin removes its category and date rows', async () => {
    const store = randomUUID()
    const place = await draftPin(store)
    await tagPin(place, await category('map_categories', store), store)
    await pool.query(`insert into content.place_dates (place_id, store_id, first_day, last_day) values ($1, $2, '2026-11-20', '2026-11-21')`, [place, store])

    await pool.query('delete from content.places where id = $1', [place])

    expect(await count(pool, 'select count(*) from content.places where id = $1', [place])).toBe(0)
    expect(await count(pool, 'select count(*) from content.place_categories where place_id = $1', [place])).toBe(0)
    expect(await count(pool, 'select count(*) from content.place_dates where place_id = $1', [place])).toBe(0)
  })

  it('[E2.11][AC87] deleting a published pin that has links is refused and keeps the links', async () => {
    const store = randomUUID()
    const place = await draftPin(store)
    await tagPin(place, await category('map_categories', store), store)
    await pool.query(`insert into content.place_dates (place_id, store_id, first_day, last_day) values ($1, $2, '2026-11-20', '2026-11-21')`, [place, store])
    await publishPin(place)

    const refused = await failure(pool.query('delete from content.places where id = $1', [place]))

    expect(refused.code).toBe('23001')
    expect(refused.message).toContain('cannot be deleted')
    expect(await count(pool, 'select count(*) from content.places where id = $1', [place])).toBe(1)
    expect(await count(pool, 'select count(*) from content.place_categories where place_id = $1', [place])).toBe(1)
    expect(await count(pool, 'select count(*) from content.place_dates where place_id = $1', [place])).toBe(1)
  })
})
