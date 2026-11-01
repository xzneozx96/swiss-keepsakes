import { productCreateBodySchema, productSaveBodySchema, TEXT_MAX } from '@sk/api-contract'
import type { DescriptionNode } from '@sk/domain/content'
import { descriptionLength, isEmptyDescription } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'

const t = (text: string, marks?: unknown[]): DescriptionNode => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const p = (...content: DescriptionNode[]): DescriptionNode => ({ type: 'paragraph', content })
const doc = (...content: DescriptionNode[]) => ({ type: 'doc', content })
const item = (...content: DescriptionNode[]): DescriptionNode => ({ type: 'listItem', content })
const save = (text: unknown) => productSaveBodySchema.safeParse({ text })
const issue = (text: unknown) => {
  const result = save(text)
  return result.success ? undefined : result.error.issues[0]
}

describe('[DESC-rich] the keepsake description in the save body', () => {
  it('accepts paragraphs, hard breaks, bold, italic, links and nested lists', () => {
    const body = {
      en: doc(
        p(t('Hand '), t('made', [{ type: 'bold' }]), { type: 'hardBreak' }, t('in ', [{ type: 'italic' }]), t('Lucerne', [{ type: 'link', attrs: { href: 'https://example.ch/a' } }, { type: 'bold' }])),
        { type: 'bulletList', content: [item(p(t('one')), { type: 'orderedList', content: [item(p(t('nested')))] })] },
        { type: 'orderedList', content: [item(p(t('first'))), item(p(t('mail', [{ type: 'link', attrs: { href: 'mailto:a@b.ch' } }])))] },
      ),
      de: doc(p(t('Ein Messer.'))),
    }

    expect(save(body).success).toBe(true)
  })

  it.each([
    ['a heading', doc({ type: 'heading', attrs: { level: 2 }, content: [t('H')] })],
    ['a quote', doc({ type: 'blockquote', content: [p(t('q'))] })],
    ['an image', doc({ type: 'image', attrs: { mediaId: '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d', alt: '', caption: '' } })],
    ['an audio file', doc({ type: 'audio', attrs: { mediaId: '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d', title: '', caption: '' } })],
    ['a pin link', doc(p(t('x', [{ type: 'pinLink', attrs: { pinId: '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d' } }])))],
    ['a javascript: link', doc(p(t('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])))],
    ['a data: link', doc(p(t('x', [{ type: 'link', attrs: { href: 'data:text/html,hi' } }])))],
    ['a link with an attribute the editor does not store', doc(p(t('x', [{ type: 'link', attrs: { href: 'https://a.ch', target: '_blank' } }])))],
    ['an underline', doc(p(t('x', [{ type: 'underline' }])))],
    ['an unknown key', { ...doc(p(t('x'))), extra: 1 }],
    ['an empty document', doc()],
    ['a document of an empty paragraph', doc(p())],
    ['a document of blanks', doc(p(t('   ')))],
    ['a text with a NUL character', doc(p(t('a\u0000b')))],
    ['a string', 'Plain text'],
  ])('refuses %s', (_name, body) => {
    expect(save({ en: body }).success).toBe(false)
  })

  it('refuses a document nested deeper than the story limit', () => {
    let list: DescriptionNode = { type: 'bulletList', content: [item(p(t('deep')))] }

    for (let level = 0; level < 5; level++)
      list = { type: 'bulletList', content: [item(list)] }

    expect(save({ en: doc(list) }).success).toBe(false)
  })

  it('counts the visible text against the limit, not the markup or the line breaks', () => {
    const marked = Array.from({ length: TEXT_MAX / 2 }, () => t('ab', [{ type: 'bold' }]))
    const withBreaks = Array.from({ length: TEXT_MAX / 2 }, () => [t('ab'), { type: 'hardBreak' }]).flat()

    expect(save({ en: doc(p(...marked)) }).success).toBe(true)
    expect(save({ en: doc(p(...withBreaks.slice(0, -1))) }).success).toBe(true)
    expect(save({ en: doc(p(t('a'.repeat(TEXT_MAX))), p(t('b'))) }).success).toBe(false)
    expect(issue({ en: doc(p(t('a'.repeat(TEXT_MAX + 1)))) })?.message).toMatch(/1200/)
  })

  it('agrees with the domain rules on what is empty and how long a text is', () => {
    const samples: [DescriptionNode, number][] = [[doc(p()), 0], [doc(p(t('  '))), 2], [doc(p(t('Hi'))), 2], [doc(p(t('ab'), { type: 'hardBreak' }, t('cd')), { type: 'bulletList', content: [item(p(t('ef')))] }), 6]]

    for (const [sample, length] of samples) {
      expect(save({ en: sample }).success).toBe(!isEmptyDescription(sample))
      expect(descriptionLength(sample)).toBe(length)
    }
    // The limit is the same number on both sides: a document the domain counts as 1200 passes, 1201 does not.
    const atLimit = doc(p(t('a'.repeat(600)), { type: 'hardBreak' }, t('b'.repeat(400))), { type: 'orderedList', content: [item(p(t('c'.repeat(200))))] })

    expect(descriptionLength(atLimit)).toBe(TEXT_MAX)
    expect(save({ en: atLimit }).success).toBe(true)
    expect(save({ en: doc(...atLimit.content, p(t('d'))) }).success).toBe(false)
  })

  it('takes the same description when a keepsake is created', () => {
    const body = { name: { en: 'Knife' }, text: { en: doc(p(t('A knife.'))) }, variants: [{ skuCode: 'K-1', priceRappen: 100 }] }

    expect(productCreateBodySchema.safeParse(body).success).toBe(true)
    expect(productCreateBodySchema.safeParse({ ...body, text: { en: 'A knife.' } }).success).toBe(false)
  })
})
