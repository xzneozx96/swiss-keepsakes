import type { CategoryKind, MerchantCategory } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { toast } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { problemTypeToMessageKey } from '../lib/category-problems'
import { canMove, nameOf, refusalOf, reorderedIds, siblingsOf, withOrder } from '../lib/category-tree'

/** What is open over the list: the add or edit form (a parent to preselect for a new sub-category), or the refusal of a delete. */
export type CategorySheet
  = | { mode: 'form', category: MerchantCategory | undefined, parentId: string | null }
    | { mode: 'refused', category: MerchantCategory }

/** What the table rows and the phone pages can ask for. */
export interface CategoryActions {
  add: () => void
  edit: (category: MerchantCategory) => void
  addSub: (parent: MerchantCategory) => void
  /** `onDeleted` runs after the API removed it, for a page that must leave the category it showed. */
  remove: (category: MerchantCategory, onDeleted?: () => void) => void
  move: (category: MerchantCategory, direction: -1 | 1) => void
  /** Moves the sibling at `from` to `to` under `parentId` (a drop or an arrow key). */
  reorder: (parentId: string | null, from: number, to: number) => void
}

/**
 * Every write of the categories screen, shared by the desktop table and the phone pages: the sheet
 * state, the confirm before an unused delete, the reorder with the full sibling order and a fresh
 * `Idempotency-Key`, and the refusal text. A failed write refetches the server order and shows its
 * message. While a reorder runs the list shows the new order, so a drop does not snap back.
 */
export function useCategoryActions({ storeId, kind, items, refetch }: {
  storeId: string
  kind: CategoryKind
  items: MerchantCategory[]
  refetch: () => void
}) {
  const { t } = useLocale()
  const reorder = useSubmit('categories', 'reorder')
  const remove = useSubmit('categories', 'remove')
  const { confirm, dialog } = useConfirm()
  const [sheet, setSheet] = useState<CategorySheet>()
  const [notice, setNotice] = useState<MessageKey>()
  const [pending, setPending] = useState<{ parentId: string | null, ids: string[] }>()
  const [seenKind, setSeenKind] = useState(kind)

  // Another tab is another list: what was pending or reported for the first one does not carry over.
  if (seenKind !== kind) {
    setSeenKind(kind)
    setNotice(undefined)
    setPending(undefined)
  }

  const failed = (error: Error, options?: { reorder?: boolean }) => {
    setPending(undefined)
    setNotice(problemTypeToMessageKey(error instanceof ApiProblem ? error.type : 'unknown', options))
    refetch()
  }

  const send = (parentId: string | null, ids: string[] | undefined) => {
    // One write at a time: a step or a drop while one runs is ignored, and the list shows the server order again.
    if (!ids || reorder.isPending || remove.isPending)
      return
    // A drop is one intent with the full target order, so sending it again under another key leaves the same list.
    const sent = reorder.submit({ storeId, kind, parentId, ids, idempotencyKey: crypto.randomUUID() }, {
      onSuccess: () => setPending(undefined),
      onError: error => failed(error, { reorder: true }),
    })

    if (sent) {
      setNotice(undefined)
      setPending({ parentId, ids })
    }
  }

  const actions: CategoryActions = {
    add: () => setSheet({ mode: 'form', category: undefined, parentId: null }),
    edit: category => setSheet({ mode: 'form', category, parentId: category.parentId }),
    addSub: parent => setSheet({ mode: 'form', category: undefined, parentId: parent.id }),
    reorder: (parentId, from, to) => send(parentId, reorderedIds(items, parentId, from, to)),
    move: (category, direction) => {
      if (!canMove(items, category, direction))
        return
      const from = siblingsOf(items, category).findIndex(item => item.id === category.id)

      send(category.parentId, reorderedIds(items, category.parentId, from, from + direction))
    },
    remove: (category, onDeleted) => {
      // One write at a time, as for a reorder: a delete while a reorder runs is ignored.
      if (reorder.isPending || remove.isPending)
        return
      if (refusalOf(category)) {
        setSheet({ mode: 'refused', category })

        return
      }
      void confirm({
        title: t('categories.delete.title', { name: nameOf(category) }),
        body: t('categories.delete.body'),
        confirmLabel: t('categories.delete.confirm'),
      }).then((confirmed) => {
        if (!confirmed)
          return
        setNotice(undefined)
        remove.submit({ storeId, kind, id: category.id, idempotencyKey: crypto.randomUUID() }, {
          onSuccess: () => {
            toast.success(t('categories.toast.deleted'))
            onDeleted?.()
          },
          onError: failed,
        })
      })
    },
  }

  return {
    actions,
    items: pending ? withOrder(items, pending.parentId, pending.ids) : items,
    busy: reorder.isPending || remove.isPending,
    notice,
    sheet,
    closeSheet: () => setSheet(undefined),
    dialog,
  }
}
