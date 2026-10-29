import type { Keepsake, Language, Localized, OptionValue, ProductOption, Sku } from './keepsake-editor-data'

import { formatMoney } from '@sk/domain/shared'

import { LANG_NAME } from './keepsake-editor-data'

/**
 * Pure rules of the keepsake editor lab, the ones the database enforces (ADR-016, ADR-017,
 * ADR-027, the catalog DDL) said in the merchant's words. The screens call these before a save,
 * so a refusal shows at the control instead of coming back from the server.
 */

/** `skus_sku_code_check`. */
const SKU_CODE = /^[A-Z0-9]+(?:[-_.][A-Z0-9]+)*$/i
/** `product_option_values_swatch_check`. */
const SWATCH = /^#[0-9a-f]{6}$/
export const MAX_COMMISSION = 0.5
const LABEL_WORDS = /[\s·]+/
const NOT_CODE = /[^A-Z0-9-]/g
const LABEL_PARTS = ' · '

export const chf = (rappen: number) => formatMoney(rappen / 100, 'en-CH')

/** A label in the reading language, else the other one. */
export function label(text: Localized, language: Language = 'en') {
  return text[language] || text[language === 'en' ? 'de' : 'en']
}

// ---------------------------------------------------------------------------------------------
// Combinations

/**
 * `skus.combination_key`: the option and value ids in option order. An empty string for a product
 * with no options (so it has exactly one SKU); null while a value is missing.
 */
export function combinationKey(values: Sku['values'], options: ProductOption[]): string | null {
  const parts: string[] = []

  for (const option of options) {
    const value = values[option.id]

    if (!value || !option.values.some(v => v.id === value))
      return null
    parts.push(`${option.id}=${value}`)
  }

  return parts.join('|')
}

/** "Small · 58 mm Classic SD · Swan on the lake", or the product's one SKU. */
export function combinationName(values: Sku['values'], options: ProductOption[], language: Language = 'en') {
  if (!options.length)
    return 'The only variant'

  return options
    .map(o => o.values.find(v => v.id === values[o.id]))
    .map(v => (v ? label(v.label, language) : '…'))
    .join(' · ')
}

/** The first part of a value label: "Small · 58 mm Classic SD" → "Small" (badges, titles). */
export function shortLabel(text: Localized, language: Language = 'en') {
  return label(text, language).split(LABEL_PARTS)[0] ?? ''
}

/** A variant's title, Medusa style: "Small / Pilatus". */
export function variantTitle(values: Sku['values'], options: ProductOption[], language: Language = 'en') {
  if (!options.length)
    return 'Default variant'

  return options
    .map(o => o.values.find(v => v.id === values[o.id]))
    .map(v => (v ? shortLabel(v.label, language) : '…'))
    .join(' / ')
}

/** Every combination of the values, in option order: the matrix of option B (none of them is a SKU yet). */
export function allCombinations(options: ProductOption[]): Sku['values'][] {
  return options.reduce<Sku['values'][]>(
    (rows, option) => rows.flatMap(row => option.values.map(v => ({ ...row, [option.id]: v.id }))),
    [{}],
  )
}

export function findSku(skus: Sku[], values: Sku['values'], options: ProductOption[]) {
  const key = combinationKey(values, options)

  return key === null ? undefined : skus.find(s => combinationKey(s.values, options) === key)
}

// ---------------------------------------------------------------------------------------------
// One SKU

export type SkuField = 'values' | 'code' | 'price' | 'onHand'
export type SkuErrors = Partial<Record<SkuField, string>>

/** Stock: on hand never goes below what is held for orders (`CHECK (held <= on_hand)`). */
export function stockError(onHand: number, held: number): string | undefined {
  if (!Number.isInteger(onHand) || onHand < 0)
    return 'Enter a whole number, 0 or more.'
  if (onHand < held)
    return `${held} ${held === 1 ? 'unit is' : 'units are'} reserved by orders, so stock can’t go below the ${held} reserved.`

  return undefined
}

export const available = (s: Pick<Sku, 'onHand' | 'held'>) => Math.max(0, s.onHand - s.held)
export const isSoldOut = (s: Sku) => s.status !== 'archived' && available(s) === 0

