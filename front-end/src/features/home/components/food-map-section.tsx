import type { PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { FoodSelection } from '../lib/food-map'
import type { HoursStatus } from '@/lib/hours'

import { buttonVariants, Skeleton } from '@heroui/react'
import { zurichTime } from '@sk/domain/dates'
import { Link, useHydrated } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { ClockIcon, PickupIcon } from '@/components/icons'
import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { categoryName, pinIcon } from '@/features/map/lib/categories'
import { statusAt, weekdayName, weekSummary, zurichWeekday } from '@/lib/hours'
import { pickVariant, widestVariant } from '@/lib/pick-variant'
import { kindOf, newestFoodPlaces, streetOf } from '../lib/food-map'
import { CornerNotch } from './corner-notch'
import { SectionHeading } from './section-heading'

const PRESS = 'outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.98]'

/** A card's photo: the 640 px copy (sharp on a 3x phone), else the widest, else the small `photoUrl`; undefined shows the category icon. */
const cardPhoto = (pin: PublicMapItem) => (pickVariant(pin.photoVariants, 640) ?? widestVariant(pin.photoVariants))?.url ?? pin.photoUrl ?? undefined

/**
 * The card's status corner: a frosted tab that hugs the top-right corner (the card's own radius clips its outer corner; the mask above
 * curves the inner one and runs it into the edges). The state is the big word with a dot ("Open" green and live, "Closed" red) and the small line says until when or when it
 * opens again: "until 19:00", "Opens 14:00", "Opens tomorrow 09:00", "Opens Sat 07:00". Screen readers
 * hear one sentence instead of the pieces. Absolute, so it takes no room and nothing shifts when it appears after hydration.
 */
function StatusCorner({ status }: { status: HoursStatus }) {
  const { t, intlLocale } = useLocale()
  // The state is the big word; the small line says until when, or when it opens again (owner, 05.11.2026).
  const view = status.state === 'open'
    ? { live: true, state: t('homePage.food.status.open'), detail: t('homePage.food.status.until', { time: status.until }), say: t('homePage.food.status.sayOpen', { time: status.until }) }
    : status.state === 'opens-later'
      ? { live: false, state: t('homePage.food.status.closed'), detail: t('homePage.food.status.opensAt', { time: status.opensAt }), say: t('homePage.food.status.sayOpens', { time: status.opensAt }) }
      : status.inDays === 1
        ? { live: false, state: t('homePage.food.status.closed'), detail: t('homePage.food.status.opensTomorrow', { time: status.opensAt }), say: t('homePage.food.status.sayTomorrow', { time: status.opensAt }) }
        : {
            live: false,
            state: t('homePage.food.status.closed'),
            detail: t('homePage.food.status.opensOn', { day: weekdayName(status.nextDay, intlLocale), time: status.opensAt }),
            say: t('homePage.food.status.sayBack', { day: weekdayName(status.nextDay, intlLocale, 'long'), time: status.opensAt }),
          }

  return <CornerNotch detail={view.detail} dot={view.live ? 'live' : 'off'} kind={status.state} say={view.say} state={view.state} />
}

/**
 * A place card in the look of the blog lab's portrait story: the 4:5 photo, the dark gradient, and at the foot the glass badge with
 * the kind of place, the white serif name, the week's hours and the street; the status corner at the top right. It opens the place on the map.
 */
function PlaceCard({ pin, kind, categories, week, status }: { pin: PublicMapItem, kind: PublicCategory, categories: readonly PublicCategory[], week: string | undefined, status: HoursStatus | undefined }) {
  const { language } = useLocale()
  const hydrated = useHydrated()
  const other = pin.language === language ? undefined : pin.language

  return (
    <li className="w-[272px] shrink-0 snap-start">
      <Link className={`relative block overflow-hidden rounded-[28px] text-start ${PRESS}`} params={{ lang: language }} search={pin.slug ? { place: pin.slug } : {}} to="/$lang/map">
        <MapThumb className="aspect-[4/5] w-full" icon={pinIcon(pin, categories)} iconSize={56} src={cardPhoto(pin)} />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <span className="absolute inset-x-4 bottom-4 flex flex-col gap-2 text-white">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-semibold backdrop-blur-md">
            <span aria-hidden className="size-1.5 rounded-full bg-white" />
            {categoryName(kind, language)}
          </span>
          <h3 className="font-serif text-[22px] leading-7 font-medium text-balance hyphens-auto" lang={other}>{pin.title}</h3>
          {(week || pin.address) && (
            <span className="flex flex-col gap-1 text-[12px] leading-4 font-medium text-white/85">
              {week && (
                <span className="flex items-start gap-1.5 tabular-nums">
                  <ClockIcon aria-hidden className="shrink-0" size={14} />
                  <span className="line-clamp-2">{week}</span>
                </span>
              )}
              {pin.address && (
                <span className="flex min-w-0 items-center gap-1">
                  <PickupIcon aria-hidden className="shrink-0" size={14} />
                  <span className="truncate">{streetOf(pin.address)}</span>
                </span>
              )}
            </span>
          )}
        </span>
        {/* The status depends on the minute: drawn only once hydrated, so the server HTML never disagrees with the browser's clock. */}
        {hydrated && status && <StatusCorner status={status} />}
      </Link>
    </li>
  )
}

/** Two cards with the badge, the name and the two fact lines. */
function FoodSkeleton() {
  return (
    <div aria-hidden data-skeleton="food-map">
      <div className="-mx-4 flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex aspect-[4/5] w-[272px] shrink-0 flex-col justify-end gap-2 rounded-[28px] bg-surface p-4 shadow-surface">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-7 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-2/5 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The rail of the five newest places, then the button to the map filtered to food and drink. */
function FoodPlaces({ selection, categories }: { selection: FoodSelection, categories: readonly PublicCategory[] }) {
  const { t, language, intlLocale } = useLocale()
  // One clock for the whole section, read once, so every card says the same about now.
  const [now] = useState(() => new Date())
  const day = zurichWeekday(now)
  const time = zurichTime(now)

  return (
    <div className="flex flex-col gap-4">
      <Rail label={t('homePage.food.places')}>
        {selection.places.map(pin => (
          <PlaceCard
            key={pin.id}
            categories={categories}
            kind={kindOf(pin, selection)}
            pin={pin}
            status={statusAt(pin.weeklyHours, day, time)}
            week={weekSummary(pin.weeklyHours, intlLocale, t('homePage.food.daily'))}
          />
        ))}
      </Rail>
      <Link
        className={`${buttonVariants({ variant: 'tertiary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`}
        params={{ lang: language }}
        search={{ category: selection.category.slug }}
        to="/$lang/map"
      >
        {t('homePage.food.seeAll')}
      </Link>
    </div>
  )
}

/**
 * "Eat and drink like a local" (owner, 05.11.2026; docs/ux/home-design.md section 4): the five food and drink places added to the
 * map most recently, newest first in the server's order and not sorted by the guest's answers, as tall photo cards in a rail, then
 * "See all on the map" to the map filtered to food and drink (no kind filter since 05.11.2026). Not drawn when the category is not there or holds no undated place. The pins and categories are the home loader's
 * read of the map list (undefined while it loads, null when it failed). No price anywhere.
 */
export function FoodMapSection({ pins, categories, onRetry }: { pins: readonly PublicMapItem[] | null | undefined, categories: readonly PublicCategory[] | null | undefined, onRetry: () => void }) {
  const { t } = useLocale()
  const headingId = useId()
  const isFailed = pins === null || categories === null
  const selection = pins && categories ? newestFoodPlaces(pins, categories) : undefined

  if (pins && categories && !selection)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.food.body')} id={headingId} title={t('homePage.food.title')} />
      {isFailed
        ? <ErrorNotice compact message={t('homePage.food.failed')} onRetry={onRetry} />
        : !selection || !categories
            ? <FoodSkeleton />
            : <FoodPlaces categories={categories} selection={selection} />}
    </section>
  )
}
