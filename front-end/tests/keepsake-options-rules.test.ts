import type { ProductOption } from '@sk/api-contract'
import type { OptionDraft, Valued } from '@/features/keepsakes/lib/option-rules'

import { describe, expect, it } from 'vitest'

import { checkText } from '@/features/keepsakes/lib/keepsake-rules'
import {
  allCombinations,
  asSaved,
  checkOptionsDraft,
  checkVariantValues,
  combinationName,
  createErrors,
  createRows,
  draftOfOptions,
  optionsBody,
  refusalsOfProblem,
  refusalText,
  shortLabel,
  suggestCode,
  variantsUsing,
  variantTitle,
} from '@/features/keepsakes/lib/option-rules'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const size: ProductOption = {
  id: 'size',
  name: { en: 'Size', de: 'Grösse' },
  values: [{ id: 's', label: { en: 'Small · 58 mm', de: 'Klein · 58 mm' }, swatch: null }, { id: 'l', label: { en: 'Large' }, swatch: null }],
}
const theme: ProductOption = {
  id: 'theme',
  name: { en: 'Theme' },
  values: [{ id: 'swan', label: { en: 'Swan on the lake' }, swatch: null }, { id: 'lion', label: { en: 'Lion Monument' }, swatch: null }],
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

  it('[E6.2][AC52] a code suggestion is one letter of the first option and the first word of the others', () => {
    expect(suggestCode({ size: 's', theme: 'swan' }, saved)).toBe('VX-S-SWAN')
    expect(suggestCode({ size: 'l' }, saved)).toBe('VX-L')
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

    expect(found).toEqual([{ at: 'lion', code: 'value-in-use', params: { value: 'Lion Monument', count: 1, codes: 'VX-S-LION', more: 0 } }])
    expect(refusalText(t, found[0]!)).toBe('Can’t delete Lion Monument. Used by 1 variant (VX-S-LION). Archive or change those first.')
  })

  it('[E6.2][AC52] an option that variants use cannot be deleted', () => {
    const found = checkOptionsDraft(saved, draft().slice(0, 1), variants, {})

    expect(found[0]).toMatchObject({ at: 'theme', code: 'option-in-use', params: { option: 'Theme', count: 3 } })
    expect(refusalText(t, found[0]!)).toBe('Can’t delete Theme. Used by 3 variants (VX-S-SWAN, VX-L-SWAN, VX-S-LION). Every variant has one of its values.')
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
    values: [{ ref: 'red', label: { en: 'Red', de: '' }, swatch: '#c8102e' }, { ref: 'blue', label: { en: 'Blue', de: '' }, swatch: null }],
  }

  it('[E6.2][AC52] a new option needs a value for every variant, archived ones too, and then it passes', () => {
    const some = { 1: { colour: 'red' }, 2: { colour: 'blue' } } as Record<string, Record<string, string>>
    const found = checkOptionsDraft(saved, [...draft(), colour], variants, some)

    expect(found).toEqual([{ at: '3', code: 'values-missing', params: { code: 'VX-S-LION', option: 'Colour' } }])
    expect(refusalText(t, found[0]!)).toBe('VX-S-LION needs a colour.')
    expect(checkOptionsDraft(saved, [...draft(), colour], variants, { ...some, 3: { colour: 'red' } })).toEqual([])
  })

  it('[E6.2][AC52] names are needed in one language, a value is needed, a swatch is #rrggbb', () => {
    const bad: OptionDraft[] = [
      { ref: 'a', name: { en: '', de: '' }, values: [{ ref: 'v', label: { en: '', de: '' }, swatch: '#FFF' }] },
      { ref: 'b', name: { en: 'Edge', de: '' }, values: [] },
    ]

    expect(codes(checkOptionsDraft([], bad, [], {}))).toEqual(['option-name-required', 'value-name-required', 'swatch-invalid', 'option-needs-value'])
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

  it('[E6.2][AC52] the body keeps the languages that have text, and a swatch only where it is on', () => {
    const body = optionsBody([{ ref: 'x', name: { en: ' Colour ', de: '' }, values: [{ ref: 'y', label: { en: '', de: 'Rot' }, swatch: '#c8102e' }, { ref: 'z', label: { en: 'Blue', de: '' }, swatch: null }] }])

    expect(body).toEqual([{ ref: 'x', name: { en: 'Colour' }, values: [{ ref: 'y', label: { de: 'Rot' }, swatch: '#c8102e' }, { ref: 'z', label: { en: 'Blue' }, swatch: null }] }])
    expect(asSaved(draftOfOptions(saved))[0]!.values[0]!.label).toEqual({ en: 'Small · 58 mm', de: 'Klein · 58 mm' })
  })
})

describe('[E6.2][AC52] what the API says', () => {
  it('[E6.2][AC52] a 422 error list becomes refusals at the option, value or variant', () => {
    const found = refusalsOfProblem([
      { path: 'options.theme.values.lion', code: 'value-in-use', params: { value: 'Lion', count: 2, codes: 'A, B', more: 0 } },
      { path: 'options.theme.name', code: 'option-name-required' },
      { path: 'options.theme', code: 'option-in-use', params: { option: 'Theme', count: 1, codes: 'A', more: 0 } },
      { path: 'variants.v1.values.colour', code: 'values-missing', params: { code: 'VX-1', option: 'Colour' } },
      { path: 'variants.v2', code: 'combination-duplicate', params: { code: 'B', twin: 'A' } },
      { path: 'values', code: 'combination-taken', params: { code: 'A', archived: 0 } },
      { path: 'body', code: undefined },
    ])

    expect(found.map(f => f.at)).toEqual(['lion', 'theme', 'theme', 'v1', 'v2', 'values'])
    expect(refusalText(t, found[0]!)).toBe('Can’t delete Lion. Used by 2 variants (A, B). Archive or change those first.')
  })
})

describe('[E6.2][AC52] the create flow rows', () => {
  const options: OptionDraft[] = [
    { ref: 'colour', name: { en: 'Colour', de: '' }, values: [{ ref: 'navy', label: { en: 'Navy', de: '' }, swatch: null }, { ref: 'black', label: { en: 'Black', de: '' }, swatch: null }] },
    { ref: 'theme', name: { en: 'Theme', de: '' }, values: [{ ref: 'pilatus', label: { en: 'Pilatus', de: '' }, swatch: null }, { ref: 'chapel', label: { en: 'Chapel Bridge', de: '' }, swatch: null }, { ref: 'blank', label: { en: '', de: '' }, swatch: null }] },
  ]

  it('[E6.2][AC52] offers every combination ticked with a suggested code, and leaves out a value with no name', () => {
    const rows = createRows(options)

    expect(rows).toHaveLength(4)
    expect(rows.every(row => row.sold)).toBe(true)
    expect(rows.map(row => row.code)).toEqual(['VX-N-PILATUS', 'VX-N-CHAPEL', 'VX-B-PILATUS', 'VX-B-CHAPEL'])
  })

  it('[E6.2][AC52] rows that stay keep what was typed, and a keepsake with no option gets one row', () => {
    const first = createRows(options).map((row, index) => (index === 0 ? { ...row, sold: false, price: 39 } : row))

    expect(createRows(options, first)[0]).toMatchObject({ sold: false, price: 39 })
    expect(createRows([])).toHaveLength(1)
  })

  it('[E6.2][AC52] Create is refused with no ticked row, a missing, bad or repeated code, or no price', () => {
    const rows = createRows(options)

    expect(createErrors(rows.map(row => ({ ...row, sold: false }))).none).toBe(true)
    const typed = rows.map((row, index) => ({ ...row, price: 39, code: ['A-1', 'a-1', 'bad code', ''][index]! }))

    expect(createErrors(typed).rows).toEqual({
      [rows[1]!.key]: { code: 'twice' },
      [rows[2]!.key]: { code: 'invalid' },
      [rows[3]!.key]: { code: 'required' },
    })
    expect(createErrors(rows.map(row => ({ ...row, price: 0 }))).rows[rows[0]!.key]).toEqual({ price: true })
    expect(createErrors(rows.map(row => ({ ...row, price: 39 })))).toEqual({ rows: {}, none: false })
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
