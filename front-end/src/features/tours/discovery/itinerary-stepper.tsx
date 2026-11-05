import type { Tour } from '@sk/domain/bookings'

import { pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'

/** "Start", "+20 min", "+1 h 10 min": the time from the start of the route. */
function useSince() {
  const { t } = useLocale()

  return (minutes: number | null | undefined) => {
    if (minutes == null)
      return null
    if (minutes <= 0)
      return t('tourDetail.itinerary.start')
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60

    if (hours === 0)
      return t('tourDetail.itinerary.min', { minutes: rest })

    return rest === 0
      ? t('tourDetail.itinerary.hour', { hours })
      : t('tourDetail.itinerary.hourMin', { hours, minutes: rest })
  }
}

/**
 * The stops of a route as a vertical stepper: a numbered circle on a thin line that joins it to the next
 * stop, the name beside it and the time from the start under the name. The first circle (the start) is
 * filled in the accent colour and the last (the end) in ink; the ones between are outlined.
 */
export function ItineraryStepper({ stops }: { stops: Tour['itinerary'] }) {
  const { language } = useLocale()
  const since = useSince()

  return (
    <ol className="flex flex-col">
      {stops.map((stop, index) => {
        const first = index === 0
        const last = index === stops.length - 1
        const time = since(stop.minutesFromStart)
        const circle = first
          ? 'bg-accent text-accent-foreground'
          : last
            ? 'bg-foreground text-background'
            : 'border-2 border-separator bg-background text-foreground'

        return (
          <li key={stop.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span aria-hidden className="absolute start-[13px] top-8 bottom-1 border-s-2 border-separator" />}
            <span aria-hidden className={`relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${circle}`}>
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col pt-0.5">
              <span className="font-semibold">{pickText(stop.name, language).text}</span>
              {time && <span className="text-sm text-muted tabular-nums">{time}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
