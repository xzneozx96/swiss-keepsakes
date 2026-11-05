import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { buttonVariants, Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { pinCategoryNames, pinIcon } from '@/features/map/lib/categories'
import { pickVariant, widestVariant } from '@/lib/pick-variant'
import { newestFoodPlaces } from '../lib/food-map'
import { PhotoPoster, POSTER_TITLE } from './photo-poster'
import { SectionHeading } from './section-heading'

const PRESS = 'outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.98]'

/** A card's photo: the 640 px copy (sharp at full width on a phone), else the widest, else the small `photoUrl`; undefined shows the category icon. */
const cardPhoto = (pin: PublicMapItem) => (pickVariant(pin.photoVariants, 640) ?? widestVariant(pin.photoVariants))?.url ?? pin.photoUrl ?? undefined

/** The place's search on the map: its slug, or the map as it is when it has none. */
const placeSearch = (pin: PublicMapItem) => pin.slug ? { place: pin.slug } : {}

/** The newest place as the shared photo poster: the name and, under it, the local tip in at most two lines (the kind of place when there is no tip). */
function Highlight({ pin, categories }: { pin: PublicMapItem, categories: readonly PublicCategory[] }) {
  const { language } = useLocale()
  const other = pin.language === language ? undefined : pin.language
  const kind = pinCategoryNames(pin, categories, language).join(', ')

  return (
    <PhotoPoster wide icon={pinIcon(pin, categories)} slug={pin.slug} src={cardPhoto(pin)}>
      <span className="flex flex-col gap-1">
        <span className={POSTER_TITLE} lang={other}>{pin.title}</span>
        {pin.tip
          ? <span className="line-clamp-2 text-sm leading-5 text-white/85" lang={other}>{pin.tip}</span>
          : kind && <span className="text-sm leading-5 text-white/85">{kind}</span>}
      </span>
    </PhotoPoster>
  )
}

/** A rail card in the guide's caption style: the 4:5 photo on top, the serif name and the kind of place under it. */
function PlaceCard({ pin, categories }: { pin: PublicMapItem, categories: readonly PublicCategory[] }) {
  const { language } = useLocale()
  const other = pin.language === language ? undefined : pin.language
  const kind = pinCategoryNames(pin, categories, language).join(', ')

  return (
    <li className="flex shrink-0 snap-start">
      <Link className={`flex w-[200px] flex-col gap-2.5 rounded-2xl text-start ${PRESS}`} params={{ lang: language }} search={placeSearch(pin)} to="/$lang/map">
        <MapThumb className="aspect-[4/5] w-full rounded-2xl" icon={pinIcon(pin, categories)} iconSize={40} src={cardPhoto(pin)} />
        <span className="flex flex-col gap-0.5 px-0.5">
          <h3 className="font-serif text-card-title text-balance hyphens-auto" lang={other}>{pin.title}</h3>
          {kind && <span className="text-label text-muted">{kind}</span>}
        </span>
      </Link>
    </li>
  )
}

/** The poster box with a title and two tip lines, then two rail cards with a photo box and two caption lines. */
function FoodSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4" data-skeleton="food-map">
      <div className="flex aspect-[4/3] flex-col justify-end gap-2 rounded-2xl bg-surface p-5 shadow-surface">
        <Skeleton className="h-7 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
      <div className="-mx-4 flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex w-[200px] shrink-0 flex-col gap-2.5">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * "Eat and drink like a local" (owner, 05.11.2026; docs/ux/home-design.md section 4): the five food and drink places added to the
 * map most recently, newest first in the server's order and not sorted by the guest's answers. The newest is a photo poster with
 * its tip, the next four a rail of cards, then a button to the guest map filtered to food and drink. One place shows the poster
 * alone. Not drawn when the category is not there or holds no undated place. The pins and categories are the home loader's read
 * of the map list (undefined while it loads, null when it failed). A card opens the map with that place; no price anywhere.
 */
export function FoodMapSection({ pins, categories, onRetry }: { pins: readonly PublicMapItem[] | null | undefined, categories: readonly PublicCategory[] | null | undefined, onRetry: () => void }) {
  const { t, language } = useLocale()
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
            : (
                <div className="flex flex-col gap-4">
                  <Highlight categories={categories} pin={selection.highlight} />
                  {selection.more.length > 0 && (
                    <Rail label={t('homePage.food.more')}>
                      {selection.more.map(pin => <PlaceCard key={pin.id} categories={categories} pin={pin} />)}
                    </Rail>
                  )}
                  <Link
                    className={`${buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`}
                    params={{ lang: language }}
                    search={{ category: selection.category.slug }}
                    to="/$lang/map"
                  >
                    {t('homePage.food.seeAll')}
                  </Link>
                </div>
              )}
    </section>
  )
}
