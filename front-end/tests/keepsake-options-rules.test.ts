import type { ProductOption } from '@sk/api-contract'
import type { OptionDraft, Valued } from '@/features/keepsakes/lib/option-rules'

import { describe, expect, it } from 'vitest'

import { checkText, isSkuCode } from '@/features/keepsakes/lib/keepsake-rules'
import {
  allCombinations,
  asSaved,
  checkOptionsDraft,
  checkStagedOptions,
  checkVariantValues,
  codePart,
  combinationName,
  draftOfOptions,
  duplicateValue,
  moveItem,
  optionsBody,
  refusalsOfProblem,
  refusalText,
  shortLabel,
  splitValues,
  suggestCode,
  variantName,
  variantsUsing,
  variantTitle,
} from '@/features/keepsakes/lib/option-rules'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const size: ProductOption = {
  id: 'size',
  name: { en: 'Size', de: 'Grösse' },
  values: [{ id: 's', label: { en: 'Small · 58 mm', de: 'Klein · 58 mm' } }, { id: 'l', label: { en: 'Large' } }],
}
const theme: ProductOption = {
  id: 'theme',
  name: { en: 'Theme' },
  values: [{ id: 'swan', label: { en: 'Swan on the lake' } }, { id: 'lion', label: { en: 'Lion Monument' } }],
}
const variant = (id: string, skuCode: string, values: Record<string, string>, status = 'published'): Valued => ({ id, skuCode, status, values })
const t = (key: keyof typeof en, params: Record<string, string | number> = {}) => Object.entries(params).reduce((text, [k, v]) => text.split(`{${k}}`).join(String(v)), en[key] as string)
const saved = [size, theme]
const variants = [variant('1', 'VX-S-SWAN', { size: 's', theme: 'swan' }), variant('2', 'VX-L-SWAN', { size: 'l', theme: 'swan' }), variant('3', 'VX-S-LION', { size: 's', theme: 'lion' }, 'archived')]
const codes = (found: { code: string }[]) => found.map(f => f.code)

describe('[E6.2][AC52] how a combination reads', () => {
  it('[E6.2][AC52] the short label is the part before the dot, the title joins them with a slash', () => {
    expect(shortLabel(size.values[0]!.label)).toBe('Small')
    expect(variantTitle({ size: 's', theme: 'swan' }, saved)).toBe('Small / Swan on the lake')
    expect(combinationName({ size: 's', theme: 'swan' }, saved)).toBe('Small · 58 mm · Swan on the lake')
    expect(variantTitle({ size: 's', theme: 'swan' }, saved, 'de')).toBe('Klein / Swan on the lake')
  })

  it('[E6.2][AC52] all combinations in option order, one empty combination for no option', () => {
    expect(allCombinations([{ ref: 'a', values: [{ ref: '1' }, { ref: '2' }] }, { ref: 'b', values: [{ ref: 'x' }, { ref: 'y' }, { ref: 'z' }] }])).toHaveLength(6)
    expect(allCombinations([])).toEqual([{}])
  })

  it('[T-010][AC2] a code suggestion is the keepsake code and the full labels, upper case, joined by hyphens', () => {
    expect(suggestCode({ size: 's', theme: 'swan' }, saved, '1.6795')).toBe('1.6795-SMALL-58-MM-SWAN-ON-THE-LAKE')
    expect(suggestCode({ size: 'l' }, saved, '1.6795')).toBe('1.6795-LARGE')
    expect(suggestCode({ size: 'l' }, saved)).toBe('LARGE')
    expect(isSkuCode(suggestCode({ size: 's', theme: 'swan' }, saved, '1.6795'))).toBe(true)
  })

  it('[T-010] a label becomes a part of a code: no marks, no stray characters', () => {
    expect(codePart('Light blue')).toBe('LIGHT-BLUE')
    expect(codePart('  Grösse (XL)! ')).toBe('GROSSE-XL')
    expect(codePart('—')).toBe('')
  })

  it('[T-010] a variant with no code is named by its values', () => {
    expect(variantName({ skuCode: null, values: { size: 's', theme: 'swan' } }, saved)).toBe('Small / Swan on the lake')
    expect(variantName({ skuCode: 'VX-1', values: {} }, saved)).toBe('VX-1')
  })
})

