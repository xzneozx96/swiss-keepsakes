import type { Sku } from '@/features/lab/keepsake-editor-data'

import { describe, expect, it } from 'vitest'

import { colourOption, HOLDS, newKeepsake, swissCardDraft, victorinox } from '@/features/lab/keepsake-editor-data'
import {
  allCombinations,
  available,
  buildKeepsake,
  combinationKey,
  createErrors,
  createRows,
  deleteOptionRefusal,
  deleteValueRefusal,
  findSku,
  hasErrors,
  isSoldOut,
  languageState,
  optionsProblems,
  publishChecks,
  skuErrors,
  stockError,
  variantTitle,
} from '@/features/lab/keepsake-editor-rules'

function newSku(values: Sku['values'], patch: Partial<Sku> = {}): Sku {
  return {
    id: 'sku-test',
    code: 'VX-TEST',
    price: 4900,
    status: 'published',
    values,
    onHand: 1,
    held: 0,
    isNew: true,
    ...patch,
  }
}

describe('[E6.2][AC52] options and sparse SKUs', () => {
  it('stores only the sold combinations', () => {
    const p = victorinox()

    expect(allCombinations(p.options)).toHaveLength(36)
    expect(p.skus).toHaveLength(10)
    expect(findSku(p.skus, { 'opt-size': 'v-l', 'opt-theme': 'v-pilatus' }, p.options)).toBeUndefined()
    expect(findSku(p.skus, { 'opt-size': 'v-s', 'opt-theme': 'v-swan' }, p.options)?.code).toBe('VX-S-SWAN')
  })

  it('keys a SKU by one value per option, in option order', () => {
    const p = victorinox()

    expect(combinationKey({ 'opt-theme': 'v-swan', 'opt-size': 'v-s' }, p.options)).toBe('opt-size=v-s|opt-theme=v-swan')
    expect(combinationKey({ 'opt-size': 'v-s' }, p.options)).toBeNull()
    // A value of another option is not a value of this one.
    expect(combinationKey({ 'opt-size': 'v-swan', 'opt-theme': 'v-swan' }, p.options)).toBeNull()
  })

  it('every mock SKU is valid', () => {
    const p = victorinox()

    for (const s of p.skus)
      expect(skuErrors(s, p), s.code).toEqual({})
  })

  it('refuses a missing value', () => {
    const p = victorinox()

    expect(skuErrors(newSku({ 'opt-size': 'v-m' }), p).values).toBe('Choose a theme.')
  })

  it('refuses a duplicate combination, archived SKUs included', () => {
    const p = victorinox()

    expect(skuErrors(newSku({ 'opt-size': 'v-s', 'opt-theme': 'v-swan' }), p).values).toContain('already sold as VX-S-SWAN')
    expect(skuErrors(newSku({ 'opt-size': 'v-s', 'opt-theme': 'v-oldtown' }), p).values).toContain('Restore it instead')
    expect(hasErrors(skuErrors(newSku({ 'opt-size': 'v-l', 'opt-theme': 'v-pilatus' }), p))).toBe(false)
  })

  it('refuses a bad, taken or other-product SKU code, and no price', () => {
    const p = victorinox()
    const values = { 'opt-size': 'v-l', 'opt-theme': 'v-pilatus' }

    expect(skuErrors(newSku(values, { code: 'vx s swan' }), p).code).toContain('Letters and digits')
    expect(skuErrors(newSku(values, { code: 'vx-s-swan' }), p).code).toContain('already used')
    // Codes are unique per store: another product's code is taken too.
    expect(skuErrors(newSku(values, { code: 'vx-red-swan' }), p, new Set(['VX-RED-SWAN'])).code).toContain('already used')
    expect(skuErrors(newSku(values, { price: 0 }), p).price).toBeDefined()
  })

  it('works with no options: exactly one SKU', () => {
    const p = newKeepsake()
    const only = { ...p.skus[0]!, code: 'POUCH-1', price: 1500 }
    const product = { ...p, skus: [only] }

    expect(combinationKey({}, [])).toBe('')
    expect(skuErrors(only, product)).toEqual({})
    expect(skuErrors(newSku({}), product).values).toContain('one variant only')
  })

  it('works with one option', () => {
    const p = victorinox()
    const options = [p.options[0]!]
    const skus = [newSku({ 'opt-size': 'v-s' }, { id: 'a', code: 'A' }), newSku({ 'opt-size': 'v-m' }, { id: 'b', code: 'B' })]

    expect(optionsProblems(options, skus)).toEqual([])
    expect(skuErrors(newSku({ 'opt-size': 'v-s' }, { code: 'C' }), { options, skus }).values).toContain('already sold as A')
  })

  it('refuses deleting a value or an option a SKU uses, and names the SKUs', () => {
    const p = victorinox()

    expect(deleteValueRefusal(p.skus, 'opt-theme', 'v-lion')).toBe('Used by 2 variants (VX-S-LION, VX-L-LION). Archive or change those first.')
    // The archived Old town SKU still counts.
    expect(deleteValueRefusal(p.skus, 'opt-theme', 'v-oldtown')).toContain('VX-S-OLDTOWN')
    expect(deleteValueRefusal(p.skus, 'opt-theme', 'v-furka')).toBeUndefined()
    expect(deleteOptionRefusal(p.skus, 'opt-size')).toContain('and 7 more')
    expect(deleteOptionRefusal(p.skus, 'opt-colour')).toBeUndefined()
  })

  it('adding an option needs a value for every existing SKU in the same save', () => {
    const p = victorinox()
    const options = [...p.options, structuredClone(colourOption)]
    const someColoured = p.skus.map((s, i) => (i < 8 ? { ...s, values: { ...s.values, 'opt-colour': 'v-red' } } : s))

    const problems = optionsProblems(options, someColoured)

    expect(problems.map(x => x.text)).toEqual(['VX-M-STEAMBOAT needs a colour.', 'VX-S-OLDTOWN needs a colour.'])
    const allColoured = p.skus.map(s => ({ ...s, values: { ...s.values, 'opt-colour': 'v-red' } }))

    expect(optionsProblems(options, allColoured)).toEqual([])
  })

  it('refuses two SKUs that a change of values would put on one combination', () => {
    const p = victorinox()
    const skus = p.skus.map(s => (s.code === 'VX-M-SWAN' ? { ...s, values: { ...s.values, 'opt-size': 'v-s' } } : s))

    expect(optionsProblems(p.options, skus).map(x => x.text)).toEqual(['VX-M-SWAN and VX-S-SWAN would both be Small · 58 mm Classic SD · Swan on the lake.'])
  })

  it('checks option names, value names and swatches', () => {
    const options = [{ ...structuredClone(colourOption), name: { en: '', de: '' } }]

    options[0]!.values[0]!.swatch = '#C8102E'
    options[0]!.values[1]!.label = { en: '', de: '' }
    expect(optionsProblems(options, []).map(x => x.text)).toEqual([
      'Name the option in English or German.',
      'A colour is # and six digits or letters a–f, like #c8102e.',
      'Name the value in English or German.',
    ])
  })
})

