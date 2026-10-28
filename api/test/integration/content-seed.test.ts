import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { seedContent } from '../../scripts/seed-content.ts'
import { seedStories } from '../../scripts/seed-data/stories.ts'
import { seedTours } from '../../scripts/seed-data/tours.ts'
import { insertStore } from '../support/identity-wiring.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 180_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

// Slugs are unique across all stores, so this is the only test file that seeds, and it seeds a store of its own.
const storeId = randomUUID()

async function snapshot(): Promise<Record<string, string>> {
  const tables = ['story_groups', 'story_versions', 'tours', 'tour_stops']
  const result: Record<string, string> = {}
  for (const table of tables) {
    const { rows } = await pool.query<{ hash: string }>(
      `select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) as hash from content.${table} t where store_id = $1`,
      [storeId],
    )
    result[table] = rows[0]!.hash
  }
  return result
}

describe('db:seed', () => {
  it('[E2.12] the seed imports drafts and a second run changes nothing', async () => {
    await insertStore(pool, storeId)
    // A prototype slug that already exists in this store: its story is left alone, including the other language.
    const taken = seedStories.find(s => s.versions.en && s.versions.de)!
    const { rows: group } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [storeId])
    await pool.query(
      `insert into content.story_versions (group_id, language, store_id, slug, draft) values ($1, 'en', $2, $3, $4::jsonb)`,
      [group[0]!.id, storeId, taken.slug, JSON.stringify({ ...taken.versions.en, title: 'Hand-written' })],
    )
    const preExisting = await pool.query(`select md5(t::text) as hash from content.story_versions t where store_id = $1 and slug = $2`, [storeId, taken.slug])

    const first = await seedContent(db, storeId)
    expect(first).toEqual({ stories: seedStories.length - 1, tours: seedTours.length })
    const afterFirst = await snapshot()

    const second = await seedContent(db, storeId)
    expect(second).toEqual({ stories: 0, tours: 0 })
    expect(await snapshot()).toEqual(afterFirst)

    const versions = await pool.query<{ status: string, published: unknown, published_at: Date | null, language: string, slug: string }>(
      `select status, published, published_at, language, slug from content.story_versions where store_id = $1`,
      [storeId],
    )
    const expected = seedStories.reduce((n, s) => n + Object.keys(s.versions).length, 0) - Object.keys(taken.versions).length + 1
    expect(versions.rows).toHaveLength(expected)
    expect(versions.rows.every(v => v.status === 'draft' && v.published === null && v.published_at === null)).toBe(true)
    expect(versions.rows.filter(v => v.slug === taken.slug)).toHaveLength(1)
    const after = await pool.query(`select md5(t::text) as hash from content.story_versions t where store_id = $1 and slug = $2`, [storeId, taken.slug])
    expect(after.rows).toEqual(preExisting.rows)

    const tours = await pool.query<{ status: string, published: unknown, slug: Record<string, string>, row_version: number }>(
      `select status, published, slug, row_version from content.tours where store_id = $1`,
      [storeId],
    )
    expect(tours.rows).toHaveLength(seedTours.length)
    expect(tours.rows.every(t => t.status === 'draft' && t.published === null && t.row_version === 1)).toBe(true)
    const stops = await pool.query<{ count: string }>(`select count(*) from content.tour_stops where store_id = $1`, [storeId])
    expect(Number(stops.rows[0]!.count)).toBe(seedTours.reduce((n, t) => n + t.stops.length, 0))
    const media = await pool.query<{ count: string }>(`select count(*) from content.media where store_id = $1`, [storeId])
    expect(Number(media.rows[0]!.count)).toBe(0)
  })
})
