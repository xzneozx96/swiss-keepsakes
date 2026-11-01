import type { OptionWrite, ProductOption, ProductVariant } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { Translate } from './keepsake-rules'

import { LANGUAGES } from './keepsake-rules'

/**
 * The rules of section 7 of the keepsake design, said before a save. The API holds the same rules and answers a
 * refused save with the same codes and numbers, so a refusal from either side reads through `refusalText`. The database
 * is the backstop (ADR-017, ADR-027).
 */

export const SWATCH = /^#[0-9a-f]{6}$/
export const DEFAULT_SWATCH = '#888888'
/** The API's `OPTION_NAME_MAX` and `VALUE_LABEL_MAX`, kept here so the rules pull in no schema code. */
export const OPTION_NAME_MAX = 60
export const VALUE_LABEL_MAX = 80
/** The colours the picker offers by name; any other colour comes from the browser's picker. */
export const SWATCH_PRESETS = [
  { key: 'red', hex: '#c8102e' },
  { key: 'black', hex: '#1a1a1a' },
  { key: 'white', hex: '#f5f5f5' },
  { key: 'navy', hex: '#1f3a5f' },
  { key: 'green', hex: '#2f7d4f' },
  { key: 'yellow', hex: '#f2c230' },
  { key: 'brown', hex: '#8a5a2b' },
  { key: 'grey', hex: DEFAULT_SWATCH },
] as const
const MAX_CODES_NAMED = 3
const LABEL_PARTS = ' · '
const LABEL_WORDS = /[\s·]+/
const NOT_CODE = /[^A-Z0-9-]/g
const MARKS = /[\u0300-\u036F]/g

export type Values = Record<string, string>
export type Text = Record<Language, string>

export interface ValueDraft { ref: string, label: Text, swatch: string | null }
export interface OptionDraft { ref: string, name: Text, values: ValueDraft[] }

/** The slice of a variant that the rules read: a saved variant, or a row of the create flow. */
export interface Valued { id: string, skuCode: string, status?: string, values: Values }

export type RefusalCode
  = | 'option-name-required' | 'value-name-required' | 'option-needs-value' | 'option-in-use' | 'value-in-use'
    | 'values-missing' | 'value-unknown' | 'combination-taken' | 'combination-duplicate' | 'no-options-one-variant'
    | 'refs-invalid' | 'code-duplicate' | 'variant-reserved' | 'variant-archived' | 'swatch-invalid'
    // The two the control says before a save; the API never sends them.
    | 'value-duplicate' | 'variants-missing'

/** One thing that stops a save. `at` is the option ref, value ref or variant id it belongs to. */
export interface Refusal { at: string, code: RefusalCode, params?: Record<string, string | number> }

/** A label in the reading language, else the other one. */
export function labelOf(text: { en?: string, de?: string }, language: Language = 'en'): string {
  return text[language] || text[language === 'en' ? 'de' : 'en'] || ''
}

/** "Small" for "Small · 58 mm Classic SD". */
export function shortLabel(text: { en?: string, de?: string }, language: Language = 'en'): string {
  return labelOf(text, language).split(LABEL_PARTS)[0] ?? ''
}

/** "Small · 58 mm Classic SD · Swan on the lake". */
export function combinationName(values: Values, options: ProductOption[], language: Language = 'en'): string {
  return options
    .map(option => option.values.find(value => value.id === values[option.id]))
    .map(value => (value ? labelOf(value.label, language) : '…'))
    .join(LABEL_PARTS)
}

/** "Small / Pilatus", the short labels joined by a slash. Empty for a keepsake with no option. */
export function variantTitle(values: Values, options: ProductOption[], language: Language = 'en'): string {
  return options
    .map(option => option.values.find(value => value.id === values[option.id]))
    .map(value => (value ? shortLabel(value.label, language) : '…'))
    .join(' / ')
}

/** Every combination of the values, in option order. One empty combination when there is no option. */
export function allCombinations(options: { ref: string, values: { ref: string }[] }[]): Values[] {
  return options.reduce<Values[]>(
    (rows, option) => rows.flatMap(row => option.values.map(value => ({ ...row, [option.ref]: value.ref }))),
    [{}],
  )
}

export function combinationKey(values: Values, optionRefs: string[]): string {
  return optionRefs.map(ref => `${ref}=${values[ref] ?? ''}`).join('|')
}