describe('[E6.3][AC05][AC53] stock', () => {
  it('refuses stock below the reserved units and names them', () => {
    expect(stockError(1, 2)).toBe('2 units are reserved by orders, so stock can’t go below the 2 reserved.')
    expect(stockError(2, 2)).toBeUndefined()
    expect(stockError(-1, 0)).toBeDefined()
    expect(stockError(1.5, 0)).toBeDefined()
  })

  it('held by orders adds up to the held figure of every SKU', () => {
    for (const s of victorinox().skus)
      expect(HOLDS.filter(h => h.skuId === s.id).reduce((n, h) => n + h.quantity, 0), s.code).toBe(s.held)
  })

  it('sold out at zero available; the other SKUs of the design stay for sale', () => {
    const p = victorinox()
    const by = (code: string) => p.skus.find(s => s.code === code)!

    expect(available(by('VX-S-SWAN'))).toBe(4)
    expect(isSoldOut(by('VX-L-SWAN'))).toBe(true)
    expect(isSoldOut(by('VX-S-LION'))).toBe(true)
    expect(isSoldOut(by('VX-M-SWAN'))).toBe(false)
    expect(isSoldOut(by('VX-L-LION'))).toBe(false)
  })
})

describe('[E6.1][AC30][AC55] publish checks', () => {
  it('the Victorinox keepsake publishes, with warnings only', () => {
    const { blocking, warnings } = publishChecks(victorinox())

    expect(blocking).toEqual([])
    expect(warnings.map(w => w.id)).toEqual(['labels', 'sold-out', 'hidden'])
  })

  it('one full language is enough, the other only warns (AC30)', () => {
    const p = victorinox()
    const { blocking, warnings } = publishChecks({ ...p, text: { ...p.text, de: '' } })

    expect(blocking).toEqual([])
    expect(warnings[0]!.text).toContain('No German name and text')
  })

  it('a new keepsake is blocked by language, photo and its variant', () => {
    const { blocking } = publishChecks(newKeepsake())

    expect(blocking.map(b => b.id)).toEqual(['language', 'photo', 'sku-errors'])
  })

  it('the language switch says what is missing', () => {
    const p = victorinox()

    expect(languageState(p, 'en')).toBe('Complete')
    expect(languageState({ ...p, text: { ...p.text, de: '' } }, 'de')).toBe('Missing text')
    expect(languageState({ ...p, name: { ...p.name, de: ' ' } }, 'de')).toBe('Missing name')
    expect(languageState({ name: { en: '', de: '' }, text: { en: '', de: '' } }, 'en')).toBe('Not written')
  })

  it('a name in one language and the text in the other is not a full language', () => {
    const p = victorinox()

    expect(publishChecks({ ...p, name: { en: p.name.en, de: '' }, text: { en: '', de: p.text.de } }).blocking[0]!.id).toBe('language')
  })

  it('needs one variant on sale', () => {
    const p = victorinox()

    expect(publishChecks({ ...p, skus: p.skus.map(s => ({ ...s, status: 'draft' as const })) }).blocking.map(b => b.id)).toEqual(['for-sale'])
  })

  it('no mock text offers engraving (AC55)', () => {
    const text = JSON.stringify([victorinox(), newKeepsake(), colourOption]).toLowerCase()

    expect(text).not.toMatch(/engrav|gravier/)
  })
})

