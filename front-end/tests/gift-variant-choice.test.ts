import { describe, expect, it } from 'vitest'

import {
  blockedValues,
  chosenVariant,
  galleryOrder,
  pickValue,
  settleChoice,
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

  it('blocks a value only when no combination with it can be picked', () => {
    expect(blockedValues(options, variants, 'not sold')).toEqual({ size: {}, colour: {} })
    const soldOut = variants.map(v => v.values.size === 'l' ? { ...v, reason: 'Sold out' } : v)

    expect(blockedValues(options, soldOut, 'not sold')).toEqual({ size: { l: 'Sold out' }, colour: { red: 'Sold out' } })
  })

  it('moves the other options to a combination that exists, keeping as many choices as it can', () => {
    expect(settleChoice(options, variants, { size: 's', colour: 'nat' }, 'colour', 'red')).toEqual({ size: 'l', colour: 'red' })
    expect(settleChoice(options, variants, { size: 'l', colour: 'red' }, 'size', 's')).toEqual({ size: 's', colour: 'nat' })
    expect(settleChoice(options, variants, { size: 's', colour: 'nat' }, 'size', 'l')).toEqual({ size: 'l', colour: 'red' })
  })

  it('settles on the combination that keeps most of the other choices, not the first one listed', () => {
    const three = [...options, { id: 'finish', label: 'Finish', values: [{ id: 'matte', label: 'Matte' }, { id: 'gloss', label: 'Gloss' }] }]
    const list = [
      { id: 'x', values: { size: 'l', colour: 'red', finish: 'gloss' }, price: '' },
      { id: 'y', values: { size: 's', colour: 'red', finish: 'gloss' }, price: '' },
      { id: 'z', values: { size: 's', colour: 'nat', finish: 'matte' }, price: '' },
    ]

    // Red with small and matte chosen: s/red/matte is not sold; s/red/gloss keeps the size, l/red/gloss (listed first) keeps nothing.
    expect(settleChoice(three, list, { size: 's', colour: 'nat', finish: 'matte' }, 'colour', 'red')).toEqual({ size: 's', colour: 'red', finish: 'gloss' })
  })

  it('takes the exact combination when it can be picked', () => {
    const list = [
      { id: 'a', values: { size: 's', colour: 'red' }, price: '' },
      { id: 'b', values: { size: 'l', colour: 'red' }, price: '' },
      { id: 'c', values: { size: 'l', colour: 'nat' }, price: '' },
    ]

    expect(settleChoice(options, list, { size: 'l', colour: 'nat' }, 'colour', 'red')).toEqual({ size: 'l', colour: 'red' })
  })

  it('takes the first combination listed on a tie', () => {
    const list = [
      { id: 'a', values: { size: 'l', colour: 'red' }, price: '' },
      { id: 'b', values: { size: 'l', colour: 'nat' }, price: '' },
    ]

    expect(settleChoice(options, list, {}, 'size', 'l')).toEqual({ size: 'l', colour: 'red' })
  })

  it('keeps the picked value as it is when no combination with it can be picked', () => {
    const list = [
      { id: 'a', values: { size: 's', colour: 'nat' }, price: '' },
      { id: 'b', values: { size: 'l', colour: 'nat' }, price: '', reason: 'Sold out' },
    ]

    expect(settleChoice(options, list, { size: 's', colour: 'nat' }, 'size', 'l')).toEqual({ size: 'l', colour: 'nat' })
  })

  it('gives the `missing` reason to a value no combination has', () => {
    const list = [{ id: 'a', values: { size: 's', colour: 'nat' }, price: '' }]

    expect(blockedValues(options, list, 'not sold')).toEqual({ size: { l: 'not sold' }, colour: { red: 'not sold' } })
  })
})
