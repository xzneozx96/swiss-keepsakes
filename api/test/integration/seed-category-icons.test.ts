import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { categorySpecs, iconStep } from '../../scripts/seed-curated.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await pool.end()
})

async function rows(store: string) {
  return (await pool.query<{ slug: string, icon: string | null, updated_at: Date, show_on_home: boolean }>(
    `select slug, icon, updated_at, show_on_home from content.map_categories where store_id = $1 order by slug`,
    [store],
  )).rows
}

describe('[E4.13][AC7] the seed icon step adds an icon and never overwrites one', () => {
  it('[E4.13][AC7] sets the icon of the seeded categories that have none, keeps the one a merchant chose, changes no other column, and a second run changes nothing', async () => {
    const store = randomUUID()
    const other = randomUUID()
    const insert = (storeId: string, slug: string, en: string, icon: string | null) => pool.query(
      `insert into content.map_categories (store_id, name, slug, icon) values ($1, $2::jsonb, $3, $4)`,
      [storeId, JSON.stringify({ en }), slug, icon],
    )
    await insert(store, 'toilets', 'Toilets', null)
    await insert(store, 'water', 'Drinking water', 'lake')
    // Found by its English name when the slug differs.
    await insert(store, 'my-churches', 'Churches', null)
    // In the seed table but with no icon of its own, and not in the seed at all: both stay without.
    await insert(store, 'sights', 'Sights', null)
    await insert(store, 'my-own', 'My own', null)
    // Another store is not touched by a run for this store.
    await insert(other, 'toilets', 'Toilets', null)
    const before = await rows(store)

    expect(await iconStep(pool, store, true)).toBe(2)
    expect(await rows(store)).toEqual(before)

    expect(await iconStep(pool, store, false)).toBe(2)
    const after = await rows(store)
    expect(after.map(row => [row.slug, row.icon])).toEqual([
      ['my-churches', 'church'],
      ['my-own', null],
      ['sights', null],
      ['toilets', 'toilet'],
      ['water', 'lake'],
    ])
    // Only the icon changed: the other columns, updated_at too.
    expect(after.map(({ icon: _icon, ...rest }) => rest)).toEqual(before.map(({ icon: _icon, ...rest }) => rest))
    expect((await rows(other))[0]!.icon).toBeNull()

    const snapshot = await rows(store)
    expect(await iconStep(pool, store, false)).toBe(0)
    expect(await rows(store)).toEqual(snapshot)
    expect(categorySpecs.find(spec => spec.slug === 'water')!.icon).toBe('water')
  })
})
