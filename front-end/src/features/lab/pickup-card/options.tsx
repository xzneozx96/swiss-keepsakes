import type { PickupPlace } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { pickText } from '@sk/domain/shared'

import {
  ArchiveIcon,
  ClockIcon,
  OpenInMapsIcon,
  PickupIcon,
  RestoreIcon,
  TrashIcon,
} from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { StatusChip, TagChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { languagesOf } from '@/features/pickup/lib/form'
import { hoursLine } from '@/features/pickup/lib/hours-line'

export interface CardProps { place: PickupPlace }

function noop() {}

/** Owner rule: no badge when EN and DE are both filled in; a badge only for the missing language. */
function badgesOf(place: PickupPlace) {
  const status = languagesOf(place)
  const missing = status === 'de-missing' ? 'DE missing' : status === 'en-missing' ? 'EN missing' : status === 'incomplete' ? 'EN and DE missing' : null

  return { missing, archived: place.archived }
}

function Badges({ place }: CardProps) {
  const { missing, archived } = badgesOf(place)

  if (!missing && !archived)
    return null

  return (
    <div className="flex flex-wrap gap-2">
      {missing && <StatusChip tone="warning">{missing}</StatusChip>}
      {archived && <TagChip>Archived</TagChip>}
    </div>
  )
}

function usePlaceText(place: PickupPlace) {
  const { t, language } = useLocale()

  return {
    name: pickText(place.name, language).text,
    address: pickText(place.address, language).text,
    hours: hoursLine(place.hours, t),
    instructions: place.instructions ? pickText(place.instructions, language).text : '',
  }
}

/** The name is the card's open button; its hit area covers the card. An archived point is not opened. */
function Title({ place, name, className }: { place: PickupPlace, name: string, className?: string }) {
  return (
    <h3 className={className ?? 'text-lg leading-tight font-semibold'}>
      {place.archived
        ? name
        : (
            <button
              aria-label={`Edit ${name}`}
              className="rounded-md text-start outline-none after:absolute after:inset-0 focus-visible:focus-ring"
              type="button"
              onClick={noop}
            >
              {name}
            </button>
          )}
    </h3>
  )
}

const cardClass = 'relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl bg-surface shadow-surface card-hover'

/** The ⋯ menu above the card's hit area. */
function Menu({ place, name }: { place: PickupPlace, name: string }) {
  const actions = place.archived
    ? [
        { id: 'restore', label: 'Restore', icon: RestoreIcon },
        { id: 'delete', label: 'Delete', icon: TrashIcon, isDanger: true },
      ]
    : [
        { id: 'archive', label: 'Archive', icon: ArchiveIcon },
        { id: 'delete', label: 'Delete', icon: TrashIcon, isDanger: true },
      ]

  return (
    <div className="relative shrink-0">
      <RowActions actions={actions} label={`Actions for ${name}`} onAction={noop} />
    </div>
  )
}

/**
 * A: one quiet row, like a table row. Name and address, hours under them, the menu at the end. Instructions are
 * one line. Densest: eight points fit in a screen. Actions live in the menu, so nothing on the card is a button
 * to hit by mistake.
 */
export function OptionA({ place }: CardProps) {
  const { name, address, hours, instructions } = usePlaceText(place)

  return (
    <article className={`${cardClass} ${place.archived ? 'opacity-80' : ''}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Title name={name} place={place} />
          <p className="text-sm text-muted">{address}</p>
          <p className="mt-1 flex items-start gap-2 text-sm">
            <ClockIcon aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
            <span className={hours ? 'tabular-nums' : 'text-muted'}>{hours || 'No opening hours'}</span>
          </p>
          {instructions && <p className="line-clamp-1 text-sm text-muted">{instructions}</p>}
          <div className="mt-1 empty:hidden">
            <Badges place={place} />
          </div>
        </div>
        <Menu name={name} place={place} />
      </div>
    </article>
  )
}

/**
 * B: a facts card. Labelled rows (Address with its Maps link, Hours, How to find it) so each fact has one place, and
 * the actions are visible at the foot: Archive or Restore on the left, Delete on the right in the danger tone. Tallest;
 * nothing hidden, no menu to open.
 */
export function OptionB({ place }: CardProps) {
  const { name, address, hours, instructions } = usePlaceText(place)

  return (
    <article className={cardClass}>
      <div className="flex flex-col gap-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <Title name={name} place={place} />
          <Badges place={place} />
        </div>
        <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted">Address</dt>
          <dd className="min-w-0">
            {address}
            <a className="relative mt-0.5 flex w-fit items-center gap-1 text-label text-accent underline underline-offset-4" href={place.mapsLink} rel="noreferrer" target="_blank">
              <OpenInMapsIcon aria-hidden size={14} />
              Open in Maps
            </a>
          </dd>
          <dt className="text-muted">Hours</dt>
          <dd className={hours ? 'tabular-nums' : 'text-muted'}>{hours || 'None set'}</dd>
          {instructions && (
            <>
              <dt className="text-muted">Finding it</dt>
              <dd className="text-pretty">{instructions}</dd>
            </>
          )}
        </dl>
      </div>
      <div className="relative mt-auto flex items-center justify-between gap-2 border-t border-separator px-4 py-3">
        {place.archived
          ? (
              <Button className="min-h-11" size="sm" variant="secondary" onPress={noop}>
                <RestoreIcon aria-hidden size={16} />
                Restore
              </Button>
            )
          : (
              <Button className="min-h-11" size="sm" variant="secondary" onPress={noop}>
                <ArchiveIcon aria-hidden size={16} />
                Archive
              </Button>
            )}
        <Button className="min-h-11" size="sm" variant="danger-soft" onPress={noop}>
          <TrashIcon aria-hidden size={16} />
          Delete
        </Button>
      </div>
    </article>
  )
}

/**
 * C: map first. A map thumbnail with the pin heads the card, so the merchant sees where the point is before reading
 * anything; name, address and hours sit under it, the menu top right. Cost: this lab draws the thumbnail from tokens.
 * In the product a live MapView per card means one MapLibre instance (a WebGL context and tile requests) for every
 * card, which browsers cap at about 16 contexts, so the real build would use one static tile image per point (one
 * request each, stored with the point) or fall back to the icon tile.
 */
export function OptionC({ place }: CardProps) {
  const { name, address, hours, instructions } = usePlaceText(place)

  return (
    <article className={cardClass}>
      <div aria-hidden className="relative grid h-28 place-items-center bg-surface-secondary text-accent">
        <div className="absolute inset-0 bg-[linear-gradient(var(--color-separator)_1px,transparent_1px),linear-gradient(90deg,var(--color-separator)_1px,transparent_1px)] bg-size-[2rem_2rem] opacity-60" />
        <PickupIcon className={`relative ${place.archived ? 'text-muted' : ''}`} size={32} />
        <span className="absolute end-3 bottom-2 text-xs text-muted tabular-nums">
          {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Title name={name} place={place} />
            <p className="mt-1 text-sm text-muted">{address}</p>
          </div>
          <Menu name={name} place={place} />
        </div>
        <p className="flex items-start gap-2 text-sm">
          <ClockIcon aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
          <span className={hours ? 'tabular-nums' : 'text-muted'}>{hours || 'No opening hours'}</span>
        </p>
        {instructions && <p className="text-sm text-pretty text-muted">{instructions}</p>}
        <div className="empty:hidden">
          <Badges place={place} />
        </div>
      </div>
    </article>
  )
}
