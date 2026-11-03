import type { ProductVariant, VariantCreateBody, VariantSaveBody, VariantsSaveBody } from '@sk/api-contract'
import type { OptionsPlan } from '../lib/combinations'
import type { OptionDraft, Values } from '../lib/option-rules'
import type { Outcome } from './use-keepsake-editor'

import { useState } from 'react'

import { newVariantsFor } from '../lib/combinations'
import { asSaved, combinationKey } from '../lib/option-rules'
import { isComplete, normaliseValues } from '../lib/variant-rules'

/** The one variant of a keepsake with no option yet: no price, which the Price card asks for, and no code. */
const defaultVariant = (): ProductVariant => ({ id: crypto.randomUUID(), skuCode: null, mediaId: null, photo: null, priceRappen: 0, status: 'published', values: {} })

/** The code and photo a change sets: a left-out field stays, null clears it. */
function changesOf(body: { skuCode?: string | null, mediaId?: string | null }) {
  return {
    ...(body.skuCode !== undefined && { skuCode: body.skuCode }),
    ...(body.mediaId !== undefined && { mediaId: body.mediaId, photo: null }),
  }
}

const fresh = (made: { skuCode: string | null, priceRappen: number, values: Values }): ProductVariant => ({ id: crypto.randomUUID(), skuCode: made.skuCode, mediaId: null, photo: null, priceRappen: made.priceRappen, status: 'published', values: made.values })

/**
 * The variants of a keepsake that is only in the browser, with the same changes the saved keepsake has. It always holds one
 * variant, so the Price card has something to edit, unless `withDefault` is off: a saved keepsake holds here only the rows
 * its held options will create. A variant keeps only the values that still exist in the options, a variant that is no longer
 * a whole combination goes, and removing (or archiving) drops the row: there is nothing saved to keep.
 */
export function useDraftVariants(options: OptionDraft[], initial: ProductVariant[], withDefault = true) {
  const [stored, setStored] = useState(() => (initial.length > 0 || !withDefault ? initial : [defaultVariant()]))
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
      setStored(list => (body.status === 'archived' || body.status === 'removed'
        ? list.filter(variant => variant.id !== id)
        : list.map(variant => (variant.id === id ? { ...variant, ...changesOf(body), priceRappen: body.priceRappen ?? variant.priceRappen, values: body.values ?? variant.values } : variant))))

      return { ok: true }
    },
    saveMany: async (rows: VariantsSaveBody['variants']): Promise<Outcome> => {
      setStored(list => list.filter(variant => !['archived', 'removed'].includes(rows.find(row => row.id === variant.id)?.status ?? '')).map((variant) => {
        const row = rows.find(r => r.id === variant.id)

        return row ? { ...variant, ...changesOf(row), priceRappen: row.priceRappen ?? variant.priceRappen } : variant
      }))

      return { ok: true }
    },
    /** The one variant of a keepsake with no options and none left: the Price block's first valid price. */
    create: async (body: VariantCreateBody): Promise<Outcome> => {
      setStored(list => [...list, { ...defaultVariant(), skuCode: body.skuCode ?? null, priceRappen: body.priceRappen, status: body.status ?? 'published' }])

      return { ok: true }
    },
    /** A finished option: the existing variants take its first value, the new combinations are made, and the ones the options no longer allow go. */
    apply: async (next: OptionDraft[], plan: OptionsPlan): Promise<Outcome> => {
      setStored((list) => {
        const assigned = list.map((variant) => {
          const extra = plan.variantValues.find(row => row.variantId === variant.id)

          return extra ? { ...variant, values: { ...variant.values, ...extra.values } } : variant
        })

        return reconcile([...assigned, ...plan.newVariants.map(made => fresh(made))], next)
      })

      return { ok: true }
    },
    /** Combinations that no variant holds, made again at the price of the first variant. `others` are variants kept elsewhere, whose codes the new ones must not repeat. */
    addBack: async (combinations: Values[], basePrice: number, codeBase: string | null, others: Pick<ProductVariant, 'skuCode'>[] = []): Promise<Outcome> => {
      setStored(list => [...list, ...newVariantsFor(combinations, options, [...others, ...list], basePrice, codeBase).map(made => fresh(made))])

      return { ok: true }
    },
    /** Forgets every variant held here, after the options were saved and the API made them. */
    clear: () => setStored([]),
  }
}
