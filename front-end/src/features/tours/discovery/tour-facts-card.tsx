import type { Tour } from '@sk/domain/bookings'

import { numberFormat, pickText, pluralCategory } from '@sk/domain/shared'

import { CategoryRouteIcon, ClockIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

/**
 * The route at a glance, the first thing in the Overview tab (owner, 06.11.2026: the stats row left the header). Two
 * figures side by side, each with its icon (how long, how many stops), and under them where the route starts and ends.
 * A tour with no stops yet (M13) shows the duration alone.
 */
export function TourFactsCard({ tour }: { tour: Tour }) {
  const { t, language, intlLocale } = useLocale()
  const stops = tour.itinerary
  const first = stops[0]
  const last = stops.at(-1)
  const plural = pluralCategory(intlLocale, stops.length) === 'one' ? 'one' : 'other'
  const facts = [
    {
      id: 'duration',
      icon: ClockIcon,
      value: t('tourDiscovery.duration', { hours: numberFormat(intlLocale).format(tour.durationMinutes / 60) }),
      label: t('tourDiscovery.durationLabel'),
    },
    ...(stops.length > 0 ? [{ id: 'stops', icon: CategoryRouteIcon, value: String(stops.length), label: t(`tourDetail.stops.${plural}`) }] : []),
  ]

  return (
    <section aria-label={t('tourDetail.facts.label')} className="mb-7 flex flex-col rounded-3xl bg-surface shadow-surface">
      <dl className="grid divide-x divide-separator rtl:divide-x-reverse" style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}>
        {facts.map(fact => (
          // A dl group holds only dt and dd: the icon sits in the dt, out of flow at the start edge, and the value (dd) shows over the label (dt).
          <div key={fact.id} className="relative flex min-h-18 min-w-0 flex-col-reverse justify-center py-4 ps-17 pe-4">
            <dt className="text-xs text-muted">
              <span aria-hidden className="absolute start-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-accent-soft text-accent">
                <fact.icon size={20} />
              </span>
              {fact.label}
            </dt>
            <dd className="text-lg leading-6 font-semibold tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {first && last && first !== last && (
        <p className="flex items-center gap-2.5 border-t border-separator px-4 py-3.5 text-sm">
          <span aria-hidden className="flex shrink-0 items-center gap-1">
            <span className="size-2.5 rounded-full bg-accent" />
            <span className="h-px w-4 bg-separator" />
            <span className="size-2.5 rounded-full bg-foreground" />
          </span>
          <span className="min-w-0">
            {t('tourDetail.facts.route', { start: pickText(first.name, language).text, end: pickText(last.name, language).text })}
          </span>
        </p>
      )}
    </section>
  )
}
