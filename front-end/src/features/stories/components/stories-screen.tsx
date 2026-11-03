import type { StoryTab } from '../lib/list'
import type { MessageKey } from '@/i18n/en'

import { useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { ContentIcon, PlusIcon } from '@/components/icons'
import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useStories } from '../api/queries'
import { useCreateStory } from '../hooks/use-create-story'
import { useDeleteStory } from '../hooks/use-delete-story'
import { filterStories, isPublishedStory, STORY_TABS, storyTitle, tabCounts } from '../lib/list'
import { StoriesGate } from './stories-gate'
import { StoryRows } from './story-rows'

function Header({ onNew, isDisabled }: { onNew?: () => void, isDisabled: boolean }) {
  const { t } = useLocale()

  return (
    <ListHeader
      action={<ListAction icon={PlusIcon} isDisabled={isDisabled} onPress={onNew}>{t('merchantStories.new')}</ListAction>}
      description={t('merchantStories.description')}
      title={t('merchantStories.title')}
    />
  )
}

/** The wording of an empty list: the search, else the tab, else no stories at all. */
function emptyKey(total: number, tab: StoryTab): MessageKey {
  if (total === 0 || tab === 'all')
    return 'merchantStories.empty'

  return tab === 'published' ? 'merchantStories.empty.published' : 'merchantStories.empty.drafts'
}

/** The tabs, the search and the rows, with `onNew`, `onDelete` and `list` supplied once the store is known. */
function StoriesBody({ items, isLoading, failure, onNew, newPending, onDelete }: {
  items: Parameters<typeof tabCounts>[0]
  isLoading: boolean
  failure?: React.ReactNode
  onNew?: () => void
  newPending: boolean
  onDelete: Parameters<typeof StoryRows>[0]['onDelete']
}) {
  const { t } = useLocale()
  const [tab, setTab] = useState<StoryTab>('all')
  const [query, setQuery] = useState('')
  const counts = tabCounts(items, query)
  const shown = filterStories(items, tab, query)
  const searching = query.trim() !== ''
  const empty = searching && items.length > 0
    ? { icon: ContentIcon, message: t('merchantStories.emptySearch', { query: query.trim() }) }
    : { icon: ContentIcon, message: t(emptyKey(items.length, tab)), ...(items.length === 0 && onNew ? { action: { label: t('merchantStories.new'), onPress: onNew } } : {}) }

  return (
    <>
      <Header isDisabled={onNew === undefined || newPending} onNew={onNew} />
      <ListToolbar
        search={<ListSearch isDisabled={isLoading} label={t('merchantStories.search')} value={query} onChange={setQuery} />}
        tabs={(
          <PageTabs
            fill
            label={t('merchantStories.tabs.label')}
            selected={tab}
            tabs={STORY_TABS.map(id => ({ id, label: t(`merchantStories.tab.${id}`), count: isLoading ? null : counts[id] }))}
            onSelect={setTab}
          />
        )}
      />
      {failure ?? (
        <StoryRows
          empty={empty}
          isLoading={isLoading}
          items={shown}
          label={t('merchantStories.title')}
          resetKey={`${tab}|${query}`}
          onDelete={onDelete}
        />
      )}
    </>
  )
}

function LoadedStories({ storeId }: { storeId: string }) {
  const { t } = useLocale()
  const list = useStories(storeId)
  const create = useCreateStory(storeId)
  const remove = useDeleteStory(storeId)

  return (
    <>
      <StoriesBody
        failure={list.isError
          ? (
              <ErrorNotice
                message={t('merchantStories.loadFailed')}
                reference={list.error instanceof ApiProblem ? list.error.requestId : undefined}
                onRetry={() => void list.refetch()}
              />
            )
          : undefined}
        isLoading={list.isPending}
        items={list.data?.items ?? []}
        newPending={create.isPending}
        onDelete={item => void remove.ask({ groupId: item.groupId, name: storyTitle(item) || t('merchantStories.untitled'), published: isPublishedStory(item) })}
        onNew={create.create}
      />
      {remove.dialog}
    </>
  )
}

/**
 * M17, Content > Stories: one row per story with the state of each language version, status tabs with counts, a
 * search on the title, New story and a delete for any story, published or not. A table from 1024 px, cards below.
 */
export function StoriesScreen() {
  return (
    <div className="flex flex-col gap-4" data-testid="stories-screen">
      <StoriesGate fallback={<StoriesBody isLoading items={[]} newPending={false} onDelete={() => undefined} />}>
        {storeId => <LoadedStories storeId={storeId} />}
      </StoriesGate>
    </div>
  )
}
