import type { ProductVariant, VariantSaveBody, VariantsSaveBody } from '@sk/api-contract'
import type { OptionsPlan } from '../lib/combinations'
import type { OptionDraft, Values } from '../lib/option-rules'
import type { Outcome } from './use-keepsake-editor'

import { useState } from 'react'

import { newVariantsFor, uniqueCode } from '../lib/combinations'
import { asSaved, combinationKey, suggestCode } from '../lib/option-rules'
import { isComplete, normaliseValues } from '../lib/variant-rules'

/** The one variant of a keepsake with no option yet: no price and no code, which the Price card asks for. */
const defaultVariant = (): ProductVariant => ({ id: crypto.randomUUID(), skuCode: '', priceRappen: 0, status: 'published', values: {} })

/**
 * The variants of a keepsake that is only in the browser, with the same changes the saved keepsake has. It always holds one
 * variant, so the Price card has something to edit. A variant keeps only the values that still exist in the options, a
 * variant that is no longer a whole combination goes, and archiving removes: there is nothing saved to keep.
 */
export function useDraftVariants(options: OptionDraft[], initial: ProductVariant[]) {
  const [stored, setStored] = useState(() => (initial.length > 0 ? initial : [defaultVariant()]))
  const saved = asSaved(options)
  const variants = stored.map(variant => ({ ...variant, values: normaliseValues(saved, variant.values) }))

  /** What `list` is once the options are `next`: whole combinations only, each once, in the order they were added. */
  const reconcile = (list: ProductVariant[], next: OptionDraft[]) => {
    const keep = asSaved(next)
    const seen = new Set<string>()

    return list
      .map(variant => ({ ...variant, values: normaliseValues(keep, variant.values) }))
      .filter((variant) => {
        const key = combinationKey(variant.values, keep.map(option => option.id))

        if (!isComplete(keep, variant.values) || seen.has(key))
          return false
        seen.add(key)

        return true
      })
  }

  return {
    variants,
    save: async (id: string, body: VariantSaveBody): Promise<Outcome> => {
      setStored(list => (body.status === 'archived'
        ? list.filter(variant => variant.id !== id)
        : list.map(variant => (variant.id === id ? { ...variant, skuCode: body.skuCode ?? variant.skuCode, priceRappen: body.priceRappen ?? variant.priceRappen, values: body.values ?? variant.values } : variant))))

      return { ok: true }
    },
    saveMany: async (rows: VariantsSaveBody['variants']): Promise<Outcome> => {
      setStored(list => list.filter(variant => rows.find(row => row.id === variant.id)?.status !== 'archived').map((variant) => {
        const row = rows.find(r => r.id === variant.id)

        return row?.priceRappen === undefined ? variant : { ...variant, priceRappen: row.priceRappen }
      }))

      return { ok: true }
    },
    /** A finished option: the existing variants take its first value, the new combinations are made, and the ones the options no longer allow go. */
    apply: async (next: OptionDraft[], plan: OptionsPlan): Promise<Outcome> => {
      const keep = asSaved(next)

      setStored((list) => {
        const taken = new Set(list.map(variant => variant.skuCode.toLowerCase()))
        const assigned = list.map((variant) => {
          const extra = plan.variantValues.find(row => row.variantId === variant.id)
          const values = extra ? { ...variant.values, ...extra.values } : variant.values

          // The default variant has no code until the Price card is filled in: its values name it, like the others.
          return { ...variant, values, skuCode: variant.skuCode || (extra ? uniqueCode(suggestCode(values, keep), taken) : '') }
        })

        return reconcile([...assigned, ...plan.newVariants.map(made => ({ id: crypto.randomUUID(), skuCode: made.skuCode, priceRappen: made.priceRappen, status: 'published' as const, values: made.values }))], next)
      })

      return { ok: true }
    },
    /** Combinations that no variant holds, made again at the price of the first variant. */
    addBack: async (combinations: Values[], basePrice: number): Promise<Outcome> => {
      setStored(list => [...list, ...newVariantsFor(combinations, options, list, basePrice).map(made => ({ id: crypto.randomUUID(), skuCode: made.skuCode, priceRappen: made.priceRappen, status: 'published' as const, values: made.values }))])

      return { ok: true }
    },
  }
}
