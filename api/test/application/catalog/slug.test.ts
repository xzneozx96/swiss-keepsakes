import { describe, expect, it } from 'vitest'
import { isSkuCode } from '../../../src/modules/catalog/application/sku-code.ts'
import { productSlug } from '../../../src/modules/catalog/application/slug.ts'

const none = { en: new Set<string>(), de: new Set<string>() }

describe('[E6.1] the web address of a keepsake', () => {
  it('[E6.1] is made from the name of each language that has one', () => {
    expect(productSlug({ stored: null, name: { en: 'Victorinox Classic', de: 'Kapellbrücke Taschenmesser' }, taken: none }))
      .toEqual({ en: 'victorinox-classic', de: 'kapellbruecke-taschenmesser' })
  })

  it('[E6.1] covers only the languages with a name', () => {
    expect(productSlug({ stored: null, name: { de: 'Messer' }, taken: none })).toEqual({ de: 'messer' })
  })

  it('[E6.1] takes the next free one when another product holds it', () => {
    expect(productSlug({ stored: null, name: { en: 'Knife' }, taken: { en: new Set(['knife', 'knife-2']), de: new Set() } })).toEqual({ en: 'knife-3' })
  })

  it('[E6.1] keeps a live address when the name changes', () => {
    expect(productSlug({ stored: { en: 'knife' }, name: { en: 'Big knife' }, taken: none })).toEqual({ en: 'knife' })
  })

  it('[E6.1] drops the address of a language that lost its name, and adds one for a new language', () => {
    expect(productSlug({ stored: { en: 'knife' }, name: { de: 'Messer' }, taken: none })).toEqual({ de: 'messer' })
  })
})

describe('[E6.1] a SKU code', () => {
  it.each(['VX-S-SWAN', 'a1', 'VX_1.2', 'VX-S-swan'])('[E6.1] accepts %s', (code) => {
    expect(isSkuCode(code)).toBe(true)
  })

  it.each(['', 'VX S', '-VX', 'VX-', 'VX--S', 'VX/1', 'Gravur äö'])('[E6.1] refuses "%s"', (code) => {
    expect(isSkuCode(code)).toBe(false)
  })
})
