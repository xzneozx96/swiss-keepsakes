import type { ProductRemoval } from '@sk/api-contract'

import { useRef } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { useSubmit } from '@/features/data-client/use-command'
import { problemMessageKey, problemTypeOf } from '../lib/problems'

/** What the dialog needs of a keepsake: the list row and the open keepsake both have these. */
export interface Removable {
  id: string
  name: string
  rowVersion: number
  /** An order names it, so it will be archived instead of deleted. */
  hasOrders: boolean
}

/**
 * Remove a keepsake: one action, "Delete". The dialog says which will happen from `hasOrders` (never sold: deleted for
 * good, sold: archived, final) and runs the write inside itself: spinner, then the row leaves the cached lists at once
 * (`commandChanges`) and a refusal shows in the dialog. `dialog` must be rendered by the caller.
 */
export function useRemoveKeepsake(storeId: string, onRemoved?: (removal: ProductRemoval) => void) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  // Which keepsake the tap asked about, written only once its dialog opened (`api-feedback.md`).
  const nameRef = useRef('')
  const submit = useSubmit('keepsakes', 'remove', {
    meta: { success: result => t(result.outcome === 'archived' ? 'keepsakes.toast.archived' : 'keepsakes.toast.deleted', { name: nameRef.current }), silent: true },
  })

  const ask = (item: Removable) => {
    if (submit.isPending)
      return
    nameRef.current = item.name
    void confirm({
      title: t(item.hasOrders ? 'keepsakes.remove.archiveTitle' : 'keepsakes.remove.deleteTitle', { name: item.name }),
      body: item.hasOrders ? t('keepsakes.remove.archiveBody', { name: item.name }) : t('keepsakes.remove.deleteBody'),
      confirmLabel: t(item.hasOrders ? 'keepsakes.remove.archiveConfirm' : 'keepsakes.remove.deleteConfirm'),
      problem: error => t(problemMessageKey(problemTypeOf(error))),
      run: () => submit.submitAsync({ storeId, id: item.id, ifMatch: item.rowVersion, idempotencyKey: crypto.randomUUID() }).then(removal => onRemoved?.(removal)),
    })
  }

  return { ask, isPending: submit.isPending, dialog }
}