/** A code suggestion from the values: "VX-S-SWAN" from the first word of each label, one letter for the first option. */
export function suggestCode(values: Values, options: { id: string, values: { id: string, label: { en?: string, de?: string } }[] }[], prefix = 'VX'): string {
  const parts = options.map((option, index) => {
    const value = option.values.find(v => v.id === values[option.id])
    const word = value ? (labelOf(value.label).normalize('NFD').replace(MARKS, '').split(LABEL_WORDS)[0] ?? '') : ''

    return index === 0 ? word.slice(0, 1) : word
  })

  return [prefix, ...parts].filter(Boolean).join('-').toUpperCase().replace(NOT_CODE, '')
}

/** The variants (archived ones too) that hold this option, or this value of it. */
export function variantsUsing(variants: Valued[], optionRef: string, valueRef?: string): Valued[] {
  return variants.filter(variant => (valueRef === undefined ? variant.values[optionRef] !== undefined : variant.values[optionRef] === valueRef))
}

function usedBy(users: Valued[]): Record<string, string | number> {
  return { count: users.length, codes: users.slice(0, MAX_CODES_NAMED).map(user => user.skuCode).join(', '), more: Math.max(0, users.length - MAX_CODES_NAMED) }
}

const hasText = (text: Text) => LANGUAGES.some(language => text[language].trim() !== '')

/** The options as the sheet holds them, from the saved ones. */
export function draftOfOptions(options: ProductOption[]): OptionDraft[] {
  return options.map(option => ({
    ref: option.id,
    name: { en: option.name.en ?? '', de: option.name.de ?? '' },
    values: option.values.map(value => ({ ref: value.id, label: { en: value.label.en ?? '', de: value.label.de ?? '' }, swatch: value.swatch })),
  }))
}

function trimmed(text: Text) {
  return {
    ...(text.en.trim() && { en: text.en.trim() }),
    ...(text.de.trim() && { de: text.de.trim() }),
  }
}

/** What the API takes: the languages that have text, and no swatch where it is off. */
export function optionsBody(drafts: OptionDraft[]): OptionWrite[] {
  return drafts.map(option => ({
    ref: option.ref,
    name: trimmed(option.name),
    values: option.values.map(value => ({ ref: value.ref, label: trimmed(value.label), swatch: value.swatch })),
  }))
}

export const emptyText = (): Text => ({ en: '', de: '' })

/** A new option, with no value yet. */
export function newOption(ref: string): OptionDraft {
  return { ref, name: emptyText(), values: [] }
}

const VALUE_BREAK = /[,;\n]/
const normalised = (text: string) => text.trim().toLocaleLowerCase()

/** What typed or pasted text adds: "Small, Medium" or a column of lines, trimmed, with no empty one. */
export function splitValues(input: string): string[] {
  return input.split(VALUE_BREAK).map(part => part.trim()).filter(Boolean)
}

/** Another value of the option that already says the same, in either language, ignoring case and spaces. */
export function duplicateValue(option: OptionDraft, text: Text, exceptRef?: string): ValueDraft | undefined {
  const en = normalised(text.en)
  const de = normalised(text.de)

  return option.values.find(other => other.ref !== exceptRef && ((en !== '' && normalised(other.label.en) === en) || (de !== '' && normalised(other.label.de) === de)))
}

/** The list with one item moved; the same list when the move goes nowhere. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length)
    return items
  const next = [...items]
  const [item] = next.splice(from, 1)

  next.splice(to, 0, item!)

  return next
}

/** A draft option as the rules read a saved one. */
export function asSaved(drafts: OptionDraft[]): ProductOption[] {
  return drafts.map(option => ({
    id: option.ref,
    name: trimmed(option.name),
    values: option.values.map(value => ({ id: value.ref, label: trimmed(value.label), swatch: value.swatch })),
  }))
}

// A variant's values against the options: one of each, none unknown, and no twin among the others.
export function checkVariantValues(options: ProductOption[], others: Valued[], values: Values, at: string, code = ''): Refusal[] {
  if (options.length === 0) {
    const [other] = others

    return other ? [{ at, code: 'no-options-one-variant', params: { code: other.skuCode } }] : []
  }
  const refusals: Refusal[] = []

  for (const option of options) {
    const value = values[option.id]

    if (value === undefined || !option.values.some(v => v.id === value))
      refusals.push({ at, code: value === undefined ? 'values-missing' : 'value-unknown', params: { code, option: labelOf(option.name) } })
  }
  if (refusals.length === 0) {
    const twin = others.find(other => options.every(option => other.values[option.id] === values[option.id]))

    if (twin)
      refusals.push({ at, code: 'combination-taken', params: { code: twin.skuCode, archived: twin.status === 'archived' ? 1 : 0 } })
  }

  return refusals
}

