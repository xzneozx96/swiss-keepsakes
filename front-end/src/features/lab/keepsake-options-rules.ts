/**
 * The rules the two controls share (ADR-017, ADR-027), as plain functions: every variant has exactly one value of every
 * option, a combination is sold once, a value a variant uses can't be deleted, and a new option needs a value on every
 * variant in the same save. The lab's wording is plain English.
 */
import type { Lang, OptionDraft, Text, ValueDraft, Variant } from './keepsake-options-data'

export interface Problem {
  /** The option ref, value ref, variant id or `${option ref}:assign` it belongs to. */
  at: string
  code: 'option-name' | 'value-name' | 'option-needs-value' | 'value-duplicate' | 'variants-missing'
  text: string
}

export type Assigned = Record<string, Record<string, string>>

let counter = 0

/** A ref for something the merchant just made. Called from event handlers only. */
export function newRef(kind: string) {
  counter += 1

  return `new-${kind}-${counter}`
}

export const norm = (value: string) => value.trim().toLocaleLowerCase()

/** A text in the reading language, else the other one. */
export function labelOf(text: Partial<Text>, lang: Lang = 'en'): string {
  return text[lang] || text[lang === 'en' ? 'de' : 'en'] || ''
}

export const hasName = (text: Text) => text.en.trim() !== '' || text.de.trim() !== ''

export function emptyOption(): OptionDraft {
  return { ref: newRef('option'), name: { en: '', de: '' }, values: [] }
}

export function valueFrom(text: string, lang: Lang = 'en', swatch: string | null = null): ValueDraft {
  return { ref: newRef('value'), label: { en: lang === 'en' ? text.trim() : '', de: lang === 'de' ? text.trim() : '' }, swatch }
}

/** What "a, b, c" or a pasted column of lines adds: trimmed, no empty ones. */
const VALUE_BREAK = /[,\n;]/
const CODE_SHAPE = /^[A-Z0-9][A-Z0-9-]*$/

export function splitValues(input: string): string[] {
  return input.split(VALUE_BREAK).map(part => part.trim()).filter(Boolean)
}

/** Another value of the option that already says the same thing, in either language. */
export function duplicateOf(option: OptionDraft, text: Text, exceptRef?: string): ValueDraft | undefined {
  const en = norm(text.en)
  const de = norm(text.de)

  return option.values.find(other => other.ref !== exceptRef && ((en !== '' && norm(other.label.en) === en) || (de !== '' && norm(other.label.de) === de)))
}

export function move<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length)
    return items
  const next = [...items]
  const [item] = next.splice(from, 1)

  next.splice(to, 0, item!)

  return next
}

/** The variants (hidden ones too) that hold this option, or this value of it. */
export function variantsUsing(variants: Variant[], optionRef: string, valueRef?: string): Variant[] {
  return variants.filter(variant => (valueRef === undefined ? variant.values[optionRef] !== undefined : variant.values[optionRef] === valueRef))
}

const MAX_CODES = 3

export function codesOf(users: Variant[]): string {
  const shown = users.slice(0, MAX_CODES).map(user => user.code).join(', ')
  const more = users.length - MAX_CODES

  return more > 0 ? `${shown} and ${more} more` : shown
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function refuseDeleteValue(name: string, users: Variant[]) {
  return `Can’t delete ${name}. ${plural(users.length, 'variant')} use it (${codesOf(users)}). Change or archive those first.`
}

export function refuseDeleteOption(name: string, users: Variant[]) {
  return `Can’t delete ${name}. ${plural(users.length, 'variant')} use it (${codesOf(users)}). Every variant has one of its values.`
}

/** The values with a name, in order: the ones a guest sees. */
export const named = (option: OptionDraft) => option.values.filter(value => hasName(value.label))

/** Every variant that still has no value of this new option. */
export function unassigned(option: OptionDraft, variants: Variant[], assigned: Assigned): Variant[] {
  const refs = new Set(named(option).map(value => value.ref))

  return variants.filter(variant => !refs.has(assigned[variant.id]?.[option.ref] ?? ''))
}

/**
 * Everything that stops a save. A value row that is empty is dropped silently, so it is not a problem; a value whose
 * text was deleted is.
 */
export function checkOptions(options: OptionDraft[], savedRefs: Set<string>, variants: Variant[], assigned: Assigned): Problem[] {
  const problems: Problem[] = []

  for (const option of options) {
    const label = labelOf(option.name)

    if (!hasName(option.name))
      problems.push({ at: option.ref, code: 'option-name', text: 'Name the option in English or German.' })
    if (named(option).length === 0)
      problems.push({ at: option.ref, code: 'option-needs-value', text: `${label || 'The option'} needs at least one value.` })
    for (const value of option.values) {
      if (!hasName(value.label) && savedRefs.has(value.ref))
        problems.push({ at: value.ref, code: 'value-name', text: 'Name the value in English or German.' })
      const twin = hasName(value.label) ? duplicateOf({ ...option, values: option.values.slice(0, option.values.indexOf(value)) }, value.label) : undefined

      if (twin)
        problems.push({ at: value.ref, code: 'value-duplicate', text: `${labelOf(value.label)} is already a value of ${label || 'this option'}. Each value is listed once.` })
    }
    if (!savedRefs.has(option.ref) && variants.length > 0 && named(option).length > 0) {
      const missing = unassigned(option, variants, assigned).length

      if (missing > 0)
        problems.push({ at: `${option.ref}:assign`, code: 'variants-missing', text: `${plural(missing, 'variant')} still ${missing === 1 ? 'needs' : 'need'} ${label ? `a ${label.toLocaleLowerCase()}` : 'a value of the new option'}.` })
    }
  }

  return problems
}

/** "Small · Lucerne": the values of a variant in option order. */
export function combinationName(values: Record<string, string>, options: OptionDraft[], lang: Lang = 'en'): string {
  return options
    .map(option => option.values.find(value => value.ref === values[option.ref]))
    .map(value => (value ? labelOf(value.label, lang) : '…'))
    .join(' · ')
}

/** The sold variant with exactly these values, if there is one. */
export function variantAt(variants: Variant[], options: OptionDraft[], values: Record<string, string>): Variant | undefined {
  return variants.find(variant => options.every(option => variant.values[option.ref] === values[option.ref]))
}

export const isComplete = (options: OptionDraft[], values: Record<string, string>) => options.every(option => values[option.ref])

const NOT_CODE = /[^A-Z0-9-]/g
const MARKS = /[\u0300-\u036F]/g
const WORDS = /[\s·]+/

/** "VX-S-LUCERNE": the prefix, one letter of the first value, then the first word of each other. */
export function suggestCode(prefix: string, values: Record<string, string>, options: OptionDraft[]): string {
  const parts = options.map((option, index) => {
    const value = option.values.find(v => v.ref === values[option.ref])
    const word = value ? (labelOf(value.label).normalize('NFD').replace(MARKS, '').split(WORDS)[0] ?? '') : ''

    return index === 0 && options.length > 1 ? word.slice(0, 1) : word
  })

  return [prefix, ...parts].filter(Boolean).join('-').toUpperCase().replace(NOT_CODE, '')
}

export const isCode = (code: string) => CODE_SHAPE.test(code)

export function takenText(combination: string, code: string) {
  return `${combination} is already sold as ${code}. Each combination is sold once.`
}
