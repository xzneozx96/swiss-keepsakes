import type { StoryDraft } from '@sk/api-contract'
import {
  BODY_LINK_PROTOCOLS,
  BODY_MARK_TYPES,
  BODY_NODE_TYPES,
  STORY_BODY_LIMITS,
  storyBodySchema,
  storyDraftSchema,
} from '@sk/api-contract'
import {
  STORY_BODY_LIMITS as DOMAIN_LIMITS,
  BODY_LINK_PROTOCOLS as DOMAIN_LINK_PROTOCOLS,
  BODY_MARK_TYPES as DOMAIN_MARK_TYPES,
  BODY_NODE_TYPES as DOMAIN_NODE_TYPES,
  isSafeLinkHref,
} from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const uuid = '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d'
const uuid2 = '4f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2e'

const p = (text: string, marks?: unknown[]) => ({ type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] })
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const draftOf = (body: unknown) => ({ title: 'T', excerpt: '', authorName: '', authorRole: '', coverMediaId: null, body })
const image = (mediaId = uuid) => ({ type: 'image', attrs: { mediaId, alt: 'a', caption: 'c' } })

function firstIssue(body: unknown) {
  const result = storyDraftSchema.safeParse(draftOf(body))
  return result.success ? undefined : result.error.issues[0]
}
const pathOf = (body: unknown) => firstIssue(body)?.path.join('.')

