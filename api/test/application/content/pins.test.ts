import type { Actor } from '@sk/domain/identity'
import type { AuditEntry, MediaRow, PinChanges } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeCreatePin } from '../../../src/modules/content/application/create-pin.ts'
import { makeDeletePin } from '../../../src/modules/content/application/delete-pin.ts'
import { makeHidePin } from '../../../src/modules/content/application/hide-pin.ts'
import { makePublishPin } from '../../../src/modules/content/application/publish-pin.ts'
import { makeSavePin } from '../../../src/modules/content/application/save-pin.ts'
import { createFakePins } from '../../support/fake-pins.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const complete: PinChanges = { title: { en: 'Chapel Bridge' }, latitude: 47.05, longitude: 8.3 }

function setup(media: MediaRow[] = []) {
  const pins = createFakePins()
  const audit: AuditEntry[] = []
  const deps = {
    uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) },
    pins,
    media: { find: async (_tx: null, _storeId: string, ids: string[]) => media.filter(m => ids.includes(m.id)) },
    audit: { record: async (_tx: null, entry: AuditEntry) => void audit.push(entry) },
    clock: createManualClock(new Date('2026-10-27T10:00:00Z')),
  }
  return {
    pins,
    audit,
    create: makeCreatePin(deps),
    save: makeSavePin(deps),
    publish: makePublishPin(deps),
    hide: makeHidePin(deps),
    remove: makeDeletePin(deps),
  }
}

async function created(s: ReturnType<typeof setup>, changes: PinChanges = complete) {
  const result = await s.create(owner, store, changes, null)
  if (!result.ok)
    throw new Error('create failed')
  return result.value
}

