import type { StoryBody } from '@sk/domain/content'

import { storyBodySchema } from '@sk/api-contract'
import { storyBodyFacts } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'

import { cleanBody } from '@/features/stories/lib/body'
import { bodyFactsLine } from '@/features/stories/lib/facts-line'
import { linkHref } from '@/features/stories/lib/link-input'
import { pastedHtml } from '@/features/stories/lib/paste'
import { storiesMerchantEn } from '@/features/stories/messages'
import { storiesMerchantDe } from '@/features/stories/messages.de'

function translator(messages: Record<string, string>) {
  return ((key: string, params?: Record<string, string | number>) =>
    Object.entries(params ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), messages[key]!)) as never
}

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')

/** A body of `count` words in all, `h2` of them level 2 headings of one word each. */
function bodyOf(count: number, h2: number): StoryBody {
  const headings = Array.from({ length: h2 }, () => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'head' }] }))
  const rest = count - h2

  return { type: 'doc', content: [...headings, ...(rest > 0 ? [{ type: 'paragraph', content: [{ type: 'text', text: words(rest) }] }] : [])] }
}

describe('[E4.3][AC30][AC45] story body rules', () => {
  const en = translator(storiesMerchantEn)
  const de = translator(storiesMerchantDe)

  it('[E4.3][AC45] AC-3 the facts line reads "0 words · 1 min read · No contents list (needs 2 headings)", "400 words · 2 min read · Contents: 2 sections" and "150 words · 1 min read · No contents list (needs 2 headings)"', () => {
    expect(bodyFactsLine(en, 'en-CH', storyBodyFacts(bodyOf(0, 0)))).toBe('0 words · 1 min read · No contents list (needs 2 headings)')
    expect(bodyFactsLine(en, 'en-CH', storyBodyFacts(bodyOf(400, 2)))).toBe('400 words · 2 min read · Contents: 2 sections')
    expect(bodyFactsLine(en, 'en-CH', storyBodyFacts(bodyOf(150, 1)))).toBe('150 words · 1 min read · No contents list (needs 2 headings)')
  })

  it('[E4.3][AC45] one word reads "1 word", and the German line reads "400 Wörter · 2 Min. Lesezeit · Inhalt: 2 Abschnitte"', () => {
    expect(bodyFactsLine(en, 'en-CH', storyBodyFacts(bodyOf(1, 0)))).toBe('1 word · 1 min read · No contents list (needs 2 headings)')
    expect(bodyFactsLine(de, 'de-CH', storyBodyFacts(bodyOf(400, 2)))).toBe('400 Wörter · 2 Min. Lesezeit · Inhalt: 2 Abschnitte')
  })

  it('[E4.3][AC30] every new storyEditor.body, format and link key exists in English and German', () => {
    const wanted = (key: string) => /^storyEditor\.(?:body|format|link|card\.story)/.test(key)
    const english = Object.keys(storiesMerchantEn).filter(wanted).sort()

    expect(english.length).toBeGreaterThanOrEqual(30)
    expect(Object.keys(storiesMerchantDe).filter(wanted).sort()).toEqual(english)
  })
})

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })

