import type { TourPageKey } from '../../src/modules/content/read-ports.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createPublicReadRepository } from '../../src/modules/content/adapters/public-repository.ts'
import { makeGetTour, makeListTours } from '../../src/modules/content/application/read-tours.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

// ADR-033: the tour list pages by keyset over the tour id. The list is global and test files share one database, so a test
// compares the ids it made, in the order of a full read, and never the whole list (other files may insert tours meanwhile).
const deps = { uow: createUnitOfWork(db), reads: createPublicReadRepository(), clock: systemClock, publicUrl: (key: string) => `https://media.test/${key}` }
const list = makeListTours(deps)
const getTour = makeGetTour(deps)

async function tour(store: string, stops: number): Promise<{ id: string, slug: string }> {
  const slug = `t-${randomUUID().slice(0, 8)}`
  const doc = { title: { en: 'Walk' }, summary: { en: 'S' }, meetingPoint: { en: 'M' }, sections: [] }
  const pdf = (await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'pdf', $2, 'application/pdf', 10, repeat('a', 64), 'ready') returning id`,
    [store, `${store}/${randomUUID()}`],
  )).rows[0]!.id
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.tours (store_id, status, slug, pdf_media_id, published, duration_minutes) values ($1, 'published', $2, $3, $4, 90) returning id`,
    [store, JSON.stringify({ en: slug }), pdf, JSON.stringify(doc)],
  )
  for (let position = 1; position <= stops; position += 1) {
    await pool.query(
      `insert into content.tour_stops (tour_id, store_id, position, latitude, longitude, content, minutes_from_start) values ($1, $2, $3, 47.05, 8.3, '{"title":{"en":"Stop"},"text":{"en":"Text"}}', 0)`,
      [rows[0]!.id, store, position],
    )
  }
  return { id: rows[0]!.id, slug }
}

describe('the public tour list pages by keyset', () => {
  it('[ADR-033] walking with a small limit gives the same ids, in the same order, as a full read, each once', async () => {
    const store = randomUUID()
    const made: string[] = []
    for (let index = 0; index < 7; index += 1)
      made.push((await tour(store, 0)).id)

    const whole = (await list({ language: 'en' })).items.map(i => i.id)
    const walked: string[] = []
    const totals: number[] = []
    let after: TourPageKey | null = null
    do {
      const found: Awaited<ReturnType<typeof list>> = await list({ language: 'en', limit: 3, after: after ?? undefined })
      walked.push(...found.items.map(i => i.id))
      totals.push(found.total)
      after = found.next
    } while (after)

    expect(walked.filter(id => made.includes(id))).toEqual(whole.filter(id => made.includes(id)))
    expect(new Set(walked).size).toBe(walked.length)
    expect(made.every(id => walked.includes(id))).toBe(true)
    expect(walked.filter(id => made.includes(id))).toEqual([...made].reverse())
    expect(totals.every(total => total >= 7)).toBe(true)
  })

  it('[ADR-033] stopCount of the list card equals the length of the stops of the detail', async () => {
    const store = randomUUID()
    const three = await tour(store, 3)
    const none = await tour(store, 0)

    const cards = (await list({ language: 'en' })).items
    const detailThree = await getTour(three.slug, 'en')
    const detailNone = await getTour(none.slug, 'en')

    expect(cards.find(c => c.id === three.id)?.stopCount).toBe(3)
    expect(cards.find(c => c.id === none.id)?.stopCount).toBe(0)
    expect(detailThree.ok && [detailThree.value.stopCount, detailThree.value.stops.length]).toEqual([3, 3])
    expect(detailNone.ok && [detailNone.value.stopCount, detailNone.value.stops.length]).toEqual([0, 0])
  })
})
