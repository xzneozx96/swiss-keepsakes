import type { ProductOption, ProductVariant } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { codeProblem, findTwin, isComplete, normaliseValues, variantsBody } from '@/features/keepsakes/lib/variant-rules'

const value = (id: string) => ({ id, label: { en: id }, swatch: null })
const options: ProductOption[] = [
  { id: 'size', name: { en: 'Size' }, values: [value('s'), value('m')] },
  { id: 'theme', name: { en: 'Theme' }, values: [value('bridge'), value('lion')] },
]
const variant = (skuCode: string, values: Record<string, string>, status: ProductVariant['status'] = 'published'): ProductVariant => ({ id: skuCode, skuCode, priceRappen: 2900, status, values })
const others = [variant('VX-M-BRIDGE', { size: 'm', theme: 'bridge' }), variant('VX-S-LION', { size: 's', theme: 'lion' }, 'archived')]

describe('[T-007B] a variant against the options', () => {
  it('[T-007B] is complete with one value of every option, and a keepsake with no option always is', () => {
    expect(isComplete(options, { size: 's', theme: 'lion' })).toBe(true)
    expect(isComplete(options, { size: 's' })).toBe(false)
    expect(isComplete(options, { size: 'gone', theme: 'lion' })).toBe(false)
    expect(isComplete([], {})).toBe(true)
  })

  it('[T-007B] finds the variant that holds the combination, archived ones too, and none while a value is missing', () => {
    expect(findTwin(options, others, { size: 'm', theme: 'bridge' })?.skuCode).toBe('VX-M-BRIDGE')
    expect(findTwin(options, others, { size: 's', theme: 'lion' })?.status).toBe('archived')
    expect(findTwin(options, others, { size: 'm', theme: 'lion' })).toBeUndefined()
    expect(findTwin(options, others, { size: 'm' })).toBeUndefined()
    expect(findTwin([], others, {})).toBeUndefined()
  })

  it('[T-007B] drops the values that no longer exist', () => {
    expect(normaliseValues(options, { size: 's', theme: 'gone', colour: 'red' })).toEqual({ size: 's' })
    expect(normaliseValues([], { size: 's' })).toEqual({})
  })
})

describe('[T-007B] a code', () => {
  it('[T-007B] is required, made of letters, digits and - _ ., and used once among the other variants', () => {
    expect(codeProblem('  ', others)).toBe('required')
    expect(codeProblem('bad code', others)).toBe('invalid')
    expect(codeProblem('vx-m-bridge', others)).toBe('taken')
    expect(codeProblem('VX-L-LION', others)).toBeUndefined()
  })
})

describe('[T-007B] what a new keepsake sends', () => {
  it('[T-007B] is the code, the price and the values of each variant', () => {
    expect(variantsBody(others)).toEqual([
      { skuCode: 'VX-M-BRIDGE', priceRappen: 2900, values: { size: 'm', theme: 'bridge' } },
      { skuCode: 'VX-S-LION', priceRappen: 2900, values: { size: 's', theme: 'lion' } },
    ])
  })
})
