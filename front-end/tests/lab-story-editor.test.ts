import type { StoryBody } from '@/features/lab/story-editor-data'

import { Editor } from '@tiptap/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  audio,
  blogCategories,
  h2,
  h3,
  image,
  LAB_USER,
  link,
  museggStory,
  newStory,
  para,
  pins,
  reviewStory,
  sectionsToBody,
  text,
} from '@/features/lab/story-editor-data'
import {
  ALLOWED_MARKS,
  ALLOWED_NODES,
  contentsList,
  headingAnchors,
  includedParents,
  isAllowed,
  MAX_KEEPSAKES,
  MAX_RELATED,
  pinHostWarnings,
  publishChecks,
  readingMinutes,
  toggleCategory,
  toggleLimited,
} from '@/features/lab/story-editor-rules'
import { storyExtensions } from '@/features/lab/story-editor-schema'

let editor: Editor | undefined

afterEach(() => {
  editor?.destroy()
  editor = undefined
})

function makeEditor(content?: StoryBody | string) {
  editor = new Editor({ extensions: storyExtensions, content })

  return editor
}

const doc = (...content: StoryBody['content']): StoryBody => ({ type: 'doc', content })

describe('[E4.3] the editor schema is the allow-list', () => {
  it('has exactly the allowed nodes and marks', () => {
    const { schema } = makeEditor()

    expect(Object.keys(schema.nodes).sort()).toEqual([...ALLOWED_NODES].sort())
    expect(Object.keys(schema.marks).sort()).toEqual([...ALLOWED_MARKS].sort())
  })

  it('drops strike, code, H1, H4, tables, rules and raw HTML from pasted content', () => {
    const e = makeEditor('<h1>Title</h1><h4>Small</h4><p><s>gone</s> <code>x</code> <u>under</u> <b>kept</b></p><pre>code</pre><hr><table><tr><td>cell</td></tr></table><img src="https://evil.example/x.png"><script>alert(1)</script>')
    const body = e.getJSON() as StoryBody

    expect(isAllowed(body)).toBe(true)
    const json = JSON.stringify(body)

    for (const banned of ['strike', 'code', 'codeBlock', 'underline', 'horizontalRule', 'table', 'tableCell'])
      expect(json).not.toContain(`"type":"${banned}"`)
    expect(json).not.toContain('evil.example')
    expect(json).not.toContain('alert(1)')
    expect(json).toContain('"bold"')
    // H1 and H4 become headings of an allowed level or paragraphs, never level 1 or 4.
    expect(json).not.toMatch(/"level":\s*[14]/)
  })

  it('keeps a photo, video or recording out of quotes and lists', () => {
    const e = makeEditor(doc({ type: 'blockquote', content: [para(text('quote'))] }))

    e.commands.setTextSelection(3)
    e.commands.insertContent({ type: 'image', attrs: { mediaId: 'img-musegg-wall', alt: '', caption: '' } })
    const body = e.getJSON() as StoryBody

    expect(body.content[0]!.type).toBe('blockquote')
    expect(JSON.stringify(body.content[0])).not.toContain('"image"')
  })

  it('round-trips the seeded draft unchanged', () => {
    const body = museggStory().versions.en.body
    const e = makeEditor(body)
    const out = e.getJSON() as StoryBody

    expect(isAllowed(out)).toBe(true)
    expect(JSON.stringify(out)).toContain('"pinLink"')
    expect(out.content.filter(n => ['image', 'video', 'audio'].includes(n.type))).toHaveLength(3)
  })

  it('refuses a javascript: link', () => {
    const e = makeEditor('<p><a href="javascript:alert(1)">bad</a> <a href="https://ok.example">ok</a></p>')

    expect(JSON.stringify(e.getJSON())).not.toContain('javascript:')
  })
})

describe('[E4.3] contents list and reading time come from the body', () => {
  it('lists H2 headings only, with unique anchors, and none below two', () => {
    const body = doc(h2('The towers'), para(text('a')), h3('Inside'), h2('The towers'), h2('Back down'))

    expect(contentsList(body).map(c => c.anchor)).toEqual(['the-towers', 'the-towers-2', 'back-down'])
    expect(headingAnchors(body).find(h => h.level === 3)?.anchor).toBe('inside')
    expect(contentsList(doc(h2('Only one'), para(text('x'))))).toEqual([])
  })

  it('counts words at 200 a minute, rounds up, at least 1, media add nothing', () => {
    const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ')

    expect(readingMinutes(doc(para()))).toBe(1)
    expect(readingMinutes(doc(para(text(words(200)))))).toBe(1)
    expect(readingMinutes(doc(para(text(words(201)))))).toBe(2)
    expect(readingMinutes(doc(para(text(words(200))), image('img-x', 'a long caption that is not counted at all'), audio('aud-y', 'title', 'caption')))).toBe(1)
  })

  it('maps the prototype sections: intro first, headings to H2, blocks to nodes', () => {
    const body = sectionsToBody('Intro line.\n\nSecond.', [{ id: 's', heading: 'Head', blocks: [{ type: 'paragraph', text: 'one\ntwo' }, { type: 'image', photo: 'musegg-wall', caption: 'c' }] }])

    expect(body.content.map(n => n.type)).toEqual(['paragraph', 'paragraph', 'heading', 'paragraph', 'image'])
    expect(body.content[3]!.content!.map(n => n.type)).toEqual(['text', 'hardBreak', 'text'])
    expect(body.content[4]!.attrs).toEqual({ mediaId: 'img-musegg-wall', alt: '', caption: 'c' })
  })
})

