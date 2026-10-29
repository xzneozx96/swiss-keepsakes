import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { seedContent, seedStoryDraft } from '../../scripts/seed-content.ts'
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
  it('[E2.12][E2.13][E2.14][AC30] the seed imports drafts, both languages share one link, and a second run changes nothing', async () => {
    await insertStore(pool, storeId)
    // A prototype slug that already exists in this store: its story is left alone, including the other language.
    const taken = seedStories.find(s => s.versions.en && s.versions.de)!
    const { rows: group } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [storeId])
    await pool.query(
      `insert into content.story_versions (group_id, language, store_id, slug, draft) values ($1, 'en', $2, $3, $4::jsonb)`,
      [group[0]!.id, storeId, taken.slug, JSON.stringify({ ...seedStoryDraft(taken.versions.en!), title: 'Hand-written' })],
    )
    const preExisting = await pool.query(`select md5(t::text) as hash from content.story_versions t where store_id = $1 and slug = $2`, [storeId, taken.slug])
    // Two prototype tour slugs held by other tours: one by its en slug, one by its de slug only. Both tours are skipped.
    const [heldEn, heldDe] = seedTours
    await pool.query(`insert into content.tours (store_id, slug) values ($1, $2::jsonb), ($1, $3::jsonb)`, [storeId, JSON.stringify({ en: heldEn!.slug.en }), JSON.stringify({ de: heldDe!.slug.de })])
    const preTours = await pool.query(`select md5(t::text) as hash from content.tours t where store_id = $1 order by 1`, [storeId])

    const first = await seedContent(db, storeId)
    expect(first).toEqual({ stories: seedStories.length - 1, tours: seedTours.length - 2 })
    const afterFirst = await snapshot()

    const second = await seedContent(db, storeId)
    expect(second).toEqual({ stories: 0, tours: 0 })
    expect(await snapshot()).toEqual(afterFirst)

    const versions = await pool.query<{ status: string, published: unknown, published_at: Date | null, language: string, slug: string, draft: Record<string, unknown>, row_version: number }>(
      `select status, published, published_at, language, slug, draft, row_version from content.story_versions where store_id = $1`,
      [storeId],
    )
    const expected = seedStories.reduce((n, s) => n + Object.keys(s.versions).length, 0) - Object.keys(taken.versions).length + 1
    expect(versions.rows).toHaveLength(expected)
    expect(versions.rows.every(v => v.status === 'draft' && v.published === null && v.published_at === null)).toBe(true)
    expect(versions.rows.filter(v => v.slug === taken.slug)).toHaveLength(1)
    // Both language versions of a seeded story carry the one link (G-E214-SLUG), and a second run left them alone.
    const perGroup = await pool.query<{ links: number, versions: number }>(
      `select count(distinct slug)::int as links, count(*)::int as versions from content.story_versions where store_id = $1 group by group_id`,
      [storeId],
    )
    expect(perGroup.rows.every(g => g.links === 1)).toBe(true)
    expect(perGroup.rows.some(g => g.versions === 2)).toBe(true)
    const after = await pool.query(`select md5(t::text) as hash from content.story_versions t where store_id = $1 and slug = $2`, [storeId, taken.slug])
    expect(after.rows).toEqual(preExisting.rows)

    const tours = await pool.query<{ status: string, published: unknown, slug: Record<string, string>, row_version: number }>(
      `select status, published, slug, row_version from content.tours where store_id = $1`,
      [storeId],
    )
    expect(tours.rows).toHaveLength(seedTours.length)
    const keptTours = await pool.query(`select md5(t::text) as hash from content.tours t where store_id = $1 and md5(t::text) = any($2) order by 1`, [storeId, preTours.rows.map(r => r.hash)])
    expect(keptTours.rows).toEqual(preTours.rows)
    expect(tours.rows.filter(t => t.slug.en === heldEn!.slug.en || t.slug.de === heldDe!.slug.de)).toHaveLength(2)
    expect(tours.rows.every(t => t.status === 'draft' && t.published === null && t.row_version === 1)).toBe(true)
    const stops = await pool.query<{ count: string }>(`select count(*) from content.tour_stops where store_id = $1`, [storeId])
    expect(Number(stops.rows[0]!.count)).toBe(seedTours.slice(2).reduce((n, t) => n + t.stops.length, 0))
    const media = await pool.query<{ count: string }>(`select count(*) from content.media where store_id = $1`, [storeId])
    expect(Number(media.rows[0]!.count)).toBe(0)
  })

  // Runs after the test above, on the rows it seeded (same file, same store, in order).
  it('[E2.13] seeded drafts hold a body document, no intro, sections or readMinutes, and the second run bumped no row_version', async () => {
    const taken = seedStories.find(s => s.versions.en && s.versions.de)!
    const { rows } = await pool.query<{ draft: Record<string, unknown>, row_version: number, slug: string, language: string }>(
      `select draft, row_version, slug, language from content.story_versions where store_id = $1`,
      [storeId],
    )
    const seeded = rows.filter(v => v.slug !== taken.slug || v.language !== 'en')

    expect(seeded.length).toBeGreaterThan(0)
    expect(seeded.every(v => (v.draft.body as { type?: string }).type === 'doc' && !('intro' in v.draft) && !('sections' in v.draft) && !('readMinutes' in v.draft))).toBe(true)
    expect(rows.every(v => v.row_version === 1)).toBe(true)
  })

  it('[E2.14][AC30] no seeded draft holds authorRole, and a third run still changes nothing', async () => {
    const before = await snapshot()
    const { rows } = await pool.query<{ draft: Record<string, unknown> }>(`select draft from content.story_versions where store_id = $1`, [storeId])

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every(v => !('authorRole' in v.draft))).toBe(true)
    expect(await seedContent(db, storeId)).toEqual({ stories: 0, tours: 0 })
    expect(await snapshot()).toEqual(before)
  })
})
