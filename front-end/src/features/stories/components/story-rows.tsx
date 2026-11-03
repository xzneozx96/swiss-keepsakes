import type { StoryListItem } from '@sk/api-contract'
import type { LanguageState } from '../lib/list'
import type { DataTableColumn } from '@/components/data-table'
import type { EmptyStateProps } from '@/components/empty-state'
import type { IconComponent } from '@/components/icons'
import type { MessageKey } from '@/i18n/en'

import { Skeleton } from '@heroui/react'
import { dateTimeFormat } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'

import { DataTable } from '@/components/data-table'
import { EditIcon, StatusNeutralIcon, StatusSuccessIcon, StatusWarningIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { useLocale } from '@/contexts/locale-context'
import { KeepsakePhoto } from '@/features/keepsakes/components/keepsake-photo'
import { languageState, storyTitle } from '../lib/list'
import { STORY_PATH } from '../lib/search-params'

const editorHref = (item: StoryListItem) => `/store/content/articles/${item.groupId}`

/** A cover that is still processing or was retired is no picture: the tile shows its placeholder. */
const readyCover = (item: StoryListItem) => (item.cover?.status === 'ready' ? item.cover : null)

const STATE: Record<LanguageState, { icon: IconComponent, tone: string, label: MessageKey }> = {
  published: { icon: StatusSuccessIcon, tone: 'text-success', label: 'merchantStories.state.published' },
  draft: { icon: StatusWarningIcon, tone: 'text-warning', label: 'merchantStories.state.draft' },
  none: { icon: StatusNeutralIcon, tone: 'text-muted', label: 'merchantStories.state.none' },
}

function useRowText() {
  const { t, intlLocale } = useLocale()

  return {
    t,
    title: (item: StoryListItem) => storyTitle(item) || t('merchantStories.untitled'),
    updated: (item: StoryListItem) => dateTimeFormat(intlLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.updatedAt)),
  }
}

/** A version's state is an icon and words, never colour alone. `prefix` (EN, DE) names the language on phones. */
function State({ state, prefix }: { state: LanguageState, prefix?: string }) {
  const { t } = useLocale()
  const { icon: Icon, tone, label } = STATE[state]

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon aria-hidden className={`shrink-0 ${tone}`} size={14} />
      <span>{prefix ? `${prefix} · ${t(label)}` : t(label)}</span>
    </span>
  )
}

/** Open and Delete, for a draft and for a published story alike; the dialog says which it is. */
function RowMenu({ item, onDelete }: { item: StoryListItem, onDelete: (item: StoryListItem) => void }) {
  const { t, title } = useRowText()

  return (
    <RowActions
      actions={[
        { id: 'open', label: t('merchantStories.row.open'), icon: EditIcon, href: editorHref(item) },
        { id: 'delete', label: t('merchantStories.row.delete'), icon: TrashIcon, isDanger: true },
      ]}
      label={t('merchantStories.row.actions', { name: title(item) })}
      onAction={id => id === 'delete' && onDelete(item)}
    />
  )
}

/** Phones: the thumbnail, the title (two lines at most) over `EN · state   DE · state` and the last update, and the ⋯ menu. */
function StoryCards({ items, label, onDelete }: { items: StoryListItem[], label: string, onDelete: (item: StoryListItem) => void }) {
  const { title, updated } = useRowText()

  return (
    <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {items.map(item => (
        <li key={item.groupId} className="flex items-center gap-1 rounded-3xl bg-surface p-3 shadow-surface" data-story={item.groupId}>
          <Link className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl outline-none focus-visible:focus-ring" params={{ articleId: item.groupId }} to={STORY_PATH}>
            <KeepsakePhoto className="size-14 shrink-0 rounded-xl" media={readyCover(item)} width={160} />
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere]">{title(item)}</span>
              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-label">
                <State prefix="EN" state={languageState(item.languages.en)} />
                <State prefix="DE" state={languageState(item.languages.de)} />
              </span>
              <span className="text-label text-muted">{updated(item)}</span>
            </span>
          </Link>
          <RowMenu item={item} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}

/** The loading rows have the shape of the cards: a thumbnail, the title and state lines, and the menu. */
function CardSkeletons() {
  return (
    <ul aria-hidden className="flex flex-col gap-3 lg:hidden">
      {[0, 1, 2].map(i => (
        <li key={i} className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-surface">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-2/5 rounded-lg" />
            <Skeleton className="h-3 w-1/4 rounded-lg" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

/** From 1024 px a table, below it the cards. */
export function StoryRows({ items, isLoading, label, empty, resetKey, onDelete }: {
  items: StoryListItem[]
  isLoading: boolean
  label: string
  empty: EmptyStateProps
  resetKey: string
  onDelete: (item: StoryListItem) => void
}) {
  const { t, title, updated } = useRowText()
  const columns: DataTableColumn<StoryListItem>[] = [
    {
      id: 'story',
      header: t('merchantStories.column.story'),
      isRowHeader: true,
      skeleton: 'lead',
      render: item => (
        <div className="flex min-w-0 items-center gap-3">
          <KeepsakePhoto className="size-11 shrink-0 rounded-lg" media={readyCover(item)} width={160} />
          <span className="font-semibold [overflow-wrap:anywhere]">{title(item)}</span>
        </div>
      ),
    },
    { id: 'en', header: t('merchantStories.column.english'), render: item => <State state={languageState(item.languages.en)} /> },
    { id: 'de', header: t('merchantStories.column.german'), render: item => <State state={languageState(item.languages.de)} /> },
    { id: 'updated', header: t('merchantStories.column.updated'), headerClassName: 'whitespace-nowrap', cellClassName: 'whitespace-nowrap text-muted', render: updated },
  ]

  return (
    <DataTable
      cardSkeleton={<CardSkeletons />}
      cards={pageItems => <StoryCards items={pageItems} label={label} onDelete={onDelete} />}
      columns={columns}
      empty={empty}
      getRowHref={editorHref}
      getRowId={item => item.groupId}
      isLoading={isLoading}
      label={label}
      resetKey={resetKey}
      rowActions={{ render: item => <RowMenu item={item} onDelete={onDelete} /> }}
      rows={items}
    />
  )
}
