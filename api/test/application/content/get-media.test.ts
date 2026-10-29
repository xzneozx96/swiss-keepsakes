import type { Actor } from '@sk/domain/identity'
import type { MediaRecord } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { mediaView } from '../../../src/modules/content/adapters/media-view.ts'
import { makeGetMedia } from '../../../src/modules/content/application/get-media.ts'
import { StorageUnavailableError } from '../../../src/modules/content/ports.ts'
import { createFakeMedia, mediaDefaults } from '../../support/fake-media.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const other = '0190f0c2-0000-7000-8000-00000000000b'
const id = '0190f0c2-0000-7000-8000-0000000000f1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([[other, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u4', guestId: 'g4' }

const row: MediaRecord = { id, storeId: store, kind: 'image', storageKey: `${store}/${id}/original.jpg`, contentType: 'image/jpeg', byteSize: 1000, sha256: 'a'.repeat(64), width: 1500, height: 1000, status: 'ready', ...mediaDefaults }
const url = (key: string) => `https://storage.test/media/${key}`

function setup(rows: MediaRecord[]) {
  const media = createFakeMedia(rows)
  return makeGetMedia({ uow: { run: work => work(null) }, media })
}

describe('[E2.7] reading one media row', () => {
  it('[E2.7] an owner reads a row of the store', async () => {
    expect(await setup([row])(owner, store, id)).toEqual({ ok: true, value: row })
  })

  it('[E2.7] the row of another store is not-found, and a missing row too', async () => {
    const get = setup([{ ...row, storeId: other }])

    expect(await get(owner, store, id)).toEqual({ ok: false, reason: 'not-found' })
    expect(await get(owner, store, '0190f0c2-0000-7000-8000-0000000000f9')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.7] a guest and staff of another store are forbidden', async () => {
    const get = setup([row])

    expect(await get(guest, store, id)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await get(elsewhere, store, id)).toEqual({ ok: false, reason: 'forbidden' })
  })
})

describe('[E2.7] the media view', () => {
  it('[E2.7] a ready 1500 px image lists its original and the variants that fit', () => {
    expect(mediaView(row, url)).toEqual({
      id,
      kind: 'image',
      status: 'ready',
      contentType: 'image/jpeg',
      byteSize: 1000,
      width: 1500,
      height: 1000,
      publicUrl: url(row.storageKey),
      variants: [320, 640, 1280].map(width => ({ width, url: url(`${store}/${id}/w${width}.webp`) })),
    })
  })

  it('[E2.7] a ready PDF has the URL and no variants', () => {
    const pdf: MediaRecord = { ...row, kind: 'pdf', contentType: 'application/pdf', storageKey: `${store}/${id}/original.pdf`, width: null, height: null }

    expect(mediaView(pdf, url)).toMatchObject({ publicUrl: url(pdf.storageKey), variants: [], width: null })
  })

  it('[E2.7] a processing or retired row has no URL and no variants, and the URL function is not called', () => {
    const unavailable = () => {
      throw new StorageUnavailableError('not configured')
    }

    expect(mediaView({ ...row, status: 'processing', width: null, height: null }, unavailable)).toMatchObject({ status: 'processing', publicUrl: null, variants: [] })
    expect(mediaView({ ...row, status: 'retired' }, unavailable)).toMatchObject({ status: 'retired', publicUrl: null, variants: [] })
  })
})
