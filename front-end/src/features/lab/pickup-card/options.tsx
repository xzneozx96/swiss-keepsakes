import type { PickupPlace } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { pickText } from '@sk/domain/shared'

import { ArchiveIcon, RestoreIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { useLocale } from '@/contexts/locale-context'
import { languagesOf } from '@/features/pickup/lib/form'
import { hoursLine } from '@/features/pickup/lib/hours-line'
import { DAYS } from '@/features/places/lib/hours'

export interface ListProps { places: PickupPlace[] }

function noop() {}

function usePlaceText(place: PickupPlace) {
  const { t, language } = useLocale()

  return {
    name: pickText(place.name, language).text,
    address: pickText(place.address, language).text,
    hours: hoursLine(place.hours, t),
    instructions: place.instructions ? pickText(place.instructions, language).text : '',
  }
}

/**
 * Status as coloured text with a dot, never a pill (owner rule for merchant screens). Only the missing language
 * shows ("DE missing"); nothing when both are there. Archived is neutral. Red never appears here.
 */
function Status({ place }: { place: PickupPlace }) {
  const status = languagesOf(place)
  const missing = status === 'de-missing' ? 'DE missing' : status === 'en-missing' ? 'EN missing' : status === 'incomplete' ? 'EN and DE missing' : null

  if (!missing && !place.archived)
    return null

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-label whitespace-nowrap">
      {place.archived && (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-muted" />
          Archived
        </span>
      )}
      {missing && (
        <span className="inline-flex items-center gap-1.5 text-warning">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          {missing}
        </span>
      )}
    </span>
  )
}

/** The name is the open (edit) button; its hit area stretches over the nearest `relative` parent. */
function Title({ place, name, className }: { place: PickupPlace, name: string, className: string }) {
  return (
    <h3 className={`${className} text-pretty ${place.archived ? 'text-muted' : ''}`}>
      <button
        aria-label={`Edit ${name}`}
        className="rounded-md text-start outline-none after:absolute after:inset-0 focus-visible:focus-ring"
        type="button"
        onClick={noop}
      >
        {name}
      </button>
    </h3>
  )
}

/** The ⋯ menu, above the open button's hit area. Delete is the one red thing, and only inside the menu. */
function Menu({ place, name }: { place: PickupPlace, name: string }) {
  const actions = [
    place.archived
      ? { id: 'restore', label: 'Restore', icon: RestoreIcon }
      : { id: 'archive', label: 'Archive', icon: ArchiveIcon },
    { id: 'delete', label: 'Delete', icon: TrashIcon, isDanger: true },
  ]

  return (
    <div className="relative -me-1 shrink-0">
      <RowActions actions={actions} label={`Actions for ${name}`} onAction={noop} />
    </div>
  )
}

const cardClass = 'relative flex min-w-0 flex-col rounded-3xl bg-surface shadow-surface card-hover'

/* A: Ledger ------------------------------------------------------------------------------------------------- */

function LedgerRow({ place }: { place: PickupPlace }) {
  const { name, address, hours } = usePlaceText(place)

  return (
    <li className="relative flex items-start gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1 @md:flex-row @md:items-start @md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Title className="text-body font-semibold" name={name} place={place} />
          <p className="text-sm text-muted">{address}</p>
          <p className="text-sm text-muted tabular-nums">{hours || 'No opening hours'}</p>
        </div>
        <div className="pt-1 empty:hidden @md:pt-0.5">
          <Status place={place} />
        </div>
      </div>
      <Menu name={name} place={place} />
    </li>
  )
}

/**
 * A, Ledger: every point is a row of one white list, split by hairlines, like the Media file list. Three lines of
 * text per row, the status at the right edge, the ⋯ menu last. Instructions stay in the editor.
 */
export function OptionA({ places }: ListProps) {
  return (
    <ul className="@container flex flex-col divide-y divide-separator rounded-3xl bg-surface px-5 py-1 shadow-surface">
      {places.map(place => <LedgerRow key={place.id} place={place} />)}
    </ul>
  )
}

/* B: Placard ------------------------------------------------------------------------------------------------ */

function Placard({ place }: { place: PickupPlace }) {
  const { name, address, hours, instructions } = usePlaceText(place)

  return (
    <article className={cardClass}>
      <div className="flex items-start gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <Title className="font-serif text-card-title" name={name} place={place} />
          <p className="mt-1 text-sm text-muted">{address}</p>
        </div>
        <Menu name={name} place={place} />
      </div>
      {instructions && (
        <p className="mx-5 mt-4 font-serif text-body text-pretty text-muted italic">
          “{instructions}”
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-separator px-5 py-3.5">
        <span className={`text-sm tabular-nums ${hours ? '' : 'text-muted'}`}>{hours || 'No opening hours'}</span>
        <Status place={place} />
      </div>
    </article>
  )
}

/**
 * B, Placard: the card reads like the sign the guest will look for. The name in the serif that names places, the
 * address under it, the finding note quoted as the guest reads it, and one hairline foot with the hours and the
 * status.
 */
export function OptionB({ places }: ListProps) {
  return (
    <ul className="flex flex-col gap-4">
      {places.map(place => (
        <li key={place.id}>
          <Placard place={place} />
        </li>
      ))}
    </ul>
  )
}

/* C: Week ---------------------------------------------------------------------------------------------------- */

/** Mo to Su as seven quiet cells: an open day is filled, a closed day is only its letters. */
function WeekStrip({ place }: { place: PickupPlace }) {
  const { t } = useLocale()
  const open = new Set(place.hours.map(span => span.weekday))
  const spans = new Set(place.hours.map(span => t('pickup.hours.range', { from: span.opens, to: span.closes })))
  // One span shared by every open day prints once beside the strip; mixed days fall back to the full line.
  const time = place.hours.length === 0 ? 'No opening hours' : spans.size === 1 ? [...spans][0] : hoursLine(place.hours, t)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <ol aria-label="Open days" className="flex gap-1">
        {DAYS.map((day) => {
          const label = t(`places.day.${day}` as MessageKey)

          return (
            <li
              key={day}
              aria-label={`${label} ${open.has(day) ? 'open' : 'closed'}`}
              className={`grid h-7 w-8 place-items-center rounded-lg text-xs font-medium ${
                open.has(day) ? 'bg-default text-foreground' : 'text-muted'
              }`}
            >
              {label.slice(0, 2)}
            </li>
          )
        })}
      </ol>
      <span className={`text-sm tabular-nums ${place.hours.length ? '' : 'text-muted'}`}>{time}</span>
    </div>
  )
}

function WeekCard({ place }: { place: PickupPlace }) {
  const { name, address } = usePlaceText(place)

  return (
    <article className={`${cardClass} gap-4 p-5`}>
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Title className="text-lg leading-tight font-semibold" name={name} place={place} />
          <p className="text-sm text-muted">{address}</p>
        </div>
        <Menu name={name} place={place} />
      </div>
      <WeekStrip place={place} />
      <div className="-mt-1 empty:hidden">
        <Status place={place} />
      </div>
    </article>
  )
}

/**
 * C, Week: when the point is open is what a merchant checks, so the week is drawn: seven day cells, open days filled
 * in neutral grey, the time once beside them. Name and address above, status under, the ⋯ menu top right.
 */
export function OptionC({ places }: ListProps) {
  return (
    <ul className="flex flex-col gap-4">
      {places.map(place => (
        <li key={place.id}>
          <WeekCard place={place} />
        </li>
      ))}
    </ul>
  )
}
