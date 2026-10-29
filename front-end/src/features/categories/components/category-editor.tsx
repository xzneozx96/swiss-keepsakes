import type { CategoryKind } from '@sk/api-contract'
import type { ReactNode } from 'react'

import { Button, Skeleton } from '@heroui/react'

import { PlusIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useIsWide } from '@/hooks/use-is-wide'
import { useCategories } from '../api/queries'
import { useCategoryActions } from '../hooks/use-category-actions'
import { displayName } from '../lib/category-name'
import { rootsOf } from '../lib/category-tree'
import { CategoryPhone } from './category-phone'
import { CategoryRefusal } from './category-refusal'
import { CategorySheet } from './category-sheet'
import { CategoryTable } from './category-table'

/**
 * One list of the store (the map's or the blog's) under the screen's header: the Add action, the tabs the
 * screen passes in, the grouped table from 1024 px or the phone drill-in below it, and the sheets they open.
 * The store id is unknown for a moment after sign-in, so the list waits while it is.
 */
export function CategoryEditor({ storeId, kind, tabs }: { storeId: string | undefined, kind: CategoryKind, tabs: ReactNode }) {
  const { t, language } = useLocale()
  const wide = useIsWide()
  const categories = useCategories(storeId, kind)
  const loaded = categories.data?.items
  const { actions, items, busy, notice, sheet, closeSheet, dialog } = useCategoryActions({
    storeId: storeId ?? '',
    kind,
    items: loaded ?? [],
    refetch: () => void categories.refetch(),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title">{t('categories.title')}</h1>
          <p className="text-sm text-pretty text-muted">{t('categories.subtitle')}</p>
        </div>
        <Button className="min-h-11 shrink-0" isDisabled={!loaded} onPress={actions.add}>
          <PlusIcon size={18} />
          {t('categories.add')}
        </Button>
      </div>
      {tabs}
      {notice && (
        <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">{t(notice)}</p>
      )}
      {categories.isError
        ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">
              <p>{t(categories.error instanceof ApiProblem && categories.error.type === 'forbidden' ? 'categories.problem.forbidden' : 'categories.loadFailed')}</p>
              {categories.error instanceof ApiProblem && categories.error.requestId && <p className="text-xs opacity-80">{t('categories.requestId', { id: categories.error.requestId })}</p>}
              <Button className="min-h-11" variant="secondary" onPress={() => void categories.refetch()}>{t('categories.retry')}</Button>
            </div>
          )
        : !loaded
            ? (
                <div className="flex flex-col gap-3">
                  <p aria-live="polite" className="sr-only" role="status">{t('categories.loading')}</p>
                  <Skeleton className="h-28 w-full rounded-3xl" />
                  <Skeleton className="h-28 w-full rounded-3xl" />
                </div>
              )
            : wide
              ? <CategoryTable key={kind} actions={actions} busy={busy} items={items} kind={kind} />
              : <CategoryPhone items={items} kind={kind} />}
      {sheet?.mode === 'refused' && (
        <SheetFrame
          isOpen
          footer={<Button fullWidth className="min-h-11" variant="secondary" onPress={closeSheet}>{t('categories.refusal.gotIt')}</Button>}
          title={t('categories.refusal.title', { name: displayName(sheet.category, language).primary })}
          onClose={closeSheet}
        >
          <CategoryRefusal category={sheet.category} items={items} kind={kind} />
        </SheetFrame>
      )}
      {sheet?.mode === 'form' && storeId && (
        <CategorySheet
          key={sheet.category?.id ?? `new-${sheet.parentId}`}
          category={sheet.category}
          kind={kind}
          parentId={sheet.parentId}
          roots={rootsOf(items)}
          storeId={storeId}
          onClose={closeSheet}
        />
      )}
      {dialog}
    </>
  )
}
