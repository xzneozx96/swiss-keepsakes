import type { TourGuideDoc } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AuditEntry, MediaRow, TourChanges } from '../../../src/modules/content/ports.ts'
import { tourWriteBodySchema } from '@sk/api-contract'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { makeCreateTour } from '../../../src/modules/content/application/create-tour.ts'
import { makeDeleteTour } from '../../../src/modules/content/application/delete-tour.ts'
import { makePublishTour } from '../../../src/modules/content/application/publish-tour.ts'
import { makeSaveTour } from '../../../src/modules/content/application/save-tour.ts'
import { makeUnpublishTour } from '../../../src/modules/content/application/unpublish-tour.ts'
import { createFakeStorage } from '../../support/fake-storage.ts'
import { createFakeTours } from '../../support/fake-tours.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const doc = (en: string): TourGuideDoc => ({ title: { en }, summary: {}, meetingPoint: {}, sections: [] })
const complete: TourChanges = { slug: { en: 'old-town-walk' }, pdfMediaId: 'pdf1', draft: doc('Old town walk') }
const media: MediaRow[] = [
  { id: 'pdf1', kind: 'pdf', status: 'ready' },
  { id: 'img1', kind: 'image', status: 'ready' },
  { id: 'pdf2', kind: 'pdf', status: 'ready' },
]

interface SentJob { queue: string, data: object, options?: { startAfter?: Date } }

function setup(rows: MediaRow[] = media, graceHours = 24) {
  const tours = createFakeTours()
  const audit: AuditEntry[] = []
  const jobs: SentJob[] = []
  const deps = {
    uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) },
    tours,
    media: { find: async (_tx: null, _storeId: string, ids: string[]) => rows.filter(m => ids.includes(m.id)) },
    audit: { record: async (_tx: null, entry: AuditEntry) => void audit.push(entry) },
    jobs: { send: async (_tx: null, queue: string, data: object, options?: { startAfter?: Date }) => void jobs.push({ queue, data, options }) },
    graceHours,
    clock: createManualClock(new Date('2026-10-27T10:00:00Z')),
  }
  return {
    tours,
    audit,
    jobs,
    create: makeCreateTour(deps),
    save: makeSaveTour(deps),
    publish: makePublishTour(deps),
    unpublish: makeUnpublishTour(deps),
    remove: makeDeleteTour(deps),
  }
}

async function created(s: ReturnType<typeof setup>, changes: TourChanges = complete) {
  const result = await s.create(owner, store, changes, null)
  if (!result.ok)
    throw new Error('create failed')
  return result.value
}

const stop = (n: number) => ({ latitude: 47 + n / 100, longitude: 8 + n / 100, title: { en: `Stop ${n}` }, text: {}, minutesFromStart: n * 10, mediaId: null, placeId: null })

