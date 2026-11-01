import type { ProductOption, ProductVariant, VariantCreateBody, VariantSaveBody } from '@sk/api-contract'
import type { Outcome } from './use-keepsake-editor'

import { useState } from 'react'

import { normaliseValues } from '../lib/variant-rules'

/**
 * The variants of a keepsake that is only in the browser, with the same two commands the saved keepsake has. A variant
 * keeps only the values that still exist in the options, so an option changed on the Options step leaves it incomplete
 * (it then says "Needs a value") instead of being dropped. Archiving removes: there is nothing saved to keep.
 */
export function useDraftVariants(options: ProductOption[], initial: ProductVariant[]) {
  const [stored, setStored] = useState(initial)
  const variants = stored.map(variant => ({ ...variant, values: normaliseValues(options, variant.values) }))

  return {
    variants,
    create: async (body: VariantCreateBody): Promise<Outcome> => {
      setStored(list => [...list, { id: crypto.randomUUID(), skuCode: body.skuCode, priceRappen: body.priceRappen, status: 'published', values: body.values ?? {} }])

      return { ok: true }
    },
    save: async (id: string, body: VariantSaveBody): Promise<Outcome> => {
      setStored(list => (body.status === 'archived'
        ? list.filter(variant => variant.id !== id)
        : list.map(variant => (variant.id === id ? { ...variant, skuCode: body.skuCode ?? variant.skuCode, priceRappen: body.priceRappen ?? variant.priceRappen, values: body.values ?? variant.values } : variant))))

      return { ok: true }
    },
  }
}
