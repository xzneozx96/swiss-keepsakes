import type { ProductOption } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'
import { missingCombinations } from '@/features/keepsakes/lib/variant-rules'

const option = (id: string, values: string[]): ProductOption => ({ id, name: { en: id }, values: values.map(v => ({ id: v, label: { en: v }, swatch: null })) })
const size = option('size', ['s', 'l'])
const theme = option('theme', ['swan', 'lion'])

describe('[ADD-ALL] missingCombinations', () => {
  it('lists every combination when nothing is sold, in option order', () => {
    expect(missingCombinations([size, theme], [])).toEqual([
      { size: 's', theme: 'swan' },
      { size: 's', theme: 'lion' },
      { size: 'l', theme: 'swan' },
      { size: 'l', theme: 'lion' },
    ])
  })

  it('counts an archived combination as taken, and a hidden one', () => {
    const variants = [{ values: { size: 's', theme: 'swan' } }, { values: { size: 'l', theme: 'swan' } }]

    expect(missingCombinations([size, theme], variants)).toEqual([{ size: 's', theme: 'lion' }, { size: 'l', theme: 'lion' }])
  })

  it('is empty when all are sold, and for a keepsake with no option', () => {
    expect(missingCombinations([size], [{ values: { size: 's' } }, { values: { size: 'l' } }])).toEqual([])
    expect(missingCombinations([], [])).toEqual([])
  })

  it('does not count a variant that lost a value as taking a combination', () => {
    expect(missingCombinations([size], [{ values: {} }])).toHaveLength(2)
  })
})
