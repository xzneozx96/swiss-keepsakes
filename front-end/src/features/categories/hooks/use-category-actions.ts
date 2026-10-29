import type { CategoryKind, MerchantCategory } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { toast } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { displayName } from '../lib/category-name'
import { problemTypeToMessageKey } from '../lib/category-problems'
import { canMove, refusalOf, reorderedIds, siblingsOf, withOrder } from '../lib/category-tree'

/** What is open over the list: the add or edit form (a parent to preselect for a new sub-category), or the refusal of a delete. */
export type CategorySheet
  = | { mode: 'form', category: MerchantCategory | undefined, parentId: string | null }
    | { mode: 'refused', category: MerchantCategory }

/** What the table rows and the phone pages can ask for. */
export interface CategoryActions {
  add: () => void
  edit: (category: MerchantCategory) => void
  addSub: (parent: MerchantCategory) => void
  remove: (category: MerchantCategory) => void
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
  const { t, language } = useLocale()
  const reorder = useSubmit('categories', 'reorder')
  const remove = useSubmit('categories', 'remove')
  const { confirm, dialog } = useConfirm()
  const [sheet, setSheet] = useState<CategorySheet>()
  const [notice, setNotice] = useState<MessageKey>()
  const [pending, setPending] = useState<{ parentId: string | null, ids: string[] }>()

  const failed = (error: Error, options?: { reorder?: boolean }) => {
    setPending(undefined)
    setNotice(problemTypeToMessageKey(error instanceof ApiProblem ? error.type : 'unknown', options))
    refetch()
  }

  const send = (parentId: string | null, ids: string[] | undefined) => {
    if (!ids)
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
    remove: (category) => {
      if (refusalOf(category)) {
        setSheet({ mode: 'refused', category })

        return
      }
      void confirm({
        title: t('categories.delete.title', { name: displayName(category, language).primary }),
        body: t('categories.delete.body'),
        confirmLabel: t('categories.delete.confirm'),
      }).then((confirmed) => {
        if (!confirmed)
          return
        setNotice(undefined)
        remove.submit({ storeId, kind, id: category.id, idempotencyKey: crypto.randomUUID() }, {
          onSuccess: () => toast.success(t('categories.toast.deleted')),
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
