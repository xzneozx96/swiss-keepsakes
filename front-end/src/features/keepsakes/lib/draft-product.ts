import type { Media, Product, ProductOption, ProductVariant, PublishCheck } from '@sk/api-contract'
import type { KeepsakeText } from './keepsake-rules'

import { fullLanguages, LANGUAGES } from './keepsake-rules'

/**
 * What the Review step reads for a keepsake that is only in the browser: the checks the API would run on it, and the
 * keepsake as the saved screens know it. `publishChecks` copies the rules of the API's publish checks (design section
 * 10), so a draft says the same as the keepsake it becomes.
 */

function unlabelled(options: ProductOption[]): number {
  return options.flatMap(option => [option.name, ...option.values.map(value => value.label)]).filter(label => !label.en?.trim() || !label.de?.trim()).length
}

export function publishChecks({ value, photoIds, commission, options, variants }: {
  value: KeepsakeText
  photoIds: string[]
  commission: number
  options: ProductOption[]
  variants: Pick<ProductVariant, 'skuCode' | 'status'>[]
}): { blocking: PublishCheck[], warnings: PublishCheck[] } {
  const live = variants.filter(variant => variant.status !== 'archived')
  const full = fullLanguages(value)
  const blocking: PublishCheck[] = []
  const warnings: PublishCheck[] = []
  const hidden = live.filter(variant => variant.status === 'draft')
  const labels = unlabelled(options)

  if (full.length === 0)
    blocking.push({ code: 'language', card: 'basics' })
  if (photoIds.length === 0)
    blocking.push({ code: 'photos', card: 'photos' })
  if (!live.some(variant => variant.status === 'published'))
    blocking.push({ code: 'variant-for-sale', card: 'variants' })
  if (full.length === 1)
    warnings.push({ code: 'other-language', card: 'basics', language: full[0] === 'en' ? 'de' : 'en' })
  if (labels > 0)
    warnings.push({ code: 'option-labels', card: 'options', count: labels })
  if (hidden.length > 0)
    warnings.push({ code: 'hidden', card: 'variants', count: hidden.length, codes: hidden.map(variant => variant.skuCode) })
  if (commission === 0)
    warnings.push({ code: 'commission-zero', card: 'commission' })

  return { blocking, warnings }
}

const only = (text: Record<'en' | 'de', string>) => Object.fromEntries(LANGUAGES.filter(language => text[language].trim()).map(language => [language, text[language].trim()]))

/** The keepsake a draft would become, for the Review step. It has no id, no address and no row version yet. */
export function draftProduct({ storeId, value, photos, commission, options, variants, checks }: {
  storeId: string
  value: KeepsakeText
  /** The photos that have loaded, in order. */
  photos: Media[]
  commission: number
  options: ProductOption[]
  variants: ProductVariant[]
  checks: { blocking: PublishCheck[], warnings: PublishCheck[] }
}): Product {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    storeId,
    status: 'draft',
    name: only(value.name),
    text: only(value.text),
    photos,
    commissionRate: commission,
    slug: null,
    hasUnpublishedEdits: false,
    options,
    variants,
    ...checks,
    rowVersion: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }
}
