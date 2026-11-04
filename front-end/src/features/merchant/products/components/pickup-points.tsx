import type { PickupPlace } from '@sk/api-contract'
import type { DataTableColumn } from '@/components/data-table'
import type { RowAction } from '@/components/row-actions'

import { Skeleton } from '@heroui/react'
import { pickText } from '@sk/domain/shared'

import { DataTable } from '@/components/data-table'
import { ArchiveIcon, EditIcon, RestoreIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { StatusText } from '@/components/status-text'
import { useLocale } from '@/contexts/locale-context'
import { languagesOf } from '@/features/pickup/lib/form'
import { hoursGroups } from '@/features/pickup/lib/hours-line'
import { LanguageChip } from './status-chips'

type PickupAction = 'edit' | 'archive' | 'restore' | 'delete'

interface PickupPointsProps {
  places: PickupPlace[]
  label: string
  /** Back to page 1 when this changes: the search or the Status filter. */
  resetKey?: string
  isLoading?: boolean
  onOpen: (place: PickupPlace) => void
  onArchive: (place: PickupPlace) => void
  onDelete: (place: PickupPlace) => void
  onRestore: (place: PickupPlace) => void
}

type Handlers = Pick<PickupPointsProps, 'onOpen' | 'onArchive' | 'onDelete' | 'onRestore'>

function useRowText() {
  const { t, language } = useLocale()

  return {
    t,
    name: (place: PickupPlace) => pickText(place.name, language).text,
    address: (place: PickupPlace) => pickText(place.address, language).text,
    hours: (place: PickupPlace) => hoursGroups(place.hours, t),
  }
}

/** One line per day group ("Mon to Sat · 10:00 – 18:00"), or one muted line when the point has no hours. */
function Hours({ lines, className = '' }: { lines: string[], className?: string }) {
  const { t } = useLocale()

  if (!lines.length)
    return <span className={`text-muted ${className}`}>{t('products.place.noHours')}</span>

  return (
    <span className={`flex flex-col tabular-nums ${className}`}>
      {lines.map(line => <span key={line}>{line}</span>)}
    </span>
  )
}

/** The warning chip for the language still missing; nothing when EN and DE are both there. */
function MissingLanguage({ place }: { place: PickupPlace }) {
  const status = languagesOf(place)

  return status === 'complete' ? null : <LanguageChip status={status} />
}

function Status({ place }: { place: PickupPlace }) {
  const { t } = useLocale()

  return place.archived
    ? <StatusText tone="neutral">{t('products.view.archived')}</StatusText>
    : <StatusText tone="success">{t('products.view.active')}</StatusText>
}

/**
 * Edit (an active point only: an archived one is restored, not edited), Archive or Restore, and Delete, the only
 * danger item. Archive and Delete ask first; the API refuses a delete when an order or a handover names the point.
 */
function RowMenu({ place, onOpen, onArchive, onDelete, onRestore }: { place: PickupPlace } & Handlers) {
  const { t, name } = useRowText()
  const actions: RowAction<PickupAction>[] = [
    ...(place.archived
      ? [{ id: 'restore' as const, label: t('pickup.action.restore'), icon: RestoreIcon }]
      : [
          { id: 'edit' as const, label: t('products.action.edit'), icon: EditIcon },
          { id: 'archive' as const, label: t('products.action.archive'), icon: ArchiveIcon },
        ]),
    { id: 'delete', label: t('pickup.action.delete'), icon: TrashIcon, isDanger: true },
  ]
  const run: Record<PickupAction, (place: PickupPlace) => void> = { edit: onOpen, archive: onArchive, restore: onRestore, delete: onDelete }

  return <RowActions actions={actions} label={t('products.action.more', { name: name(place) })} onAction={id => run[id](place)} />
}

/** The name of an active point is the button that opens its edit sheet; an archived point's name is plain text. */
function Name({ place, onOpen, className }: { place: PickupPlace, onOpen: (place: PickupPlace) => void, className: string }) {
  const { t, name } = useRowText()

  if (place.archived)
    return <span className={className}>{name(place)}</span>

  return (
    <button aria-label={t('products.place.open', { name: name(place) })} className={className} type="button" onClick={() => onOpen(place)}>
      {name(place)}
    </button>
  )
}

/** Phones: the Keepsakes card shape. Name over the address and the hours lines, the status with the language chip, the ⋯ menu. */
function PickupCards({ places, label, ...handlers }: { places: PickupPlace[], label: string } & Handlers) {
  const { address, hours } = useRowText()

  return (
    <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {places.map(place => (
        <li key={place.id} className="relative flex items-center gap-1 rounded-3xl bg-surface p-4 pe-3 shadow-surface">
          <span className="flex min-w-0 flex-1 flex-col">
            {/* The name's hit area covers the card; the menu sits above it. */}
            <Name
              className="text-start text-sm font-semibold [overflow-wrap:anywhere] outline-none after:absolute after:inset-0 after:rounded-3xl focus-visible:after:focus-ring"
              place={place}
              onOpen={handlers.onOpen}
            />
            <span className="text-label text-muted">{address(place)}</span>
            <Hours className="text-label text-muted" lines={hours(place)} />
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 [&_svg]:shrink-0">
              <Status place={place} />
              <MissingLanguage place={place} />
            </span>
          </span>
          <span className="relative">
            <RowMenu place={place} {...handlers} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The loading cards have the shape of the cards: name, address and hours lines, the status, and the menu. */
function CardSkeletons() {
  return (
    <ul aria-hidden className="flex flex-col gap-3 lg:hidden">
      {[0, 1, 2].map(i => (
        <li key={i} className="flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-surface">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-2/5 rounded-lg" />
            <Skeleton className="h-3 w-1/2 rounded-lg" />
            <Skeleton className="mt-1 h-3 w-16 rounded-lg" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

/**
 * M14 Pickup points: the shared table from 1024 px, the cards below it. Columns: the point (name over address), the
 * opening hours one line per day group, the missing language, the status as dot text, and the ⋯ menu. The
 * instructions stay in the edit sheet.
 */
export function PickupPoints({ places, label, resetKey, isLoading, ...handlers }: PickupPointsProps) {
  const { t, address, hours } = useRowText()
  const columns: DataTableColumn<PickupPlace>[] = [
    {
      id: 'point',
      header: t('pickup.column.point'),
      isRowHeader: true,
      skeleton: 'lead',
      headerClassName: 'w-[38%]',
      render: place => (
        <div className="flex min-w-0 flex-col">
          <Name className="w-fit text-start font-semibold [overflow-wrap:anywhere] underline-offset-4 outline-none hover:underline focus-visible:focus-ring" place={place} onOpen={handlers.onOpen} />
          <span className="text-label text-muted">{address(place)}</span>
        </div>
      ),
    },
    { id: 'hours', header: t('pickup.hours.title'), headerClassName: 'w-[30%] whitespace-nowrap', cellClassName: 'whitespace-nowrap', render: place => <Hours lines={hours(place)} /> },
    { id: 'languages', header: t('pickup.column.languages'), skeleton: 'chip', cellClassName: 'whitespace-nowrap [&_svg]:shrink-0', render: place => <MissingLanguage place={place} /> },
    { id: 'status', header: t('products.view.label'), headerClassName: 'whitespace-nowrap', cellClassName: 'whitespace-nowrap', render: place => <Status place={place} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-pretty text-muted">
        {t('products.place.intro')}
      </p>
      <DataTable
        cardSkeleton={<CardSkeletons />}
        cards={pageRows => <PickupCards label={label} places={pageRows} {...handlers} />}
        columns={columns}
        getRowId={place => place.id}
        isLoading={isLoading}
        label={label}
        resetKey={resetKey}
        rowActions={{ render: place => <RowMenu place={place} {...handlers} /> }}
        rows={places}
      />
    </div>
  )
}