/**
 * What stops one SKU from saving next to the others: a missing value, a duplicate combination
 * (archived SKUs count: the unique key ignores status), a bad or taken code, no price, stock
 * below held.
 */
/** `otherCodes`: codes of the store's other products (`skus_store_sku_code_key` is per store). */
export function skuErrors(target: Sku, product: Pick<Keepsake, 'options' | 'skus'>, otherCodes: ReadonlySet<string> = new Set()): SkuErrors {
  const errors: SkuErrors = {}
  const others = product.skus.filter(s => s.id !== target.id)
  const missing = product.options.filter(o => !o.values.some(v => v.id === target.values[o.id]))

  if (missing.length) {
    errors.values = `Choose a ${missing.map(o => label(o.name).toLowerCase()).join(' and a ')}.`
  }
  else {
    const key = combinationKey(target.values, product.options)
    const twin = others.find(s => combinationKey(s.values, product.options) === key)

    if (twin) {
      errors.values = !product.options.length
        ? `A keepsake without options has one variant only (${twin.code || 'the first'}). Add an option to sell more.`
        : twin.status === 'archived'
          ? `${combinationName(target.values, product.options)} is already ${twin.code}, archived. Restore it instead.`
          : `${combinationName(target.values, product.options)} is already sold as ${twin.code}. Each combination is sold once.`
    }
  }

  const code = target.code.trim()

  if (!code)
    errors.code = 'Add a SKU code.'
  else if (!SKU_CODE.test(code))
    errors.code = 'Letters and digits, joined by - _ or . (like VX-S-SWAN).'
  else if (others.some(s => s.code.toLowerCase() === code.toLowerCase()) || otherCodes.has(code.toUpperCase()))
    errors.code = `${code} is already used in your shop.`

  if (!Number.isFinite(target.price) || target.price <= 0)
    errors.price = 'Add a price above CHF 0.'

  const stock = stockError(target.onHand, target.held)

  if (stock)
    errors.onHand = stock

  return errors
}

// ---------------------------------------------------------------------------------------------
// How a SKU reads

const statusText: Record<Sku['status'], string> = { published: 'For sale', draft: 'Hidden', archived: 'Archived' }

export function skuState(sku: Sku): { tone: 'success' | 'danger' | 'neutral', text: string } {
  if (sku.status === 'published' && isSoldOut(sku))
    return { tone: 'danger', text: 'Sold out' }

  return { tone: sku.status === 'published' ? 'success' : 'neutral', text: statusText[sku.status] }
}

/** "4 available · 2 held", as the variants table and the inventory say it. */
/** A fresh SKU for the add sheet: the values given (or none), no code and no price yet. */
export function blankSku(id: string, values: Sku['values'] = {}): Sku {
  return { id, code: '', price: 0, status: 'published', values, onHand: 0, held: 0, isNew: true }
}

export const hasErrors = (errors: SkuErrors) => Object.keys(errors).length > 0

/** A code suggestion from the values: "VX-S-SWAN" style, from the first word of each label. */
export function suggestCode(values: Sku['values'], options: ProductOption[], prefix = 'VX') {
  const parts = options.map((o) => {
    const v = o.values.find(x => x.id === values[o.id])
    const word = v ? label(v.label).split(LABEL_WORDS)[0] ?? '' : ''

    return o.id === 'opt-size' ? word.slice(0, 1) : word
  })

  return [prefix, ...parts].filter(Boolean).join('-').toUpperCase().replace(NOT_CODE, '')
}

// ---------------------------------------------------------------------------------------------
// Options and values (N14)

/** SKUs (archived ones too) that use a value: why it can't be deleted. */
export function skusUsing(skus: Sku[], optionId: string, valueId?: string) {
  return skus.filter(s => (valueId ? s.values[optionId] === valueId : Boolean(s.values[optionId])))
}

function usedByText(users: Sku[]) {
  const codes = users.map(s => s.code || 'a new variant')
  const list = codes.length > 3 ? `${codes.slice(0, 3).join(', ')} and ${codes.length - 3} more` : codes.join(', ')

  return `Used by ${users.length} ${users.length === 1 ? 'variant' : 'variants'} (${list})`
}