const everything = doc(
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Two' }] },
  { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Three' }] },
  {
    type: 'paragraph',
    content: [
      { type: 'text', text: 'bold ', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      { type: 'hardBreak' },
      { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://example.ch/a' } }] },
      { type: 'text', text: 'mail', marks: [{ type: 'link', attrs: { href: 'mailto:a@b.ch' } }, { type: 'bold' }] },
      { type: 'text', text: 'pin', marks: [{ type: 'pinLink', attrs: { pinId: uuid } }] },
    ],
  },
  { type: 'blockquote', content: [p('quote')] },
  { type: 'bulletList', content: [{ type: 'listItem', content: [p('one'), { type: 'orderedList', content: [{ type: 'listItem', content: [p('nested')] }] }] }] },
  { type: 'orderedList', content: [{ type: 'listItem', content: [p('first')] }] },
  image(),
  { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 't', caption: 'c' } },
  { type: 'audio', attrs: { mediaId: uuid2, title: 't', caption: 'c' } },
)

describe('[E2.13][AC30] the inferred body type', () => {
  it('holds the list nodes (compile-time: this file fails tsc if bulletList or orderedList leaves the union)', () => {
    const list: StoryDraft['body']['content'][number] = {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph' }, { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }] }],
    }
    // @ts-expect-error a table is not a body node
    const table: StoryDraft['body']['content'][number] = { type: 'table' }
    expect(storyBodySchema.safeParse(doc(list)).success).toBe(true)
    expect(table.type).toBe('table')
  })
})

describe('[E2.13][AC30] the story body schema', () => {
  it('accepts a document with every node and mark, and an empty paragraph', () => {
    expect(storyDraftSchema.safeParse(draftOf(everything)).success).toBe(true)
    expect(storyDraftSchema.safeParse(draftOf({ type: 'doc', content: [{ type: 'paragraph' }] })).success).toBe(true)
  })

  it('accepts a text node of 20,000 characters and refuses one of 20,001', () => {
    expect(storyDraftSchema.safeParse(draftOf(doc(p('x'.repeat(20000))))).success).toBe(true)
    expect(pathOf(doc(p('x'.repeat(20001))))).toBe('body.content.0.content.0.text')
  })

  it('a missing body, a null body and a string of HTML are refused', () => {
    const { body: _body, ...without } = draftOf(null)
    expect(storyDraftSchema.safeParse(without).error?.issues[0]?.path).toEqual(['body'])
    expect(pathOf(null)).toBe('body')
    expect(pathOf('<p>Hi</p>')).toBe('body')
  })

  it('a node that is not on the list names the node type', () => {
    expect(pathOf(doc({ type: 'table', content: [] }))).toBe('body.content.0.type')
    expect(pathOf(doc(p('a'), { type: 'codeBlock' }))).toBe('body.content.1.type')
    expect(pathOf(doc({ type: 'blockquote', content: [{ type: 'bulletList', content: [] }] }))).toBe('body.content.0.content.0.type')
  })

  it('a mark that is not on the list names the mark type', () => {
    expect(pathOf(doc(p('a', [{ type: 'underline' }])))).toBe('body.content.0.content.0.marks.0.type')
    expect(pathOf(doc(p('a', [{ type: 'bold' }, { type: 'strike' }])))).toBe('body.content.0.content.0.marks.1.type')
  })

  it('an unknown attribute or key is refused', () => {
    expect(storyDraftSchema.safeParse(draftOf(doc({ type: 'paragraph', attrs: { textAlign: 'left' } }))).success).toBe(false)
    expect(pathOf(doc({ type: 'paragraph', attrs: { textAlign: 'left' } }))).toBe('body.content.0')
    expect(pathOf(doc({ type: 'image', attrs: { mediaId: uuid, alt: '', caption: '', width: 100 } }))).toBe('body.content.0.attrs')
    expect(pathOf(doc(p('a', [{ type: 'link', attrs: { href: 'https://a.ch', target: '_blank' } }])))).toBe('body.content.0.content.0.marks.0.attrs')
    expect(pathOf({ type: 'doc', content: [], extra: 1 })).toBe('body')
  })

  it.each([1, 4, 5, 6])('a heading of level %i is refused at attrs.level', (level) => {
    expect(pathOf(doc({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'H' }] }))).toBe('body.content.0.attrs.level')
  })

  it.each(['javascript:alert(1)', 'JAVASCRIPT:alert(1)', ' javascript:alert(1)', 'data:text/html,x', '/relative', 'ftp://a.ch'])('a link to %s is refused', (href) => {
    expect(pathOf(doc(p('a', [{ type: 'link', attrs: { href } }])))).toBe('body.content.0.content.0.marks.0.attrs.href')
  })

  it.each(['https://a.ch', 'HTTP://a.ch', 'mailto:a@b.ch'])('a link to %s is accepted', (href) => {
    expect(storyDraftSchema.safeParse(draftOf(doc(p('a', [{ type: 'link', attrs: { href } }])))).success).toBe(true)
  })

  it('refuses a pinLink with no uuid and an image with no uuid', () => {
    expect(pathOf(doc(p('a', [{ type: 'pinLink', attrs: { pinId: 'x' } }])))).toBe('body.content.0.content.0.marks.0.attrs.pinId')
    expect(pathOf(doc({ type: 'image', attrs: { mediaId: 'x', alt: '', caption: '' } }))).toBe('body.content.0.attrs.mediaId')
    expect(pathOf(doc({ type: 'video', attrs: { youtubeId: 'short', title: '', caption: '' } }))).toBe('body.content.0.attrs.youtubeId')
  })

  it('an image, video or audio node is a top-level node and has no children', () => {
    expect(pathOf(doc({ type: 'blockquote', content: [image()] }))).toBe('body.content.0.content.0.type')
    expect(pathOf(doc({ type: 'bulletList', content: [{ type: 'listItem', content: [image()] }] }))).toBe('body.content.0.content.0.content.0.type')
    expect(pathOf(doc({ type: 'image', attrs: { mediaId: uuid, alt: '', caption: '' }, content: [] }))).toBe('body.content.0')
  })

  it('depth 10 is accepted and depth 11 is refused at the node of depth 11 with the depth message', () => {
    // list 2, item 3, list 4, item 5, list 6, item 7, list 8, item 9, then the leaf: a paragraph at 10, its text at 11
    const deep = (lists: number, leaf: unknown) => {
      let inner: unknown = { type: 'listItem', content: [leaf] }
      for (let i = 1; i < lists; i++)
        inner = { type: 'listItem', content: [{ type: i % 2 === 0 ? 'orderedList' : 'bulletList', content: [inner] }] }
      return { type: 'bulletList', content: [inner] }
    }
    expect(storyDraftSchema.safeParse(draftOf(doc(deep(4, { type: 'paragraph' })))).success).toBe(true)
    // three nested lists with text fit (text at depth 9)
    expect(storyDraftSchema.safeParse(draftOf(doc(deep(3, p('x'))))).success).toBe(true)
    const issue = firstIssue(doc(deep(4, p('x'))))
    expect(issue?.path.join('.')).toBe(`body${'.content.0'.repeat(10)}`)
    expect(issue?.message).toMatch(/deeper than 10/)
    // a fifth list level still reaches the depth check at the first node past the cap
    const five = firstIssue(doc(deep(5, { type: 'paragraph' })))
    expect(five?.message).toMatch(/deeper than 10/)
    expect(five?.path.join('.')).toBe(`body${'.content.0'.repeat(10)}`)
  })

  it('a body nested far past the cap is refused, not walked', () => {
    let node: unknown = { type: 'listItem', content: [p('x')] }
    for (let i = 0; i < 5000; i++)
      node = { type: 'listItem', content: [{ type: 'bulletList', content: [node] }] }
    const result = storyDraftSchema.safeParse(draftOf(doc({ type: 'bulletList', content: [node] })))
    expect(result.success).toBe(false)
  })

  it('100 media nodes are accepted and 101 are refused at the 101st', () => {
    const kinds = [image(), { type: 'audio', attrs: { mediaId: uuid2, title: '', caption: '' } }, { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: '', caption: '' } }]
    const media = (n: number) => Array.from({ length: n }, (_, i) => kinds[i % 3])
    expect(storyDraftSchema.safeParse(draftOf(doc(...media(STORY_BODY_LIMITS.maxMedia)))).success).toBe(true)
    const issue = firstIssue(doc(...media(STORY_BODY_LIMITS.maxMedia + 1)))
    expect(issue?.path.join('.')).toBe('body.content.100')
    expect(issue?.message).toMatch(/at most 100/)
  })

  it('video nodes count toward the media cap', () => {
    const videos = (n: number) => Array.from({ length: n }).fill({ type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: '', caption: '' } })
    expect(storyDraftSchema.safeParse(draftOf(doc(...videos(100)))).success).toBe(true)
    expect(firstIssue(doc(...videos(101)))?.path.join('.')).toBe('body.content.100')
  })

  it('the size cap counts UTF-8 bytes of the JSON, not characters', () => {
    const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length
    // 11 paragraphs of 10,000 two-byte letters: about 220,000 bytes but only about 110,000 characters.
    const wide = doc(...Array.from({ length: 11 }).fill(p('\u00E9'.repeat(10000))))
    expect(JSON.stringify(wide).length).toBeLessThan(STORY_BODY_LIMITS.maxBytes)
    expect(bytes(wide)).toBeGreaterThan(STORY_BODY_LIMITS.maxBytes)
    const issue = firstIssue(wide)
    expect(issue?.path.join('.')).toBe('body')
    expect(issue?.message).toMatch(/larger than 200000 bytes/)
  })

  it('a body of exactly 200,000 bytes is accepted and one byte more is refused', () => {
    const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length
    // Ten full paragraphs, then one filler paragraph sized to land on the cap.
    const full = Array.from({ length: 9 }).fill(p('a'.repeat(20000)))
    const make = (filler: number) => doc(...full, p('a'.repeat(filler)))
    const empty = bytes(make(0))
    const fit = make(STORY_BODY_LIMITS.maxBytes - empty)
    expect(bytes(fit)).toBe(STORY_BODY_LIMITS.maxBytes)
    expect(storyDraftSchema.safeParse(draftOf(fit)).success).toBe(true)
    const over = make(STORY_BODY_LIMITS.maxBytes - empty + 1)
    expect(bytes(over)).toBe(STORY_BODY_LIMITS.maxBytes + 1)
    expect(firstIssue(over)?.message).toMatch(/larger than 200000 bytes/)
  })
})

