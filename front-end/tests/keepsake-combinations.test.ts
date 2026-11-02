import type { OptionDraft } from '@/features/keepsakes/lib/option-rules'

import { describe, expect, it } from 'vitest'

import { groupByFirstOption, planOptionsDone, priceRange, uniqueCode } from '@/features/keepsakes/lib/combinations'

const option = (ref: string, values: string[]): OptionDraft => ({ ref, name: { en: ref, de: '' }, values: values.map(value => ({ ref: value, label: { en: value, de: '' } })) })
const variant = (id: string, values: Record<string, string>, status: 'published' | 'draft' | 'archived' = 'published', skuCode = id.toUpperCase()) => ({ id, skuCode, status, values })

describe('[T-008] what saving the options brings', () => {
  it('[T-008][AC3] a first option: the one variant takes its first value and the others are new, at the same price', () => {
    const plan = planOptionsDone({ options: [option('size', ['xs', 's', 'm', 'l'])], committed: new Set(), variants: [variant('v1', {})], basePrice: 3900, codeBase: null })

    expect(plan.variantValues).toEqual([{ variantId: 'v1', values: { size: 'xs' } }])
    expect(plan.newVariants.map(made => made.values)).toEqual([{ size: 's' }, { size: 'm' }, { size: 'l' }])
    expect(plan.newVariants.every(made => made.priceRappen === 3900)).toBe(true)
    // The SKU switch is off, so the new variants have no code.
    expect(plan.newVariants.map(made => made.skuCode)).toEqual([null, null, null])
  })

  it('[T-010][AC2] with the SKU switch on the new codes are the keepsake code and the full labels, upper case, each used once', () => {
    const on = planOptionsDone({ options: [option('size', ['xs', 's', 'm', 'l'])], committed: new Set(), variants: [variant('v1', {}, 'published', '1.6795')], basePrice: 3900, codeBase: '1.6795' })

    expect(on.newVariants.map(made => made.skuCode)).toEqual(['1.6795-S', '1.6795-M', '1.6795-L'])
    const light = planOptionsDone({ options: [option('colour', ['red', 'Light blue'])], committed: new Set(['colour', 'red']), variants: [variant('a', { colour: 'red' })], basePrice: 100, codeBase: '' })

    expect(light.newVariants.map(made => made.skuCode)).toEqual(['LIGHT-BLUE'])
    expect(planOptionsDone({ options: [option('size', ['s', 'S'])], committed: new Set(['size']), variants: [variant('a', { size: 'x' }, 'published', 'K-S')], basePrice: 100, codeBase: 'K' }).newVariants.map(made => made.skuCode)).toEqual(['K-S-2', 'K-S-3'])
  })

  it('[T-008][AC4] a second option copies every row for each value after the first', () => {
    const size = option('size', ['s', 'm'])
    const plan = planOptionsDone({
      options: [size, option('colour', ['red', 'blue'])],
      committed: new Set(['size', 's', 'm']),
      variants: [variant('a', { size: 's' }), variant('b', { size: 'm' })],
      basePrice: 4000,
      codeBase: null,
    })

    expect(plan.variantValues.map(row => row.values)).toEqual([{ colour: 'red' }, { colour: 'red' }])
    expect(plan.newVariants.map(made => made.values)).toEqual([{ size: 's', colour: 'blue' }, { size: 'm', colour: 'blue' }])
  })

  it('[T-008] an archived variant takes the first value too but is not copied, and a combination left unsold stays unsold', () => {
    const plan = planOptionsDone({
      options: [option('size', ['s', 'm']), option('colour', ['red', 'blue'])],
      committed: new Set(['size', 's', 'm']),
      variants: [variant('a', { size: 's' }), variant('gone', { size: 'm' }, 'archived')],
      basePrice: 4000,
      codeBase: null,
    })

    expect(plan.variantValues.map(row => row.variantId)).toEqual(['a', 'gone'])
    expect(plan.newVariants.map(made => made.values)).toEqual([{ size: 's', colour: 'blue' }])
  })

  it('[T-008] a new value of an option that was there makes a variant for each combination of the others, and not the ones that exist', () => {
    const plan = planOptionsDone({
      options: [option('size', ['s', 'm', 'l']), option('colour', ['red', 'blue'])],
      committed: new Set(['size', 's', 'm', 'colour', 'red', 'blue']),
      variants: [variant('a', { size: 's', colour: 'red' }), variant('b', { size: 'l', colour: 'red' }, 'archived')],
      basePrice: 5000,
      codeBase: null,
    })

    expect(plan.variantValues).toEqual([])
    expect(plan.newVariants.map(made => made.values)).toEqual([{ colour: 'blue', size: 'l' }])
  })

  it('[T-008] nothing is brought by an option that is what the keepsake has, or has no value yet', () => {
    expect(planOptionsDone({ options: [option('size', ['s'])], committed: new Set(['size', 's']), variants: [variant('a', { size: 's' })], basePrice: 100, codeBase: null })).toEqual({ variantValues: [], newVariants: [] })
    expect(planOptionsDone({ options: [option('size', [])], committed: new Set(), variants: [variant('a', {})], basePrice: 100, codeBase: null })).toEqual({ variantValues: [], newVariants: [] })
  })

  it('[T-008] a code another variant has gets a number', () => {
    expect(uniqueCode('VX-S', new Set(['vx-s']))).toBe('VX-S-2')
    const plan = planOptionsDone({ options: [option('size', ['small', 'silver'])], committed: new Set(), variants: [variant('v1', {}, 'published', 'VX-SILVER')], basePrice: 100, codeBase: 'VX' })

    expect(plan.newVariants.map(made => made.skuCode)).toEqual(['VX-SILVER-2'])
  })
})

describe('[T-008] the variants table', () => {
  const size = { id: 'size', name: { en: 'Size' }, values: [{ id: 's', label: { en: 'S' } }, { id: 'm', label: { en: 'M' } }, { id: 'l', label: { en: 'L' } }] }

  it('[T-008][AC4] groups the rows by the first option in its order and leaves out a value with no row', () => {
    const rows = [variant('1', { size: 'm' }), variant('2', { size: 's' }), variant('3', { size: 'm' })]

    expect(groupByFirstOption([size], rows).map(group => [group.value.id, group.rows.length])).toEqual([['s', 1], ['m', 2]])
    expect(groupByFirstOption([], rows)).toEqual([])
  })

  it('[T-008] a group shows the lowest and highest price', () => {
    expect(priceRange([{ priceRappen: 4500 }, { priceRappen: 3900 }, { priceRappen: 4500 }])).toEqual({ min: 3900, max: 4500 })
    expect(priceRange([])).toBeUndefined()
  })
})
