import type { OptionInput, Product, ProductOption, ProductVariant } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it } from 'vitest'
import { checkNewProduct, checkOptionDefinitions, checkOptionsSave, checkVariantValues } from '../../../src/modules/catalog/application/option-rules.ts'

const size: ProductOption = {
  id: 'size',
  name: { en: 'Size', de: 'Grösse' },
  values: [{ id: 's', label: { en: 'Small' }, swatch: null }, { id: 'l', label: { en: 'Large' }, swatch: null }],
}
const theme: ProductOption = {
  id: 'theme',
  name: { en: 'Theme' },
  values: [{ id: 'swan', label: { en: 'Swan' }, swatch: null }, { id: 'lion', label: { en: 'Lion' }, swatch: null }],
}
const variant = (id: string, skuCode: string, values: Record<string, string>, status: ProductVariant['status'] = 'published'): ProductVariant => ({ id, skuCode, priceRappen: 3900, status, values })
function input(option: ProductOption): OptionInput {
  return {
    ref: option.id,
    name: option.name,
    values: option.values.map(v => ({ ref: v.id, label: v.label, swatch: v.swatch })),
  }
}
const product = (options: ProductOption[], variants: ProductVariant[]): Pick<Product, 'options' | 'variants'> => ({ options, variants })
const codes = (refusals: { code: string }[]) => refusals.map(r => r.code)

describe('[E6.2][AC52] option definitions', () => {
  it('[E6.2][AC52] accepts an option named in one language only and a value with no German label', () => {
    expect(checkOptionDefinitions([{ ref: 'a', name: { de: 'Farbe' }, values: [{ ref: 'v', label: { en: 'Red' }, swatch: null }] }])).toEqual([])
  })

  it('[E6.2][AC52] refuses a blank name, a blank value and an option with no value', () => {
    const refusals = checkOptionDefinitions([
      { ref: 'a', name: { en: ' ' }, values: [{ ref: 'v', label: {}, swatch: null }] },
      { ref: 'b', name: { en: 'Theme' }, values: [] },
    ])

    expect(refusals).toEqual([
      { code: 'option-name-required', path: 'options.a.name' },
      { code: 'value-name-required', path: 'options.a.values.v' },
      { code: 'option-needs-value', path: 'options.b', params: { option: 'Theme' } },
    ])
  })

  it('[E6.2][AC52] refuses a ref used twice', () => {
    const value = { ref: 'v', label: { en: 'Red' }, swatch: null }

    expect(codes(checkOptionDefinitions([{ ref: 'a', name: { en: 'A' }, values: [value, value] }]))).toEqual(['refs-invalid'])
  })
})

describe('[E6.2][AC52] one variant against the options', () => {
  const others = [variant('1', 'VX-S-SWAN', { size: 's', theme: 'swan' })]

  it('[E6.2][AC52] accepts a free combination', () => {
    expect(checkVariantValues([size, theme], others, { size: 's', theme: 'lion' }, 'values')).toEqual([])
  })

  it('[E6.2][AC52] refuses a combination that is sold, and names its code', () => {
    expect(checkVariantValues([size, theme], others, { size: 's', theme: 'swan' }, 'values')).toEqual([
      { code: 'combination-taken', path: 'values', params: { code: 'VX-S-SWAN', archived: 0 } },
    ])
  })

  it('[E6.2][AC52] an archived twin still counts, and says it is archived', () => {
    const archived = [variant('1', 'VX-S-SWAN', { size: 's', theme: 'swan' }, 'archived')]

    expect(checkVariantValues([size, theme], archived, { size: 's', theme: 'swan' }, 'values')).toEqual([
      { code: 'combination-taken', path: 'values', params: { code: 'VX-S-SWAN', archived: 1 } },
    ])
  })

  it('[E6.2][AC52] refuses a missing value, a value of another option and an unknown option', () => {
    expect(codes(checkVariantValues([size, theme], [], { size: 's' }, 'values', 'VX-1'))).toEqual(['values-missing'])
    expect(codes(checkVariantValues([size, theme], [], { size: 's', theme: 's' }, 'values'))).toEqual(['value-unknown'])
    expect(codes(checkVariantValues([size], [], { size: 's', colour: 'red' }, 'values'))).toEqual(['value-unknown'])
  })

  it('[E6.2][AC52] a value for an option that does not exist is refused, also when the keepsake has no option', () => {
    expect(checkVariantValues([], [], { x: 'y' }, 'values')).toEqual([{ code: 'value-unknown', path: 'values.x' }])
    expect(checkVariantValues([], [variant('1', 'VX-ONLY', {})], { x: 'y' }, 'values').map(r => r.code)).toEqual(['no-options-one-variant', 'value-unknown'])
  })

  it('[E6.2][AC52] with no option the keepsake has one variant only', () => {
    expect(checkVariantValues([], [], {}, 'values')).toEqual([])
    expect(checkVariantValues([], [variant('1', 'VX-ONLY', {})], {}, 'values')).toEqual([
      { code: 'no-options-one-variant', path: 'values', params: { code: 'VX-ONLY' } },
    ])
  })
})

