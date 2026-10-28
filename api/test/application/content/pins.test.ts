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
const complete: PinChanges = { title: { en: 'Chapel Bridge' }, slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3 }

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
    ['slug', { slug: null }],
  ] as const)('[E2.6][AC68] publishing a pin that lacks %s is incomplete naming that gap and the pin stays a draft', async (gap, lacking) => {
    const s = setup()
    const pin = await created(s, { ...complete, ...lacking })
    const result = await s.publish(owner, store, pin.id, 1, null)
    expect(result).toEqual({ ok: false, reason: 'incomplete', gaps: [gap] })
    expect(s.pins.rows.get(pin.id)).toMatchObject({ status: 'draft', rowVersion: 1 })
    expect(s.audit).toEqual([])
  })

  it('[E2.6][AC68] a slug that misses a title language is a slug gap', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, title: { en: 'A', de: 'B' } })
    expect(await s.publish(owner, store, pin.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
  })

  it('[E2.6][AC68] a created pin belongs to the signed-in store', async () => {
    const s = setup()
    const pin = await created(s)
    expect(pin).toMatchObject({ storeId: store, status: 'draft' })
  })

  it('[E2.6][AC79] a draft pin is deleted', async () => {
    const s = setup()
    const pin = await created(s)
    expect(await s.remove(owner, store, pin.id, null)).toEqual({ ok: true, value: { id: pin.id } })
    expect(s.pins.rows.has(pin.id)).toBe(false)
  })

  it('[E2.6][AC79] a published pin cannot be deleted and stays published', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    expect(await s.remove(owner, store, pin.id, null)).toEqual({ ok: false, reason: 'published-cannot-be-deleted' })
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

  it('[E2.6][AC30] a live English pin gains German: the draft adds the title and the publish carries the German slug', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    await s.save(owner, store, pin.id, 2, { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' } }, null)
    const result = await s.publish(owner, store, pin.id, 3, 'req-3', { de: 'kapellbruecke' })
    expect(result).toMatchObject({ ok: true, value: { status: 'published', slug: { en: 'chapel-bridge', de: 'kapellbruecke' }, published: { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' } }, draft: null } })
  })

  it('[E2.6][AC68] a draft that adds German with no slug for it is incomplete naming slug and the pin is unchanged', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    await s.save(owner, store, pin.id, 2, { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' } }, null)
    const before = s.pins.rows.get(pin.id)
    expect(await s.publish(owner, store, pin.id, 3, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(s.pins.rows.get(pin.id)).toBe(before)
  })

  it('[E2.6][AC30] a draft that drops German takes the German slug with it and English stays live', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, title: { en: 'A', de: 'B' }, slug: { en: 'a', de: 'b' } })
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

  it('[E2.6][AC30] a body slug never renames a stored slug: a live English pin republished with {en: renamed} keeps its slug', async () => {
    const s = setup()
    const pin = await created(s)
    await s.publish(owner, store, pin.id, 1, null)
    const result = await s.publish(owner, store, pin.id, 2, null, { en: 'renamed' })
    expect(result).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
  })

  it('[E2.6][AC30] a draft whose stored slug misses a title language is a slug gap, and a body slug fills the missing language', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, title: { en: 'A', de: 'B' }, slug: { en: 'a' } })
    expect(await s.publish(owner, store, pin.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(await s.publish(owner, store, pin.id, 1, null, { de: 'b' })).toMatchObject({ ok: true, value: { slug: { en: 'a', de: 'b' } } })
  })

  it('[E2.6][AC30] a draft whose stored slug covers a language its title lacks is a slug gap, not a silent drop', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, title: { en: 'A' }, slug: { en: 'a', de: 'b' } })
    expect(await s.publish(owner, store, pin.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(s.pins.rows.get(pin.id)).toMatchObject({ status: 'draft', slug: { en: 'a', de: 'b' } })
  })

  it('[E2.6][AC30] a slug for a language with no title is dropped, and an empty or missing slug changes nothing', async () => {
    const s = setup()
    const pin = await created(s)
    expect(await s.publish(owner, store, pin.id, 1, null, { de: 'unused' })).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
    await s.hide(owner, store, pin.id, 2, null)
    expect(await s.publish(owner, store, pin.id, 3, null, { de: 'still-unused' })).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' }, published: { title: { en: 'Chapel Bridge' } } } })
    expect(await s.publish(owner, store, pin.id, 4, null, {})).toMatchObject({ ok: true, value: { slug: { en: 'chapel-bridge' } } })
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

  it('[E2.6] a save that drops a language from the slug of a published pin is incomplete naming slug', async () => {
    const s = setup()
    const pin = await created(s, { ...complete, title: { en: 'A', de: 'B' }, slug: { en: 'a', de: 'b' } })
    await s.publish(owner, store, pin.id, 1, null)
    expect(await s.save(owner, store, pin.id, 2, { slug: { en: 'a' } }, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
  })

  it('[E2.6] a member of another store\'s pin id is not-found', async () => {
    const s = setup()
    const pin = await created(s)
    const other: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([['store-2', 'owner']]) }
    expect(await s.save(other, 'store-2', pin.id, 1, { address: 'x' }, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.publish(other, 'store-2', pin.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.hide(other, 'store-2', pin.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.remove(other, 'store-2', pin.id, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.6] AC-7 an actor without manage-content is forbidden and nothing is written', async () => {
    const s = setup()
    const pin = await created(s)
    const failures = [
      await s.create(outsider, store, complete, null),
      await s.save(outsider, store, pin.id, 1, { address: 'x' }, null),
      await s.publish(outsider, store, pin.id, 1, null),
      await s.hide(outsider, store, pin.id, 1, null),
      await s.remove(outsider, store, pin.id, null),
      await s.create({ kind: 'anonymous' }, store, complete, null),
    ]
    expect(failures).toEqual(Array.from<unknown>({ length: 6 }).fill({ ok: false, reason: 'forbidden' }))
    expect(s.pins.rows.size).toBe(1)
    expect(s.pins.rows.get(pin.id)?.rowVersion).toBe(1)
    expect(s.audit).toEqual([])
  })
})