describe('tour guide use cases', () => {
  it('[E2.6] AC-1 a tour draft at row_version 3 saved with If-Match 3 returns 4, with 2 is stale and unchanged', async () => {
    const s = setup()
    const tour = await created(s)
    s.tours.rows.set(tour.id, { ...tour, rowVersion: 3 })
    expect(await s.save(owner, store, tour.id, 3, { draft: doc('Renamed') }, null)).toMatchObject({ ok: true, value: { rowVersion: 4, draft: { title: { en: 'Renamed' } } } })
    expect(await s.save(owner, store, tour.id, 2, { draft: doc('Other') }, null)).toEqual({ ok: false, reason: 'stale' })
    expect(s.tours.rows.get(tour.id)).toMatchObject({ rowVersion: 4, draft: { title: { en: 'Renamed' } } })
  })

  it('[E2.6] a PATCH with only draft.summary keeps the stored title, meeting point and sections, and publishes with that title', async () => {
    const s = setup()
    const full = { title: { en: 'Old town walk' }, summary: { en: 'Before' }, meetingPoint: { en: 'Station' }, sections: [{ id: 'a', heading: { en: 'H' }, body: { en: 'B' } }] }
    const tour = await created(s, { ...complete, draft: full })

    const saved = await s.save(owner, store, tour.id, 1, { draft: { summary: { en: 'After' } } }, null)

    expect(saved).toMatchObject({ ok: true, value: { draft: { ...full, summary: { en: 'After' } } } })
    expect(await s.publish(owner, store, tour.id, 2, null)).toMatchObject({ ok: true, value: { status: 'published', published: { title: { en: 'Old town walk' }, summary: { en: 'After' } } } })
  })

  it('[E2.6] a PATCH of a draft field on a tour with no draft starts from empty, and on a published tour from the published text', async () => {
    const s = setup()
    const bare = await created(s, { slug: { en: 'bare' } })
    expect(await s.save(owner, store, bare.id, 1, { draft: { title: { en: 'T' } } }, null)).toMatchObject({ ok: true, value: { draft: { title: { en: 'T' }, summary: {}, meetingPoint: {}, sections: [] } } })

    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.save(owner, store, tour.id, 2, { draft: { summary: { en: 'New' } } }, null)).toMatchObject({ ok: true, value: { draft: { title: { en: 'Old town walk' }, summary: { en: 'New' } }, published: { title: { en: 'Old town walk' } } } })
  })

  it('[E2.6] a save with no draft on a published tour leaves draft null', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)

    const saved = await s.save(owner, store, tour.id, 2, { stayTag: 'multi_day', stops: [stop(1)] }, null)

    expect(saved).toMatchObject({ ok: true, value: { status: 'published', stayTag: 'multi_day', draft: null, published: { title: { en: 'Old town walk' } } } })
    expect(s.tours.rows.get(tour.id)?.draft).toBeNull()
  })

  it('[E2.6] an explicit sections: [] clears the stored sections and keeps the title', async () => {
    const s = setup()
    const tour = await created(s, { ...complete, draft: { ...doc('Old town walk'), sections: [{ id: 'a', heading: { en: 'H' }, body: { en: 'B' } }] } })

    expect(await s.save(owner, store, tour.id, 1, { draft: { sections: [] } }, null)).toMatchObject({ ok: true, value: { draft: { title: { en: 'Old town walk' }, sections: [] } } })
  })

  it('[E2.6] a tour publishes with a slug, a title in one language and a PDF, and writes an audit row', async () => {
    const s = setup()
    const tour = await created(s)
    const result = await s.publish(owner, store, tour.id, 1, 'req-1')
    expect(result).toMatchObject({ ok: true, value: { status: 'published', rowVersion: 2, draft: null, published: { title: { en: 'Old town walk' } } } })
    expect(s.audit).toEqual([{ storeId: store, actor: 'staff:u1', entity: 'tour', entityId: tour.id, action: 'published', before: { status: 'draft' }, after: { status: 'published', rowVersion: 2 }, requestId: 'req-1' }])
  })

  it('[E2.6] a tour with no PDF is incomplete naming pdf', async () => {
    const s = setup()
    const tour = await created(s, { slug: { en: 'a' }, draft: doc('A') })
    expect(await s.publish(owner, store, tour.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['pdf'] })
    expect(s.tours.rows.get(tour.id)).toMatchObject({ status: 'draft', rowVersion: 1 })
    expect(s.audit).toEqual([])
  })

  it('[E2.6] a slug whose languages differ from the title is incomplete naming slug', async () => {
    const s = setup()
    const tour = await created(s, { ...complete, draft: { ...doc('A'), title: { en: 'A', de: 'B' } } })
    expect(await s.publish(owner, store, tour.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
  })

  it('[E2.6][AC30] a never-published tour takes the body slug over the stored one', async () => {
    const s = setup()
    const tour = await created(s)
    expect(await s.publish(owner, store, tour.id, 1, null, { en: 'new-walk' })).toMatchObject({ ok: true, value: { slug: { en: 'new-walk' } } })
  })

  it('[E2.6][AC30] a live English tour gains German: the draft adds the title and the publish carries the German slug', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    await s.save(owner, store, tour.id, 2, { draft: { title: { en: 'Old town walk', de: 'Altstadtrundgang' } } }, null)
    expect(await s.publish(owner, store, tour.id, 3, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    const result = await s.publish(owner, store, tour.id, 3, null, { de: 'altstadtrundgang' })
    expect(result).toMatchObject({ ok: true, value: { slug: { en: 'old-town-walk', de: 'altstadtrundgang' }, published: { title: { en: 'Old town walk', de: 'Altstadtrundgang' } }, draft: null } })
  })

  it('[E2.6][AC30] a draft that drops German takes the German slug with it and English stays live', async () => {
    const s = setup()
    const tour = await created(s, { ...complete, slug: { en: 'a', de: 'b' }, draft: { ...doc('A'), title: { en: 'A', de: 'B' } } })
    await s.publish(owner, store, tour.id, 1, null)
    await s.save(owner, store, tour.id, 2, { draft: { title: { en: 'A' } } }, null)
    expect(await s.publish(owner, store, tour.id, 3, null)).toMatchObject({ ok: true, value: { slug: { en: 'a' }, published: { title: { en: 'A' } } } })
  })

  it('[E2.6][AC68] a live tour refuses a body slug that differs from its stored one as slug-conflict and stays unchanged', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    const before = s.tours.rows.get(tour.id)
    expect(await s.publish(owner, store, tour.id, 2, null, { en: 'renamed' })).toEqual({ ok: false, reason: 'slug-conflict' })
    expect(s.tours.rows.get(tour.id)).toBe(before)
    expect(await s.publish(owner, store, tour.id, 2, null, { en: 'old-town-walk' })).toMatchObject({ ok: true, value: { slug: { en: 'old-town-walk' } } })
  })

  it('[E2.6][AC68] a hidden tour refuses a different body slug as slug-conflict', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    await s.unpublish(owner, store, tour.id, 2, null)
    expect(await s.publish(owner, store, tour.id, 3, null, { en: 'renamed' })).toEqual({ ok: false, reason: 'slug-conflict' })
  })

  it('[E2.6][AC68] a live tour whose draft drops its last title language is incomplete naming title and unchanged', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    await s.save(owner, store, tour.id, 2, { draft: { title: {} } }, null)
    const before = s.tours.rows.get(tour.id)
    expect(await s.publish(owner, store, tour.id, 3, null)).toMatchObject({ ok: false, reason: 'incomplete', gaps: expect.arrayContaining(['title']) })
    expect(s.tours.rows.get(tour.id)).toBe(before)
  })

  it('[E2.6][AC68] a conflicting body slug for a language the draft is dropping is still slug-conflict', async () => {
    const s = setup()
    const tour = await created(s, { ...complete, slug: { en: 'a', de: 'b' }, draft: { ...doc('A'), title: { en: 'A', de: 'B' } } })
    await s.publish(owner, store, tour.id, 1, null)
    await s.save(owner, store, tour.id, 2, { draft: { title: { en: 'A' } } }, null)
    expect(await s.publish(owner, store, tour.id, 3, null, { de: 'other' })).toEqual({ ok: false, reason: 'slug-conflict' })
  })

  it('[E2.6] a draft title that adds a language does not block a PATCH of a live tour that leaves the slug alone', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.save(owner, store, tour.id, 2, { draft: { title: { en: 'Old town walk', de: 'Altstadtrundgang' } } }, null)).toMatchObject({ ok: true })
  })

  it('[E2.6] clearing the PDF of a published tour is incomplete naming pdf', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.save(owner, store, tour.id, 2, { pdfMediaId: null }, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['pdf'] })
    expect(s.tours.rows.get(tour.id)).toMatchObject({ pdfMediaId: 'pdf1', rowVersion: 2 })
  })

  it('[E2.7][AC51] replacing PDF A by B queues one retire job for A that starts after the grace period', async () => {
    const s = setup()
    const tour = await created(s)
    expect(await s.save(owner, store, tour.id, 1, { pdfMediaId: 'pdf2' }, null)).toMatchObject({ ok: true, value: { pdfMediaId: 'pdf2' } })
    expect(s.jobs).toEqual([{ queue: 'media-retire', data: { storeId: store, mediaId: 'pdf1' }, options: { startAfter: new Date('2026-10-28T10:00:00Z') } }])
  })

  it('[E2.7][AC51] the grace period is the configured one', async () => {
    const s = setup(media, 48)
    const tour = await created(s)
    await s.save(owner, store, tour.id, 1, { pdfMediaId: 'pdf2' }, null)
    expect(s.jobs[0]?.options?.startAfter).toEqual(new Date('2026-10-29T10:00:00Z'))
  })

  it('[E2.7][AC51] saving the same PDF id again queues nothing', async () => {
    const s = setup()
    const tour = await created(s)
    await s.save(owner, store, tour.id, 1, { pdfMediaId: 'pdf1', draft: doc('Again') }, null)
    expect(s.jobs).toEqual([])
  })

  it('[E2.7][AC51] clearing the PDF of a draft tour, or saving with no PDF change, queues nothing', async () => {
    const s = setup()
    const tour = await created(s)
    expect(await s.save(owner, store, tour.id, 1, { draft: doc('Other') }, null)).toMatchObject({ ok: true })
    expect(await s.save(owner, store, tour.id, 2, { pdfMediaId: null }, null)).toMatchObject({ ok: true, value: { pdfMediaId: null } })
    expect(s.jobs).toEqual([])
  })

  it('[E2.7][AC51] a refused removal on a published tour queues nothing', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.save(owner, store, tour.id, 2, { pdfMediaId: null }, null)).toMatchObject({ ok: false })
    expect(s.jobs).toEqual([])
  })

  it('[E2.7] setting a first PDF on a tour that had none queues nothing', async () => {
    const s = setup()
    const tour = await created(s, { slug: { en: 'bare' } })
    await s.save(owner, store, tour.id, 1, { pdfMediaId: 'pdf1' }, null)
    expect(s.jobs).toEqual([])
  })

  it('[E2.7][AC51] an upper-case id of the same PDF queues nothing', async () => {
    const s = setup([{ id: 'abc-pdf', kind: 'pdf', status: 'ready' }, ...media])
    const tour = await created(s, { ...complete, pdfMediaId: 'abc-pdf' })
    await s.save(owner, store, tour.id, 1, { pdfMediaId: 'ABC-PDF' }, null)
    expect(s.jobs).toEqual([])
  })

  it('[E2.7][AC51] replacing the PDF of a published tour queues one retire job', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.save(owner, store, tour.id, 2, { pdfMediaId: 'pdf2' }, null)).toMatchObject({ ok: true })
    expect(s.jobs).toEqual([{ queue: 'media-retire', data: { storeId: store, mediaId: 'pdf1' }, options: { startAfter: new Date('2026-10-28T10:00:00Z') } }])
  })

  it('[E2.7][AC51] the old file still answers right after the replacing save, before the grace period', async () => {
    const s = setup()
    const clock = createManualClock(new Date('2026-10-27T10:00:00Z'))
    const storage = createFakeStorage(clock)
    storage.seed('media', 'store-1/pdf1/original.pdf', new Uint8Array([1]))
    const tour = await created(s)
    await s.save(owner, store, tour.id, 1, { pdfMediaId: 'pdf2' }, null)
    expect(s.jobs).toHaveLength(1)
    expect(await storage.head('media', 'store-1/pdf1/original.pdf')).toBeDefined()
  })

  it('[E2.6] a slug that drops a language of a published tour is incomplete naming slug', async () => {
    const s = setup()
    const tour = await created(s, { ...complete, slug: { en: 'a', de: 'b' }, draft: { ...doc('A'), title: { en: 'A', de: 'B' } } })
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.save(owner, store, tour.id, 2, { slug: { en: 'a' } }, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
  })

  it('[E2.6] AC-6 a retired cover, a retired PDF and a retired stop photo are each media-retired and the tour is unchanged', async () => {
    const s = setup([...media, { id: 'old-img', kind: 'image', status: 'retired' }, { id: 'old-pdf', kind: 'pdf', status: 'retired' }])
    const tour = await created(s)
    expect(await s.save(owner, store, tour.id, 1, { coverMediaId: 'old-img' }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(await s.save(owner, store, tour.id, 1, { pdfMediaId: 'old-pdf' }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(await s.save(owner, store, tour.id, 1, { stops: [{ ...stop(1), mediaId: 'old-img' }] }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(await s.create(owner, store, { coverMediaId: 'old-img' }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(s.tours.rows.get(tour.id)).toMatchObject({ coverMediaId: null, pdfMediaId: 'pdf1', stops: [], rowVersion: 1 })
    expect(s.tours.rows.size).toBe(1)
  })

  it('[E2.6] a PDF id that is an image is media-invalid', async () => {
    const s = setup()
    const tour = await created(s)
    expect(await s.save(owner, store, tour.id, 1, { pdfMediaId: 'img1' }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await s.save(owner, store, tour.id, 1, { coverMediaId: 'pdf1' }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await s.save(owner, store, tour.id, 1, { stops: [{ ...stop(1), mediaId: 'missing' }] }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(s.tours.rows.get(tour.id)?.rowVersion).toBe(1)
  })

  it('[E2.6] unpublish returns the tour to draft and keeps the published text', async () => {
    const s = setup()
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    const result = await s.unpublish(owner, store, tour.id, 2, 'req-2')
    expect(result).toMatchObject({ ok: true, value: { status: 'draft', rowVersion: 3, published: { title: { en: 'Old town walk' } } } })
    expect(s.audit.at(-1)).toMatchObject({ entity: 'tour', action: 'unpublished', before: { status: 'published' }, after: { status: 'draft', rowVersion: 3 }, requestId: 'req-2' })
    expect(await s.unpublish(owner, store, tour.id, 3, null)).toEqual({ ok: false, reason: 'not-published' })
  })

  // Gate G-S5-TOURDELETE (owner): only a never-published tour can be deleted; a once-published tour gets 409.
  it('[E2.6][AC79] a draft tour is deleted, a published or unpublished-after-publish tour is published-cannot-be-deleted', async () => {
    const s = setup()
    const draft = await created(s)
    expect(await s.remove(owner, store, draft.id, 1, null)).toEqual({ ok: true, value: { id: draft.id } })
    expect(s.tours.rows.has(draft.id)).toBe(false)
    const tour = await created(s)
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.remove(owner, store, tour.id, 2, null)).toEqual({ ok: false, reason: 'published-cannot-be-deleted' })
    await s.unpublish(owner, store, tour.id, 2, null)
    expect(await s.remove(owner, store, tour.id, 3, null)).toEqual({ ok: false, reason: 'published-cannot-be-deleted' })
    expect(s.tours.rows.has(tour.id)).toBe(true)
  })

  it('[E2.6][AC79] a delete with a stale If-Match is stale and the tour stays, even a published one (stale before published-cannot-be-deleted)', async () => {
    const s = setup()
    const tour = await created(s)
    expect(await s.remove(owner, store, tour.id, 2, null)).toEqual({ ok: false, reason: 'stale' })
    expect(s.tours.rows.has(tour.id)).toBe(true)
    await s.publish(owner, store, tour.id, 1, null)
    expect(await s.remove(owner, store, tour.id, 1, null)).toEqual({ ok: false, reason: 'stale' })
  })

  it('[E2.6] a save with 51 stops is refused by the schema, and a save with 3 stops keeps their order and coordinates', async () => {
    const s = setup()
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ latitude: 47, longitude: 8, title: { en: `s${i}` } }))
    expect(tourWriteBodySchema.safeParse({ stops: tooMany }).success).toBe(false)
    const tour = await created(s)
    const result = await s.save(owner, store, tour.id, 1, { stops: [stop(3), stop(1), stop(2)] }, null)
    expect(result.ok && result.value.stops.map(x => [x.position, x.latitude, x.longitude])).toEqual([[1, 47.03, 8.03], [2, 47.01, 8.01], [3, 47.02, 8.02]])
  })

  it('[E2.6] a member of another store\'s tour id is not-found', async () => {
    const s = setup()
    const tour = await created(s)
    const other: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([['store-2', 'owner']]) }
    expect(await s.save(other, 'store-2', tour.id, 1, { stayTag: 'multi_day' }, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.publish(other, 'store-2', tour.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.unpublish(other, 'store-2', tour.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.remove(other, 'store-2', tour.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.6] AC-7 an outsider is forbidden', async () => {
    const s = setup()
    const tour = await created(s)
    const failures = [
      await s.create(outsider, store, complete, null),
      await s.save(outsider, store, tour.id, 1, { stayTag: 'multi_day' }, null),
      await s.publish(outsider, store, tour.id, 1, null),
      await s.unpublish(outsider, store, tour.id, 1, null),
      await s.remove(outsider, store, tour.id, 1, null),
      await s.create({ kind: 'anonymous' }, store, complete, null),
    ]
    expect(failures).toEqual(Array.from<unknown>({ length: 6 }).fill({ ok: false, reason: 'forbidden' }))
    expect(s.tours.rows.size).toBe(1)
    expect(s.tours.rows.get(tour.id)?.rowVersion).toBe(1)
    expect(s.audit).toEqual([])
  })

  it('[E2.6] a tour write has no price or departure field', () => {
    expectTypeOf<TourChanges>().not.toHaveProperty('price')
    expectTypeOf<TourChanges>().not.toHaveProperty('departure')
    expectTypeOf<TourChanges>().not.toHaveProperty('departureAt')
    expect(tourWriteBodySchema.safeParse({ price: 100 }).success).toBe(false)
    expect(tourWriteBodySchema.safeParse({ departureAt: '2026-11-01T10:00:00Z' }).success).toBe(false)
  })
})
