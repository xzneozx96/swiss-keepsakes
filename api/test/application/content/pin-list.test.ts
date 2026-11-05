import type { Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AuditEntry, PinChanges, PinListQuery } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeCreatePin } from '../../../src/modules/content/application/create-pin.ts'
import { makeListMerchantPins, makeListPinStoryOptions } from '../../../src/modules/content/application/list-pins.ts'
import { makePublishPin } from '../../../src/modules/content/application/publish-pin.ts'
import { makeSavePin } from '../../../src/modules/content/application/save-pin.ts'
import { createFakePins } from '../../support/fake-pins.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const query = (over: Partial<PinListQuery> = {}): PinListQuery => ({ status: [], category: [], stay: [], type: [], sort: 'edited', page: 1, pageSize: 20, ...over })
const [museum, oldTown] = ['0190f0c2-0000-7000-8000-0000000000a1', '0190f0c2-0000-7000-8000-0000000000a2']
const day = [{ firstDay: '2026-11-09', lastDay: '2026-11-14', startTime: null, endTime: null }]

function setup() {
  const pins = createFakePins()
  const clock = createManualClock(new Date('2026-11-12T11:00:00Z'))
  const deps = {
    uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) },
    pins,
    media: { find: async () => [] },
    audit: { record: async (_tx: null, _entry: AuditEntry) => {} },
    clock,
  }
  return { pins, clock, create: makeCreatePin(deps), save: makeSavePin(deps), publish: makePublishPin(deps), list: makeListMerchantPins(deps), options: makeListPinStoryOptions(deps) }
}

// Ten pins. p0 is the oldest edit. Even ones are places, odd ones events (dates). p2 "Lion Wall" and p3 "Löwen Wall" (German only).
async function ten() {
  const s = setup()
  const ids: string[] = []
  for (let i = 0; i < 10; i += 1) {
    const title = i === 2 ? { en: 'Lion Wall' } : i === 3 ? { de: 'Löwen Wall' } : { en: `Pin ${i}` }
    const changes: PinChanges = { title, latitude: 47.05, longitude: 8.3, stayTag: i < 4 ? 'short_stay' : 'both', categoryIds: i % 3 === 0 ? [museum] : i % 3 === 1 ? [oldTown] : [], ...(i % 2 === 1 ? { dates: day } : {}) }
    const made = await s.create(owner, store, changes, null) as { ok: true, value: Pin }
    ids.push(made.value.id)
    s.clock.advance(60_000)
  }
  // Publish p4 (a place) and p5 (an event, still running); p7 (an event) is published and its dates are over.
  for (const index of [4, 5, 7]) {
    await s.publish(owner, store, ids[index]!, 1, null)
    s.clock.advance(60_000)
  }
  s.pins.rows.set(ids[7]!, { ...s.pins.rows.get(ids[7]!)!, dates: [{ id: 'd', firstDay: '2026-11-01', lastDay: '2026-11-02', startTime: null, endTime: null }] })
  s.pins.categoryParents.set(oldTown, museum)
  return { ...s, ids }
}

