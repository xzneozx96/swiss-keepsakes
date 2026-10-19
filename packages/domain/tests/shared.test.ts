import { describe, expect, it } from 'vitest'

import * as shared from '../src/shared'

describe('[E1.2] shared/format', () => {
  it('formats money as CHF with the design system apostrophe', () => {
    expect(shared.formatMoney(1249, 'en-CH')).toMatch(/^CHF.1’249\.00$/)
  })

  it('reads a calendar day at noon UTC', () => {
    expect(shared.calendarDay('2026-10-14').toISOString()).toBe('2026-10-14T12:00:00.000Z')
  })

  it('writes a short date with the month as a word, adding the year only for another year', () => {
    expect(shared.formatShortDate('2026-10-14', '2026-10-19', 'en-CH')).toBe('Wed 14 Oct')
    expect(shared.formatShortDate('2027-01-05', '2026-10-19', 'en-CH')).toBe('Tue 5 Jan 2027')
  })
})

describe('[E1.2] shared/localized', () => {
  it('returns the requested language without a fallback flag', () => {
    expect(shared.pickText({ en: 'Hello', de: 'Hallo' }, 'de')).toEqual({ text: 'Hallo', language: 'de', isFallback: false })
  })

  it('falls back to the language that exists and says so', () => {
    expect(shared.pickText({ en: 'Hello' }, 'de')).toEqual({ text: 'Hello', language: 'en', isFallback: true })
    expect(shared.pickText({}, 'de')).toEqual({ text: '', language: 'de', isFallback: true })
  })
})

describe('[E1.2] shared/slug', () => {
  it('turns umlauts into ae, oe and ue and strips the rest', () => {
    expect(shared.slugify('Kapellbrücke Taschenmesser')).toBe('kapellbruecke-taschenmesser')
    expect(shared.slugify('  --Café  Nº 5!-- ')).toBe('cafe-n-5')
  })

  it('cuts to 60 characters without a trailing dash', () => {
    const slug = shared.slugify(`${'a'.repeat(59)} b`)

    expect(slug).toHaveLength(59)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('[E1.2] shared/rich-text', () => {
  it('reads the text of a document and detects an empty one', () => {
    const doc = shared.richDoc([shared.richParagraph('Hello')])

    expect(shared.nodeText(doc)).toContain('Hello')
    expect(shared.isEmptyDoc(doc)).toBe(false)
    expect(shared.isEmptyDoc(shared.richDoc([shared.richParagraph('')]))).toBe(true)
  })

  it('only lets safe links through', () => {
    expect(shared.safeHref('https://example.com/a')).toBe('https://example.com/a')
    expect(shared.safeHref('javascript:alert(1)')).toBeUndefined()
  })
})
