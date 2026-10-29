import type { PinListItem } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { useRef, useState } from 'react'

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
  // Which row a tap acted on, written only once its submit went out (`api-feedback.md`).
  const nameRef = useRef('')
  // A refusal shows next to the list (`notice`), so the cache's error toast is off.
  const hide = useSubmit('places', 'hide', { meta: { success: () => t('places.toast.hidden', { name: nameRef.current }), silent: true } })
  const publish = useSubmit('places', 'publish', { meta: { success: () => t('places.toast.shown', { name: nameRef.current }), silent: true } })
  const remove = useSubmit('places', 'remove', { meta: { success: 'places.toast.deleted', silent: true } })
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
        if (hide.submit({ storeId, id: item.id, ifMatch: item.rowVersion, idempotencyKey: crypto.randomUUID() }, { onError: failed }))
          nameRef.current = nameOf(item)
      })
    },
    unhide: (item: PinListItem) => {
      if (busy)
        return
      setNotice(undefined)
      if (publish.submit({ storeId, id: item.id, ifMatch: item.rowVersion, idempotencyKey: crypto.randomUUID() }, { onError: failed }))
        nameRef.current = nameOf(item)
    },
    remove: (item: PinListItem) => {
      if (busy)
        return
      void confirm({ title: t('places.delete.title', { name: nameOf(item) }), body: t('places.delete.body'), confirmLabel: t('places.delete.confirm') }).then((confirmed) => {
        if (!confirmed)
          return
        setNotice(undefined)
        remove.submit({ storeId, id: item.id, ifMatch: item.rowVersion, idempotencyKey: crypto.randomUUID() }, { onError: failed })
      })
    },
  }
}
