import { afterEach, describe, expect, it, vi } from 'vitest'

import { percentOf, pluralCategory } from '@/lib/format'

describe('formatMoney', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('formats Swiss francs with the ISO code and a typographic apostrophe', async () => {
    const { formatMoney } = await import('@/lib/format')

    expect(formatMoney(1249.5, 'de-CH')).toMatch(/^CHF.1’249\.50$/)
  })

  it('replaces the straight apostrophe that Chrome\'s ICU emits with the one the design system specifies', async () => {
    vi.resetModules()
    // Must stay a `function`: the code under test calls it with `new`, which an arrow function cannot take.

    vi.spyOn(Intl, 'NumberFormat').mockImplementation(function stub() {
      return { format: () => 'CHF 1\'249.00' } as unknown as Intl.NumberFormat
    })
    const { formatMoney } = await import('@/lib/format')

    expect(formatMoney(1249, 'de-CH')).toBe('CHF 1’249.00')
  })
})

describe('percentOf', () => {
  it('shows a share of the whole', () => {
    expect(percentOf(1, 4, 'en-CH')).toBe('25%')
  })

  it('reads an empty whole as 0%', () => {
    expect(percentOf(5, 0, 'en-CH')).toBe('0%')
  })

  it('keeps the requested decimals', () => {
    expect(percentOf(1, 8, 'en-CH', 1)).toBe('12.5%')
  })
})

describe('pluralCategory', () => {
  it('picks one for 1 and other for the rest in English', () => {
    expect(pluralCategory('en-CH', 1)).toBe('one')
    expect(pluralCategory('en-CH', 0)).toBe('other')
    expect(pluralCategory('en-CH', 2)).toBe('other')
  })

  it('picks one for 1 in German', () => {
    expect(pluralCategory('de-CH', 1)).toBe('one')
    expect(pluralCategory('de-CH', 2)).toBe('other')
  })
})