describe('[E6.2][AC52] saving options with the variants', () => {
  const current = product([size, theme], [
    variant('1', 'VX-S-SWAN', { size: 's', theme: 'swan' }),
    variant('2', 'VX-L-SWAN', { size: 'l', theme: 'swan' }),
    variant('3', 'VX-S-LION', { size: 's', theme: 'lion' }, 'archived'),
  ])

  it('[E6.2][AC52] an unchanged save is accepted', () => {
    expect(checkOptionsSave(current, { options: [input(size), input(theme)], variantValues: [] })).toEqual([])
  })

  it('[E6.2][AC52] a value that a variant uses cannot be deleted, an archived variant counts, and the codes are named', () => {
    const refusals = checkOptionsSave(current, { options: [input(size), { ...input(theme), values: [input(theme).values[0]!] }], variantValues: [] })

    expect(refusals).toEqual([
      { code: 'value-in-use', path: 'options.theme.values.lion', params: { value: 'Lion', count: 1, codes: 'VX-S-LION', more: 0 } },
    ])
  })

  it('[E6.2][AC52] names three codes at most, then the rest as a number', () => {
    const many = product([size], [1, 2, 3, 4, 5].map(n => variant(String(n), `VX-${n}`, { size: n < 5 ? 's' : 'l' })))
    const refusals = checkOptionsSave(many, { options: [{ ...input(size), values: [input(size).values[1]!] }], variantValues: [] })

    expect(refusals[0]?.params).toMatchObject({ value: 'Small', count: 4, codes: 'VX-1, VX-2, VX-3', more: 1 })
  })

  it('[E6.2][AC52] an option that variants use cannot be deleted', () => {
    const refusals = checkOptionsSave(current, { options: [input(size)], variantValues: [] })

    // Without Theme, VX-S-LION and VX-S-SWAN would also be one combination: the first refusal is the one to read.
    expect(refusals[0]).toEqual({ code: 'option-in-use', path: 'options.theme', params: { option: 'Theme', count: 3, codes: 'VX-S-SWAN, VX-L-SWAN, VX-S-LION', more: 0 } })
  })

  const colour: OptionInput = { ref: 'new-colour', name: { en: 'Colour' }, values: [{ ref: 'red', label: { en: 'Red' }, swatch: '#c8102e' }, { ref: 'blue', label: { en: 'Blue' }, swatch: null }] }
  const withColour = [input(size), input(theme), colour]

  it('[E6.2][AC52] a new option needs a value for every variant, archived ones too', () => {
    const refusals = checkOptionsSave(current, {
      options: withColour,
      variantValues: [{ variantId: '1', values: { 'new-colour': 'red' } }, { variantId: '2', values: { 'new-colour': 'blue' } }],
    })

    expect(refusals).toEqual([
      { code: 'values-missing', path: 'variants.3.values.new-colour', params: { code: 'VX-S-LION', option: 'Colour' } },
    ])
  })

  it('[E6.2][AC52] a new option with a value for each variant is accepted', () => {
    const refusals = checkOptionsSave(current, {
      options: withColour,
      variantValues: ['1', '2', '3'].map(variantId => ({ variantId, values: { 'new-colour': 'red' } })),
    })

    expect(refusals).toEqual([])
  })

  it('[E6.2][AC52] a value the new option does not have is unknown', () => {
    const refusals = checkOptionsSave(current, {
      options: withColour,
      variantValues: ['1', '2', '3'].map(variantId => ({ variantId, values: { 'new-colour': 'green' } })),
    })

    expect(codes(refusals)).toEqual(['value-unknown', 'value-unknown', 'value-unknown'])
  })

  it('[E6.2][AC52] two variants moved onto one combination are refused', () => {
    const refusals = checkOptionsSave(current, {
      options: [input(size), input(theme)],
      variantValues: [{ variantId: '2', values: { size: 's' } }],
    })

    expect(refusals).toEqual([
      { code: 'combination-duplicate', path: 'variants.2', params: { code: 'VX-L-SWAN', twin: 'VX-S-SWAN' } },
    ])
  })

  it('[E6.2][AC52] a variant id that is not this keepsake\'s is refused', () => {
    expect(codes(checkOptionsSave(current, { options: [input(size), input(theme)], variantValues: [{ variantId: 'other', values: {} }] }))).toEqual(['refs-invalid'])
  })

  it('[E6.2][AC52] a value for an option that is not in the save is refused, for a variant of the keepsake', () => {
    const refusals = checkOptionsSave(current, {
      options: [input(size), input(theme)],
      variantValues: [{ variantId: '1', values: { bogus: 'v' } }],
    })

    expect(refusals).toEqual([{ code: 'value-unknown', path: 'variants.1.values.bogus' }])
  })

  it('[E6.2][AC52] a value for an option the save deletes is refused', () => {
    const single = product([], [variant('1', 'VX-ONLY', {})])

    expect(codes(checkOptionsSave(single, { options: [], variantValues: [{ variantId: '1', values: { size: 's' } }] }))).toEqual(['value-unknown'])
  })

  it('[E6.2][AC52] a ref that is the id of an existing value under another option is refused', () => {
    const stolen = { ...colour, values: [{ ref: 'swan', label: { en: 'Swan' }, swatch: null }] }

    expect(codes(checkOptionsSave(current, { options: [input(size), input(theme), stolen], variantValues: [] }))).toContain('refs-invalid')
  })

  it('[E6.2][AC52] zero options to one option: the one variant takes a value', () => {
    const single = product([], [variant('1', 'VX-ONLY', {})])

    expect(checkOptionsSave(single, { options: [input(size)], variantValues: [{ variantId: '1', values: { size: 's' } }] })).toEqual([])
    expect(codes(checkOptionsSave(single, { options: [input(size)], variantValues: [] }))).toEqual(['values-missing'])
  })

  it('[E6.2][AC52] a value can change, and a new value can be added, order is free', () => {
    const reordered = { ...input(size), values: [...input(size).values].reverse().concat({ ref: 'xl', label: { en: 'XL' }, swatch: null }) }

    expect(checkOptionsSave(current, { options: [reordered, input(theme)], variantValues: [] })).toEqual([])
  })
})

