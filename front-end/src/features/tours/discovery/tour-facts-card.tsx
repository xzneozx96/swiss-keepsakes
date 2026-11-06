import type { Tour } from '@sk/domain/bookings'

import { pickText } from '@sk/domain/shared'

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
  const plural = new Intl.PluralRules(intlLocale).select(stops.length) === 'one' ? 'one' : 'other'
  const facts = [
    {
      id: 'duration',
      icon: ClockIcon,
      value: t('tourDiscovery.duration', { hours: new Intl.NumberFormat(intlLocale).format(tour.durationMinutes / 60) }),
      label: t('tourDiscovery.durationLabel'),
    },
    ...(stops.length > 0 ? [{ id: 'stops', icon: CategoryRouteIcon, value: String(stops.length), label: t(`tourDetail.stops.${plural}`) }] : []),
  ]

  return (
    <section aria-label={t('tourDetail.facts.label')} className="mb-7 flex flex-col rounded-3xl bg-surface shadow-surface">
      <dl className="grid divide-x divide-separator rtl:divide-x-reverse" style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}>
        {facts.map(fact => (
          <div key={fact.id} className="flex items-center gap-3 p-4">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <fact.icon size={20} />
            </span>
            <span className="flex min-w-0 flex-col-reverse">
              <dt className="text-xs text-muted">{fact.label}</dt>
              <dd className="text-lg leading-6 font-semibold tabular-nums">{fact.value}</dd>
            </span>
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
