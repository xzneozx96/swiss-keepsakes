import type { CategoryIcon, PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { FoodSelection } from '../lib/food-map'
import type { HoursStatus } from '@/lib/hours'

import { buttonVariants, Skeleton } from '@heroui/react'
import { zurichTime } from '@sk/domain/dates'
import { Link, useHydrated } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { categoryIconComponents } from '@/components/category-icons'
import { ErrorNotice } from '@/components/error-notice'
import { ClockIcon, PickupIcon } from '@/components/icons'
import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { categoryName, pinIcon } from '@/features/map/lib/categories'
import { hoursOfWeek, statusAt, weekdayName, zurichWeekday } from '@/lib/hours'
import { photoUrl } from '@/lib/photos'
import { pickVariant, widestVariant } from '@/lib/pick-variant'
import { kindOf, newestFoodPlaces, streetOf } from '../lib/food-map'
import { ALL_FOOD_PHOTO, topicPhoto } from '../lib/food-topics'
import { SectionHeading } from './section-heading'

const PRESS = 'outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.98]'
const ALL = 'all'

/** A card's photo: the 640 px copy (sharp on a 3x phone), else the widest, else the small `photoUrl`; undefined shows the category icon. */
const cardPhoto = (pin: PublicMapItem) => (pickVariant(pin.photoVariants, 640) ?? widestVariant(pin.photoVariants))?.url ?? pin.photoUrl ?? undefined

/** Today's spans of a place in Europe/Zurich ("09:00–19:00", "11:30–14:00 · 18:00–22:00"), with the place sheet's helper; none without hours or on a day off. */
function todaySpans(pin: PublicMapItem, day: number, locale: Parameters<typeof hoursOfWeek>[2]) {
  const group = hoursOfWeek(pin.weeklyHours, day, locale, '', ' · ').groups.find(candidate => candidate.today)

  return group && !group.closed ? group.value : undefined
}

/**
 * The card's status corner: a frosted block that hugs the top-right corner (the card's own radius clips its outer corner, a soft
 * radius rounds the inner one; no fillets or edge highlight, which drew as dark wedges on 05.11.2026). A tiny uppercase word
 * The state is the big word with a dot ("Open" green and live, "Closed" red) and the small line says until when or when it
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

  return (
    <>
      <span className="sr-only">{view.say}</span>
      <span
        aria-hidden
        className="absolute top-0 right-0 flex flex-col items-end gap-1 rounded-bl-[22px] bg-black/55 py-3 ps-4 pe-[18px] text-white backdrop-blur-md"
        data-status={status.state}
      >
        <span className="flex items-center gap-1.5 text-[19px] leading-6 font-extrabold tracking-[-0.01em]">
          <span className={`size-2 rounded-full ${view.live ? 'bg-[#4ade80] shadow-[0_0_0_3px_rgb(74_222_128/0.25)] motion-safe:animate-pulse' : 'bg-[#f87171]'}`} />
          {view.state}
        </span>
        <span className="text-[12px] leading-4 font-semibold text-white/90 tabular-nums">{view.detail}</span>
      </span>
    </>
  )
}

/** A kind's face: its topic photo, or its icon on a soft tile of the same size and shape (never a place's photo). */
function KindFace({ photo, icon }: { photo: string | undefined, icon: CategoryIcon | null }) {
  const Icon = icon ? categoryIconComponents[icon] : PickupIcon

  return (
    <span className="relative flex size-[58px] items-center justify-center overflow-hidden rounded-[15px] bg-default text-muted">
      {photo
        ? <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" loading="lazy" src={photo} />
        : <Icon aria-hidden size={26} />}
    </span>
  )
}

/**
 * The kind filter, in the look of the story circles of the blog lab: a rounded-square topic photo in a ring and the name under it,
 * "All" first. The chosen one has the warm ring, the others a light one. Toggle buttons (`aria-pressed`) in the shared rail.
 */
function KindFilter({ items, chosen, onChoose }: { items: { id: string, label: string, photo: string | undefined, icon: CategoryIcon | null }[], chosen: string, onChoose: (id: string) => void }) {
  const { t } = useLocale()

  return (
    <Rail label={t('homePage.food.kinds')}>
      {items.map((item) => {
        const pressed = item.id === chosen

        return (
          <li key={item.id} className="shrink-0 snap-start pt-1">
            <button
              aria-pressed={pressed}
              className="group flex w-[72px] flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:focus-ring"
              type="button"
              onClick={() => onChoose(item.id)}
            >
              <span className={`rounded-[20px] p-[2.5px] ${pressed ? 'bg-gradient-to-tr from-[#f4b860] via-accent to-[#a3241a]' : 'bg-separator'}`}>
                <span className="block rounded-[17.5px] bg-background p-[2px]">
                  <KindFace icon={item.icon} photo={item.photo} />
                </span>
              </span>
              <span className="line-clamp-2 text-center text-[12px] leading-4 font-medium group-aria-pressed:font-semibold">{item.label}</span>
            </button>
          </li>
        )
      })}
    </Rail>
  )
}

/**
 * A place card in the look of the blog lab's portrait story: the 4:5 photo, the dark gradient, and at the foot the glass badge with
 * the kind of place, the white serif name, today's hours and the street; the status corner at the top right. It opens the place on the map.
 */
function PlaceCard({ pin, kind, categories, spans, status }: { pin: PublicMapItem, kind: PublicCategory, categories: readonly PublicCategory[], spans: string | undefined, status: HoursStatus | undefined }) {
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
          {(spans || pin.address) && (
            <span className="flex flex-col gap-1 text-[12px] leading-4 font-medium text-white/85">
              {spans && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  <ClockIcon aria-hidden className="shrink-0" size={14} />
                  {spans}
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

/** The filter row (five faces with a name line) and two cards with the badge, the name and the two fact lines. */
function FoodSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4" data-skeleton="food-map">
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 pt-1">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="size-[67px] rounded-[20px]" />
            <Skeleton className="h-3 w-12 rounded-md" />
          </div>
        ))}
      </div>
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

/** The filter (when there are two kinds or more), the rail of the chosen kind's places, and the map button for that kind. */
function FoodPlaces({ selection, categories }: { selection: FoodSelection, categories: readonly PublicCategory[] }) {
  const { t, language, intlLocale } = useLocale()
  const [chosen, setChosen] = useState(ALL)
  // One clock for the whole section, read once, so every card says the same about now.
  const [now] = useState(() => new Date())
  const day = zurichWeekday(now)
  const time = zurichTime(now)
  // A kind that is gone after a new read falls back to All.
  const kind = selection.kinds.find(candidate => candidate.category.id === chosen)
  const places = kind?.places ?? selection.places
  const filters = [
    { id: ALL, label: t('homePage.food.all'), photo: photoUrl(ALL_FOOD_PHOTO), icon: selection.category.icon },
    ...selection.kinds.map(candidate => ({ id: candidate.category.id, label: categoryName(candidate.category, language), photo: photoUrl(topicPhoto(candidate.category.icon)), icon: candidate.category.icon })),
  ]

  return (
    <div className="flex flex-col gap-4">
      {selection.kinds.length > 1 && <KindFilter chosen={kind ? chosen : ALL} items={filters} onChoose={setChosen} />}
      {/* Keyed by the kind, so a new choice starts the rail at its first card. */}
      <Rail key={kind?.category.id ?? ALL} label={kind ? categoryName(kind.category, language) : t('homePage.food.places')}>
        {places.map(pin => (
          <PlaceCard
            key={pin.id}
            categories={categories}
            kind={kindOf(pin, selection)}
            pin={pin}
            spans={todaySpans(pin, day, intlLocale)}
            status={statusAt(pin.weeklyHours, day, time)}
          />
        ))}
      </Rail>
      <Link
        className={`${buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`}
        params={{ lang: language }}
        search={{ category: kind?.category.slug ?? selection.category.slug }}
        to="/$lang/map"
      >
        {t('homePage.food.seeAll')}
      </Link>
    </div>
  )
}

/**
 * "Eat and drink like a local" (owner, 05.11.2026; docs/ux/home-design.md section 4): the five food and drink places added to the
 * map most recently, newest first in the server's order and not sorted by the guest's answers, as tall photo cards in a rail. A row
 * of kinds over it (All, then each sub-category that holds an undated place) filters the rail in the page to that kind's five newest,
 * and "See all on the map" follows the chosen kind. Not drawn when the category is not there or holds no undated place. The pins and categories are the home loader's
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
