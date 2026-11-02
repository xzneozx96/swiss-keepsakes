import type { MerchantCategory, PinListItem } from '@sk/api-contract'
import type { Lang } from '../lib/form'
import type { DataTableColumn } from '@/components/data-table'
import type { EmptyStateProps } from '@/components/empty-state'
import type { RowAction } from '@/components/row-actions'
import type { MessageKey } from '@/i18n/en'

import { Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { DataTable } from '@/components/data-table'
import { ArchiveIcon, ChevronRightIcon, EditIcon, RestoreIcon, TrashIcon } from '@/components/icons'
import { MapThumb } from '@/components/map/map-thumb'
import { RowActions } from '@/components/row-actions'
import { StatusChip, TagChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { photoSrc } from '@/features/keepsakes/lib/keepsake-rules'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'
import { kindOf, languagesOf, STATUS_TONE, titleOf } from '../lib/list'
import { PLACES_PATH } from '../lib/search-params'

export type RowActionId = 'edit' | 'hide' | 'unhide' | 'delete'

export interface PlaceRowsProps {
  items: PinListItem[]
  categories: MerchantCategory[]
  isLoading: boolean
  label: string
  resetKey: string
  empty: EmptyStateProps
  busy: boolean
  onAction: (item: PinListItem, action: RowActionId) => void
}

const hrefOf = (item: PinListItem) => `${PLACES_PATH}/${item.id}`

function useNames() {
  const { t, language, intlLocale } = useLocale()
  const nameOfItem = (item: PinListItem) => titleOf(item, language) ?? t('places.row.untitled')
  const edited = (iso: string) => new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  return { t, language, nameOfItem, edited }
}

/** The picture slot of a pin row: its cover, or with no photo the place icon on the lake blue. */
function PlaceThumb({ item, className, iconSize }: { item: PinListItem, className: string, iconSize: number }) {
  return <MapThumb className={`shrink-0 ${className}`} iconSize={iconSize} src={item.cover ? photoSrc(item.cover, 160) : undefined} />
}

function categoryNames(item: PinListItem, categories: MerchantCategory[], language: Lang) {
  return item.categoryIds
    .map(id => categories.find(category => category.id === id))
    .map(category => category?.name[language] ?? category?.name[language === 'en' ? 'de' : 'en'])
    .filter((name): name is string => name !== undefined)
}

/**
 * The languages a pin still needs: a chip for every language without a title. A pin with both
 * languages ready has no chip.
 */
function LanguageChips({ item }: { item: PinListItem }) {
  const { t } = useLocale()
  const ready = languagesOf(item)
  const missing = (['en', 'de'] as const).filter(lang => !ready.includes(lang))

  if (!missing.length)
    return null

  return (
    <>
      {missing.map(lang => (
        <StatusChip key={lang} tone="warning">{t(`places.lang.missing.${lang}` as MessageKey)}</StatusChip>
      ))}
    </>
  )
}

/** Place or event, derived from the dates (ADR-029): a place has none, an event is upcoming or current, or ended. */
function Kind({ item }: { item: PinListItem }) {
  const { t, intlLocale } = useLocale()
  const kind = kindOf(item)
  let label = t('places.type.place')

  if (kind === 'ended') {
    label = t('places.type.eventEnded')
  }
  else if (kind === 'event' && item.nextDate) {
    const date = nextDateLine(item.nextDate, zurichToday(new Date()), intlLocale, {
      until: day => t('map.date.until', { day }),
      from: time => t('map.date.from', { time }),
    })

    label = t('places.type.eventNext', { date })
  }

  return <span className="text-xs text-muted">{label}</span>
}

/** The categories of a pin as chips, or a muted None chip. */
function Categories({ item, categories }: { item: PinListItem, categories: MerchantCategory[] }) {
  const { t, language } = useLocale()
  const names = categoryNames(item, categories, language)

  if (!names.length) {
    return (
      <TagChip>
        <span className="text-muted">{t('places.list.onlyAll')}</span>
      </TagChip>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {names.map(name => <TagChip key={name}>{name}</TagChip>)}
    </span>
  )
}

/** Who the pin is recommended for: the stay value, then the interests. Both only rank the pin. */
function RecommendedFor({ item }: { item: PinListItem }) {
  const { t } = useLocale()

  return (
    // Interests are plain muted text, not chips: chips are the Categories column's look, and an interest such as
    // "Lake and mountains" next to a category chip read as a category.
    <span className="flex flex-col items-start gap-0.5">
      <span>{t(`places.stay.${item.stayTag}` as MessageKey)}</span>
      {item.interests.length > 0 && (
        <span className="text-xs text-muted">{item.interests.map(id => t(`places.interest.${id}` as MessageKey)).join(' · ')}</span>
      )}
    </span>
  )
}

/** The status of a pin, and what is still missing in it: a language without a title. */
function Status({ item }: { item: PinListItem }) {
  const { t } = useLocale()

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusChip tone={STATUS_TONE[item.status]}>{t(`places.status.${item.status}` as MessageKey)}</StatusChip>
      <LanguageChips item={item} />
    </span>
  )
}

function actionsOf(item: PinListItem, t: ReturnType<typeof useLocale>['t']): RowAction<RowActionId>[] {
  return [
    { id: 'edit', label: t('places.row.edit'), icon: EditIcon, href: hrefOf(item) },
    ...(item.status === 'published' || item.status === 'ended' ? [{ id: 'hide' as const, label: t('places.row.hide'), icon: ArchiveIcon }] : []),
    ...(item.status === 'hidden' ? [{ id: 'unhide' as const, label: t('places.row.unhide'), icon: RestoreIcon }] : []),
    { id: 'delete' as const, label: t('places.row.delete'), icon: TrashIcon, isDanger: true },
  ]
}

/** Phones: one card per place, the whole card opens the editor and the menu holds the actions that change it. */
function Cards({ items, categories, busy, label, onAction }: PlaceRowsProps) {
  const { t, language, nameOfItem } = useNames()

  return (
    <ul aria-label={label} className="flex flex-col gap-4 lg:hidden">
      {items.map(item => (
        <li key={item.id} className="relative flex items-start gap-2 rounded-3xl bg-surface p-4 shadow-surface">
          <Link className="flex min-w-0 flex-1 items-start gap-3 rounded-xl outline-none focus-visible:focus-ring" to={hrefOf(item) as never}>
            <PlaceThumb className="size-14 rounded-xl" iconSize={24} item={item} />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex items-center gap-2">
                <span className="min-w-0 text-lg leading-tight font-semibold text-pretty [overflow-wrap:anywhere]">{nameOfItem(item)}</span>
                <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={16} />
              </span>
              <Kind item={item} />
              <Status item={item} />
              <span className="text-xs text-muted">{categoryNames(item, categories, language).join(', ') || t('places.list.onlyAll')}</span>
            </span>
          </Link>
          <RowActions actions={actionsOf(item, t).map(action => ({ ...action, isDisabled: busy && action.id !== 'edit' }))} label={t('places.row.actions', { name: nameOfItem(item) })} onAction={id => onAction(item, id)} />
        </li>
      ))}
    </ul>
  )
}

/** The loading cards of a phone: the shape of a card, a thumbnail, a title line, the kind line, the chips of the status row and a fact line. */
function CardSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-4 lg:hidden">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-start gap-3 rounded-3xl bg-surface p-4 shadow-surface">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-6 w-2/3 rounded-lg" />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/2 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** N16: the table from 1024 px and the cards below it. */
export function PlaceRows(props: PlaceRowsProps) {
  const { items, categories, isLoading, label, resetKey, empty, busy, onAction } = props
  const { t, nameOfItem, edited } = useNames()
  const columns: DataTableColumn<PinListItem>[] = [
    {
      id: 'pin',
      header: t('places.column.pin'),
      isRowHeader: true,
      skeleton: 'lead',
      headerClassName: 'w-[26%] whitespace-nowrap',
      render: item => (
        <div className="flex min-w-0 items-center gap-3">
          <PlaceThumb className="size-11 rounded-lg" iconSize={20} item={item} />
          <div className="flex min-w-0 flex-col">
            <Link className="font-semibold text-pretty [overflow-wrap:anywhere] outline-none hover:underline focus-visible:focus-ring" to={hrefOf(item) as never}>{nameOfItem(item)}</Link>
            <Kind item={item} />
          </div>
        </div>
      ),
    },
    { id: 'status', headerClassName: 'whitespace-nowrap', header: t('places.column.status'), skeleton: 'chip', render: item => <Status item={item} /> },
    { id: 'categories', headerClassName: 'whitespace-nowrap', header: t('places.column.categories'), render: item => <Categories categories={categories} item={item} /> },
    { id: 'tags', headerClassName: 'whitespace-nowrap', header: t('places.column.tags'), render: item => <RecommendedFor item={item} /> },
    { id: 'edited', header: t('places.column.edited'), headerClassName: 'whitespace-nowrap', cellClassName: 'whitespace-nowrap text-muted', render: item => edited(item.updatedAt) },
  ]

  return (
    <DataTable
      cardSkeleton={<CardSkeleton />}
      cards={pageItems => <Cards {...props} items={pageItems} />}
      columns={columns}
      empty={empty}
      getRowId={item => item.id}
      isLoading={isLoading}
      label={label}
      resetKey={resetKey}
      rows={items}
      rowActions={{
        render: item => <RowActions actions={actionsOf(item, t).map(action => ({ ...action, isDisabled: busy && action.id !== 'edit' }))} label={t('places.row.actions', { name: nameOfItem(item) })} onAction={id => onAction(item, id)} />,
      }}
    />
  )
}
