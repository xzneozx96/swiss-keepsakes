import type { CategoryKind, MerchantCategory } from '@sk/api-contract'

import { Button, Skeleton } from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon, PlusIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useCategories } from '../api/queries'
import { displayName } from '../lib/category-name'
import { problemTypeToMessageKey } from '../lib/category-problems'
import { CategoryRow } from './category-row'
import { CategorySheet } from './category-sheet'
import { DeleteCategoryDialog } from './delete-category-dialog'

type Editing = { category: MerchantCategory | undefined } | undefined

/** Each top-level category followed by its sub-categories, every group in the order the API gave. */
function inDisplayOrder(items: MerchantCategory[]) {
  const roots = items.filter(item => item.parentId === null)

  return roots.flatMap(root => [root, ...items.filter(item => item.parentId === root.id)])
}

/** One list of the store (the map's or the blog's): its rows, the Add button, and the sheet and dialog they open. */
export function CategoryList({ storeId, kind }: { storeId: string, kind: CategoryKind }) {
  const { t, language } = useLocale()
  const categories = useCategories(storeId, kind)
  const reorder = useSubmit('categories', 'reorder')
  const [editing, setEditing] = useState<Editing>()
  const [deleting, setDeleting] = useState<MerchantCategory>()
  const items = categories.data?.items

  if (categories.isError) {
    const error = categories.error

    return (
      <div className="flex flex-col items-start gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">
        <p>{t(error instanceof ApiProblem && error.type === 'forbidden' ? 'categories.problem.forbidden' : 'categories.loadFailed')}</p>
        {error instanceof ApiProblem && error.requestId && <p className="text-xs opacity-80">{t('categories.requestId', { id: error.requestId })}</p>}
        <Button className="min-h-11" variant="secondary" onPress={() => void categories.refetch()}>{t('categories.retry')}</Button>
      </div>
    )
  }
  if (!items) {
    return (
      <div className="flex flex-col gap-3">
        <p aria-live="polite" className="sr-only" role="status">{t('categories.loading')}</p>
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
      </div>
    )
  }

  const rows = inDisplayOrder(items)
  const roots = items.filter(item => item.parentId === null)
  const nameOf = (id: string | null) => {
    const found = items.find(item => item.id === id)

    return found ? displayName(found, language).primary : undefined
  }

  const move = (category: MerchantCategory, direction: -1 | 1) => {
    const siblings = items.filter(item => item.parentId === category.parentId).map(item => item.id)
    const from = siblings.indexOf(category.id)
    const to = from + direction

    if (to < 0 || to >= siblings.length)
      return
    const ids = siblings.filter(id => id !== category.id)

    ids.splice(to, 0, category.id)

    // A tap gets its own key. The body is the full target order, so sending it again, even under another key, leaves the same list.
    reorder.submit({ storeId, kind, parentId: category.parentId, ids, idempotencyKey: crypto.randomUUID() }, {
      onError: () => void categories.refetch(),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button className="min-h-11 self-start" onPress={() => setEditing({ category: undefined })}>
        <PlusIcon size={18} />
        {t('categories.add')}
      </Button>
      {reorder.error && (
        <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">
          {t(problemTypeToMessageKey(reorder.error instanceof ApiProblem ? reorder.error.type : 'unknown', { reorder: true }))}
        </p>
      )}
      {rows.length === 0
        ? <EmptyState icon={InfoIcon} message={t(`categories.empty.${kind}`)} />
        : (
            <ul className="flex flex-col gap-3">
              {rows.map((category) => {
                const siblings = items.filter(item => item.parentId === category.parentId)
                const index = siblings.findIndex(item => item.id === category.id)

                return (
                  <CategoryRow
                    key={category.id}
                    busy={reorder.isPending}
                    canMoveDown={index < siblings.length - 1}
                    canMoveUp={index > 0}
                    category={category}
                    kind={kind}
                    parentName={nameOf(category.parentId)}
                    onDelete={() => setDeleting(category)}
                    onEdit={() => setEditing({ category })}
                    onMove={direction => move(category, direction)}
                  />
                )
              })}
            </ul>
          )}
      {editing && (
        <CategorySheet
          category={editing.category}
          kind={kind}
          roots={roots}
          storeId={storeId}
          onClose={() => setEditing(undefined)}
        />
      )}
      {deleting && <DeleteCategoryDialog category={deleting} kind={kind} storeId={storeId} onClose={() => setDeleting(undefined)} />}
    </div>
  )
}