describe('[ADR-033] pin list pages', () => {
  it('answers one page with the total, newest edit first, and the id as the last sort key', async () => {
    const s = await ten()

    const result = await s.list(owner, store, query({ page: 2, pageSize: 4 }))

    expect(result.ok && result.value).toMatchObject({ total: 10, page: 2, pageSize: 4 })
    expect(result.ok && result.value.entries.map(e => e.id)).toEqual([s.ids[8], s.ids[6], s.ids[3], s.ids[2]])
  })

  it('a page past the end has no entries and the real total and counts', async () => {
    const s = await ten()

    const result = await s.list(owner, store, query({ page: 9, pageSize: 10 }))

    expect(result.ok && result.value).toMatchObject({ entries: [], total: 10, statuses: { draft: 7, published: 2, hidden: 0, ended: 1 } })
  })

  it('the status filter works on the derived status, so an ended pin is found under ended and not under published', async () => {
    const s = await ten()

    const ended = await s.list(owner, store, query({ status: ['ended'] }))
    const published = await s.list(owner, store, query({ status: ['published'] }))

    expect(ended.ok && ended.value.entries.map(e => e.id)).toEqual([s.ids[7]])
    expect(published.ok && published.value.entries.map(e => e.id)).toEqual([s.ids[5], s.ids[4]])
    expect(published.ok && published.value.total).toBe(2)
  })

  it('stay, type and category filters narrow together, and a group is an OR among its options', async () => {
    const s = await ten()

    const stay = await s.list(owner, store, query({ stay: ['short_stay'] }))
    const events = await s.list(owner, store, query({ type: ['event'] }))
    const both = await s.list(owner, store, query({ type: ['event'], stay: ['short_stay'] }))
    const either = await s.list(owner, store, query({ category: [museum, 'none'] }))

    expect(stay.ok && stay.value.total).toBe(4)
    expect(events.ok && events.value.total).toBe(5)
    expect(both.ok && both.value.entries.map(e => e.id)).toEqual([s.ids[3], s.ids[1]])
    expect(either.ok && either.value.entries.map(e => e.id).sort()).toEqual([s.ids[0], s.ids[2], s.ids[3], s.ids[5], s.ids[6], s.ids[8], s.ids[9]].sort())
  })

  it('the search matches the title of either language in any case', async () => {
    const s = await ten()

    const result = await s.list(owner, store, query({ q: 'WALL' }))

    expect(result.ok && result.value.entries.map(e => e.id)).toEqual([s.ids[3], s.ids[2]])
    expect(result.ok && result.value.total).toBe(2)
  })

  it('each facet count applies the search and the other groups but not its own ticks', async () => {
    const s = await ten()

    const result = await s.list(owner, store, query({ status: ['published'], stay: ['short_stay'], q: 'pin' }))

    // Statuses ignore the status tick: the stay and the search still apply (p0, p1 are short stay and drafts; p2, p3 do not match "pin").
    expect(result.ok && result.value.statuses).toEqual({ draft: 2, published: 0, hidden: 0, ended: 0 })
    // Stays ignore the stay tick: published pins that match "pin" are p4, p5.
    expect(result.ok && result.value.stays).toEqual({ short_stay: 0, multi_day: 0, both: 2 })
    expect(result.ok && result.value.total).toBe(0)
  })

  it('a category counts the pins in it and in its children, and none counts the pins with no category', async () => {
    const s = await ten()

    const result = await s.list(owner, store, query())

    // museum: p0, p3, p6, p9. oldTown (a child of museum): p1, p4, p7. none: p2, p5, p8.
    expect(result.ok && result.value.categories).toEqual({ [museum]: 7, [oldTown]: 3, none: 3 })
    expect(result.ok && result.value.types).toEqual({ place: 5, event: 5 })
  })

  it('a member of another store is forbidden, and only this store\'s pins are listed', async () => {
    const s = await ten()
    await s.create({ ...owner, stores: new Map([['store-2', 'owner']]) }, 'store-2', { title: { en: 'Other' } }, null)

    const mine = await s.list(owner, store, query())

    expect(await s.list({ ...owner, stores: new Map([['store-2', 'owner']]) }, store, query())).toEqual({ ok: false, reason: 'forbidden' })
    expect(mine.ok && mine.value.total).toBe(10)
  })

  it('the story picker passes its search to the repository, and is forbidden for another store', async () => {
    const s = setup()

    const found = await s.options(owner, store, { q: 'wall', groupId: museum, limit: 10 })

    expect(found).toEqual({ ok: true, value: [] })
    expect(s.pins.optionQueries).toEqual([{ q: 'wall', groupId: museum, limit: 10 }])
    expect(await s.options({ ...owner, stores: new Map([['store-2', 'owner']]) }, store, { limit: 10 })).toEqual({ ok: false, reason: 'forbidden' })
  })
})
