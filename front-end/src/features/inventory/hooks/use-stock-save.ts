import type { StockRow } from '@sk/api-contract'

import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useSubmit } from '@/features/data-client/use-command'
import { InventoryProblem, problemMessageKey } from '../lib/problems'
import { parseQuantity } from '../lib/quantity'

/**
 * Saves what the merchant typed or stepped in one row's In stock box. A figure that is not a whole number from 0 to 9999
 * is refused here and nothing is sent. The API refuses a figure below the reserved units, and the row keeps its refusal
 * (`error`) next to the box. After any refusal `restore` counts up, so the box remounts and shows the saved figure again.
 * The write is `silent`: the refusal is shown at the box, not as a toast.
 */
export function useStockSave(storeId: string, row: Pick<StockRow, 'skuId' | 'onHand'>) {
  const { t } = useLocale()
  const { submit } = useSubmit('inventory', 'set', { meta: { silent: true } })
  const [error, setError] = useState<string>()
  const [restore, setRestore] = useState(0)

  const refuse = (message: string) => {
    setError(message)
    setRestore(count => count + 1)
  }

  const save = (text: string) => {
    const parsed = parseQuantity(text)

    if (!parsed.ok)
      return refuse(t(parsed.reason === 'most' ? 'inventory.error.most' : 'inventory.error.whole'))
    setError(undefined)
    if (parsed.value === row.onHand)
      return
    submit({ storeId, skuId: row.skuId, onHand: parsed.value, idempotencyKey: crypto.randomUUID() }, {
      onError: (failure) => {
        const reserved = failure instanceof InventoryProblem && failure.type === 'stock-below-reserved' ? failure.reserved : undefined

        refuse(reserved === undefined
          ? t(problemMessageKey(failure instanceof InventoryProblem ? failure.type : 'unknown'))
          : t(reserved === 1 ? 'inventory.error.belowReserved.one' : 'inventory.error.belowReserved.other', { count: reserved }))
      },
    })
  }

  return { error, restore, save }
}
