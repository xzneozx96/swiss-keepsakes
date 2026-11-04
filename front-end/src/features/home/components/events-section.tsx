import type { PublicCategory } from '@sk/api-contract'
import type { EventPin } from '../lib/events'
import { Skeleton } from '@heroui/react'

import { Link } from '@tanstack/react-router'
import { useId, useMemo, useState } from 'react'
import { ErrorNotice } from '@/components/error-notice'
import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { useMapData } from '@/features/map/api/queries'
import { pinIcon } from '@/features/map/lib/categories'
import { zurichToday } from '@/features/map/lib/next-date'

import { dayParts, eventsSplit, shownDay, whenLine } from '../lib/events'
import { SectionHeading } from './section-heading'

const PRESS = 'outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.98]'

/** The map address of a card: its place's slug. A pin without a slug has no deep link, so its card opens the map as it is. */
const placeSearch = (pin: EventPin) => pin.slug ? { place: pin.slug } : {}

function useEventCopy(today: string) {
  const { t, language, intlLocale } = useLocale()
  const copy = { until: (day: string) => t('map.date.until', { day }), from: (time: string) => t('map.date.from', { time }) }

  return { language, intlLocale, when: (pin: EventPin) => whenLine(pin.nextDate, today, intlLocale, copy) }
}

/**
 * The "This week" poster: the photo fills the card (the category icon on the lake blue when there is none), a soft dark gradient
 * carries the white type, the day is an outlined number. One event fills the width; in a carousel each card is 288 px so the next peeks.
 */
function Poster({ pin, categories, today, wide }: { pin: EventPin, categories: readonly PublicCategory[], today: string, wide: boolean }) {
  const { language, intlLocale, when } = useEventCopy(today)
  const parts = dayParts(shownDay(pin.nextDate, today), intlLocale)
  const time = when(pin)
  const link = (
    <Link
      className={`relative block overflow-hidden rounded-2xl text-start text-white shadow-surface ${wide ? 'w-full' : 'w-[288px]'} ${PRESS}`}
      params={{ lang: language }}
      search={placeSearch(pin)}
      to="/$lang/map"
    >
      <MapThumb className={`${wide ? 'aspect-[4/3]' : 'aspect-[4/5]'} w-full`} icon={pinIcon(pin, categories)} iconSize={56} src={pin.photoUrl ?? undefined} />
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_20%,rgb(0_0_0/0.55)_55%,rgb(0_0_0/0.85)_100%)]" />
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
        <span className="flex items-end gap-3">
          <span aria-hidden className="text-[80px] leading-[66px] font-extrabold tracking-[-0.05em] text-transparent tabular-nums [-webkit-text-stroke:1.5px_rgb(255_255_255/0.95)]">{parts.day}</span>
          <span className="flex flex-col pb-0.5 text-[12px] leading-4 font-semibold tracking-[0.1em] uppercase">
            <span>{parts.weekdayLong}</span>
            <span className="text-white/75">{parts.monthShort}</span>
          </span>
        </span>
        <span className="flex flex-col gap-1 border-t border-white/30 pt-3">
          <span className="font-serif text-[23px] leading-7 font-medium text-balance" lang={pin.language === language ? undefined : pin.language}>{pin.title}</span>
          {time && <span className="text-[13px] leading-[18px] text-white/85 tabular-nums">{time}</span>}
        </span>
      </span>
    </Link>
  )

  return wide ? link : <li className="shrink-0 snap-start">{link}</li>
}

function ThisWeek({ events, categories, today }: { events: EventPin[], categories: readonly PublicCategory[], today: string }) {
  const { t } = useLocale()
  const headingId = useId()

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] leading-5 font-semibold" id={headingId}>{t('homePage.events.thisWeek')}</h3>
      {events.length === 1
        ? (
            <div aria-labelledby={headingId} role="group">
              <Poster categories={categories} pin={events[0]!} today={today} wide />
            </div>
          )
        : (
            <Rail label={t('homePage.events.thisWeek')}>
              {events.map(pin => <Poster key={pin.id} categories={categories} pin={pin} today={today} wide={false} />)}
            </Rail>
          )}
    </div>
  )
}