describe('[E6.2][AC52] one variant against the options', () => {
  it('[E6.2][AC52] a free combination passes, a sold one is refused with its code, an archived twin says so', () => {
    expect(checkVariantValues(saved, variants, { size: 'l', theme: 'lion' }, 'values')).toEqual([])
    expect(checkVariantValues(saved, variants, { size: 'l', theme: 'swan' }, 'values')).toEqual([{ at: 'values', code: 'combination-taken', params: { code: 'VX-L-SWAN', archived: 0 } }])
    expect(checkVariantValues(saved, variants, { size: 's', theme: 'lion' }, 'values')).toEqual([{ at: 'values', code: 'combination-taken', params: { code: 'VX-S-LION', archived: 1 } }])
  })

  it('[E6.2][AC52] a missing value is refused, and a keepsake with no option has one variant only', () => {
    expect(codes(checkVariantValues(saved, [], { size: 's' }, 'values', 'VX-1'))).toEqual(['values-missing'])
    expect(checkVariantValues([], [], {}, 'values')).toEqual([])
    expect(codes(checkVariantValues([], [variant('1', 'VX-1', {})], {}, 'values'))).toEqual(['no-options-one-variant'])
  })
})

describe('[E6.2][AC52] the options sheet rules', () => {
  const draft = (options: ProductOption[] = saved): OptionDraft[] => draftOfOptions(options)

  it('[E6.2][AC52] unchanged options pass, and a German label may be empty', () => {
    expect(checkOptionsDraft(saved, draft(), variants, {})).toEqual([])
    expect(draft()[1]!.name.de).toBe('')
  })

  it('[E6.2][AC52] a value that a variant uses cannot be deleted: archived variants count, and the codes are named', () => {
    const next = draft()

    next[1]!.values = next[1]!.values.filter(v => v.ref !== 'lion')
    const found = checkOptionsDraft(saved, next, variants, {})

    expect(found).toEqual([{ at: 'lion', code: 'value-in-use', params: { value: 'Lion Monument', count: 0, archived: 1, codes: '', more: 0 } }])
    expect(refusalText(t, found[0]!)).toBe('Can’t delete Lion Monument. Used only by 1 archived variant. Archive or change those first.')
  })

  it('[T-020][AC1] an option that variants use is dropped when the rows stay distinct, archived ones included', () => {
    const colour: ProductOption = { id: 'colour', name: { en: 'Colour' }, values: [{ id: 'red', label: { en: 'Red' } }, { id: 'blue', label: { en: 'Blue' } }] }
    const withColour = [variant('1', 'A', { size: 's', theme: 'swan', colour: 'red' }), variant('2', 'B', { size: 'l', theme: 'swan', colour: 'red' }), variant('3', 'C', { size: 's', theme: 'lion', colour: 'blue' }, 'archived')]

    expect(checkOptionsDraft([size, theme, colour], draftOfOptions([size, theme]), withColour, {})).toEqual([])
  })

  it('[T-020][AC2] dropping an option that makes two rows the same is refused, naming the groups and the rows that were sold', () => {
    const found = checkOptionsDraft(saved, draft().slice(0, 1), variants.map(v => (v.id === '3' ? { ...v, hasOrders: true } : v)), {})

    expect(found).toEqual([{ at: 'theme', code: 'option-drop-clash', params: { option: 'Theme', count: 2, sold: 1, groups: JSON.stringify([{ title: 'Small', count: 2, values: ['Swan on the lake', 'Lion Monument'] }]) } }])
    expect(refusalText(t, found[0]!)).toBe('Can’t delete Theme. These variants would become the same: Small: 2 rows (Swan on the lake, Lion Monument). Delete all but one of each first. 1 of them was sold and cannot be deleted.')
  })

  it('[T-020][AC3] the last option goes when one variant remains, and not when two would be the same', () => {
    const only: OptionDraft[] = []

    expect(checkOptionsDraft([size], only, [variant('1', 'A', { size: 's' })], {})).toEqual([])
    const found = checkOptionsDraft([size], only, [variant('1', 'A', { size: 's' }), variant('2', 'B', { size: 'l' })], {})

    expect(found[0]).toMatchObject({ at: 'size', code: 'option-drop-clash', params: { count: 2, groups: JSON.stringify([{ title: '', count: 2, values: ['Small', 'Large'] }]) } })
    expect(refusalText(t, found[0]!)).toContain('All variants: 2 rows (Small, Large)')
  })

  it('[T-020][AC4] the draft refuses what the API refuses: the same code, path and numbers for the same rows', () => {
    const apiRefusal = { path: 'options.theme', code: 'option-drop-clash', params: { option: 'Theme', count: 2, sold: 0, groups: JSON.stringify([{ title: 'Small', count: 2, values: ['Swan on the lake', 'Lion Monument'] }]) } }
    const [fromDraft] = checkOptionsDraft(saved, draft().slice(0, 1), variants, {})

    expect(refusalsOfProblem([apiRefusal])).toEqual([fromDraft])
  })

  it('[E6.2][AC52] says three codes at most, then how many more', () => {
    const many = [1, 2, 3, 4].map(n => variant(String(n), `VX-${n}`, { size: 's' }))

    expect(variantsUsing(many, 'size', 's')).toHaveLength(4)
    const found = checkOptionsDraft([size], [{ ...draft([size])[0]!, values: [draft([size])[0]!.values[1]!] }], many, {})

    expect(refusalText(t, found[0]!)).toContain('Used by 4 variants (VX-1, VX-2, VX-3 and 1 more)')
  })

  const colour: OptionDraft = {
    ref: 'colour',
    name: { en: 'Colour', de: '' },
    values: [{ ref: 'red', label: { en: 'Red', de: '' } }, { ref: 'blue', label: { en: 'Blue', de: '' } }],
  }

  it('[E6.2][AC52] a new option needs a value for every variant, archived ones too, and then it passes', () => {
    const some = { 1: { colour: 'red' }, 2: { colour: 'blue' } } as Record<string, Record<string, string>>
    const found = checkOptionsDraft(saved, [...draft(), colour], variants, some)

    expect(found).toEqual([{ at: '3', code: 'values-missing', params: { code: 'VX-S-LION', option: 'Colour' } }])
    expect(refusalText(t, found[0]!)).toBe('VX-S-LION needs a colour.')
    expect(checkOptionsDraft(saved, [...draft(), colour], variants, { ...some, 3: { colour: 'red' } })).toEqual([])
  })

  it('[E6.2][AC52] names are needed in one language and a value is needed', () => {
    const bad: OptionDraft[] = [
      { ref: 'a', name: { en: '', de: '' }, values: [{ ref: 'v', label: { en: '', de: '' } }] },
      { ref: 'b', name: { en: 'Edge', de: '' }, values: [] },
    ]

    expect(codes(checkOptionsDraft([], bad, [], {}))).toEqual(['option-name-required', 'value-name-required', 'option-needs-value'])
  })

  it('[E6.2][AC52] two variants moved onto one combination are refused', () => {
    const found = checkOptionsDraft(saved, draft(), variants, { 2: { size: 's' } })

    expect(found).toEqual([{ at: '2', code: 'combination-duplicate', params: { code: 'VX-L-SWAN', twin: 'VX-S-SWAN' } }])
  })

  it('[E6.2][AC52] zero options to one: the one variant needs a value of it', () => {
    const only = [variant('1', 'VX-ONLY', {})]

    expect(codes(checkOptionsDraft([], draft([size]), only, {}))).toEqual(['values-missing'])
    expect(checkOptionsDraft([], draft([size]), only, { 1: { size: 's' } })).toEqual([])
  })

  it('[E6.2][AC52] the body keeps the languages that have text, ', () => {
    const body = optionsBody([{ ref: 'x', name: { en: ' Colour ', de: '' }, values: [{ ref: 'y', label: { en: '', de: 'Rot' } }, { ref: 'z', label: { en: 'Blue', de: '' } }] }])

    expect(body).toEqual([{ ref: 'x', name: { en: 'Colour' }, values: [{ ref: 'y', label: { de: 'Rot' } }, { ref: 'z', label: { en: 'Blue' } }] }])
    expect(asSaved(draftOfOptions(saved))[0]!.values[0]!.label).toEqual({ en: 'Small · 58 mm', de: 'Klein · 58 mm' })
  })
})

