import type { VariantCreateBody, VariantSaveBody } from '@sk/api-contract'
import type { Outcome } from './use-keepsake-editor'

import { useQueryClient } from '@tanstack/react-query'

import { useDataClient } from '@/features/data-client'
import { useCommand } from '@/features/data-client/use-command'
import { keepsakesQueries } from '../api/queries'
import { problemTypeOf, refusalsOf } from '../lib/problems'

/**
 * A variant's own writes: change one (code, price, status, values, archive) or add one. Both are live at once and take
 * no row version (ADR-014), so they need no autosave. Every answer is the whole keepsake, written into the detail query.
 */
export function useVariantCommands({ storeId, id }: { storeId: string, id: string }) {
  const client = useDataClient()
  const queryClient = useQueryClient()
  const saveVariant = useCommand('keepsakes', 'saveVariant')
  const createVariant = useCommand('keepsakes', 'createVariant')
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
    createVariant: async (body: VariantCreateBody): Promise<Outcome> => {
      try {
        queryClient.setQueryData(detailKey, await createVariant.mutateAsync({ storeId, id, idempotencyKey: crypto.randomUUID(), ...body }))

        return { ok: true }
      }
      catch (error) {
        return { ok: false, type: problemTypeOf(error), refusals: refusalsOf(error) }
      }
    },
  }
}
