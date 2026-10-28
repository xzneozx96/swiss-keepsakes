import { describe, expect, it } from 'vitest'

import {
  BODY_LINK_PROTOCOLS,
  BODY_MARK_TYPES,
  BODY_NODE_TYPES,
  emptyStoryBody,
  isSafeLinkHref,
  sectionsToBody,
  STORY_BODY_LIMITS,
  storyBodyMediaRefs,
  storyBodyPinIds,
  storyBodyReadMinutes,
} from '../src/content'
import type { StoryBody } from '../src/content'

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
const doc = (...content: StoryBody['content']): StoryBody => ({ type: 'doc', content })
const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })

describe('[E2.13] story body constants', () => {
  it('[E2.13][AC30] exposes the limits and the allow-lists', () => {
    expect(STORY_BODY_LIMITS).toEqual({ maxBytes: 200_000, maxDepth: 8, maxMedia: 100 })
    expect(BODY_LINK_PROTOCOLS).toEqual(['https:', 'http:', 'mailto:'])
    expect([...BODY_NODE_TYPES].sort()).toEqual([
      'audio',
      'blockquote',
      'bulletList',
      'hardBreak',
      'heading',
      'image',
      'listItem',
      'orderedList',
      'paragraph',
      'text',
      'video',
    ])
    expect([...BODY_MARK_TYPES].sort()).toEqual(['bold', 'italic', 'link', 'pinLink'])
  })

  it('[E2.13] the empty body is one empty paragraph', () => {
    expect(emptyStoryBody).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
})

describe('[E2.13] storyBodyReadMinutes', () => {
  it('[E2.13] an empty body reads in 1 minute', () => {
    expect(storyBodyReadMinutes(emptyStoryBody)).toBe(1)
  })

  it('[E2.13] 200 words are 1 minute and 201 words are 2', () => {
    expect(storyBodyReadMinutes(doc(para(words(200))))).toBe(1)
    expect(storyBodyReadMinutes(doc(para(words(201))))).toBe(2)
  })

  it('[E2.13] media nodes add nothing', () => {
    const media = [
      { type: 'image', attrs: { mediaId: 'a', alt: 'many words in this alt text here', caption: 'and a long caption too' } },
      { type: 'video', attrs: { youtubeId: 'abcdefghijk', title: 'a long title', caption: 'cap' } },
      { type: 'audio', attrs: { mediaId: 'b', title: 'a long title', caption: 'cap' } },
    ]
    expect(storyBodyReadMinutes(doc(para(words(200)), ...media))).toBe(1)
  })

  it('[E2.13] marks do not split counting', () => {
    const split = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'hel' },
        { type: 'text', text: 'lo', marks: [{ type: 'bold' }] },
        { type: 'text', text: ` ${words(199)}` },
      ],
    }
    expect(storyBodyReadMinutes(doc(split))).toBe(1)
    expect(storyBodyReadMinutes(doc({ ...split, content: [...split.content, { type: 'text', text: ' x' }] }))).toBe(2)
  })

  it('[E2.13] words in nested lists and quotes count, and a hard break separates words', () => {
    const nested = doc(
      { type: 'bulletList', content: [{ type: 'listItem', content: [para(words(150))] }] },
      { type: 'blockquote', content: [para(words(50))] },
      { type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }] },
    )
    expect(storyBodyReadMinutes(nested)).toBe(2)
  })
})

describe('[E2.13] isSafeLinkHref', () => {
  it.each(['https://a.ch', 'HTTP://a.ch', 'mailto:a@b.ch'])('[E2.13][AC30] accepts %s', (href) => {
    expect(isSafeLinkHref(href)).toBe(true)
  })

  it.each(['javascript:alert(1)', ' javascript:x', 'JaVaScRiPt:x', '/rel', 'data:text/html,x', 'not a url', ''])(
    '[E2.13][AC30] refuses %j',
    (href) => {
      expect(isSafeLinkHref(href)).toBe(false)
    },
  )
})

