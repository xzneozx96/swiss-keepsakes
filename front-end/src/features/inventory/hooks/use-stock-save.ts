import type { StockRow } from '@sk/api-contract'

import { useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useCommand } from '@/features/data-client/use-command'
import { InventoryProblem, problemMessageKey } from '../lib/problems'
import { parseQuantity } from '../lib/quantity'

/** Not a stock figure, so the next idle render takes the saved figure. */
const RESYNC = -1

/**
 * One row's In stock box. The box shows `draft`, the figure the merchant typed or stepped to, so a figure never snaps
 * back while its save and the re-read of the list are on the way (typed fields do not read from a query:
 * `api-integration.md`). `draft` follows the saved figure again once no save is running.
 *
 * `step` takes a figure from the box's steps, `text` the text typed in it. A text that is not a whole number from 0 to
 * 9999 is refused here and nothing is sent. Saves go one at a time and in order: a step made while a save runs is
 * sent when that one has answered, so two quick taps end at the second figure. The API refuses a figure below the
 * reserved units. A refusal is kept in `error`, `draft` goes back to the saved figure and `restore` counts up, so the
 * box remounts and drops the text it still holds. The write is `silent`: the refusal shows at the box, not as a toast.
 */
export function useStockSave(storeId: string, row: Pick<StockRow, 'skuId' | 'onHand' | 'reserved'>) {
  const { t } = useLocale()
  const { mutateAsync } = useCommand('inventory', 'set', { meta: { silent: true } })
  const [draft, setDraft] = useState(row.onHand)
  const [seen, setSeen] = useState(row.onHand)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [restore, setRestore] = useState(0)
  const savingRef = useRef(false)
  const queuedRef = useRef<number | undefined>(undefined)

  if (!saving && seen !== row.onHand) {
    setSeen(row.onHand)
    setDraft(row.onHand)
  }

  const refuse = (message: string) => {
    setError(message)
    setSeen(RESYNC)
    setRestore(count => count + 1)
  }

  const messageOf = (failure: unknown) => {
    if (!(failure instanceof InventoryProblem))
      return t(problemMessageKey('unknown'))
    if (failure.type !== 'stock-below-reserved')
      return t(problemMessageKey(failure.type))
    const reserved = failure.reserved ?? row.reserved

    return t(reserved === 1 ? 'inventory.error.belowReserved.one' : 'inventory.error.belowReserved.other', { count: reserved })
  }

  const send = async (onHand: number) => {
    queuedRef.current = onHand
    if (savingRef.current)
      return
    savingRef.current = true
    setSaving(true)
    // One write at a time: a later figure must not overtake an earlier one, so each waits for the answer before it.
    while (queuedRef.current !== undefined) {
      const next = queuedRef.current

      queuedRef.current = undefined
      try {
        await mutateAsync({ storeId, skuId: row.skuId, onHand: next, idempotencyKey: crypto.randomUUID() })
        setError(undefined)
      }
      catch (failure) {
        refuse(messageOf(failure))
      }
    }
    savingRef.current = false
    setSaving(false)
  }

  const step = (figure: number) => {
    if (figure === draft)
      return
    setDraft(figure)
    void send(figure)
  }

  const text = (typed: string) => {
    const parsed = parseQuantity(typed)

    if (!parsed.ok)
      return refuse(t(parsed.reason === 'most' ? 'inventory.error.most' : 'inventory.error.whole'))
    setError(undefined)
    step(parsed.value)
  }

  return { draft, error, restore, step, text }
}
