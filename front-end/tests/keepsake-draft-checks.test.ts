import { descriptionFromPlain } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'

import { publishChecks } from '@/features/keepsakes/lib/draft-product'

const d = (text: string) => descriptionFromPlain(text)
const full = { name: { en: 'Knife', de: '' }, text: { en: d('A knife'), de: undefined } }
const option = { id: 'size', name: { en: 'Size', de: 'Grösse' }, values: [{ id: 's', label: { en: 'Small', de: 'Klein' } }] }
const base = { value: full, photoIds: ['p1'], commission: 0.1, options: [option], variants: [{ skuCode: 'K-1', status: 'published' as const }] }

describe('[T-007B] the publish checks of a keepsake that is only in the browser', () => {
  it('[T-007B] a draft with one language, a photo and a variant for sale can go live and warns about the other language', () => {
    expect(publishChecks(base)).toEqual({ blocking: [], warnings: [{ code: 'other-language', card: 'basics', language: 'de' }] })
  })

  it('[T-007B] no full language, no photo and no variant for sale each block', () => {
    const found = publishChecks({ ...base, value: { name: { en: 'Knife', de: '' }, text: { en: undefined, de: undefined } }, photoIds: [], variants: [] })

    expect(found.blocking.map(check => check.code)).toEqual(['language', 'photos', 'variant-for-sale'])
  })

  it('[T-007B] a missing German label, a hidden variant and no commission only warn', () => {
    const both = { name: { en: 'Knife', de: 'Messer' }, text: { en: d('A'), de: d('B') } }
    const found = publishChecks({ ...base, value: both, commission: 0, options: [{ ...option, name: { en: 'Size' } }], variants: [{ skuCode: 'K-1', status: 'published' }, { skuCode: 'K-2', status: 'draft' }] })

    expect(found.blocking).toEqual([])
    expect(found.warnings.map(check => check.code)).toEqual(['option-labels', 'hidden', 'commission-zero'])
  })
})
