import type { ProductOption, ProductVariant } from '@sk/api-contract'
import type { Values } from './option-rules'

import { isSkuCode } from './keepsake-rules'

/**
 * The rules of the Variants step, said before a save (ADR-017, ADR-027): a variant has one value of every option, a
 * combination is sold once (archived variants keep theirs), and a code is used once. The API holds the same rules.
 */

/** A value for every option, and nothing else. A keepsake with no option is always complete. */
export function isComplete(options: ProductOption[], values: Values): boolean {
  return options.every(option => option.values.some(value => value.id === values[option.id]))
}

/** The variant that already has exactly these values, archived ones too. None while a value is missing. */
export function findTwin<T extends Pick<ProductVariant, 'values'>>(options: ProductOption[], others: T[], values: Values): T | undefined {
  if (options.length === 0 || !isComplete(options, values))
    return undefined

  return others.find(other => options.every(option => other.values[option.id] === values[option.id]))
}

/** The values a variant holds that still exist in the options. A value that is gone, or an option that is gone, is dropped. */
export function normaliseValues(options: ProductOption[], values: Values): Values {
  return Object.fromEntries(options.flatMap(option => (option.values.some(value => value.id === values[option.id]) ? [[option.id, values[option.id]!]] : [])))
}

export type CodeProblem = 'required' | 'invalid' | 'taken'

/** What is wrong with a code: empty, not letters and digits joined by - _ or ., or used by another variant of the keepsake. */
export function codeProblem(code: string, others: Pick<ProductVariant, 'skuCode'>[]): CodeProblem | undefined {
  const trimmed = code.trim()

  if (!trimmed)
    return 'required'
  if (!isSkuCode(trimmed))
    return 'invalid'

  return others.some(other => other.skuCode.toLowerCase() === trimmed.toLowerCase()) ? 'taken' : undefined
}

/** The variants a new keepsake sends: code, price and values, in the order they were added. */
export function variantsBody(variants: Pick<ProductVariant, 'skuCode' | 'priceRappen' | 'values'>[]) {
  return variants.map(variant => ({ skuCode: variant.skuCode, priceRappen: variant.priceRappen, values: variant.values }))
}
