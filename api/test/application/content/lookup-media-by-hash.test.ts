import type { Actor } from '@sk/domain/identity'
import type { MediaRecord } from '../../../src/modules/content/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeLookupMediaByHash } from '../../../src/modules/content/application/lookup-media-by-hash.ts'
import { createFakeMedia, mediaDefaults } from '../../support/fake-media.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const other = '0190f0c2-0000-7000-8000-00000000000b'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([[other, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u4', guestId: 'g4' }

const hashA = 'a'.repeat(64)
const hashB = 'b'.repeat(64)
const row = (id: string, extra: Partial<MediaRecord>): MediaRecord => ({ id, storeId: store, kind: 'image', storageKey: `${store}/${id}/original.jpg`, contentType: 'image/jpeg', byteSize: 1000, sha256: hashA, width: 1500, height: 1000, status: 'ready', ...mediaDefaults, ...extra })

function setup(rows: MediaRecord[]) {
  const media = createFakeMedia(rows)
  const findReadyByHash = vi.spyOn(media, 'findReadyByHash')
  return { lookup: makeLookupMediaByHash({ uow: { run: work => work(null) }, media }), findReadyByHash }
}

describe('[AC-dup] looking files up by content', () => {
  it('[AC-dup] finds the ready files of the store with those bytes, whatever their names', async () => {
    const { lookup } = setup([row('f1', { name: 'IMG_0001.jpg' }), row('f2', { sha256: hashB, name: 'IMG_0001.jpg' })])

    const found = await lookup(owner, store, [hashA])

    expect(found.ok && found.value.map(file => file.id)).toEqual(['f1'])
  })

  it('[AC-dup] asks the repository once for all hashes, and for each hash once', async () => {
    const { lookup, findReadyByHash } = setup([row('f1', {}), row('f2', { sha256: hashB })])

    const found = await lookup(owner, store, [hashA, hashB, hashA])

    expect(found.ok && found.value.map(file => file.id).sort()).toEqual(['f1', 'f2'])
    expect(findReadyByHash).toHaveBeenCalledTimes(1)
    expect(findReadyByHash.mock.calls[0]![2]).toEqual([hashA, hashB])
  })

  it('[AC-dup] an empty list finds nothing and does not touch the database', async () => {
    const { lookup, findReadyByHash } = setup([row('f1', {})])

    expect(await lookup(owner, store, [])).toEqual({ ok: true, value: [] })
    expect(findReadyByHash).not.toHaveBeenCalled()
  })

  it('[AC-dup] a retired file and a processing file are not offered', async () => {
    const { lookup } = setup([row('f1', { status: 'retired' }), row('f2', { status: 'processing' }), row('f3', {})])

    const found = await lookup(owner, store, [hashA])

    expect(found.ok && found.value.map(file => file.id)).toEqual(['f3'])
  })

  it('[AC-dup] a file of another store is not offered', async () => {
    const { lookup } = setup([row('f1', { storeId: other })])

    expect(await lookup(owner, store, [hashA])).toEqual({ ok: true, value: [] })
  })

  it('[AC-dup] a guest and staff of another store are forbidden', async () => {
    const { lookup, findReadyByHash } = setup([row('f1', {})])

    expect(await lookup(guest, store, [hashA])).toEqual({ ok: false, reason: 'forbidden' })
    expect(await lookup(elsewhere, store, [hashA])).toEqual({ ok: false, reason: 'forbidden' })
    expect(findReadyByHash).not.toHaveBeenCalled()
  })
})
