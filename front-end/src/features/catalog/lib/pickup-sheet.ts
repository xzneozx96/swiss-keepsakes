import type { CalendarDate } from '@internationalized/date'
import type { PublicPickupPoints } from '@sk/api-contract'
import type { IntlLocale } from '@sk/domain/shared'
import type { GiftPageProps } from '../components/gift-detail'
import type { PickupDateFieldProps } from '../components/pickup-date-field'
import type { MessageKey } from '@/i18n/en'

import { parseDate } from '@internationalized/date'
import { zurichDate } from '@sk/domain/catalog'
import { addCalendarDays } from '@sk/domain/dates'
import { formatShortDate } from '@sk/domain/shared'
import { hoursOfWeek } from '@/lib/hours'
import { earliestPickupDay, isPickupDay, opensOnWeekday, PICKUP_WINDOW_DAYS } from './pickup-days'

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string
export type PickupPoint = PublicPickupPoints['items'][number]

/** The map link is the merchant's; only a web link is ever put in an anchor. */
const WEB_LINK = /^https?:\/\//i

/** The points as the "Pickup places" fold-out and the place choice show them: address, the week's hours, instructions and the directions link. */
export function placeOptions(points: readonly PickupPoint[], t: Translate, intlLocale: IntlLocale): GiftPageProps['place']['options'] {
  return points.map((point) => {
    const { groups } = hoursOfWeek(point.hours.map(span => ({ day: span.weekday, opens: span.opens, closes: span.closes })), 0, intlLocale, t('map.sheet.closed'))

    return {
      id: point.id,
      name: point.name,
      address: point.address,
      hours: groups.filter(group => !group.closed).map(group => `${group.days} ${group.value}`).join(', '),
      instructions: point.instructions ?? undefined,
      schedule: groups.map(group => ({ days: group.days, value: group.value })),
      directions: WEB_LINK.test(point.mapsUrl) ? { href: point.mapsUrl, label: t('detail.places.directions') } : undefined,
    }
  })
}

/** The "Pickup" highlight line: the point's name, two names joined, or the first two and the count of the rest. */
export function pickupHighlight(points: readonly PickupPoint[], t: Translate): string {
  const [first, second] = points

  if (!first)
    return t('detail.places.none')
  if (!second)
    return first.name

  return points.length === 2
    ? t('detail.highlight.pickup.places', { first: first.name, second: second.name })
    : t('detail.highlight.pickup.many', { first: first.name, second: second.name, count: points.length - 2 })
}

/**
 * The inline calendar for one pickup point: only a day the point is open can be picked, the earliest one is where it
 * opens, closed days say why when tapped, and the legend has no "preparing" entry (no preparation time, O22).
 */
export function pickupDateField(input: {
  point: PickupPoint
  now: Date
  value: CalendarDate | null
  onChange: (value: CalendarDate) => void
  t: Translate
  intlLocale: IntlLocale
}): PickupDateFieldProps {
  const { point, now, value, onChange, t, intlLocale } = input
  const today = zurichDate(now)
  const earliest = earliestPickupDay(point.hours, now)
  const last = addCalendarDays(today, PICKUP_WINDOW_DAYS)

  return {
    label: t('detail.date.label'),
    description: earliest ? t('detail.date.earliest', { date: formatShortDate(earliest, today, intlLocale) }) : t('detail.date.noDays'),
    today: parseDate(today),
    earliest: parseDate(earliest ?? today),
    max: parseDate(last),
    // Days before today and after the window are left to the calendar's own limits (disabled).
    isUnavailable: (date) => {
      const day = date.toString()

      return day >= today && day <= last && !isPickupDay(point.hours, day, now)
    },
    // Today with a span that has ended is not "closed that day": the opening hours are over.
    reasonFor: day => day < today || day > last
      ? undefined
      : day === today && opensOnWeekday(point.hours, day) ? t('detail.date.todayOver') : t('detail.date.closedDay'),
    legend: { title: t('detail.legend.title'), closed: t('detail.legend.closedDay') },
    value,
    onChange,
  }
}
