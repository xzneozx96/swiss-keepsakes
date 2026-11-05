import type { PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { EventPin } from '../lib/events'
import { buttonVariants, Skeleton } from '@heroui/react'

import { zurichDate } from '@sk/domain/dates'
import { Link } from '@tanstack/react-router'
import { useId, useMemo, useState } from 'react'
import { ErrorNotice } from '@/components/error-notice'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { pinIcon } from '@/features/map/lib/categories'

import { dayParts, EVENTS_CATEGORY_SLUG, eventsSplit, shownDay, whenLine } from '../lib/events'
import { PhotoPoster, POSTER_TITLE } from './photo-poster'
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
 * The "This week" poster: the shared photo poster with the day as an outlined number over the title and the time. One event
 * fills the width; in a carousel each card is 288 px so the next peeks.
 */
function Poster({ pin, categories, today, wide }: { pin: EventPin, categories: readonly PublicCategory[], today: string, wide: boolean }) {
  const { language, intlLocale, when } = useEventCopy(today)
  const parts = dayParts(shownDay(pin.nextDate, today), intlLocale)
  const time = when(pin)
  const link = (
    <PhotoPoster icon={pinIcon(pin, categories)} slug={pin.slug} src={pin.photoUrl ?? undefined} wide={wide}>
      <span className="flex items-end gap-3">
        <span aria-hidden className="text-[80px] leading-[66px] font-extrabold tracking-[-0.05em] text-transparent tabular-nums [-webkit-text-stroke:1.5px_rgb(255_255_255/0.95)]">{parts.day}</span>
        <span className="flex flex-col pb-0.5 text-[12px] leading-4 font-semibold tracking-[0.1em] uppercase">
          <span>{parts.weekdayLong}</span>
          <span className="text-white/75">{parts.monthShort}</span>
        </span>
      </span>
      <span className="flex flex-col gap-1 border-t border-white/30 pt-3">
        <span className={POSTER_TITLE} lang={pin.language === language ? undefined : pin.language}>{pin.title}</span>
        {time && <span className="text-[13px] leading-[18px] text-white/85 tabular-nums">{time}</span>}
      </span>
    </PhotoPoster>
  )

  return wide ? link : <li className="shrink-0 snap-start">{link}</li>
}

/** "This week" has no visible heading (owner, 05.11.2026); the poster's group or the carousel keeps the name for screen readers. */
function ThisWeek({ events, categories, today }: { events: EventPin[], categories: readonly PublicCategory[], today: string }) {
  const { t } = useLocale()

  return events.length === 1
    ? (
        <div aria-label={t('homePage.events.thisWeek')} role="group">
          <Poster categories={categories} pin={events[0]!} today={today} wide />
        </div>
      )
    : (
        <Rail label={t('homePage.events.thisWeek')}>
          {events.map(pin => <Poster key={pin.id} categories={categories} pin={pin} today={today} wide={false} />)}
        </Rail>
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
        <Link className={`${buttonVariants({ variant: 'tertiary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`} params={{ lang: language }} search={{ category: EVENTS_CATEGORY_SLUG }} to="/$lang/map">
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
      <div className="flex aspect-[4/3] flex-col justify-end gap-3 rounded-2xl bg-surface p-5 shadow-surface">
        <Skeleton className="h-16 w-20 rounded-lg" />
        <Skeleton className="h-7 w-3/4 rounded-md" />
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
 * event the section is not drawn. The pins and categories are the home loader's read of the map list (undefined while it loads, null when it failed), so the browser reads nothing for it. A card opens the map with that place; no price anywhere.
 */
export function EventsSection({ pins, categories, onRetry }: { pins: readonly PublicMapItem[] | null | undefined, categories: readonly PublicCategory[] | null | undefined, onRetry: () => void }) {
  const { t } = useLocale()
  const headingId = useId()
  const isFailed = pins === null || categories === null
  const isPending = pins === undefined || categories === undefined
  const [now] = useState(() => new Date())
  const today = zurichDate(now)
  const split = useMemo(() => eventsSplit(pins ?? [], now), [pins, now])
  const empty = split.thisWeek.length === 0 && split.comingUp.length === 0

  if (!isPending && !isFailed && empty)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.events.body')} id={headingId} title={t('homePage.events.title')} />
      {isFailed
        ? <ErrorNotice compact message={t('homePage.events.failed')} onRetry={onRetry} />
        : isPending
          ? <EventsSkeleton />
          : (
              <>
                {split.thisWeek.length > 0 && <ThisWeek categories={categories ?? []} events={split.thisWeek} today={today} />}
                {split.comingUp.length > 0 && <ComingUp events={split.comingUp} seeAll={split.seeAll} today={today} />}
              </>
            )}
    </section>
  )
}
