import type { StoryGroupDetail } from '@sk/api-contract'
import type { GroupFields } from '../lib/group-fields'
import type { StoryLanguage } from '../lib/search-params'

import { Button, Skeleton } from '@heroui/react'
import { useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { CloseIcon, OptionIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { categoryLabel, includedParents } from '../lib/categories'
import { categoriesSummary } from '../lib/details-summary'
import { StoryCategoriesSheet } from './story-categories-sheet'
import { CollapsibleCard } from './story-details-panel'

/**
 * The blog categories of the story (shared by both languages): removable chips (a sub-category reads "Old Town in Swiss history",
 * a parent reached through a sub-category has no chip and a line says so) and a button that opens the shared sheet. A chip is named
 * in the open language, else the other one. Only categories that exist are shown; the sheet saves in one change.
 */
export function CategoriesCard({ storeId, group, language, onChange }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  onChange: (patch: Partial<GroupFields>) => void
}) {
  const { t } = useLocale()
  const query = useCategories(storeId, 'blog')
  const [sheetOpen, setSheetOpen] = useState(false)
  const all = query.data?.items
  const chosen = (all ?? []).filter(category => group.categoryIds.includes(category.id))
  // The chips keep the order the story has them in.
  const ordered = group.categoryIds.flatMap(id => chosen.filter(category => category.id === id))
  const byId = new Map((all ?? []).map(category => [category.id, category]))
  const label = (id: string) => categoryLabel(byId.get(id)!, language)
  const includedLine = includedParents(group.categoryIds, all ?? []).filter(id => byId.has(id)).map(parent =>
    t('storyDetails.categories.included', {
      parent: label(parent),
      child: group.categoryIds.filter(id => byId.get(id)?.parentId === parent).map(label).join(', '),
    }),
  ).join(' ')

  return (
    <CollapsibleCard icon={OptionIcon} id="categories" summary={categoriesSummary(t, ordered.map(category => categoryLabel(category, language)))} title={t('storyDetails.categories.title')}>
      {query.isError && <ErrorNotice compact message={t('storyDetails.categories.failed')} onRetry={() => void query.refetch()} />}
      {query.isPending && (
        <div aria-hidden className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
      )}
      {ordered.length > 0 && (
        <ul aria-label={t('storyDetails.categories.chosen')} className="flex flex-wrap gap-2">
          {ordered.map((category) => {
            const parent = category.parentId ? byId.get(category.parentId) : undefined

            return (
              <li key={category.id} className="flex items-center gap-1 rounded-full bg-default py-1 ps-3 pe-1 text-sm">
                <span className="font-medium">{categoryLabel(category, language)}</span>
                {' '}
                {parent && <span className="text-xs text-muted">{t('storyDetails.categories.in', { parent: categoryLabel(parent, language) })}</span>}
                <button
                  aria-label={t('storyDetails.categories.remove', { name: categoryLabel(category, language) })}
                  className="flex size-8 items-center justify-center rounded-full outline-none hover:bg-default-hover focus-visible:focus-ring max-lg:-my-2 max-lg:size-11"
                  type="button"
                  onClick={() => onChange({ categoryIds: group.categoryIds.filter(id => id !== category.id) })}
                >
                  <CloseIcon aria-hidden size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-pretty text-muted">{includedLine || t('storyDetails.categories.help')}</p>
      <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheetOpen(true)}>
        {t(group.categoryIds.length > 0 ? 'storyDetails.categories.change' : 'storyDetails.categories.choose')}
      </Button>
      {sheetOpen && (
        <StoryCategoriesSheet
          categories={all}
          isLoading={query.isPending}
          value={group.categoryIds}
          onClose={() => setSheetOpen(false)}
          onSave={(categoryIds) => {
            onChange({ categoryIds })
            setSheetOpen(false)
          }}
        />
      )}
    </CollapsibleCard>
  )
}
