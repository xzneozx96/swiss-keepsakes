import type { PickupPlace } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { pickText } from '@sk/domain/shared'

import { ArchiveIcon, ChevronRightIcon, ClockIcon, PickupIcon, RestoreIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { languagesOf } from '@/features/pickup/lib/form'
import { hoursLine } from '@/features/pickup/lib/hours-line'
import { LanguageChip } from './status-chips'

/**
 * M14 Pickup points as M11's third tab: one ticket per point, as the M03 cards. An active point's name opens the
 * editor (its hit area covers the card) and it can be archived; an archived point is not edited, only restored.
 * Either can be deleted; the API refuses when an order or a handover names the point.
 */
export function PickupPoints({ places, label, onOpen, onArchive, onDelete, onRestore }: {
  places: PickupPlace[]
  label: string
  onOpen: (place: PickupPlace) => void
  onArchive: (place: PickupPlace) => void
  onDelete: (place: PickupPlace) => void
  onRestore: (place: PickupPlace) => void
}) {
  const { t, language } = useLocale()

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-pretty text-muted">
        {t('products.place.intro')}
      </p>
      <ul aria-label={label} className="grid gap-5 lg:grid-cols-2">
        {places.map((place) => {
          const name = pickText(place.name, language).text
          const hours = hoursLine(place.hours, t)
          const instructions = place.instructions ? pickText(place.instructions, language).text : ''

          return (
            <li key={place.id}>
              <article className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface shadow-surface card-hover">
                <div className="flex items-center gap-4 p-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-secondary text-muted">
                    <PickupIcon aria-hidden size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg leading-tight font-semibold">
                      {place.archived
                        ? name
                        : (
                            <button
                              aria-label={t('products.place.open', { name })}
                              className="rounded-md text-start outline-none after:absolute after:inset-0 focus-visible:focus-ring"
                              type="button"
                              onClick={() => onOpen(place)}
                            >
                              {name}
                            </button>
                          )}
                    </h3>
                    <p className="mt-2 text-xs text-muted">{pickText(place.address, language).text}</p>
                  </div>
                  {!place.archived && <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />}
                </div>
                <div className="flex flex-wrap gap-2 px-4 pb-4 [&_svg]:shrink-0">
                  <LanguageChip status={languagesOf(place)} />
                </div>
                <div className="mt-auto flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5 text-sm">
                  <p className="flex items-start gap-2">
                    <ClockIcon aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
                    <span className={hours ? 'tabular-nums' : 'text-muted'}>{hours || t('products.place.noHours')}</span>
                  </p>
                  {instructions && <p className="text-pretty text-muted">{instructions}</p>}
                  <div className="relative mt-1 flex flex-wrap gap-2">
                    {place.archived
                      ? (
                          <Button aria-label={`${t('pickup.action.restore')} ${name}`} className="max-lg:min-h-11" size="sm" variant="secondary" onPress={() => onRestore(place)}>
                            <RestoreIcon aria-hidden size={16} />
                            {t('pickup.action.restore')}
                          </Button>
                        )
                      : (
                          <Button aria-label={`${t('products.action.archive')} ${name}`} className="max-lg:min-h-11" size="sm" variant="danger-soft" onPress={() => onArchive(place)}>
                            <ArchiveIcon aria-hidden size={16} />
                            {t('products.action.archive')}
                          </Button>
                        )}
                    <Button aria-label={`${t('pickup.action.delete')} ${name}`} className="max-lg:min-h-11" size="sm" variant="danger-soft" onPress={() => onDelete(place)}>
                      <TrashIcon aria-hidden size={16} />
                      {t('pickup.action.delete')}
                    </Button>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