describe('pin use cases', () => {
  it('[E2.6] AC-1 a pin draft at row_version 3 saved with If-Match 3 is updated and returns row_version 4', async () => {
    const s = setup()
    const pin = await created(s)
    s.pins.rows.set(pin.id, { ...pin, rowVersion: 3 })
    const result = await s.save(owner, store, pin.id, 3, { title: { en: 'Kapellbruecke' } }, null)
    expect(result).toMatchObject({ ok: true, value: { rowVersion: 4, draft: { title: { en: 'Kapellbruecke' } } } })
  })

  it('[E2.6] AC-1 a save with If-Match 2 is stale and leaves the draft unchanged', async () => {
    const s = setup()
    const pin = await created(s)
    s.pins.rows.set(pin.id, { ...pin, rowVersion: 3 })
    const result = await s.save(owner, store, pin.id, 2, { title: { en: 'Other' } }, null)
    expect(result).toEqual({ ok: false, reason: 'stale' })
    expect(s.pins.rows.get(pin.id)).toMatchObject({ rowVersion: 3, draft: { title: { en: 'Chapel Bridge' } } })
  })

  it('[E2.6][AC85] a pin draft with a title in one language, a location and a slug publishes with no story and no category, writes one audit row and has no main story', async () => {
    const s = setup()
    const pin = await created(s)
    const result = await s.publish(owner, store, pin.id, 1, 'req-1')
    expect(result).toMatchObject({ ok: true, value: { status: 'published', rowVersion: 2, mainStoryGroupId: null, categoryIds: [], draft: null, published: { title: { en: 'Chapel Bridge' } } } })
    expect(s.audit).toEqual([{ storeId: store, actor: 'staff:u1', entity: 'pin', entityId: pin.id, action: 'published', before: { status: 'draft' }, after: { status: 'published', rowVersion: 2 }, requestId: 'req-1' }])
  })

  it.each([
    ['title', { title: undefined }],
    ['location', { latitude: null }],
  ] as const)('[E2.6][AC68] publishing a pin that lacks %s is incomplete naming that gap and the pin stays a draft', async (gap, lacking) => {
    const s = setup()
    const pin = await created(s, { ...complete, ...lacking })
    const result = await s.publish(owner, store, pin.id, 1, null)
    expect(result).toEqual({ ok: false, reason: 'incomplete', gaps: [gap] })
    expect(s.pins.rows.get(pin.id)).toMatchObject({ status: 'draft', rowVersion: 1 })
    expect(s.audit).toEqual([])
  })

  it('[E2.6][AC68] a pin with a title in two languages and no slug publishes: the server made one for each language', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, title: { en: 'Lion Monument', de: 'Löwendenkmal' } })
    expect(pin.slug).toEqual({ en: 'lion-monument', de: 'loewendenkmal' })
    expect(await s.publish(owner, store, pin.id, 1, null)).toMatchObject({ ok: true, value: { slug: { en: 'lion-monument', de: 'loewendenkmal' } } })
  })

  it('[E2.6][AC68] a created pin belongs to the signed-in store', async () => {
    const s = setup()
    const pin = await created(s)
    expect(pin).toMatchObject({ storeId: store, status: 'draft' })
  })

  it('[E2.6][AC79] a draft pin is deleted', async () => {
    const s = setup()
    const pin = await created(s)
    expect(await s.remove(owner, store, pin.id, 1, null)).toEqual({ ok: true, value: { id: pin.id } })
    expect(s.pins.rows.has(pin.id)).toBe(false)
  })

  it('[E2.6][AC79] a delete with a stale If-Match is stale and the pin stays, even a published one (stale before published-cannot-be-deleted)', async () => {
    const s = setup()
    const pin = await created(s)
    expect(await s.remove(owner, store, pin.id, 2, null)).toEqual({ ok: false, reason: 'stale' })
    expect(s.pins.rows.has(pin.id)).toBe(true)
    await s.publish(owner, store, pin.id, 1, null)
    expect(await s.remove(owner, store, pin.id, 1, null)).toEqual({ ok: false, reason: 'stale' })
  })

  it('[E2.6][AC79] a published pin cannot be deleted and stays published', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    expect(await s.remove(owner, store, pin.id, 2, null)).toEqual({ ok: false, reason: 'published-cannot-be-deleted' })
    expect(s.pins.rows.get(pin.id)?.status).toBe('published')
  })

  it('[E2.6][AC79] a published pin is hidden and an audit row is written', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    const result = await s.hide(owner, store, pin.id, 2, 'req-2')
    expect(result).toMatchObject({ ok: true, value: { status: 'hidden', rowVersion: 3 } })
    expect(s.audit.at(-1)).toMatchObject({ entity: 'pin', action: 'hidden', before: { status: 'published' }, after: { status: 'hidden', rowVersion: 3 }, requestId: 'req-2' })
  })

  it('[E2.6] hiding a draft pin is not-published', async () => {
    const s = setup()
    const pin = await created(s)
    expect(await s.hide(owner, store, pin.id, 1, null)).toEqual({ ok: false, reason: 'not-published' })
  })

  it('[E2.6] a hidden pin publishes again with no pending draft, keeps first_published_at and its published text', async () => {
    const s = setup()
    const pin = await created(s)
    const first = await s.publish(owner, store, pin.id, 1, null)
    await s.hide(owner, store, pin.id, 2, null)
    const again = await s.publish(owner, store, pin.id, 3, null)
    expect(again).toMatchObject({ ok: true, value: { status: 'published', published: { title: { en: 'Chapel Bridge' } }, draft: null } })
    expect(again.ok && first.ok && again.value.firstPublishedAt).toEqual(first.ok && first.value.firstPublishedAt)
  })

  it('[E2.6][AC30] a live English pin gains German: the publish makes the German slug and keeps the English one', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    await s.save(owner, store, pin.id, 2, { title: { en: 'Chapel Bridge', de: 'Kapellbrücke' } }, null)
    expect(s.pins.rows.get(pin.id)?.slug).toEqual({ en: 'chapel-bridge' })
    const result = await s.publish(owner, store, pin.id, 3, 'req-3')
    expect(result).toMatchObject({ ok: true, value: { status: 'published', slug: { en: 'chapel-bridge', de: 'kapellbruecke' }, published: { title: { en: 'Chapel Bridge', de: 'Kapellbrücke' } }, draft: null } })
  })

  it('[E2.6][AC30] a draft that drops German takes the German slug with it and English stays live', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, title: { en: 'A', de: 'B' } })
    await s.publish(owner, store, pin.id, 1, null)
    await s.save(owner, store, pin.id, 2, { title: { en: 'A' } }, null)
    const result = await s.publish(owner, store, pin.id, 3, null)
    expect(result).toMatchObject({ ok: true, value: { status: 'published', slug: { en: 'a' }, published: { title: { en: 'A' } } } })
  })

  it('[E2.6][AC68] a draft that leaves no title at all is incomplete naming title and the pin is unchanged', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    await s.save(owner, store, pin.id, 2, { title: { en: '  ' } }, null)
    const before = s.pins.rows.get(pin.id)
    expect(await s.publish(owner, store, pin.id, 3, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['title'] })
    expect(s.pins.rows.get(pin.id)).toBe(before)
  })

  it('[E2.6][AC30] a slug a client sends is ignored on create and on save: the slug is made from the title', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, slug: { en: 'my-own' } })
    expect(pin.slug).toEqual({ en: 'chapel-bridge' })
    const saved = await s.save(owner, store, pin.id, 1, { slug: { en: 'other' }, address: 'Kapellplatz' }, null)
    expect(saved).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' }, address: 'Kapellplatz' } })
  })

  it('[E2.6][AC30] before the first publish the slug follows the title, and an unchanged title keeps its slug without a -2', async () => {
    const s = setup()
    const pin = await created(s)
    const same = await s.save(owner, store, pin.id, 1, { title: { en: 'Chapel Bridge' } }, null)
    expect(same).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
    const renamed = await s.save(owner, store, pin.id, 2, { title: { en: 'Kapell Bridge Lucerne' } }, null)
    expect(renamed).toMatchObject({ ok: true, value: { slug: { en: 'kapell-bridge-lucerne' } } })
    const cleared = await s.save(owner, store, pin.id, 3, { title: {} }, null)
    expect(cleared).toMatchObject({ ok: true, value: { slug: null } })
  })

  it('[E2.6][AC30] a draft that already has a slug and no title change keeps it, whatever else the save changes', async () => {
    const s = setup()
    const pin = await created(s)
    s.pins.rows.set(pin.id, { ...pin, slug: { en: 'custom-from-before' } })
    const saved = await s.save(owner, store, pin.id, 1, { address: 'x' }, null)
    expect(saved).toMatchObject({ ok: true, value: { slug: { en: 'custom-from-before' } } })
  })

  it('[E2.6][AC30] a draft with a title and no slug gets one on any save', async () => {
    const s = setup()
    const pin = await created(s)
    s.pins.rows.set(pin.id, { ...pin, slug: null })
    expect(await s.save(owner, store, pin.id, 1, { address: 'x' }, null)).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
  })

  it('[E2.6][AC30] two pins with one title get chapel-bridge and chapel-bridge-2, across stores', async () => {
    const s = setup()
    const first = await created(s)
    const second = await s.create({ ...owner, stores: new Map([[store, 'owner'], ['store-2', 'owner']]) }, 'store-2', complete, null)
    expect(first.slug).toEqual({ en: 'chapel-bridge' })
    expect(second).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge-2' } } })
  })

  it('[E2.6][AC30] after the first publish the slug is locked: a new title changes neither the slug nor the next publish', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    const saved = await s.save(owner, store, pin.id, 2, { title: { en: 'Completely Different' } }, null)
    expect(saved).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' }, draft: { title: { en: 'Completely Different' } } } })
    const again = await s.publish(owner, store, pin.id, 3, null)
    expect(again).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' }, published: { title: { en: 'Completely Different' } } } })
  })

  it('[E2.6][AC30] a hidden pin keeps its slug when it is saved and published again with a new title', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    await s.hide(owner, store, pin.id, 2, null)
    await s.save(owner, store, pin.id, 3, { title: { en: 'New Name' } }, null)
    expect(await s.publish(owner, store, pin.id, 4, null)).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
  })

  it('[E2.6][AC30] a live pin saved with a German title gets no German slug yet, so the slug keeps covering the published title', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    const saved = await s.save(owner, store, pin.id, 2, { title: { en: 'Chapel Bridge', de: 'Kapellbrücke' } }, null)
    expect(saved).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
  })

  it('[E2.6][AC30] a never-published draft publishes with the slug of its title only, a stored slug for a language with no title is dropped', async () => {
    const s = setup()
    const pin = await created(s)
    s.pins.rows.set(pin.id, { ...pin, slug: { en: 'chapel-bridge', de: 'nur-alt' } })
    expect(await s.publish(owner, store, pin.id, 1, null)).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
  })

  it('[E2.6] AC-6 a retired cover is media-retired and the cover is unchanged', async () => {
    const s = setup([{ id: 'm1', kind: 'image', status: 'retired' }])
    const pin = await created(s)
    expect(await s.save(owner, store, pin.id, 1, { coverMediaId: 'm1' }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(await s.create(owner, store, { coverMediaId: 'm1' }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(s.pins.rows.get(pin.id)).toMatchObject({ coverMediaId: null, rowVersion: 1 })
  })

  it('[E2.6] a save that clears the latitude of a published pin is incomplete naming location and writes nothing', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    expect(await s.save(owner, store, pin.id, 2, { latitude: null }, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['location'] })
    expect(s.pins.rows.get(pin.id)).toMatchObject({ latitude: 47.05, rowVersion: 2 })
  })

  it('[E2.6] a member of another store\'s pin id is not-found', async () => {
    const s = setup()
    const pin = await created(s)
    const other: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([['store-2', 'owner']]) }
    expect(await s.save(other, 'store-2', pin.id, 1, { address: 'x' }, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.publish(other, 'store-2', pin.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.hide(other, 'store-2', pin.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.remove(other, 'store-2', pin.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.6] AC-7 an actor without manage-content is forbidden and nothing is written', async () => {
    const s = setup()
    const pin = await created(s)
    const failures = [
      await s.create(outsider, store, complete, null),
      await s.save(outsider, store, pin.id, 1, { address: 'x' }, null),
      await s.publish(outsider, store, pin.id, 1, null),
      await s.hide(outsider, store, pin.id, 1, null),
      await s.remove(outsider, store, pin.id, 1, null),
      await s.create({ kind: 'anonymous' }, store, complete, null),
    ]
    expect(failures).toEqual(Array.from<unknown>({ length: 6 }).fill({ ok: false, reason: 'forbidden' }))
    expect(s.pins.rows.size).toBe(1)
    expect(s.pins.rows.get(pin.id)?.rowVersion).toBe(1)
    expect(s.audit).toEqual([])
  })
})