/**
 * Can the staged options save together with the variants' new values, in one save? Each option and value needs a name
 * in English or German, a swatch is `#rrggbb`, a value or option that a variant holds is not deleted, every variant has a
 * value of every option (archived ones too), and no two variants share a combination.
 */
export function checkOptionsDraft(saved: ProductOption[], drafts: OptionDraft[], variants: Valued[], assigned: Record<string, Values>): Refusal[] {
  const refusals: Refusal[] = []
  const savedIds = new Set(saved.map(option => option.id))
  const kept = new Map(drafts.map(option => [option.ref, option]))

  for (const option of drafts) {
    if (!hasText(option.name))
      refusals.push({ at: option.ref, code: 'option-name-required' })
    if (option.values.length === 0)
      refusals.push({ at: option.ref, code: 'option-needs-value', params: { option: labelOf(option.name) } })
    for (const value of option.values) {
      if (!hasText(value.label))
        refusals.push({ at: value.ref, code: 'value-name-required' })
      if (value.swatch !== null && !SWATCH.test(value.swatch))
        refusals.push({ at: value.ref, code: 'swatch-invalid' })
    }
  }
  for (const option of saved) {
    const next = kept.get(option.id)

    if (!next) {
      const users = variantsUsing(variants, option.id)

      if (users.length > 0)
        refusals.push({ at: option.id, code: 'option-in-use', params: { option: labelOf(option.name), ...usedBy(users) } })
      continue
    }
    for (const value of option.values.filter(v => !next.values.some(n => n.ref === v.id))) {
      const users = variantsUsing(variants, option.id, value.id)

      if (users.length > 0)
        refusals.push({ at: value.id, code: 'value-in-use', params: { value: labelOf(value.label), ...usedBy(users) } })
    }
  }

  const seen = new Map<string, Valued>()

  for (const variant of variants) {
    const values: Values = {}
    let complete = true

    for (const option of drafts) {
      const value = assigned[variant.id]?.[option.ref] ?? (savedIds.has(option.ref) ? variant.values[option.ref] : undefined)

      if (value === undefined) {
        complete = false
        if (option.values.some(v => labelOfDraft(v)))
          refusals.push({ at: variant.id, code: 'values-missing', params: { code: variant.skuCode, option: labelOf(option.name) } })
      }
      else if (option.values.some(v => v.ref === value)) {
        values[option.ref] = value
      }
      else {
        complete = false
      }
    }
    if (!complete)
      continue
    const key = combinationKey(values, drafts.map(option => option.ref))
    const twin = seen.get(key)

    if (twin)
      refusals.push({ at: variant.id, code: 'combination-duplicate', params: { code: variant.skuCode, twin: twin.skuCode } })
    else
      seen.set(key, variant)
  }

  return refusals
}

function labelOfDraft(value: ValueDraft): string {
  return value.label.en.trim() || value.label.de.trim()
}

/**
 * What the options control says before a save: the rules of `checkOptionsDraft`, with a variant that still needs a value
 * of a new option counted once per option (`variants-missing`, at `<option ref>:assign`) instead of once per variant, and a
 * value that an earlier value of the same option already says (`value-duplicate`). The API holds the rest of the rules,
 * not the duplicate.
 */
export function checkStagedOptions(saved: ProductOption[], drafts: OptionDraft[], variants: Valued[], assigned: Record<string, Values>): Refusal[] {
  const savedIds = new Set(saved.map(option => option.id))
  const found = checkOptionsDraft(saved, drafts, variants, assigned).filter(refusal => refusal.code !== 'values-missing')
  const refusals: Refusal[] = []

  for (const option of drafts) {
    const refs = new Set(option.values.filter(value => labelOfDraft(value)).map(value => value.ref))

    option.values.forEach((value, index) => {
      if (labelOfDraft(value) && duplicateValue({ ...option, values: option.values.slice(0, index) }, value.label))
        refusals.push({ at: value.ref, code: 'value-duplicate', params: { value: labelOf(value.label), option: labelOf(option.name) } })
    })
    if (!savedIds.has(option.ref) && refs.size > 0) {
      const missing = variants.filter(variant => !refs.has(assigned[variant.id]?.[option.ref] ?? '')).length

      if (missing > 0)
        refusals.push({ at: `${option.ref}:assign`, code: 'variants-missing', params: { option: labelOf(option.name), count: missing } })
    }
  }

  return [...found, ...refusals]
}

