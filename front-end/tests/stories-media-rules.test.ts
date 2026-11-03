import { storyBodySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

import { audioNode, countMediaNodes, imageNode, MEDIA_LIMIT, videoNode, youtubeId, youtubePoster } from '@/features/stories/lib/media-block'

const ID = '0198a000-0000-7000-8000-000000000010'
const parses = (node: object) => storyBodySchema.parse({ type: 'doc', content: [{ type: 'paragraph' }, node] })

describe('[E4.3][AC30][AC45] media rules', () => {
  // The ticket writes `abc123`; the contract needs an 11-character id, so the examples use one.
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://vimeo.com/123', null],
    ['', null],
    ['   ', null],
  ])('[E4.3][AC45] AC-2 outline: %j gives %j', (link, id) => {
    expect(youtubeId(link)).toBe(id)
  })

  it('[E4.3][AC45] AC-2 the poster address is the YouTube thumbnail', () => {
    expect(youtubePoster('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('[E4.3][AC45] AC-6 counts image, video and audio at any depth', () => {
    const body = {
      content: [
        { type: 'image', attrs: {} },
        { type: 'image', attrs: {} },
        { type: 'video', attrs: {} },
        { type: 'audio', attrs: {} },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'image', attrs: {} }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'image' }] },
      ],
    }

    expect(countMediaNodes(body)).toBe(5)
    expect(countMediaNodes({})).toBe(0)
    expect(MEDIA_LIMIT).toBe(100)
  })

  it('[E4.3][AC45] AC-1 a new photo takes the library description as its alt, in the version\'s language, else the other', () => {
    expect(imageNode({ id: ID, alt: { en: 'Wall', de: '' } }, 'de').attrs).toEqual({ mediaId: ID, alt: 'Wall', caption: '' })
    expect(imageNode({ id: ID, alt: { en: 'Wall', de: 'Mauer' } }, 'de').attrs.alt).toBe('Mauer')
    expect(imageNode({ id: ID, alt: {} }, 'en').attrs.alt).toBe('')
    expect((imageNode({ id: ID, alt: { en: 'x'.repeat(400) } }, 'en').attrs as { alt: string }).alt).toHaveLength(300)
    expect(() => parses(imageNode({ id: ID, alt: { en: 'Wall' } }, 'en'))).not.toThrow()
  })

  it('[E4.3][AC45] a recording\'s title is its description, else its file name without extension', () => {
    expect((audioNode({ id: ID, name: 'Rathaus-Glocken.mp3', alt: {} }, 'en').attrs as { title: string }).title).toBe('Rathaus Glocken')
    expect((audioNode({ id: ID, name: 'x.mp3', alt: { de: 'Glocken' } }, 'en').attrs as { title: string }).title).toBe('Glocken')
    expect(() => parses(audioNode({ id: ID, name: 'Rathaus_Glocken.mp3', alt: {} }, 'en'))).not.toThrow()
  })

  it('[E4.3][AC45] a video node holds the 11-character id and a trimmed title', () => {
    const node = videoNode('dQw4w9WgXcQ', '  Bells  ')

    expect(node.attrs).toEqual({ youtubeId: 'dQw4w9WgXcQ', title: 'Bells', caption: '' })
    expect(() => parses(node)).not.toThrow()
  })
})