describe('[E2.13] media refs and pin ids', () => {
  const nested: StoryBody = doc(
    { type: 'image', attrs: { mediaId: 'i1', alt: '', caption: '' } },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'x', marks: [{ type: 'pinLink', attrs: { pinId: 'p1' } }] },
                { type: 'text', text: 'y', marks: [{ type: 'bold' }, { type: 'pinLink', attrs: { pinId: 'p2' } }] },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'z', marks: [{ type: 'pinLink', attrs: { pinId: 'p1' } }] }] }],
                },
              ],
            },
          ],
        },
      ],
    },
    { type: 'audio', attrs: { mediaId: 'a1', title: '', caption: '' } },
    { type: 'video', attrs: { youtubeId: 'abcdefghijk', title: '', caption: '' } },
    { type: 'image', attrs: { mediaId: 'i1', alt: '', caption: '' } },
  )

  it('[E2.13] lists image and audio refs in order, keeping duplicates, and skips video', () => {
    expect(storyBodyMediaRefs(nested)).toEqual([
      { id: 'i1', kind: 'image' },
      { id: 'a1', kind: 'audio' },
      { id: 'i1', kind: 'image' },
    ])
  })

  it('[E2.13] lists each pin id once, in order', () => {
    expect(storyBodyPinIds(nested)).toEqual(['p1', 'p2'])
  })

  it('[E2.13] an empty body has none', () => {
    expect(storyBodyMediaRefs(emptyStoryBody)).toEqual([])
    expect(storyBodyPinIds(emptyStoryBody)).toEqual([])
  })
})

describe('[E2.13] sectionsToBody', () => {
  it('[E2.13] intro paragraphs come first', () => {
    const body = sectionsToBody({
      intro: 'one\n\ntwo',
      sections: [{ heading: 'H', blocks: [{ type: 'paragraph', text: 'p' }] }],
    })
    expect(body.content.map(n => n.type)).toEqual(['paragraph', 'paragraph', 'heading', 'paragraph'])
    expect(body.content[0]).toEqual(para('one'))
    expect(body.content[1]).toEqual(para('two'))
  })

  it('[E2.13] a heading becomes a level 2 heading node', () => {
    const body = sectionsToBody({ intro: '', sections: [{ heading: 'Old town', blocks: [] }] })
    expect(body.content).toEqual([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Old town' }] },
    ])
  })

  it('[E2.13] an empty heading adds no node', () => {
    const body = sectionsToBody({ intro: '', sections: [{ heading: '  ', blocks: [{ type: 'paragraph', text: 'p' }] }] })
    expect(body.content).toEqual([para('p')])
  })

  it('[E2.13] a blank line starts a paragraph and a single newline is a hard break', () => {
    const body = sectionsToBody({ intro: '', sections: [{ heading: '', blocks: [{ type: 'paragraph', text: 'a\n\nb\nc' }] }] })
    expect(body.content).toEqual([
      para('a'),
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'b' }, { type: 'hardBreak' }, { type: 'text', text: 'c' }],
      },
    ])
  })

  it('[E2.13] image, video and audio blocks keep their attributes, and an image alt starts empty', () => {
    const body = sectionsToBody({
      intro: '',
      sections: [
        {
          heading: '',
          blocks: [
            { type: 'image', mediaId: 'm1', caption: 'c1' },
            { type: 'video', youtubeId: 'abcdefghijk', title: 't2', caption: 'c2' },
            { type: 'audio', mediaId: 'm3', title: 't3', caption: 'c3' },
          ],
        },
      ],
    })
    expect(body.content).toEqual([
      { type: 'image', attrs: { mediaId: 'm1', alt: '', caption: 'c1' } },
      { type: 'video', attrs: { youtubeId: 'abcdefghijk', title: 't2', caption: 'c2' } },
      { type: 'audio', attrs: { mediaId: 'm3', title: 't3', caption: 'c3' } },
    ])
  })

  it('[E2.13] section id and reading time are dropped', () => {
    const body = sectionsToBody({
      intro: '',
      sections: [{ id: 'sec-1', heading: 'H', blocks: [] }],
    })
    expect(JSON.stringify(body)).not.toContain('sec-1')
    expect(JSON.stringify(body)).not.toContain('readMinutes')
  })

  it('[E2.13] an empty intro adds nothing', () => {
    const body = sectionsToBody({ intro: ' \n ', sections: [{ heading: 'H', blocks: [] }] })
    expect(body.content.map(n => n.type)).toEqual(['heading'])
  })

  it('[E2.13] an empty result is the empty body', () => {
    expect(sectionsToBody({ intro: '', sections: [] })).toEqual(emptyStoryBody)
    expect(sectionsToBody({ intro: '', sections: [{ heading: '', blocks: [{ type: 'paragraph', text: '' }] }] })).toEqual(emptyStoryBody)
  })
})
