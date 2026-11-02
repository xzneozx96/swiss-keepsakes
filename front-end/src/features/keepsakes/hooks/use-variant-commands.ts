import type { VariantSaveBody, VariantsSaveBody } from '@sk/api-contract'
import type { Outcome } from './use-keepsake-editor'

import { useQueryClient } from '@tanstack/react-query'

import { useLocale } from '@/contexts/locale-context'
import { useDataClient } from '@/features/data-client'
import { useCommand } from '@/features/data-client/use-command'
import { keepsakesQueries } from '../api/queries'
import { variantName } from '../lib/option-rules'
import { problemTypeOf, refusalsOf } from '../lib/problems'

/**
 * A variant's own writes: change one (code, price, status, values, archive) or change the price or status of several in
 * one request. Both are live at once and take no row version (ADR-014), so they need no autosave. Every answer is the
 * whole keepsake, written into the detail query. Each screen shows a refusal beside its field or in its own alert, so both
 * commands are `silent`; the bar says "Saved" for a price, so only a status and a bulk change toast.
 */
export function useVariantCommands({ storeId, id }: { storeId: string, id: string }) {
  const { t, language } = useLocale()
  const client = useDataClient()
  const queryClient = useQueryClient()
  const saveVariant = useCommand('keepsakes', 'saveVariant', {
    meta: {
      success: (result, input) => {
        if (input.skuCode !== undefined || input.priceRappen !== undefined || input.status === undefined)
          return input.skuCode && input.priceRappen !== undefined ? t('keepsakes.variant.saved', { code: input.skuCode }) : ''
        const variant = result.variants.find(row => row.id === input.variantId)
        const code = variant ? variantName(variant, result.options, language) : ''

        return t(input.status === 'draft' ? 'keepsakes.variant.toast.hidden' : input.status === 'archived' ? 'keepsakes.variant.toast.archived' : 'keepsakes.variant.toast.forSale', { code })
      },
      silent: true,
    },
  })
  const saveVariants = useCommand('keepsakes', 'saveVariants', {
    meta: {
      success: (_, input) => t(input.variants.length === 1 ? 'keepsakes.variants.bulk.done.one' : 'keepsakes.variants.bulk.done.other', { count: input.variants.length }),
      silent: true,
    },
  })
  const detailKey = keepsakesQueries.detail(client, storeId, id).queryKey

  return {
    saveVariant: async (variantId: string, body: VariantSaveBody): Promise<Outcome> => {
      try {
        queryClient.setQueryData(detailKey, await saveVariant.mutateAsync({ storeId, id, variantId, idempotencyKey: crypto.randomUUID(), ...body }))

        return { ok: true }
      }
      catch (error) {
        return { ok: false, type: problemTypeOf(error), refusals: refusalsOf(error) }
      }
    },
    saveVariants: async (variants: VariantsSaveBody['variants']): Promise<Outcome> => {
      try {
        queryClient.setQueryData(detailKey, await saveVariants.mutateAsync({ storeId, id, idempotencyKey: crypto.randomUUID(), variants }))

        return { ok: true }
      }
      catch (error) {
        return { ok: false, type: problemTypeOf(error), refusals: refusalsOf(error) }
      }
    },
  }
}