/** "Coming up": a timeline with an italic month marker, no photos, and "See all on the map" only when more than three events are ahead. */
function ComingUp({ events, seeAll, today }: { events: EventPin[], seeAll: boolean, today: string }) {
  const { t } = useLocale()
  const { language, intlLocale, when } = useEventCopy(today)
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-surface">
      <h3 className="text-[15px] leading-5 font-semibold" id={headingId}>{t('homePage.events.comingUp')}</h3>
      <ol className="relative flex flex-col ps-5">
        <span aria-hidden className="absolute start-[5px] top-2 bottom-2 w-px bg-separator" />
        {events.map((pin, index) => {
          const parts = dayParts(pin.nextDate.firstDay, intlLocale)
          const newMonth = index === 0 || dayParts(events[index - 1]!.nextDate.firstDay, intlLocale).monthLong !== parts.monthLong
          const time = when(pin)

          return (
            <li key={pin.id} className="relative flex flex-col">
              {newMonth && <span className="pt-1 pb-0.5 font-serif text-[15px] leading-5 italic">{parts.monthLong}</span>}
              <Link
                className={`relative flex items-start gap-3 py-2.5 text-start ${PRESS}`}
                params={{ lang: language }}
                search={placeSearch(pin)}
                to="/$lang/map"
              >
                <span aria-hidden className="absolute -start-5 top-[22px] size-[11px] rounded-full border-2 border-surface bg-foreground/60" />
                <span aria-hidden className="w-9 shrink-0 text-center tabular-nums">
                  <span className="block text-[11px] leading-4 text-muted">{parts.weekdayShort}</span>
                  <span className="block text-[17px] leading-6 font-semibold">{parts.day}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-serif text-[17px] leading-[22px] font-medium" lang={pin.language === language ? undefined : pin.language}>{pin.title}</span>
                  <span className="sr-only">{`${parts.weekdayLong} ${parts.day} ${parts.monthLong}`}</span>
                  {time && <span className="text-label font-normal text-muted tabular-nums">{time}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      {seeAll && (
        <Link className={`flex min-h-11 items-center justify-center rounded-full bg-default px-4 text-sm font-medium ${PRESS}`} params={{ lang: language }} search={{ dated: 1 }} to="/$lang/map">
          {t('homePage.events.seeAll')}
        </Link>
      )}
    </section>
  )
}

/** The poster box and the timeline box with the same structure as the real blocks, a line or a number block in each part. */
function EventsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4" data-skeleton="events">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24 rounded-md" />
        <div className="flex aspect-[4/3] flex-col justify-end gap-3 rounded-2xl bg-surface p-5 shadow-surface">
          <Skeleton className="h-16 w-20 rounded-lg" />
          <Skeleton className="h-7 w-3/4 rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-surface">
        <Skeleton className="h-5 w-24 rounded-md" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-start gap-3">
            <Skeleton className="h-11 w-9 rounded-md" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * "While you're in town": the pins with a next date of the guest map's own list, split into "This week" and "Coming up"
 * (docs/ux/home-design.md row 7, G-S9-EVENTS). The split drops an event that has ended, also from a cached list. With no
 * event the section is not drawn. A card opens the map with that place; no price anywhere.
 */
export function EventsSection() {
  const { t, language } = useLocale()
  const headingId = useId()
  const { pins, categories, isPending, isFailed, retry } = useMapData(language)
  const [now] = useState(() => new Date())
  const today = zurichToday(now)
  const split = useMemo(() => eventsSplit(pins, now), [pins, now])
  const empty = split.thisWeek.length === 0 && split.comingUp.length === 0

  if (!isPending && !isFailed && empty)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.events.body')} id={headingId} title={t('homePage.events.title')} />
      {isFailed
        ? <ErrorNotice compact message={t('homePage.events.failed')} onRetry={retry} />
        : isPending
          ? <EventsSkeleton />
          : (
              <>
                {split.thisWeek.length > 0 && <ThisWeek categories={categories} events={split.thisWeek} today={today} />}
                {split.comingUp.length > 0 && <ComingUp events={split.comingUp} seeAll={split.seeAll} today={today} />}
              </>
            )}
    </section>
  )
}
