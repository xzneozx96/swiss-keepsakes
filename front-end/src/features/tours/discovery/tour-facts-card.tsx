import type { Tour } from '@sk/domain/bookings'

import { numberFormat, pickText, pluralCategory } from '@sk/domain/shared'

import { CategoryRouteIcon, ClockIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

/**
 * The route at a glance, the first thing in the Overview tab: a highlights list with no box, as GetYourGuide's "About this
 * activity" and Airbnb's experience page show it (owner, 06.11.2026, lab /lab/tour-facts option 1). Each row is a line icon,
 * a bold line and a muted line under it: the duration and the stops from the first to the last. The meeting point left the
 * list (owner, 06.11.2026); the Itinerary tab's "Where it starts" has it. A tour with no stops yet (M13) leaves the stops
 * row out; a one-stop tour has no "From … to …".
 */
export function TourFactsCard({ tour }: { tour: Tour }) {
  const { t, language, intlLocale } = useLocale()
  const text = (value: Tour['name']) => pickText(value, language).text
  const stops = tour.itinerary
  const first = stops[0]
  const last = stops.at(-1)
  const plural = pluralCategory(intlLocale, stops.length) === 'one' ? 'one' : 'other'
  const rows = [
    {
      id: 'duration',
      icon: ClockIcon,
      title: t('tourDiscovery.duration', { hours: numberFormat(intlLocale).format(tour.durationMinutes / 60) }),
      body: t('tourDiscovery.durationLabel'),
    },
    ...(stops.length > 0
      ? [{
          id: 'stops',
          icon: CategoryRouteIcon,
          title: t(`tourDetail.stops.${plural}`, { count: stops.length }),
          body: first && last && first !== last ? t('tourDetail.facts.route', { start: text(first.name), end: text(last.name) }) : null,
        }]
      : []),
  ]

  return (
    <section aria-label={t('tourDetail.facts.label')} className="pb-7">
      <ul className="flex flex-col gap-4">
        {rows.map(row => (
          <li key={row.id} className="flex gap-3.5">
            <row.icon aria-hidden className="mt-0.5 shrink-0" size={22} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] leading-[22px] font-semibold">{row.title}</span>
              {row.body && <span className="text-sm text-muted">{row.body}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