describe('[E6.2] the create flow', () => {
  it('offers every combination, ticked, and creates only the ticked ones', () => {
    const draft = swissCardDraft()
    const rows = createRows(draft.options).map((r, i) => ({ ...r, sold: i % 3 !== 0, price: 3900, onHand: 2 }))
    const product = buildKeepsake(draft, rows, 'p-card')

    expect(rows).toHaveLength(9)
    expect(product.skus).toHaveLength(6)
    expect(product.skus.map(s => variantTitle(s.values, product.options))).not.toContain('Red / Swan on the lake')
    expect(product.status).toBe('draft')
    for (const s of product.skus)
      expect(skuErrors(s, product)).toEqual({})
  })

  it('keeps the merchant’s edits when the options change', () => {
    const draft = swissCardDraft()
    const edited = createRows(draft.options).map(r => ({ ...r, sold: false, price: 1000 }))
    const again = createRows([...draft.options, structuredClone(victorinox().options[0]!)], edited)

    // A new option makes new combinations: they start ticked, the old keys no longer exist.
    expect(again).toHaveLength(27)
    expect(again.every(r => r.sold)).toBe(true)
    expect(createRows(draft.options, edited).every(r => !r.sold && r.price === 1000)).toBe(true)
  })

  it('refuses none ticked, a missing price, a duplicate code and a code another product uses', () => {
    const draft = swissCardDraft()
    const rows = createRows(draft.options)

    expect(createErrors(rows.map(r => ({ ...r, sold: false }))).none).toBe(true)
    expect(Object.keys(createErrors(rows).rows)).toHaveLength(9)
    const priced = rows.map(r => ({ ...r, price: 3900 }))

    expect(createErrors(priced).rows).toEqual({})
    const twin = priced.map((r, i) => (i === 1 ? { ...r, code: priced[0]!.code } : r))

    expect(createErrors(twin).rows[twin[1]!.key]?.code).toContain('already used')
    expect(createErrors(priced, new Set([priced[0]!.code])).rows[priced[0]!.key]?.code).toContain('already used')
  })

  it('zero options give exactly one variant', () => {
    const rows = createRows([])

    expect(rows).toEqual([{ key: '', values: {}, sold: true, code: 'VX', price: 0, onHand: 0 }])
    expect(buildKeepsake(newKeepsake(), [{ ...rows[0]!, code: 'POUCH-1', price: 1500 }], 'p-x').skus).toHaveLength(1)
  })
})
