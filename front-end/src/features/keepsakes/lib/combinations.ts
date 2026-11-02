import type { ProductOption, ProductVariant } from '@sk/api-contract'
import type { OptionDraft, Values } from './option-rules'

import { allCombinations, asSaved, labelOf, suggestCode } from './option-rules'

/** What an options save creates for a combination: the API's `KeepsakeVariantWrite`, its values as refs of the save. */
export interface NewVariant { skuCode: string, priceRappen: number, values: Values }

export interface OptionsPlan {
  /** The value that each existing variant takes of a new option: the first one, so the variant stays a combination. */
  variantValues: { variantId: string, values: Values }[]
  /** The combinations that no variant holds yet and that this save brings: they are created for sale. */
  newVariants: NewVariant[]
}

/** The values of an option that have a name in either language. A value with no name yet is not a combination. */
export const namedValues = (option: OptionDraft) => option.values.filter(value => labelOf(value.label) !== '')

/** The refs of every option and value, to tell what the merchant has just added from what was already there. */
export const refsOf = (options: { ref: string, values: { ref: string }[] }[]): Set<string> => new Set(options.flatMap(option => [option.ref, ...option.values.map(value => value.ref)]))

/** The refs a saved keepsake has: its options' ids and their values' ids. */
export const savedRefsOf = (options: ProductOption[]): Set<string> => refsOf(options.map(option => ({ ref: option.id, values: option.values.map(value => ({ ref: value.id })) })))

const sameValues = (a: Values, b: Values, refs: string[]) => refs.every(ref => a[ref] === b[ref])

/** `base`, or `base-2`, `base-3`... when a variant of the keepsake (or a combination planned with it) has the code already. */
export function uniqueCode(base: string, taken: Set<string>): string {
  let code = base
  let n = 2

  while (taken.has(code.toLowerCase()))
    code = `${base}-${n++}`
  taken.add(code.toLowerCase())

  return code
}

/**
 * What saving the options brings, from what is staged (ADR-017, ADR-027).
 * - A new option goes on every existing variant, archived ones too, as its first value (the merchant's one default variant
 *   becomes the first combination and keeps its code and price). Each other value of it makes a copy of every variant that
 *   is for sale or hidden, with the keepsake's price. A combination that was left unsold stays unsold.
 * - A new value of an option that was there makes a variant for each combination of the other options' values.
 * `committed` holds the refs the keepsake had when the editor last saved (or, for a new keepsake, when the option was last
 * finished). A new keepsake's variants all stand in `variants` with values by ref.
 */
export function planOptionsDone({ options, committed, variants, basePrice }: {
  options: OptionDraft[]
  committed: ReadonlySet<string>
  variants: Pick<ProductVariant, 'id' | 'skuCode' | 'status' | 'values'>[]
  basePrice: number
}): OptionsPlan {
  const refs = options.map(option => option.ref)
  const freshOptions = options.filter(option => !committed.has(option.ref) && namedValues(option).length > 0)
  const assign: Values = Object.fromEntries(freshOptions.map(option => [option.ref, namedValues(option)[0]!.ref]))
  const variantValues = freshOptions.length > 0 ? variants.map(variant => ({ variantId: variant.id, values: { ...assign } })) : []
  const held = (values: Values) => variants.some(variant => sameValues({ ...assign, ...variant.values }, values, refs))
  const created: Values[] = []

  // New options: a copy of every existing row for each value after the first.
  let rows: Values[] = variants.filter(variant => variant.status !== 'archived').map(variant => ({ ...variant.values, ...assign }))

  for (const option of freshOptions) {
    const extra = rows.flatMap(row => namedValues(option).slice(1).map(value => ({ ...row, [option.ref]: value.ref })))

    created.push(...extra)
    rows = [...rows, ...extra]
  }
  // New values of an option that was there: every combination with the other options' earlier values.
  for (const option of options.filter(o => committed.has(o.ref))) {
    const fresh = namedValues(option).filter(value => !committed.has(value.ref))

    if (fresh.length === 0)
      continue
    const others = options.filter(o => o.ref !== option.ref && committed.has(o.ref)).map(o => ({ ref: o.ref, values: namedValues(o).filter(value => committed.has(value.ref)) }))

    for (const combo of allCombinations(others)) {
      for (const value of fresh) {
        const values = { ...combo, [option.ref]: value.ref }

        if (!held(values) && !created.some(other => sameValues(other, values, refs)))
          created.push(values)
      }
    }
  }

  return { variantValues, newVariants: newVariantsFor(created, options, variants, basePrice) }
}

/** A variant to create for each combination: for sale at the keepsake's price, with a code made from its values and used by no other variant. */
export function newVariantsFor(combinations: Values[], options: OptionDraft[], variants: Pick<ProductVariant, 'skuCode'>[], basePrice: number): NewVariant[] {
  const saved = asSaved(options)
  const taken = new Set(variants.map(variant => variant.skuCode.toLowerCase()))

  return combinations.map(values => ({ skuCode: uniqueCode(suggestCode(values, saved), taken), priceRappen: basePrice, values }))
}

/** The first variant's price, the one a new combination takes. */
export function basePriceOf(variants: Pick<ProductVariant, 'priceRappen' | 'status'>[]): number {
  return (variants.find(variant => variant.status !== 'archived') ?? variants[0])?.priceRappen ?? 0
}

/** The variants for sale or hidden, grouped by the first option's value, in that option's order. */
export function groupByFirstOption<V extends Pick<ProductVariant, 'values'>>(options: ProductOption[], variants: V[]): { value: ProductOption['values'][number], rows: V[] }[] {
  const [first] = options

  if (!first)
    return []

  return first.values.map(value => ({ value, rows: variants.filter(variant => variant.values[first.id] === value.id) })).filter(group => group.rows.length > 0)
}

/** The lowest and highest price of some rows, in Rappen. */
export function priceRange(rows: Pick<ProductVariant, 'priceRappen'>[]): { min: number, max: number } | undefined {
  if (rows.length === 0)
    return undefined
  const prices = rows.map(row => row.priceRappen)

  return { min: Math.min(...prices), max: Math.max(...prices) }
}

/** How many names an option set still needs in `language`: each option's own and each value's, when the option has any text at all. */
export function missingNames(options: OptionDraft[], language: 'en' | 'de'): number {
  return options.flatMap(option => [option.name, ...option.values.map(value => value.label)]).filter(text => !text[language].trim()).length
}