describe('[E6.2][AC52] what the API says', () => {
  it('[E6.2][AC52] a 422 error list becomes refusals at the option, value or variant', () => {
    const found = refusalsOfProblem([
      { path: 'options.theme.values.lion', code: 'value-in-use', params: { value: 'Lion', count: 2, codes: 'A, B', more: 0 } },
      { path: 'options.theme.name', code: 'option-name-required' },
      { path: 'options.theme', code: 'option-drop-clash', params: { option: 'Theme', count: 2, sold: 0, groups: '[]' } },
      { path: 'variants.v1.values.colour', code: 'values-missing', params: { code: 'VX-1', option: 'Colour' } },
      { path: 'variants.v2', code: 'combination-duplicate', params: { code: 'B', twin: 'A' } },
      { path: 'values', code: 'combination-taken', params: { code: 'A', archived: 0 } },
      { path: 'body', code: undefined },
    ])

    expect(found.map(f => f.at)).toEqual(['lion', 'theme', 'theme', 'v1', 'v2', 'values'])
    expect(refusalText(t, found[0]!)).toBe('Can’t delete Lion. Used by 2 variants (A, B). Archive or change those first.')
  })
})

describe('[E6.2][AC52] the option label warning', () => {
  const tr = (dict: Record<string, string>) => (key: string, params: Record<string, string | number> = {}) => Object.entries(params).reduce((text, [k, v]) => text.split(`{${k}}`).join(String(v)), dict[key]!)

  it('[E6.2][AC52] counts the names and values that miss a language, in English and German', () => {
    const check = { code: 'option-labels', card: 'options', count: 3 } as const

    expect(checkText(tr(en) as never, check)).toBe('3 option names or values miss a language.')
    expect(checkText(tr(de) as never, { ...check, count: 1 })).toBe('1 Optionsname oder Wert hat keine Sprachfassung.')
  })
})