describe('[E4.3] a raw link to a pin’s website warns', () => {
  it('matches the host with or without www, and not other hosts', () => {
    const body = doc(para(text('Hotel', [link('https://www.hotel-am-see.example.ch/')]), text(' and '), text('town', [link('https://www.museggmauer.ch')])))
    const warnings = pinHostWarnings(body, pins)

    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.pin.id).toBe('p10')
  })

  it('warns in the publish checks but never blocks', () => {
    const story = museggStory()
    const checks = publishChecks(story, 'en', pins)

    expect(checks.warnings.some(w => w.id.startsWith('host-'))).toBe(true)
    expect(checks.blocking).toEqual([])
  })
})

describe('[E4.3][AC30] publish checks', () => {
  it('a new story is blocked by its cover, title, excerpt and link', () => {
    const checks = publishChecks(newStory(), 'en', pins)

    expect(checks.blocking.map(c => c.id)).toEqual(['cover', 'title', 'excerpt', 'slug'])
    expect(checks.blocking.map(c => c.target)).toEqual(['cover', 'title', 'excerpt', 'link'])
  })

  it('everything else only warns', () => {
    const story = museggStory()
    const checks = publishChecks(story, 'en', pins)

    expect(checks.blocking).toEqual([])
    expect(checks.warnings.map(c => c.id)).toEqual(expect.arrayContaining(['caption', 'host-https://www.hotel-am-see.example.ch/']))
    story.categories = []
    expect(publishChecks(story, 'en', pins).warnings.map(c => c.id)).toContain('categories')
  })

  it('has no author fields: the author is the signed-in account, without a role', () => {
    const story = museggStory()

    expect(story.author).toBe(LAB_USER.name)
    for (const l of ['en', 'de'] as const) {
      expect(story.versions[l]).not.toHaveProperty('authorName')
      expect(story.versions[l]).not.toHaveProperty('authorRole')
    }
    expect(JSON.stringify(publishChecks(newStory(), 'en', pins))).not.toContain('author')
  })

  it('an editorial review also needs its pin and check date', () => {
    const story = reviewStory()

    expect(publishChecks(story, 'en', pins).blocking).toEqual([])
    story.review = { pinId: null, writer: 'Sonja', checkedOn: '' }
    expect(publishChecks(story, 'en', pins).blocking.map(c => c.id)).toEqual(['review-pin', 'review-date'])
  })

  it('never asks for the other language (AC30)', () => {
    const checks = publishChecks(reviewStory(), 'en', pins)

    expect(checks.blocking.some(c => c.id === 'other-language')).toBe(false)
    expect(checks.warnings.some(c => c.id === 'other-language')).toBe(true)
  })
})

describe('[E4.3][AC31][AC33] keepsake and related limits', () => {
  it('stops at 6 keepsakes and 3 related stories', () => {
    expect(MAX_KEEPSAKES).toBe(6)
    expect(MAX_RELATED).toBe(3)
    let list: string[] = []

    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
      list = toggleLimited(list, id, MAX_KEEPSAKES)
    expect(list).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(toggleLimited(list, 'c', MAX_KEEPSAKES)).toEqual(['a', 'b', 'd', 'e', 'f'])

    let related: string[] = []

    for (const id of ['x', 'y', 'z', 'w'])
      related = toggleLimited(related, id, MAX_RELATED)
    expect(related).toEqual(['x', 'y', 'z'])
  })
})

describe('[E4.3][AC87] blog categories follow ADR-030', () => {
  const pick = (ids: string[]) => ids.reduce<string[]>((sel, id) => toggleCategory(sel, id, blogCategories), [])

  it('a sub-category tags the story with itself only; its parent is included, not stored', () => {
    const selected = pick(['old-town'])

    expect(selected).toEqual(['old-town'])
    expect(includedParents(selected, blogCategories)).toEqual(['history'])
  })

  it('a parent alone is allowed and never selects its children', () => {
    expect(pick(['history'])).toEqual(['history'])
    expect(includedParents(['history'], blogCategories)).toEqual([])
  })

  it('choosing a child replaces its parent chip', () => {
    expect(pick(['legends', 'history', 'old-town'])).toEqual(['legends', 'old-town'])
  })

  it('choosing a parent included through its child replaces the child chip', () => {
    expect(pick(['legends', 'old-town', 'history'])).toEqual(['legends', 'history'])
    expect(includedParents(pick(['old-town', 'history']), blogCategories)).toEqual([])
  })

  it('choosing a chosen category again removes it', () => {
    expect(pick(['old-town', 'old-town'])).toEqual([])
  })
})
