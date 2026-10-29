import type { ProductDoc, ProductVariant } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it } from 'vitest'
import { fullLanguages, publishChecks, publishGaps } from '../../../src/modules/catalog/application/publish-checks.ts'

const photo = '0190f0c2-0000-7000-8000-0000000000e1'
const forSale: ProductVariant = { id: 'v1', skuCode: 'VX-1', priceRappen: 3900, status: 'published' }
const doc = (over: Partial<ProductDoc> = {}): ProductDoc => ({ name: { en: 'Knife' }, text: { en: 'A knife.' }, media: [photo], ...over })
function checks(over: { doc?: ProductDoc, variants?: ProductVariant[], commissionRate?: number } = {}) {
  return publishChecks({ doc: doc(), variants: [forSale], commissionRate: 0.1, ...over })
}

describe('[E6.1][AC30] a language is full with a name and a text', () => {
  it.each([
    [{ name: { en: 'A' }, text: { en: 'B' } }, ['en']],
    [{ name: { de: 'A' }, text: { de: 'B' } }, ['de']],
    [{ name: { en: 'A', de: 'A' }, text: { en: 'B', de: 'B' } }, ['en', 'de']],
    [{ name: { en: 'A' }, text: { de: 'B' } }, []],
    [{ name: { en: '  ' }, text: { en: 'B' } }, []],
    [{ name: {}, text: {} }, []],
  ])('[E6.1][AC30] %j is full in %j', (input, expected) => {
    expect(fullLanguages(input)).toEqual(expected)
  })
})

describe('[E6.1][checks] the blocking checks', () => {
  it('[E6.1][AC30] one full language is enough to publish, in English or in German', () => {
    expect(checks().blocking).toEqual([])
    expect(checks({ doc: doc({ name: { de: 'Messer' }, text: { de: 'Ein Messer.' } }) }).blocking).toEqual([])
  })

  it('[E6.1][AC30] a name in one language and a text only in the other blocks', () => {
    const result = checks({ doc: doc({ name: { en: 'Knife' }, text: { de: 'Ein Messer.' } }) })

    expect(result.blocking).toEqual([{ code: 'language', card: 'basics' }])
    expect(publishGaps(result)).toEqual(['name'])
  })

  it('[E6.1][checks] no photo blocks', () => {
    expect(checks({ doc: doc({ media: [] }) }).blocking).toEqual([{ code: 'photos', card: 'photos' }])
  })

  it('[E6.1][checks] no variant for sale blocks, hidden or none', () => {
    expect(checks({ variants: [{ ...forSale, status: 'draft' }] }).blocking).toEqual([{ code: 'variant-for-sale', card: 'variants' }])
    expect(checks({ variants: [] }).blocking).toEqual([{ code: 'variant-for-sale', card: 'variants' }])
  })

  it('[E6.1][checks] an archived variant is not checked and not for sale', () => {
    expect(checks({ variants: [{ ...forSale, status: 'archived' }] }).blocking).toEqual([{ code: 'variant-for-sale', card: 'variants' }])
  })

  it('[E6.1][checks] every gap is named once', () => {
    const result = checks({ doc: doc({ name: {}, text: {}, media: [] }), variants: [] })

    expect(publishGaps(result)).toEqual(['name', 'photos', 'variants'])
  })
})

describe('[E6.1][checks] the warnings never block', () => {
  it('[E6.1][AC30] the other language missing is a warning that names it', () => {
    expect(checks().warnings).toEqual([{ code: 'other-language', card: 'basics', language: 'de' }])
    expect(checks({ doc: doc({ name: { de: 'M' }, text: { de: 'T' } }) }).warnings).toEqual([{ code: 'other-language', card: 'basics', language: 'en' }])
  })

  it('[E6.1][checks] both languages full gives no language warning', () => {
    expect(checks({ doc: doc({ name: { en: 'A', de: 'A' }, text: { en: 'B', de: 'B' } }) }).warnings).toEqual([])
  })

  it('[E6.1][checks] a hidden variant is listed with its code', () => {
    const hidden: ProductVariant = { id: 'v2', skuCode: 'VX-2', priceRappen: 100, status: 'draft' }

    expect(checks({ variants: [forSale, hidden] }).warnings).toContainEqual({ code: 'hidden', card: 'variants', count: 1, codes: ['VX-2'] })
  })

  it('[E6.1][checks] a zero commission is a warning', () => {
    expect(checks({ commissionRate: 0 }).warnings).toContainEqual({ code: 'commission-zero', card: 'commission' })
  })
})
