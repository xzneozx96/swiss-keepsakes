import { describe, expect, it } from 'vitest'

import {
  chosenVariant,
  demoOptions,
  demoValues,
  galleryOrder,
  pickValue,
  valueReasons,
} from '@/features/catalog/lib/variant-choice'

const options = [
  { id: 'size', label: 'Size', values: [{ id: 's', label: 'Small' }, { id: 'l', label: 'Large' }] },
  { id: 'colour', label: 'Colour', values: [{ id: 'nat', label: 'Natural' }, { id: 'red', label: 'Red' }] },
]
const variants = [
  { id: 'v1', values: { size: 's', colour: 'nat' }, price: 'CHF 34' },
  { id: 'v2', values: { size: 's', colour: 'red' }, price: 'CHF 36', reason: 'Sold out' },
  { id: 'v3', values: { size: 'l', colour: 'nat' }, price: 'CHF 52', reason: 'Not on sale at the moment' },
  { id: 'v4', values: { size: 'l', colour: 'red' }, price: 'CHF 54', photoIndex: 1 },
]

describe('variant choice by option values', () => {
  it('finds the variant that matches every chosen value', () => {
    expect(chosenVariant(options, variants, { size: 'l', colour: 'red' })?.id).toBe('v4')
    expect(chosenVariant(options, variants, { size: 's' })).toBeUndefined()
    expect(chosenVariant(options, variants, {})).toBeUndefined()
  })

  it('takes the only variant when there are no options', () => {
    expect(chosenVariant([], [{ id: 'std', values: {}, price: 'CHF 89' }], {})?.id).toBe('std')
  })

  it('blocks a value whose combination with the other chosen values cannot be picked, with its reason', () => {
    const reasons = valueReasons(options, variants, { size: 's', colour: 'nat' }, 'Not sold')

    // Small + Red is sold out; Large + Natural is not on sale; Large + Red is fine only with Red chosen.
    expect(reasons.colour).toEqual({ red: 'Sold out' })
    expect(reasons.size).toEqual({ l: 'Not on sale at the moment' })
  })

  it('names a combination that does not exist as not sold', () => {
    const sparse = variants.filter(v => v.id !== 'v4')
    const reasons = valueReasons(options, sparse, { size: 's', colour: 'red' }, 'Not sold')

    expect(reasons.size).toEqual({ s: 'Sold out', l: 'Not sold' })
  })

  it('leaves the chosen values open and blocks the ones that do not fit them', () => {
    const reasons = valueReasons(options, variants, { size: 'l', colour: 'red' }, 'Not sold')

    expect(reasons.size).toEqual({ s: 'Sold out' })
    expect(reasons.colour).toEqual({ nat: 'Not on sale at the moment' })
  })

  it('sets one value and keeps the others', () => {
    expect(pickValue({ size: 'l', colour: 'red' }, 'size', 's')).toEqual({ size: 's', colour: 'red' })
  })

  it('moves the chosen variant photo to the front of the gallery', () => {
    expect(galleryOrder(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b'])
    expect(galleryOrder(['a', 'b', 'c'], undefined)).toEqual(['a', 'b', 'c'])
    expect(galleryOrder(['a', 'b'], 7)).toEqual(['a', 'b'])
    expect(galleryOrder(['a', 'b'], 0)).toEqual(['a', 'b'])
  })

  it('turns a demo product with several variants into one option with a value per variant', () => {
    const product = {
      variants: [
        { id: 's', label: { en: 'Small' }, price: 4900, stock: 1 },
        { id: 'm', label: { en: 'Medium' }, price: 5400, stock: 1 },
      ],
    }
    const text = (l: { en?: string }) => l.en ?? ''
    const [option, ...rest] = demoOptions(product, text, 'Option', v => `CHF ${v.price / 100}`)

    expect(rest).toEqual([])
    expect(option.label).toBe('Option')
    expect(option.values).toEqual([
      { id: 's', label: 'Small', hint: 'CHF 49' },
      { id: 'm', label: 'Medium', hint: 'CHF 54' },
    ])
    expect(demoValues(product, product.variants[1])).toEqual({ [option.id]: 'm' })
  })

  it('shows no choice for a single demo variant', () => {
    const product = { variants: [{ id: 'std', label: { en: 'Standard' }, price: 8900, stock: 5 }] }

    expect(demoOptions(product, l => l.en ?? '', 'Option', () => '')).toEqual([])
    expect(demoValues(product, product.variants[0])).toEqual({})
  })

  it('reads the declared options and the variants values of a multi-option demo product', () => {
    const product = {
      options: [{ id: 'size', label: { en: 'Size' }, values: [{ id: 'a', label: { en: 'A' } }] }],
      variants: [{ id: 'v', label: { en: 'A' }, price: 100, stock: 1, values: { size: 'a' } }],
    }

    expect(demoOptions(product, l => l.en ?? '', 'Option', () => '')).toEqual([
      { id: 'size', label: 'Size', values: [{ id: 'a', label: 'A' }] },
    ])
    expect(demoValues(product, product.variants[0])).toEqual({ size: 'a' })
  })
})
