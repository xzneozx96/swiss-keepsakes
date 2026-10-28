import { describe, expect, it } from 'vitest'
import { publishedStoryMediaIds } from '../../../src/modules/content/adapters/story-media-ids.ts'

const A = '0190a000-0000-7000-8000-0000000000AA'
const B = '0190a000-0000-7000-8000-0000000000bb'
const C = '0190a000-0000-7000-8000-0000000000cc'

describe('publishedStoryMediaIds', () => {
  it('[E2.13][AC54] collects the cover, image and audio nodes of the body, lower-cased and once each', () => {
    const ids = publishedStoryMediaIds({
      coverMediaId: A,
      body: { type: 'doc', content: [
        { type: 'image', attrs: { mediaId: A.toLowerCase() } },
        { type: 'audio', attrs: { mediaId: B } },
        { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', mediaId: C } },
        { type: 'blockquote', content: [{ type: 'image', attrs: { mediaId: C } }] },
      ] },
    })

    expect(ids.sort()).toEqual([A.toLowerCase(), B, C].sort())
  })

  it('[E2.13][AC54] a body that is not a document, a node that is not an object and an id that is no uuid add nothing', () => {
    expect(publishedStoryMediaIds({ coverMediaId: 'nope', body: 'text' })).toEqual([])
    expect(publishedStoryMediaIds({ body: { type: 'doc', content: [null, 4, { type: 'image', attrs: { mediaId: 'not-a-uuid' } }, { type: 'image' }, { type: 'audio', attrs: { mediaId: 7 } }] } })).toEqual([])
    expect(publishedStoryMediaIds({})).toEqual([])
    expect(publishedStoryMediaIds(undefined as never)).toEqual([])
  })

  it('[E2.13][AC54] a body nested thousands of levels deep does not overflow the stack', () => {
    let node: Record<string, unknown> = { type: 'image', attrs: { mediaId: A } }
    for (let i = 0; i < 20000; i++)
      node = { type: 'blockquote', content: [node] }

    // The image sits far below the depth cap, so it is not read.
    expect(publishedStoryMediaIds({ body: { type: 'doc', content: [node] } })).toEqual([])
  })
})