/** The error list of a refused API save, as refusals. The path says which option, value or variant it is about. */
export function refusalsOfProblem(errors: { path: string, code?: string, params?: Record<string, string | number> }[] | undefined): Refusal[] {
  return (errors ?? []).flatMap((error) => {
    if (!error.code)
      return []
    const parts = error.path.split('.')
    const at = parts[0] === 'options' ? parts[parts.length - 1 - (parts.at(-1) === 'name' ? 1 : 0)]! : (parts[1] ?? error.path)

    return [{ at, code: error.code as RefusalCode, ...(error.params && { params: error.params }) }]
  })
}

function usedByText(t: Translate, params: Refusal['params']) {
  const count = Number(params?.count ?? 0)
  const more = Number(params?.more ?? 0)
  const codes = `${params?.codes ?? ''}${more > 0 ? ` ${t('keepsakes.and')} ${more} ${t('keepsakes.more')}` : ''}`

  return t(count === 1 ? 'keepsakes.refusal.usedBy.one' : 'keepsakes.refusal.usedBy.other', { count, codes })
}

/** The merchant's words for a refusal, from its code and numbers. */
export function refusalText(t: Translate, { code, params }: Refusal): string {
  const text = (name: string) => String(params?.[name] ?? '')

  switch (code) {
    case 'option-name-required': return t('keepsakes.refusal.optionName')
    case 'value-name-required': return t('keepsakes.refusal.valueName')
    case 'option-needs-value': return t('keepsakes.refusal.needsValue', { option: text('option') || t('keepsakes.refusal.thisOption') })
    case 'swatch-invalid': return t('keepsakes.refusal.swatch')
    case 'option-in-use': return t('keepsakes.refusal.optionInUse', { option: text('option'), usedBy: usedByText(t, params) })
    case 'value-in-use': return t('keepsakes.refusal.valueInUse', { value: text('value'), usedBy: usedByText(t, params) })
    case 'values-missing': return t('keepsakes.refusal.valuesMissing', { code: text('code') || t('keepsakes.refusal.aVariant'), option: text('option').toLowerCase() || t('keepsakes.refusal.aValue') })
    case 'value-unknown': return t('keepsakes.refusal.valueUnknown')
    case 'combination-taken': return t(params?.archived ? 'keepsakes.refusal.takenArchived' : 'keepsakes.refusal.taken', { code: text('code') })
    case 'combination-duplicate': return t('keepsakes.refusal.duplicate', { code: text('code'), twin: text('twin') })
    case 'no-options-one-variant': return t('keepsakes.refusal.oneVariant', { code: text('code') })
    case 'refs-invalid': return t('keepsakes.refusal.refs')
    case 'code-duplicate': return t('keepsakes.refusal.codeTwice', { code: text('code') })
    case 'variant-reserved': return t('keepsakes.refusal.reserved', { code: text('code'), count: Number(params?.count ?? 0) })
    case 'variant-archived': return t('keepsakes.refusal.archived', { code: text('code') })
    case 'value-duplicate': return t('keepsakes.refusal.valueDuplicate', { value: text('value'), option: text('option') || t('keepsakes.refusal.thisOptionInline') })
    case 'variants-missing': return t(Number(params?.count) === 1 ? 'keepsakes.refusal.variantsMissing.one' : 'keepsakes.refusal.variantsMissing.other', { count: Number(params?.count ?? 0), option: text('option') || t('keepsakes.refusal.thisOptionInline') })
  }
}

/** The refusal of one variant's values, with the combination in the merchant's words ("Small · Swan"). */
export function variantRefusalText(t: Translate, refusal: Refusal, combination: string): string {
  if (refusal.code === 'combination-taken') {
    return t(refusal.params?.archived ? 'keepsakes.refusal.combinationArchived' : 'keepsakes.refusal.combinationTaken', { combination, code: String(refusal.params?.code ?? '') })
  }

  return refusalText(t, refusal)
}

/** Variants by tab: the status the guest-facing list keeps apart. Archived variants have a tab of their own. */
export function isArchived(variant: Pick<ProductVariant, 'status'>): boolean {
  return variant.status === 'archived'
}
