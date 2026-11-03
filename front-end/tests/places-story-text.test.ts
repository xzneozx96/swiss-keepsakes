import type { StoryVersionText } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { storyBlocks } from '@/features/places/lib/story-text'

type Media = StoryVersionText['media'][number]

const photo: Media = {
  id: '00000000-0000-4000-8000-0000000000a1',
  kind: 'image',
  status: 'ready',
  name: 'wall.jpg',
  contentType: 'image/jpeg',
  byteSize: 1,
  width: 1600,
  height: 1000,
  publicUrl: 'https://files.test/wall.jpg',
  variants: [{ width: 320, url: 'https://files.test/wall-320.jpg' }, { width: 800, url: 'https://files.test/wall-800.jpg' }],
}
const clip: Media = { ...photo, id: '00000000-0000-4000-8000-0000000000b1', kind: 'audio', publicUrl: 'https://files.test/clip.mp3', variants: [] }
const text = (value: string, marks?: { type: string, attrs?: Record<string, unknown> }[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })
const doc = (...content: StoryVersionText['body']['content']): StoryVersionText['body'] => ({ type: 'doc', content })

describe('the story body as the sheet draws it', () => {
  it('maps headings, paragraphs, a quote and both lists, with the marks on the text', () => {
    const blocks = storyBlocks(doc(
      { type: 'heading', attrs: { level: 2 }, content: [text('The wall')] },
      { type: 'paragraph', content: [text('Walk '), text('slowly', [{ type: 'bold' }, { type: 'italic' }]), { type: 'hardBreak' }, text('now.')] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [text('Stone remembers.')] }] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('One')] }] }] },
      { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('First')] }] }] },
    ), [])

    expect(blocks).toEqual([
      { type: 'heading', level: 2, inlines: [{ text: 'The wall' }] },
      { type: 'paragraph', inlines: [{ text: 'Walk ' }, { text: 'slowly', bold: true, italic: true }, 'break', { text: 'now.' }] },
      { type: 'quote', blocks: [{ type: 'paragraph', inlines: [{ text: 'Stone remembers.' }] }] },
      { type: 'list', ordered: false, items: [[{ type: 'paragraph', inlines: [{ text: 'One' }] }]] },
      { type: 'list', ordered: true, items: [[{ type: 'paragraph', inlines: [{ text: 'First' }] }]] },
    ])
  })

  it('keeps a link whose address is http, https or mail, and draws any other as plain text', () => {
    const [paragraph] = storyBlocks(doc({ type: 'paragraph', content: [
      text('site', [{ type: 'link', attrs: { href: 'https://example.ch' } }]),
      text('bad', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
      text('pin', [{ type: 'pinLink', attrs: { pinId: 'p1' } }]),
    ] }), [])

    expect(paragraph).toEqual({ type: 'paragraph', inlines: [{ text: 'site', href: 'https://example.ch' }, { text: 'bad' }, { text: 'pin' }] })
  })

  it('maps an image to the 800 px copy, with a mediaId in any case, and a video to its YouTube id', () => {
    const blocks = storyBlocks(doc(
      { type: 'image', attrs: { mediaId: photo.id.toUpperCase(), alt: 'The wall', caption: 'At dawn' } },
      { type: 'video', attrs: { youtubeId: 'abc123', title: 'Film', caption: '' } },
    ), [photo])

    expect(blocks).toEqual([
      { type: 'image', src: 'https://files.test/wall-800.jpg', alt: 'The wall', caption: 'At dawn' },
      { type: 'video', youtubeId: 'abc123', title: 'Film', caption: '' },
    ])
  })

  it('maps audio to its file, and skips an image or audio whose file is not there', () => {
    const blocks = storyBlocks(doc(
      { type: 'audio', attrs: { mediaId: clip.id, title: 'Bells', caption: '' } },
      { type: 'image', attrs: { mediaId: '00000000-0000-4000-8000-0000000000ff', alt: '' } },
      { type: 'audio', attrs: { mediaId: photo.id.replace('a1', 'ee'), title: '' } },
    ), [photo, clip])

    expect(blocks).toEqual([{ type: 'audio', src: 'https://files.test/clip.mp3', title: 'Bells', caption: '' }])
  })

  it('skips unknown nodes and a body that is not a list of nodes, without throwing', () => {
    expect(storyBlocks(doc({ type: 'table' }, { type: 'paragraph', content: [{ type: 'mystery' }, text('kept')] }), []))
      .toEqual([{ type: 'paragraph', inlines: [{ text: 'kept' }] }])
    expect(storyBlocks({ type: 'doc', content: undefined } as never, [])).toEqual([])
  })

  describe('[E4.3][AC45] AC-3 pin links', () => {
    const pinned = doc({ type: 'paragraph', content: [text('Musegg', [{ type: 'pinLink', attrs: { pinId: 'p1' } }])] })

    it('carries the target the lookup gives for a pin link', () => {
      const blocks = storyBlocks(pinned, [], { pinHref: id => (id === 'p1' ? '/en/map?place=a' : null) })

      expect(blocks).toEqual([{ type: 'paragraph', inlines: [{ text: 'Musegg', pinHref: '/en/map?place=a' }] }])
    })

    it('draws plain text when the lookup gives null', () => {
      expect(storyBlocks(pinned, [], { pinHref: () => null })).toEqual([{ type: 'paragraph', inlines: [{ text: 'Musegg' }] }])
    })

    it('draws plain text with no options, as before', () => {
      expect(storyBlocks(pinned, [])).toEqual([{ type: 'paragraph', inlines: [{ text: 'Musegg' }] }])
    })

    it('gives no href for a javascript link', () => {
      const body = doc({ type: 'paragraph', content: [text('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])] })

      expect(storyBlocks(body, [])).toEqual([{ type: 'paragraph', inlines: [{ text: 'x' }] }])
    })
  })
})
