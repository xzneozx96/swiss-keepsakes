import type { MediaLookup, MediaRow } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { checkMedia } from '../../../src/modules/content/application/check-media.ts'

function fakeMedia(rows: MediaRow[]): MediaLookup<null> {
  return { find: async (_tx, _storeId, ids) => rows.filter(r => ids.map(i => i.toLowerCase()).includes(r.id)) }
}

describe('checkMedia', () => {
  it('[E2.6] a retired image is refused with media-retired and the list names nothing else', async () => {
    const media = fakeMedia([{ id: 'a', kind: 'image', status: 'retired' }, { id: 'b', kind: 'image', status: 'ready' }])
    const failure = await checkMedia(media, null, 's1', [{ id: 'a', kind: 'image' }, { id: 'b', kind: 'image' }])
    expect(failure).toEqual({ reason: 'media-retired' })
  })

  it('[E2.6] retired wins over invalid when both occur', async () => {
    const media = fakeMedia([{ id: 'a', kind: 'image', status: 'retired' }])
    const failure = await checkMedia(media, null, 's1', [{ id: 'a', kind: 'image' }, { id: 'missing', kind: 'image' }])
    expect(failure).toEqual({ reason: 'media-retired' })
  })

  it('[E2.6] a media id of another store or of the wrong kind is media-invalid', async () => {
    const media = fakeMedia([{ id: 'a', kind: 'audio', status: 'ready' }])
    expect(await checkMedia(media, null, 's1', [{ id: 'other-store', kind: 'image' }])).toEqual({ reason: 'media-invalid' })
    expect(await checkMedia(media, null, 's1', [{ id: 'a', kind: 'image' }])).toEqual({ reason: 'media-invalid' })
  })

  it('[E2.6] a ready and a processing image pass', async () => {
    const media = fakeMedia([{ id: 'a', kind: 'image', status: 'ready' }, { id: 'b', kind: 'image', status: 'processing' }])
    expect(await checkMedia(media, null, 's1', [{ id: 'a', kind: 'image' }, { id: 'b', kind: 'image' }])).toBeUndefined()
  })

  it('[E2.6] an uppercase uuid matches the lowercase row', async () => {
    const media = fakeMedia([{ id: '0198a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b', kind: 'image', status: 'ready' }])
    expect(await checkMedia(media, null, 's1', [{ id: '0198A1B2-C3D4-7E5F-8A9B-0C1D2E3F4A5B', kind: 'image' }])).toBeUndefined()
  })

  it('[E2.6] an empty list passes without a lookup', async () => {
    const media: MediaLookup<null> = {
      find: async () => {
        throw new Error('no lookup expected')
      },
    }
    expect(await checkMedia(media, null, 's1', [])).toBeUndefined()
  })
})
