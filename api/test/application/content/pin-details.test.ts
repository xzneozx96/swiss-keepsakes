import type { Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AuditEntry, MediaRow, PinChanges } from '../../../src/modules/content/ports.ts'
import { pinListStatus } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeCreatePin } from '../../../src/modules/content/application/create-pin.ts'
import { makeGetMerchantPin, makeListMerchantPins, makeListPinStoryOptions } from '../../../src/modules/content/application/list-pins.ts'
import { makePublishPin } from '../../../src/modules/content/application/publish-pin.ts'
import { makeSavePin } from '../../../src/modules/content/application/save-pin.ts'
import { createFakePins } from '../../support/fake-pins.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const complete: PinChanges = { title: { en: 'Chapel Bridge' }, slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3 }
const image = (id: string): MediaRow => ({ id, kind: 'image', status: 'ready' })

function setup(media: MediaRow[] = [], now = '2026-11-12T11:00:00Z') {
  const pins = createFakePins()
  const clock = createManualClock(new Date(now))
  const deps = {
    uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) },
    pins,
    media: { find: async (_tx: null, _storeId: string, ids: string[]) => media.filter(m => ids.includes(m.id)) },
    audit: { record: async (_tx: null, _entry: AuditEntry) => {} },
    clock,
  }
  return {
    pins,
    clock,
    create: makeCreatePin(deps),
    save: makeSavePin(deps),
    publish: makePublishPin(deps),
    list: makeListMerchantPins(deps),
    get: makeGetMerchantPin(deps),
    options: makeListPinStoryOptions(deps),
  }
}

async function created(s: ReturnType<typeof setup>, changes: PinChanges = complete): Promise<Pin> {
  const result = await s.create(owner, store, changes, null)
  if (!result.ok)
    throw new Error('create failed')
  return result.value
}

describe('[E4.2][AC86] the merchant list status follows the dates', () => {
  const published = (dates: Pin['dates']) => ({ status: 'published' as const, dates })
  const entry = (firstDay: string, lastDay: string, startTime: string | null = null, endTime: string | null = null) => ({ id: 'd', firstDay, lastDay, startTime, endTime })

  it.each([
    ['inside a range', [entry('2026-11-09', '2026-11-14')], '2026-11-12T11:00:00Z', 'published'],
    ['the minute after the range', [entry('2026-11-09', '2026-11-14')], '2026-11-14T23:00:00Z', 'ended'],
    ['a late event with no end, 23:59 Zurich', [entry('2026-11-14', '2026-11-14', '22:00')], '2026-11-14T22:59:00Z', 'published'],
    ['a late event with no end, 00:00 Zurich next day', [entry('2026-11-14', '2026-11-14', '22:00')], '2026-11-14T23:00:00Z', 'ended'],
    ['a later entry still ahead', [entry('2026-11-01', '2026-11-02'), entry('2026-12-01', '2026-12-01')], '2026-11-12T11:00:00Z', 'published'],
    ['no dates at all', [], '2090-01-01T00:00:00Z', 'published'],
  ] as const)('%s is %s', (_what, dates, now, status) => {
    expect(pinListStatus(published([...dates]), new Date(now))).toBe(status)
  })

  it('[E4.2][AC86] a draft or hidden pin keeps its status even when its dates are over', () => {
    expect(pinListStatus({ status: 'draft', dates: [entry('2020-01-01', '2020-01-01')] }, new Date('2026-11-12T11:00:00Z'))).toBe('draft')
    expect(pinListStatus({ status: 'hidden', dates: [entry('2020-01-01', '2020-01-01')] }, new Date('2026-11-12T11:00:00Z'))).toBe('hidden')
  })
})

describe('[E4.2][AC68] list and read of the signed-in store', () => {
  it('[E4.2][AC68] lists only the pins of the store, with the draft title, languages, next date and a story warning', async () => {
    const s = setup()
    const withDates = await created(s, { ...complete, dates: [{ firstDay: '2026-11-09', lastDay: '2026-11-14', startTime: null, endTime: null }], mainStoryGroupId: 'g' })
    await s.create({ ...owner, stores: new Map([['store-2', 'owner']]) }, 'store-2', { title: { en: 'Other store' } }, null)

    const listed = await s.list(owner, store)

    expect(listed).toMatchObject({ ok: true })
    if (!listed.ok)
      return
    expect(listed.value).toHaveLength(1)
    expect(listed.value[0]).toMatchObject({ id: withDates.id, status: 'draft', title: { en: 'Chapel Bridge' }, located: true, hasDates: true, nextDate: { firstDay: '2026-11-09' }, mainStory: { groupId: 'g', published: true } })
  })

  it('[E4.2][AC86] a published pin whose last date has passed lists as ended', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, dates: [{ firstDay: '2026-11-09', lastDay: '2026-11-14', startTime: null, endTime: null }] })
    await s.publish(owner, store, pin.id, 1, null)
    s.clock.advance(new Date('2026-11-15T00:00:00Z').getTime() - s.clock.now().getTime())

    const listed = await s.list(owner, store)

    expect(listed).toMatchObject({ ok: true, value: [{ id: pin.id, status: 'ended', hasPendingChanges: false, nextDate: null }] })
  })

  it('[E4.2][AC68] a live pin with a new draft says it has pending changes', async () => {
    const s = setup()
    const pin = await created(s)
    const live = await s.publish(owner, store, pin.id, 1, null)
    if (!live.ok)
      throw new Error('publish failed')
    await s.save(owner, store, pin.id, live.value.rowVersion, { title: { en: 'Chapel Bridge, Lucerne' } }, null)

    expect(await s.list(owner, store)).toMatchObject({ ok: true, value: [{ status: 'published', hasPendingChanges: true, title: { en: 'Chapel Bridge, Lucerne' } }] })
  })

  it('[E4.2][AC68] a member of another store gets forbidden, and a pin id of another store is not found', async () => {
    const s = setup()
    const pin = await created(s)

    expect(await s.list(outsider, store)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.get(outsider, store, pin.id)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.options(outsider, store)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.get(owner, store, 'nope')).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.get({ ...owner, stores: new Map([['store-2', 'owner']]) }, 'store-2', pin.id)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.get(owner, store, pin.id)).toMatchObject({ ok: true, value: { id: pin.id, storeId: store } })
  })
})

