import type { Actor } from '@sk/domain/identity'
import { MEDIA_RULES } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeRequestUpload } from '../../../src/modules/content/application/request-upload.ts'
import { createFakeStorage } from '../../support/fake-storage.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const MiB = 1024 * 1024
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const manager: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([[store, 'manager']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([['0190f0c2-0000-7000-8000-00000000000b', 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u4', guestId: 'g4' }

function setup() {
  const clock = createManualClock(new Date('2026-10-28T10:00:00Z'))
  const requestUpload = makeRequestUpload({ storage: createFakeStorage(clock), clock, newId: () => '0190f0c2-0000-7000-8000-0000000000e1' })
  return { requestUpload }
}

describe('[E2.7] the upload request', () => {
  it('[E2.7] an owner gets a grant for a 2 MiB JPEG: key under the store, valid for 900 seconds', async () => {
    const result = await setup().requestUpload(owner, store, { contentType: 'image/jpeg', byteSize: 2 * MiB })

    expect(result).toMatchObject({ ok: true, value: { kind: 'image', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-28T10:15:00.000Z' } })
    if (!result.ok)
      throw new Error('unreachable')
    expect(result.value.uploadKey).toBe(`${store}/0190f0c2-0000-7000-8000-0000000000e1.jpg`)
    expect(result.value.url).toContain(`/uploads/${result.value.uploadKey}`)
    expect(MEDIA_RULES.presignExpirySeconds).toBe(900)
  })

  it('[E2.7] a manager gets a grant for a PDF under the cap', async () => {
    const result = await setup().requestUpload(manager, store, { contentType: 'application/pdf', byteSize: 25 * MiB })

    expect(result).toMatchObject({ ok: true, value: { kind: 'pdf' } })
  })

  it('[E2.7] refuses an SVG, a file one byte over its cap, and an empty file', async () => {
    const { requestUpload } = setup()

    expect(await requestUpload(owner, store, { contentType: 'image/svg+xml', byteSize: 10 })).toMatchObject({ ok: false, reason: 'type-not-allowed' })
    expect(await requestUpload(owner, store, { contentType: 'image/png', byteSize: 10 * MiB + 1 })).toMatchObject({ ok: false, reason: 'too-large' })
    expect(await requestUpload(owner, store, { contentType: 'audio/mpeg', byteSize: 0 })).toMatchObject({ ok: false, reason: 'empty' })
  })

  it('[E2.7] a guest and staff of another store are forbidden, before the file is looked at', async () => {
    const { requestUpload } = setup()

    expect(await requestUpload(guest, store, { contentType: 'image/svg+xml', byteSize: 1 })).toEqual({ ok: false, reason: 'forbidden' })
    expect(await requestUpload(elsewhere, store, { contentType: 'image/jpeg', byteSize: 1 })).toEqual({ ok: false, reason: 'forbidden' })
  })
})
