import type { StoriesSearch, StoryStatus } from '../lib/list-search'
import type { StoryTab } from '../lib/list'
import type { MessageKey } from '@/i18n/en'

import { useCallback } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { ContentIcon, PlusIcon } from '@/components/icons'
import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { serverPager } from '@/components/list-pagination'
import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useListLoading } from '@/hooks/use-list-loading'
import { useSearchBox } from '@/hooks/use-search-box'
import { useStories } from '../api/queries'
import { useCreateStory } from '../hooks/use-create-story'
import { useDeleteStory } from '../hooks/use-delete-story'
import { STORY_TABS, isPublishedStory, storyTitle } from '../lib/list'
import { STORIES_PAGE_SIZE } from '../lib/list-search'
import { StoriesGate } from './stories-gate'
import { StoryRows } from './story-rows'

type OnSearch = (patch: Partial<StoriesSearch>) => void

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

const NO_COUNTS = { all: 0, published: 0, drafts: 0 }

/** The tabs, the search and the rows, with `onNew`, `onDelete` and `list` supplied once the store is known. */
function StoriesBody({ storeId, search, onSearch, onNew, newPending, onDelete }: {
  storeId?: string
  search: StoriesSearch
  onSearch: OnSearch
  onNew?: () => void
  newPending: boolean
  onDelete: Parameters<typeof StoryRows>[0]['onDelete']
}) {
  const { t } = useLocale()
  const tab: StoryTab = search.status ?? 'all'
  const page = search.page ?? 1
  const q = search.q?.trim() ?? ''
  const commitSearch = useCallback((text: string) => onSearch({ q: text.trim() ? text : undefined, page: undefined }), [onSearch])
  const [text, setText] = useSearchBox(search.q ?? '', commitSearch)
  const list = useStories(storeId, { status: search.status, q: q || undefined, page, pageSize: STORIES_PAGE_SIZE })
  // A new tab, search or page keeps the last rows on screen until the answer is late, then the skeleton takes over.
  const isLoading = useListLoading(list) || storeId === undefined
  const counts = list.data?.tabs ?? NO_COUNTS
  const rows = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const searching = q !== ''
  const empty = searching
    ? { icon: ContentIcon, message: t('merchantStories.emptySearch', { query: q }) }
    : { icon: ContentIcon, message: t(emptyKey(counts.all, tab)), ...(counts.all === 0 && onNew ? { action: { label: t('merchantStories.new'), onPress: onNew } } : {}) }
  const failure = list.isError
    ? (
        <ErrorNotice
          message={t('merchantStories.loadFailed')}
          reference={list.error instanceof ApiProblem ? list.error.requestId : undefined}
          onRetry={() => void list.refetch()}
        />
      )
    : undefined

  return (
    <>
      <Header isDisabled={onNew === undefined || newPending} onNew={onNew} />
      <ListToolbar
        search={<ListSearch isDisabled={isLoading && !list.data} label={t('merchantStories.search')} value={text} onChange={setText} />}
        tabs={(
          <PageTabs
            fill
            label={t('merchantStories.tabs.label')}
            selected={tab}
            tabs={STORY_TABS.map(id => ({ id, label: t(`merchantStories.tab.${id}`), count: list.data ? counts[id] : null }))}
            onSelect={id => onSearch({ status: id === 'all' ? undefined : id as StoryStatus, page: undefined })}
          />
        )}
      />
      {failure ?? (
        <StoryRows
          empty={empty}
          isLoading={isLoading}
          items={rows}
          label={t('merchantStories.title')}
          paging={serverPager({ page, pageSize: STORIES_PAGE_SIZE, total, go: next => onSearch({ page: next > 1 ? next : undefined }) })}
          onDelete={onDelete}
        />
      )}
    </>
  )
}

function LoadedStories({ storeId, search, onSearch }: { storeId: string, search: StoriesSearch, onSearch: OnSearch }) {
  const { t } = useLocale()
  const create = useCreateStory(storeId)
  const remove = useDeleteStory(storeId)

  return (
    <>
      <StoriesBody
        newPending={create.isPending}
        search={search}
        storeId={storeId}
        onDelete={item => void remove.ask({ groupId: item.groupId, name: storyTitle(item) || t('merchantStories.untitled'), published: isPublishedStory(item) })}
        onNew={create.create}
        onSearch={onSearch}
      />
      {remove.dialog}
    </>
  )
}

/**
 * M17, Content > Stories: one row per story with the state of each language version, status tabs with counts, a
 * search on the title, New story and a delete for any story, published or not. A table from 1024 px, cards below.
 * The server pages, filters and counts (ADR-033); the tab, the search and the page live in the URL.
 */
export function StoriesScreen({ search, onSearch }: { search: StoriesSearch, onSearch: OnSearch }) {
  return (
    <div className="flex flex-col gap-4" data-testid="stories-screen">
      <StoriesGate fallback={<StoriesBody newPending={false} search={search} onDelete={() => undefined} onSearch={onSearch} />}>
        {storeId => <LoadedStories search={search} storeId={storeId} onSearch={onSearch} />}
      </StoriesGate>
    </div>
  )
}