describe('[E2.13][AC30] the schema and the domain constants do not drift', () => {
  it('the contract and the domain hold the same limits, node types, mark types and link protocols', () => {
    expect(STORY_BODY_LIMITS).toEqual(DOMAIN_LIMITS)
    expect([...BODY_NODE_TYPES]).toEqual([...DOMAIN_NODE_TYPES])
    expect([...BODY_MARK_TYPES]).toEqual([...DOMAIN_MARK_TYPES])
    expect([...BODY_LINK_PROTOCOLS]).toEqual([...DOMAIN_LINK_PROTOCOLS])
  })

  it('every listed node type and mark type is accepted in some document, and one outside the list is refused', () => {
    const seen = new Set<string>()
    const marks = new Set<string>()
    const visit = (node: { type: string, content?: unknown[], marks?: { type: string }[] }) => {
      seen.add(node.type)
      for (const mark of node.marks ?? []) marks.add(mark.type)
      for (const child of node.content ?? []) visit(child as never)
    }
    expect(storyBodySchema.safeParse(everything).success).toBe(true)
    for (const node of everything.content) visit(node as never)
    expect([...seen].sort()).toEqual([...BODY_NODE_TYPES].sort())
    expect([...marks].sort()).toEqual([...BODY_MARK_TYPES].sort())
    expect(storyBodySchema.safeParse(doc({ type: 'horizontalRule' })).success).toBe(false)
  })

  it('the node and mark literals the schema declares are exactly the listed ones, both ways', () => {
    const json = z.toJSONSchema(storyBodySchema, { io: 'input', unrepresentable: 'any' })
    const literals = new Set<string>()
    const walk = (value: unknown, key = ''): void => {
      if (Array.isArray(value)) {
        value.forEach(item => walk(item, key))
        return
      }
      if (typeof value !== 'object' || value === null)
        return
      const object = value as Record<string, unknown>
      if (key === 'type' && typeof object.const === 'string')
        literals.add(object.const)
      if (key === 'type' && Array.isArray(object.enum))
        object.enum.forEach(item => literals.add(String(item)))
      for (const [k, child] of Object.entries(object))
        walk(child, k === 'properties' ? '' : k)
      const properties = object.properties as Record<string, unknown> | undefined
      if (properties?.type)
        walk(properties.type, 'type')
    }
    walk(json)
    literals.delete('doc')
    expect([...literals].sort()).toEqual([...BODY_NODE_TYPES, ...BODY_MARK_TYPES].sort())
  })

  it('the schema and the domain agree on which hrefs are safe', () => {
    for (const href of ['https://a.ch', 'HTTP://a.ch', 'mailto:a@b.ch', 'javascript:x', ' javascript:x', '/rel', 'data:text/html,x', 'ftp://a.ch', '']) {
      const accepted = storyDraftSchema.safeParse(draftOf(doc(p('a', [{ type: 'link', attrs: { href } }])))).success
      expect(accepted).toBe(isSafeLinkHref(href))
    }
  })
})