/** A value used by a SKU can't be deleted (ADR-027); the reason names the SKUs. */
export function deleteValueRefusal(skus: Sku[], optionId: string, valueId: string): string | undefined {
  const users = skusUsing(skus, optionId, valueId)

  return users.length ? `${usedByText(users)}. Archive or change those first.` : undefined
}

/** An option whose values SKUs use can't be deleted either. */
export function deleteOptionRefusal(skus: Sku[], optionId: string): string | undefined {
  const users = skusUsing(skus, optionId)

  return users.length ? `${usedByText(users)}. Every variant has one of its values.` : undefined
}

export interface OptionsProblem {
  /** Option id, value id, or SKU id it belongs to. */
  at: string
  text: string
}

/**
 * Can the staged options save together with the SKUs' new values, in one save? Each option and
 * value needs a name in at least one language, swatches are `#rrggbb`, and every SKU has a value
 * of every option (the trigger counts them at commit), with no two SKUs on one combination.
 */
export function optionsProblems(options: ProductOption[], skus: Sku[]): OptionsProblem[] {
  const problems: OptionsProblem[] = []

  for (const option of options) {
    if (!option.name.en.trim() && !option.name.de.trim())
      problems.push({ at: option.id, text: 'Name the option in English or German.' })
    if (!option.values.length)
      problems.push({ at: option.id, text: `${label(option.name) || 'This option'} needs at least one value.` })
    for (const v of option.values) {
      if (!v.label.en.trim() && !v.label.de.trim())
        problems.push({ at: v.id, text: 'Name the value in English or German.' })
      if (v.swatch !== null && !SWATCH.test(v.swatch))
        problems.push({ at: v.id, text: 'A colour is # and six digits or letters a–f, like #c8102e.' })
    }
  }
  for (const s of skus) {
    const missing = options.filter(o => !o.values.some(v => v.id === s.values[o.id]))

    if (missing.length)
      problems.push({ at: s.id, text: `${s.code || 'A new variant'} needs a ${missing.map(o => label(o.name).toLowerCase() || 'value').join(' and a ')}.` })
  }
  const seen = new Map<string, Sku>()

  for (const s of skus) {
    const key = combinationKey(s.values, options)

    if (key === null)
      continue
    const twin = seen.get(key)

    if (twin)
      problems.push({ at: s.id, text: `${s.code} and ${twin.code} would both be ${combinationName(s.values, options)}.` })
    else seen.set(key, s)
  }

  return problems
}

/** A new option keeps each SKU's other values; the merchant gives each SKU a value of it. */
export function emptyOption(id: string): ProductOption {
  return { id, name: { en: '', de: '' }, values: [] }
}

export function emptyValue(id: string, swatch: string | null = null): OptionValue {
  return { id, label: { en: '', de: '' }, swatch }
}

// ---------------------------------------------------------------------------------------------
// Publish (AC30: one full language is enough)

export type CheckTarget = 'basics' | 'photos' | 'options' | 'variants' | 'commission'

export interface Check {
  id: string
  text: string
  target: CheckTarget
}

/** Name and text are both filled in a language. */
export function fullLanguages(product: Pick<Keepsake, 'name' | 'text'>): Language[] {
  return (['en', 'de'] as const).filter(l => product.name[l].trim() && product.text[l].trim())
}

/** "Complete", "Missing text", "Missing name" or "Not written": a language's name and text for this keepsake. */
export function languageState(text: { name: Localized, text: Localized }, l: Language) {
  const name = Boolean(text.name[l].trim())
  const body = Boolean(text.text[l].trim())

  return name && body ? 'Complete' : name ? 'Missing text' : body ? 'Missing name' : 'Not written'
}

