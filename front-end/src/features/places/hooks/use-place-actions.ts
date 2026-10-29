import type { PinListItem } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { toast } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { titleOf } from '../lib/list'
import { problemMessageKey } from '../lib/problems'

/**
 * The writes of the list: hide after a confirm, show again, delete a draft after a confirm. One write at a
 * time, each with its own `Idempotency-Key`, and a refusal shows its words next to the list.
 */
export function usePlaceActions(storeId: string) {
  const { t, language } = useLocale()
  const hide = useSubmit('places', 'hide')
  const publish = useSubmit('places', 'publish')
  const remove = useSubmit('places', 'remove')
  const { confirm, dialog } = useConfirm()
  const [notice, setNotice] = useState<MessageKey>()
  const busy = hide.isPending || publish.isPending || remove.isPending
  const nameOf = (item: PinListItem) => titleOf(item, language) ?? t('places.row.untitled')
  const failed = (error: Error) => setNotice(problemMessageKey(error instanceof ApiProblem ? error.type : 'unknown'))

  return {
    busy,
    notice,
    dialog,
    hide: (item: PinListItem) => {
      if (busy)
        return
      void confirm({ title: t('places.hide.title', { name: nameOf(item) }), body: t('places.hide.body'), confirmLabel: t('places.hide.confirm') }).then((confirmed) => {
        if (!confirmed)
          return
        setNotice(undefined)
        hide.submit({ storeId, id: item.id, ifMatch: item.rowVersion, idempotencyKey: crypto.randomUUID() }, {
          onSuccess: () => toast.success(t('places.toast.hidden', { name: nameOf(item) })),
          onError: failed,
        })
      })
    },
    unhide: (item: PinListItem) => {
      if (busy)
        return
      setNotice(undefined)
      publish.submit({ storeId, id: item.id, ifMatch: item.rowVersion, idempotencyKey: crypto.randomUUID() }, {
        onSuccess: () => toast.success(t('places.toast.shown', { name: nameOf(item) })),
        onError: failed,
      })
    },
    remove: (item: PinListItem) => {
      if (busy)
        return
      void confirm({ title: t('places.delete.title', { name: nameOf(item) }), body: t('places.delete.body'), confirmLabel: t('places.delete.confirm') }).then((confirmed) => {
        if (!confirmed)
          return
        setNotice(undefined)
        remove.submit({ storeId, id: item.id, ifMatch: item.rowVersion, idempotencyKey: crypto.randomUUID() }, {
          onSuccess: () => toast.success(t('places.toast.deleted')),
          onError: failed,
        })
      })
    },
  }
}