describe('[E4.3][AC45] cleanBody', () => {
  it('[E4.3][AC45] AC-1 strips target, rel, class and title from a link and start and type from an ordered list, and the result parses with storyBodySchema', () => {
    // The raw getJSON() of a stock StarterKit with the story switches, as found by running the installed packages.
    const raw = {
      type: 'doc',
      content: [
        para(text('see ', []), text('here', [{ type: 'link', attrs: { href: 'https://example.org', target: '_blank', rel: 'noopener noreferrer nofollow', class: null, title: null } }])),
        { type: 'orderedList', attrs: { start: 1, type: null }, content: [{ type: 'listItem', content: [para(text('one'))] }] },
      ],
    }
    const clean = cleanBody(raw)

    expect(storyBodySchema.safeParse(clean).success).toBe(true)
    expect(JSON.stringify(clean)).not.toMatch(/target|rel|class|title|start/)
    expect(clean.content[0]).toEqual(para(text('see '), text('here', [{ type: 'link', attrs: { href: 'https://example.org' } }])))
  })

  it('[E4.3][AC45] a body that is already clean comes back deep-equal (a bold and italic text, a nested list, a quote, an H3, a video, an audio, an image and a pinLink)', () => {
    const body = {
      type: 'doc',
      content: [
        para(text('both', [{ type: 'bold' }, { type: 'italic' }]), { type: 'hardBreak' }, text('pin', [{ type: 'pinLink', attrs: { pinId: ID } }])),
        { type: 'heading', attrs: { level: 3 }, content: [text('small')] },
        { type: 'blockquote', content: [para(text('quoted')), { type: 'paragraph' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('a')), { type: 'orderedList', content: [{ type: 'listItem', content: [para(text('b'))] }] }] }] },
        { type: 'image', attrs: { mediaId: ID, alt: 'a', caption: 'c' } },
        { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 't', caption: '' } },
        { type: 'audio', attrs: { mediaId: ID, title: 't', caption: '' } },
        { type: 'paragraph' },
      ],
    }

    expect(cleanBody(body)).toEqual(body)
    expect(storyBodySchema.safeParse(body).success).toBe(true)
  })

  it('[E4.3][AC30] a javascript: link mark is dropped and its text stays; a link over 2000 characters is dropped', () => {
    const long = `https://example.org/${'a'.repeat(2000)}`
    const clean = cleanBody({ type: 'doc', content: [para(text('bad', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]), text('long', [{ type: 'link', attrs: { href: long } }]))] })

    expect(clean.content[0]).toEqual(para(text('bad'), text('long')))
  })

  it('[E4.3][AC30] Review Focus 4: a 45,000-character text node becomes three text nodes of at most 20,000 characters with the same marks, and the body parses', () => {
    const clean = cleanBody({ type: 'doc', content: [para(text('x'.repeat(45_000), [{ type: 'bold' }]))] })
    const nodes = (clean.content[0] as { content: { text: string, marks: unknown[] }[] }).content

    expect(nodes.map(node => node.text.length)).toEqual([20_000, 20_000, 5000])
    expect(nodes.every(node => node.marks.length === 1)).toBe(true)
    expect(storyBodySchema.safeParse(clean).success).toBe(true)
  })

  it('[E4.3][AC30] unknown nodes (table, codeBlock) become their text as paragraphs; empty text nodes and empty content arrays are removed', () => {
    const table = { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [para(text('A'))] }, { type: 'tableCell', content: [para(text('B'))] }] }] }
    const clean = cleanBody({ type: 'doc', content: [table, { type: 'codeBlock', content: [text('code')] }, { type: 'paragraph', content: [text('')] }, { type: 'blockquote', content: [{ type: 'heading', attrs: { level: 2 }, content: [text('h')] }] }] })

    expect(clean.content).toEqual([para(text('A')), para(text('B')), para(text('code')), { type: 'paragraph' }, { type: 'blockquote', content: [para(text('h'))] }])
    expect(storyBodySchema.safeParse(clean).success).toBe(true)
  })

  it('[E4.3][AC45] AC-4 a text node with both a link and a pin link keeps the pin link only', () => {
    const marks = [{ type: 'link', attrs: { href: 'https://zyt.example' } }, { type: 'pinLink', attrs: { pinId: '0198a000-0000-7000-8000-000000000010' } }, { type: 'bold' }]
    const clean = cleanBody({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Zyt', marks }] }] })
    const paragraph = clean.content?.[0] as unknown as { content: { marks: { type: string }[] }[] }
    const kept = paragraph.content[0]!.marks.map(mark => mark.type)

    expect(kept).toEqual(['pinLink', 'bold'])
    expect(storyBodySchema.safeParse(clean).success).toBe(true)
  })

  it('[E4.3][AC30] an empty result is the empty body', () => {
    expect(cleanBody({ type: 'doc', content: [] })).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(cleanBody(null)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
})

describe('[E4.3][AC30] link check and paste reducer', () => {
  it('[E4.3][AC30] AC-5 linkHref accepts https://example.org, http://a.ch/x?y=1 and mailto:a@b.ch, and refuses javascript:alert(1), JAVASCRIPT:alert(1), data:text/html,x, ftp://a.ch, "example.org", "https://", "https://exa mple.org", "mailto:" and a 2001-character https address', () => {
    for (const ok of ['https://example.org', 'http://a.ch/x?y=1', 'mailto:a@b.ch'])
      expect(linkHref(` ${ok} `)).toBe(ok)
    for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', 'ftp://a.ch', 'example.org', 'https://', 'https://exa mple.org', 'mailto:', `https://a.ch/${'a'.repeat(1990)}${'b'.repeat(20)}`])
      expect(linkHref(bad)).toBeUndefined()
    expect(`https://a.ch/${'a'.repeat(1988)}`.length).toBe(2001)
    expect(linkHref(`https://a.ch/${'a'.repeat(1988)}`)).toBeUndefined()
  })

  it('[E4.3][AC30] pastedHtml turns a 2 by 2 table into two paragraphs "A B" and "C D", leaves other markup as it is, and a table with only empty cells disappears', () => {
    expect(pastedHtml('<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>')).toBe('<p>A B</p><p>C D</p>')
    expect(pastedHtml('<p>x <strong>y</strong></p>')).toBe('<p>x <strong>y</strong></p>')
    expect(pastedHtml('<p>keep</p><table><tr><td> </td><td></td></tr></table>')).toBe('<p>keep</p>')
  })
})