export function publishChecks(product: Keepsake): { blocking: Check[], warnings: Check[] } {
  const blocking: Check[] = []
  const warnings: Check[] = []
  const languages = fullLanguages(product)
  const live = product.skus.filter(s => s.status !== 'archived')
  const forSale = live.filter(s => s.status === 'published')
  const broken = live.filter(s => hasErrors(skuErrors(s, product)))

  if (!languages.length)
    blocking.push({ id: 'language', text: 'Add the name and the text in English or German.', target: 'basics' })
  if (!product.photos.length)
    blocking.push({ id: 'photo', text: 'Add at least one photo.', target: 'photos' })
  if (broken.length)
    blocking.push({ id: 'sku-errors', text: `${broken.length} ${broken.length === 1 ? 'variant needs' : 'variants need'} a fix (code, price or values).`, target: 'variants' })
  else if (!forSale.length)
    blocking.push({ id: 'for-sale', text: 'Put at least one variant on sale.', target: 'variants' })

  if (languages.length === 1) {
    const other = languages[0] === 'en' ? 'de' : 'en'

    warnings.push({ id: 'other-language', text: `No ${LANG_NAME[other]} name and text: ${LANG_NAME[other]} readers see the ${LANG_NAME[languages[0]!]} with a note.`, target: 'basics' })
  }
  const unlabelled = product.options.flatMap(o => [o.name, ...o.values.map(v => v.label)]).filter(l => !l.en.trim() || !l.de.trim()).length

  if (unlabelled)
    warnings.push({ id: 'labels', text: `${unlabelled} option ${unlabelled === 1 ? 'name or value misses' : 'names or values miss'} a language.`, target: 'options' })
  const soldOut = forSale.filter(isSoldOut)

  if (soldOut.length)
    warnings.push({ id: 'sold-out', text: `${soldOut.length} sold out (${soldOut.map(s => s.code).join(', ')}): guests see them and can’t pick them.`, target: 'variants' })
  const hidden = live.filter(s => s.status === 'draft')

  if (hidden.length)
    warnings.push({ id: 'hidden', text: `${hidden.length} hidden (${hidden.map(s => s.code).join(', ')}): guests don’t see ${hidden.length === 1 ? 'it' : 'them'}.`, target: 'variants' })
  if (product.commissionRate === 0)
    warnings.push({ id: 'commission', text: 'Commission is 0 %: partners earn nothing on it.', target: 'commission' })

  return { blocking, warnings }
}

// ---------------------------------------------------------------------------------------------
// The create flow: every combination is offered, only the ticked ones become SKUs

export interface CreateRow {
  /** `combinationKey` of the values. */
  key: string
  values: Sku['values']
  sold: boolean
  code: string
  /** Rappen. */
  price: number
  onHand: number
}

/** All combinations of the options, ticked, with a suggested code; no options gives one row. */
export function createRows(options: ProductOption[], previous: CreateRow[] = []): CreateRow[] {
  return allCombinations(options).map((values) => {
    const key = combinationKey(values, options) ?? ''
    const kept = previous.find(r => r.key === key)

    return kept ?? { key, values, sold: true, code: suggestCode(values, options), price: 0, onHand: 0 }
  })
}

export type CreateErrors = Record<string, { code?: string, price?: string }>

/** What stops Create: no ticked row, or a ticked row without a valid, unique code or a price. */
export function createErrors(rows: CreateRow[], otherCodes: ReadonlySet<string> = new Set()): { rows: CreateErrors, none: boolean } {
  const sold = rows.filter(r => r.sold)
  const errors: CreateErrors = {}

  for (const row of sold) {
    const sku: Sku = { id: row.key, code: row.code, price: row.price, status: 'published', values: row.values, onHand: row.onHand, held: 0 }
    const found = skuErrors(sku, { options: [], skus: sold.filter(r => r !== row).map(r => ({ ...sku, id: r.key, code: r.code })) }, otherCodes)

    if (found.code || found.price)
      errors[row.key] = { code: found.code, price: found.price }
  }

  return { rows: errors, none: sold.length === 0 }
}

/** The new keepsake, a draft, with a SKU for each ticked row only (sparse, ADR-017). */
export function buildKeepsake(draft: Keepsake, rows: CreateRow[], id: string): Keepsake {
  return {
    ...draft,
    id,
    isNew: false,
    status: 'draft',
    skus: rows.filter(r => r.sold).map(r => ({
      id: `${id}-${r.code.toLowerCase()}`,
      code: r.code.trim(),
      price: r.price,
      status: 'published' as const,
      values: r.values,
      onHand: r.onHand,
      held: 0,
    })),
  }
}
