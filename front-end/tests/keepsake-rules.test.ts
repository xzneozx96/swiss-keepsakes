import { describe, expect, it } from 'vitest'

import { checkText, fullLanguages, isSkuCode, languageState, nameIn, photoSrc, statusOf, suggestSkuCode, toRappen, variantSummary } from '@/features/keepsakes/lib/keepsake-rules'
import { problemMessageKey } from '@/features/keepsakes/lib/problems'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

function text(name: { en?: string, de?: string }, body: { en?: string, de?: string }) {
  return {
    name: { en: name.en ?? '', de: name.de ?? '' },
    text: { en: body.en ?? '', de: body.de ?? '' },
  }
}

function translate(dictionary: Record<string, string>) {
  return (key: string, params: Record<string, string | number> = {}) =>
    Object.entries(params).reduce((line, [name, value]) => line.split(`{${name}}`).join(String(value)), dictionary[key] ?? key)
}

describe('[E6.1][AC30] a language is full with a name and a text', () => {
  it.each([
    [text({ en: 'A' }, { en: 'B' }), ['en']],
    [text({ de: 'A' }, { de: 'B' }), ['de']],
    [text({ en: 'A', de: 'A' }, { en: 'B', de: 'B' }), ['en', 'de']],
    [text({ en: 'A' }, { de: 'B' }), []],
    [text({ en: '  ' }, { en: 'B' }), []],
  ])('[E6.1][AC30] %j is full in %j', (value, expected) => {
    expect(fullLanguages(value)).toEqual(expected)
  })

  it('[E6.1][AC30] says what each language still needs', () => {
    const value = text({ en: 'A', de: '' }, { en: '', de: 'B' })

    expect(languageState(value, 'en')).toBe('missing-text')
    expect(languageState(value, 'de')).toBe('missing-name')
    expect(languageState(text({}, {}), 'en')).toBe('not-written')
    expect(languageState(text({ en: 'A' }, { en: 'B' }), 'en')).toBe('complete')
  })

  it('[E6.1] shows the other language when the reading one is empty', () => {
    expect(nameIn({ de: 'Messer' }, 'en')).toBe('Messer')
    expect(nameIn({}, 'en')).toBe('')
  })
})

describe('[E6.1][variant] the variant fields', () => {
  it.each(['VX-S-SWAN', 'a1', 'VX_1.2'])('[E6.1][variant] accepts the code %s', (code) => {
    expect(isSkuCode(code)).toBe(true)
  })

  it.each(['', 'VX S', '-VX', 'VX--S'])('[E6.1][variant] refuses the code "%s"', (code) => {
    expect(isSkuCode(code)).toBe(false)
  })

  it('[E6.1][variant] suggests a code from the name', () => {
    expect(suggestSkuCode('Victorinox Classic')).toBe('VICTORINOX-CLASSIC')
    expect(suggestSkuCode('Kapellbrücke Messer')).toBe('KAPELLBRUCKE-MESSER')
    expect(suggestSkuCode('')).toBe('')
  })

  it.each([[39, 3900], [0.1, 10], [19.99, 1999]])('[E6.1][variant] CHF %s is %s Rappen', (francs, rappen) => {
    expect(toRappen(francs)).toBe(rappen)
  })

  it.each([0, -1, Number.NaN, undefined])('[E6.1][variant] refuses the price %s', (francs) => {
    expect(toRappen(francs)).toBeUndefined()
  })
})

describe('[E6.1] photos and status', () => {
  const photo = { publicUrl: 'https://s/o.jpg', variants: [{ width: 640, url: 'https://s/640' }, { width: 320, url: 'https://s/320' }] }

  it('[E6.1] picks the smallest resized copy that is wide enough, else the original', () => {
    expect(photoSrc(photo, 160)).toBe('https://s/320')
    expect(photoSrc(photo, 400)).toBe('https://s/640')
    expect(photoSrc(photo, 2000)).toBe('https://s/o.jpg')
    expect(photoSrc({ publicUrl: null, variants: [] }, 160)).toBeUndefined()
  })

  it.each([
    [{ status: 'draft', hasUnpublishedEdits: false }, 'neutral', 'keepsakes.status.draft'],
    [{ status: 'published', hasUnpublishedEdits: false }, 'success', 'keepsakes.status.published'],
    [{ status: 'published', hasUnpublishedEdits: true }, 'warning', 'keepsakes.status.editsNotLive'],
  ] as const)('[E6.1][review] %j reads %s', (keepsake, tone, key) => {
    expect(statusOf(keepsake)).toEqual({ tone, key })
  })
})

describe.each([['en', en], ['de', de]] as const)('[E6.1][list] the variant line in %s', (_language, dictionary) => {
  const t = translate(dictionary) as Parameters<typeof variantSummary>[0]

  it('[E6.1][list] counts the variants and names the sold-out ones only when there are some', () => {
    expect(variantSummary(t, 1, 0)).toBe(_language === 'en' ? '1 variant' : '1 Variante')
    expect(variantSummary(t, 2, 0)).toBe(_language === 'en' ? '2 variants' : '2 Varianten')
    expect(variantSummary(t, 2, 1)).toBe(_language === 'en' ? '2 variants · 1 sold out' : '2 Varianten · 1 ausverkauft')
  })
})

describe.each([['en', en], ['de', de]] as const)('[E6.1][checks] the publish checks in %s', (_language, dictionary) => {
  const t = translate(dictionary) as Parameters<typeof checkText>[0]

  it('[E6.1][checks] every check code has text, with its numbers', () => {
    const codes = ['language', 'photos', 'variant-for-sale', 'other-language', 'hidden', 'commission-zero'] as const
    const lines = codes.map(code => checkText(t, { code, card: 'basics', count: 2, codes: ['A-1', 'A-2'], language: 'de' }))

    expect(lines.every(line => line.length > 0 && !line.includes('keepsakes.') && !line.includes('{'))).toBe(true)
    expect(checkText(t, { code: 'hidden', card: 'variants', count: 2, codes: ['A-1', 'A-2'] })).toContain('A-1, A-2')
  })
})

describe('[E6.1] the copy of a refusal', () => {
  it('[E6.1][412] a stale save has its own text and an unknown problem reads as generic', () => {
    expect(problemMessageKey('precondition-failed')).toBe('keepsakes.problem.stale')
    expect(problemMessageKey('sku-code-taken')).toBe('keepsakes.problem.skuTaken')
    expect(problemMessageKey('something-new')).toBe('keepsakes.problem.generic')
  })
})