describe('[E6.2][AC52] a new keepsake', () => {
  const swan = { skuCode: 'VX-1', priceRappen: 3900, status: 'published' as const }

  it('[E6.2][AC52] one variant and no option is accepted', () => {
    expect(checkNewProduct([], [{ ...swan, values: {} }])).toEqual([])
  })

  it('[E6.2][AC52] a variant for each ticked combination is accepted', () => {
    expect(checkNewProduct([input(size), input(theme)], [
      { ...swan, values: { size: 's', theme: 'swan' } },
      { ...swan, skuCode: 'VX-2', values: { size: 's', theme: 'lion' } },
    ])).toEqual([])
  })

  it('[E6.2][AC52] a variant with a value for an option the keepsake does not have is refused', () => {
    expect(checkNewProduct([], [{ ...swan, values: { x: 'y' } }]).map(r => r.code)).toEqual(['value-unknown'])
    expect(checkNewProduct([input(size)], [{ ...swan, values: { size: 's', colour: 'red' } }]).map(r => r.code)).toEqual(['value-unknown'])
  })

  it('[E6.2][AC52] refuses the same combination and the same code twice', () => {
    const refusals = checkNewProduct([input(size)], [
      { ...swan, values: { size: 's' } },
      { ...swan, values: { size: 's' } },
    ])

    expect(codes(refusals)).toEqual(['combination-taken', 'code-duplicate'])
  })

  it('[E6.2][AC52] with no option a second variant is refused', () => {
    expect(codes(checkNewProduct([], [{ ...swan, values: {} }, { ...swan, skuCode: 'VX-2', values: {} }]))).toEqual(['no-options-one-variant'])
  })
})
