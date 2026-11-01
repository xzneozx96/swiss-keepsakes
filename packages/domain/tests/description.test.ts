import { describe, expect, it } from 'vitest'

import { descriptionFromPlain, descriptionLanguages, descriptionLength, isEmptyDescription } from '../src/content'

const text = (value: string) => ({ type: 'text', text: value })
const paragraph = (...content: object[]) => ({ type: 'paragraph', content })
const doc = (...content: object[]) => ({ type: 'doc' as const, content })

describe('[DESC-rich] a keepsake description', () => {
  it('counts only the text a guest reads: a line break and a paragraph boundary add nothing', () => {
    const value = doc(
      paragraph(text('ab'), { type: 'hardBreak' }, { ...text('cd'), marks: [{ type: 'bold' }] }),
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('ef'))] }] },
    )

    expect(descriptionLength(value)).toBe(6)
    expect(descriptionLength(undefined)).toBe(0)
  })

  it('is empty without text, and Tiptap\'s empty document is empty', () => {
    expect(isEmptyDescription(doc(paragraph()))).toBe(true)
    expect(isEmptyDescription(doc(paragraph(text('  '))))).toBe(true)
    expect(isEmptyDescription(undefined)).toBe(true)
    expect(isEmptyDescription(doc(paragraph(text('Hi'))))).toBe(false)
  })

  it('names the languages that have text, in en, de order', () => {
    expect(descriptionLanguages({ de: doc(paragraph(text('Messer'))), en: doc(paragraph(text('Knife'))) })).toEqual(['en', 'de'])
    expect(descriptionLanguages({ en: doc(paragraph(text(' '))), de: doc(paragraph(text('Messer'))) })).toEqual(['de'])
    expect(descriptionLanguages(null)).toEqual([])
  })

  it('turns plain text into paragraphs on blank lines and hard breaks on single newlines', () => {
    expect(descriptionFromPlain('One\nTwo\n\n  \nThree  \r\n\r\nFour')).toEqual(doc(
      paragraph(text('One'), { type: 'hardBreak' }, text('Two')),
      paragraph(text('Three')),
      paragraph(text('Four')),
    ))
    expect(descriptionFromPlain('  \n ')).toBeUndefined()
  })
})