describe('[E4.2][AC68] the pin details on create and save', () => {
  it('[E4.2][AC68] a new pin belongs to the creating store, has no type, and defaults the home fields', async () => {
    const s = setup()
    const pin = await created(s)

    expect(pin).toMatchObject({ storeId: store, serviceType: null, mustVisit: false, foodKind: null, photos: [], outboundUrl: null, coverAlt: {} })
    expect('type' in pin).toBe(false)
  })

  it('[E4.2][AC68] the home fields are stored and the local tip joins the draft document', async () => {
    const s = setup()
    const pin = await created(s)

    const saved = await s.save(owner, store, pin.id, 1, { serviceType: 'water', mustVisit: true, foodKind: 'cafe-bakery', localTip: { en: 'Go before 9', de: 'Vor 9 Uhr' } }, null)

    expect(saved).toMatchObject({ ok: true, value: { serviceType: 'water', mustVisit: true, foodKind: 'cafe-bakery', draft: { title: { en: 'Chapel Bridge' }, localTip: { en: 'Go before 9', de: 'Vor 9 Uhr' } } } })
  })

  it('[E4.2][AC63] changing the outbound link replaces it and null removes it', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, outboundUrl: 'https://hotel.example/a' })
    const second = await s.save(owner, store, pin.id, 1, { outboundUrl: 'https://hotel.example/b' }, null)
    expect(second).toMatchObject({ ok: true, value: { outboundUrl: 'https://hotel.example/b' } })

    const third = await s.save(owner, store, pin.id, 2, { outboundUrl: null }, null)
    expect(third).toMatchObject({ ok: true, value: { outboundUrl: null } })
  })

  it('[E4.2][AC68] extra photos must be images of the store: another store, a PDF or a retired file is refused', async () => {
    const s = setup([image('m1'), image('m2'), { id: 'p1', kind: 'pdf', status: 'ready' }, { id: 'r1', kind: 'image', status: 'retired' }])

    const good = await s.create(owner, store, { ...complete, coverMediaId: 'm1', photos: [{ mediaId: 'm2', alt: { en: 'The bridge' } }] }, null)
    expect(good).toMatchObject({ ok: true, value: { coverMediaId: 'm1', photos: [{ mediaId: 'm2', alt: { en: 'The bridge' } }] } })
    expect(await s.create(owner, store, { ...complete, photos: [{ mediaId: 'unknown', alt: {} }] }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await s.create(owner, store, { ...complete, photos: [{ mediaId: 'p1', alt: {} }] }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await s.create(owner, store, { ...complete, photos: [{ mediaId: 'r1', alt: {} }] }, null)).toEqual({ ok: false, reason: 'media-retired' })
  })

  it('[E4.2][AC68] photos replace the list in the order given', async () => {
    const s = setup([image('m1'), image('m2'), image('m3')])
    const pin = await created(s, { ...complete, photos: [{ mediaId: 'm1', alt: {} }, { mediaId: 'm2', alt: {} }, { mediaId: 'm3', alt: {} }] })

    const saved = await s.save(owner, store, pin.id, 1, { photos: [{ mediaId: 'm3', alt: { de: 'Brücke' } }, { mediaId: 'm1', alt: {} }, { mediaId: 'm2', alt: {} }] }, null)

    expect(saved).toMatchObject({ ok: true, value: { photos: [{ mediaId: 'm3', alt: { de: 'Brücke' } }, { mediaId: 'm1' }, { mediaId: 'm2' }] } })
  })
})

describe('[E4.2][AC85][AC68] publish', () => {
  it('[E4.2][AC85] a pin with no story and no category publishes', async () => {
    const s = setup()
    const pin = await created(s)

    expect(pin.mainStoryGroupId).toBeNull()
    expect(pin.categoryIds).toEqual([])
    expect(await s.publish(owner, store, pin.id, 1, null)).toMatchObject({ ok: true, value: { status: 'published', mainStoryGroupId: null } })
  })

  it.each([
    ['a title in German only', { title: { de: 'Kapellbrücke' }, slug: { de: 'kapellbruecke' }, latitude: 47.05, longitude: 8.3 }, undefined],
  ])('[E4.2][AC68] %s publishes', async (_what, changes) => {
    const s = setup()
    const pin = await created(s, changes)

    expect(await s.publish(owner, store, pin.id, 1, null)).toMatchObject({ ok: true })
  })

  it.each([
    ['no location', { title: { en: 'A' }, slug: { en: 'a' } }, ['location']],
    ['no slug', { title: { en: 'A' }, latitude: 47, longitude: 8 }, ['slug']],
    ['no title', { slug: { en: 'a' }, latitude: 47, longitude: 8 }, ['title']],
  ] as const)('[E4.2][AC68] %s is refused and names the gap', async (_what, changes, gaps) => {
    const s = setup()
    const pin = await created(s, { ...changes })

    expect(await s.publish(owner, store, pin.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps })
  })
})
