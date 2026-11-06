import type { Tour } from '@sk/domain/bookings'

import { numberFormat, pluralCategory } from '@sk/domain/shared'

import { CategoryRouteIcon, ClockIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

/**
 * The route at a glance under the tour's centred title, above the tabs (owner's sketch, 06.11.2026): the duration and the
 * stop count side by side, each an icon over its value, split by a hairline. The figures say what they are ("3 hours",
 * "6 stops"), so there are no labels. A tour with no stops yet (M13) shows the duration alone.
 */
export function TourFactsCard({ tour }: { tour: Tour }) {
  const { t, intlLocale } = useLocale()
  const stops = tour.itinerary.length
  const facts = [
    { id: 'duration', icon: ClockIcon, text: t('tourDiscovery.duration', { hours: numberFormat(intlLocale).format(tour.durationMinutes / 60) }) },
    ...(stops > 0 ? [{ id: 'stops', icon: CategoryRouteIcon, text: t(`tourDetail.stops.${pluralCategory(intlLocale, stops) === 'one' ? 'one' : 'other'}`, { count: stops }) }] : []),
  ]

  return (
    <ul aria-label={t('tourDetail.facts.label')} className="flex divide-x divide-separator rtl:divide-x-reverse">
      {facts.map(fact => (
        <li key={fact.id} className="flex flex-1 flex-col items-center gap-2 py-1">
          <fact.icon aria-hidden size={22} />
          <span className="text-[15px] leading-[22px] font-semibold tabular-nums">{fact.text}</span>
        </li>
      ))}
    </ul>
  )
}
