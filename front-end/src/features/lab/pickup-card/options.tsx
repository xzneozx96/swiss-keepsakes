import type { PickupPlace } from '@sk/api-contract'
import type { DataTableColumn } from '@/components/data-table'

import { pickText } from '@sk/domain/shared'

import { DataTable } from '@/components/data-table'
import { ArchiveIcon, EditIcon, PickupIcon, RestoreIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { StatusText } from '@/features/keepsakes/components/status-text'
import { languagesOf } from '@/features/pickup/lib/form'
import { hoursLine } from '@/features/pickup/lib/hours-line'

function noop() {}

function useRowText() {
  const { t, language } = useLocale()

  return {
    name: (place: PickupPlace) => pickText(place.name, language).text,
    address: (place: PickupPlace) => pickText(place.address, language).text,
    hours: (place: PickupPlace) => hoursLine(place.hours, t) || 'No opening hours',
  }
}

/** Only the missing language gets a chip, as on the Places table; none when EN and DE are both there. */
function LanguageChip({ place }: { place: PickupPlace }) {
  const status = languagesOf(place)
  const label = status === 'de-missing' ? 'DE missing' : status === 'en-missing' ? 'EN missing' : status === 'incomplete' ? 'EN and DE missing' : null

  return label ? <StatusChip tone="warning">{label}</StatusChip> : null
}

/** Active or Archived as dot text, the keepsake editor's status look. */
function Status({ place }: { place: PickupPlace }) {
  return place.archived
    ? <StatusText tone="neutral">Archived</StatusText>
    : <StatusText tone="success">Active</StatusText>
}

/** Edit, Archive or Restore, and Delete: the only red item, which opens a confirm in the real build. */
function RowMenu({ place }: { place: PickupPlace }) {
  const { name } = useRowText()

  return (
    <RowActions
      actions={[
        { id: 'edit', label: 'Edit', icon: EditIcon },
        place.archived
          ? { id: 'restore', label: 'Restore', icon: RestoreIcon }
          : { id: 'archive', label: 'Archive', icon: ArchiveIcon },
        { id: 'delete', label: 'Delete', icon: TrashIcon, isDanger: true },
      ]}
      label={`Actions for ${name(place)}`}
      onAction={noop}
    />
  )
}

/**
 * Phones: the Keepsakes card shape. Name over the address and the hours, then the status with the language chip,
 * the ⋯ menu at the end. The whole card opens the edit sheet; the menu sits above that hit area.
 */
function PickupCards({ places, label }: { places: PickupPlace[], label: string }) {
  const { name, address, hours } = useRowText()

  return (
    <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {places.map(place => (
        <li key={place.id} className="relative flex items-center gap-1 rounded-3xl bg-surface p-4 pe-3 shadow-surface">
          <span className="flex min-w-0 flex-1 flex-col">
            <button
              className="text-start text-sm font-semibold [overflow-wrap:anywhere] outline-none after:absolute after:inset-0 after:rounded-3xl focus-visible:after:focus-ring"
              type="button"
              onClick={noop}
            >
              {name(place)}
            </button>
            <span className="text-label text-muted">{address(place)}</span>
            <span className="text-label text-muted tabular-nums">{hours(place)}</span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Status place={place} />
              <LanguageChip place={place} />
            </span>
          </span>
          <span className="relative">
            <RowMenu place={place} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The pickup points as the merchant list table: from 1024 px the table, below it the cards. */
export function PickupTable({ places, label }: { places: PickupPlace[], label: string }) {
  const { name, address, hours } = useRowText()
  const columns: DataTableColumn<PickupPlace>[] = [
    {
      id: 'name',
      header: 'Pickup point',
      isRowHeader: true,
      skeleton: 'lead',
      headerClassName: 'w-[38%]',
      render: place => (
        <div className="flex min-w-0 flex-col">
          {/* Opens the edit sheet; a pickup point has no page of its own, so the row is not a link. */}
          <button
            className="w-fit text-start font-semibold [overflow-wrap:anywhere] underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
            type="button"
            onClick={noop}
          >
            {name(place)}
          </button>
          <span className="text-label text-muted">{address(place)}</span>
        </div>
      ),
    },
    { id: 'hours', header: 'Opening hours', headerClassName: 'w-[30%]', cellClassName: 'tabular-nums', render: hours },
    { id: 'languages', header: 'Languages', skeleton: 'chip', cellClassName: 'whitespace-nowrap', render: place => <LanguageChip place={place} /> },
    { id: 'status', header: 'Status', headerClassName: 'whitespace-nowrap', cellClassName: 'whitespace-nowrap', render: place => <Status place={place} /> },
  ]

  return (
    <DataTable
      cards={pageRows => <PickupCards label={label} places={pageRows} />}
      columns={columns}
      empty={{ icon: PickupIcon, message: 'No pickup points yet' }}
      getRowId={place => place.id}
      label={label}
      rowActions={{ render: place => <RowMenu place={place} /> }}
      rows={places}
    />
  )
}