describe('[T-007A] the option control rules', () => {
  const colour: OptionDraft = {
    ref: 'colour',
    name: { en: 'Colour', de: 'Farbe' },
    values: [{ ref: 'red', label: { en: 'Red', de: 'Rot' } }, { ref: 'blue', label: { en: 'Blue', de: '' } }],
  }

  it('[T-007A] splits typed or pasted text into values at commas, semicolons and lines, and drops the empty ones', () => {
    expect(splitValues('Small, Medium;Large\n Extra large ,, ')).toEqual(['Small', 'Medium', 'Large', 'Extra large'])
    expect(splitValues('  ')).toEqual([])
  })

  it('[T-007A] moves a value to a new place and leaves the list alone when the move goes nowhere', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b'])
    const same = ['a', 'b']

    expect(moveItem(same, 0, 5)).toBe(same)
    expect(moveItem(same, 1, 1)).toBe(same)
  })

  it('[T-007A] finds a value that already says the same, in either language, ignoring case and spaces, but not itself', () => {
    expect(duplicateValue(colour, { en: ' red ', de: '' })?.ref).toBe('red')
    expect(duplicateValue(colour, { en: '', de: 'ROT' })?.ref).toBe('red')
    expect(duplicateValue(colour, { en: 'Green', de: '' })).toBeUndefined()
    expect(duplicateValue(colour, { en: 'Red', de: '' }, 'red')).toBeUndefined()
    expect(duplicateValue(colour, { en: '', de: '' })).toBeUndefined()
  })

  it('[T-007A] AC-2: a value twice in one option is refused at the second one, and the text names it and the option', () => {
    const twice: OptionDraft = { ...colour, values: [...colour.values, { ref: 'again', label: { en: 'red', de: '' } }] }
    const found = checkStagedOptions([], [twice], [], {})

    expect(found).toEqual([{ at: 'again', code: 'value-duplicate', params: { value: 'red', option: 'Colour' } }])
    expect(refusalText(t, found[0]!)).toBe('red is already a value of Colour. Each value is listed once.')
    expect(refusalText((key, params) => (de[key] as string).replace('{value}', String(params?.value)).replace('{option}', String(params?.option)), found[0]!)).toBe('red ist schon ein Wert von Colour. Jeder Wert steht nur einmal in der Liste.')
  })

  it('[T-007A] AC-3: a new option on a keepsake with variants is one refusal that counts the variants, archived ones too', () => {
    const found = checkStagedOptions(saved, [...draftOfOptions(saved), colour], variants, { 1: { colour: 'red' } })

    expect(found).toEqual([{ at: 'colour:assign', code: 'variants-missing', params: { option: 'Colour', count: 2 } }])
    expect(refusalText(t, found[0]!)).toBe('2 variants still need a value for Colour.')
    expect(refusalText(t, { ...found[0]!, params: { option: 'Colour', count: 1 } })).toBe('1 variant still needs a value for Colour.')
    expect(checkStagedOptions(saved, [...draftOfOptions(saved), colour], variants, { 1: { colour: 'red' }, 2: { colour: 'blue' }, 3: { colour: 'red' } })).toEqual([])
  })

  it('[T-007A] a value picked for a variant that is then removed from the option counts as missing again', () => {
    const gone: OptionDraft = { ...colour, values: [colour.values[0]!] }
    const found = checkStagedOptions(saved, [...draftOfOptions(saved), gone], variants, { 1: { colour: 'red' }, 2: { colour: 'red' }, 3: { colour: 'blue' } })

    expect(found).toEqual([{ at: 'colour:assign', code: 'variants-missing', params: { option: 'Colour', count: 1 } }])
  })

  it('[T-007A] AC-4: the rules of the sheet still refuse a used value, and a used option whose removal makes two rows the same', () => {
    const next = draftOfOptions(saved)

    next[1]!.values = next[1]!.values.filter(v => v.ref !== 'lion')
    expect(codes(checkStagedOptions(saved, next, variants, {}))).toEqual(['value-in-use'])
    expect(codes(checkStagedOptions(saved, next.slice(0, 1), variants, {}))).toContain('option-drop-clash')
  })

  it('[T-007A] a new option has no value until one is added, and Next on a new keepsake says it needs one', () => {
    const empty: OptionDraft = { ref: 'x', name: { en: 'Finish', de: '' }, values: [] }

    expect(codes(checkStagedOptions([], [empty], [], {}))).toEqual(['option-needs-value'])
  })
})
