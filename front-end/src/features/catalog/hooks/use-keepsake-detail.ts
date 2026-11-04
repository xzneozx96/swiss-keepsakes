import type { CalendarDate } from '@internationalized/date'
import type { PublicKeepsake, PublicLanguage } from '@sk/api-contract'
import type { GiftDetailProps } from '../components/gift-detail'
import type { AvailabilityView } from '../lib/keepsake-page'
import type { Chosen } from '../lib/variant-choice'

import { zurichDate } from '@sk/domain/catalog'
import { formatMoney, formatShortDate } from '@sk/domain/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { fetchAvailability, fetchPickupPoints } from '../api/keepsake'
import { publicKeepsakePage } from '../lib/keepsake-page'
import { isPickupDay } from '../lib/pickup-days'
import { pickupDateField, pickupHighlight, placeOptions } from '../lib/pickup-sheet'
import { settleChoice } from '../lib/variant-choice'
import { useFavourite } from './use-favourites'

/** Price and units change with every order, so they are read again after a few seconds, never served from the page. */
const AVAILABILITY_STALE_MS = 5_000

/** A shop's pickup points change rarely; the page reads them again after a minute. */
const PICKUP_STALE_MS = 60_000

/**
 * C03 Gift detail on the public API: the text, photos and options come from the server-rendered detail; the price and
 * the units are read in the browser only (AC54), with a skeleton, then the price, or an error with a retry. The pickup
 * points are read the same way; the place and the day the guest picks among them are held here, in the page (E7.x reads
 * them). Adding to the cart is a placeholder until release 4: the button does nothing.
 */
export function useKeepsakeDetail(detail: PublicKeepsake, lang: PublicLanguage): Omit<GiftDetailProps, 'onBack'> {
  const { t, intlLocale, preferredLanguage } = useLocale()
  const { saved, toggle } = useFavourite(detail.id)
  const [picked, setPicked] = useState<Chosen>()
  const [quantity, setQuantity] = useState(1)
  // The clock of the day rules: the page's own opening time, in Europe/Zurich (no time zone setting exists).
  const [now] = useState(() => new Date())
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [pickupDate, setPickupDate] = useState<CalendarDate | null>(null)

  const read = useQuery({
    queryKey: [...queryKeys.catalog.keepsakeAvailability, detail.slug, lang],
    queryFn: () => fetchAvailability(detail.slug, lang),
    staleTime: AVAILABILITY_STALE_MS,
    retry: false,
  })
  const availability: AvailabilityView = read.data
    ? { state: 'ready', byVariant: new Map(read.data.items.map(item => [item.variantId, item])) }
    : { state: read.isError && !read.isFetching ? 'failed' : 'loading' }

  const pickupRead = useQuery({
    queryKey: [...queryKeys.catalog.keepsakePickupPoints, detail.slug, lang],
    queryFn: () => fetchPickupPoints(detail.slug, lang),
    staleTime: PICKUP_STALE_MS,
    retry: false,
  })
  const points = pickupRead.data?.items
  // One point is chosen already. Several: none until the guest picks, and the calendar waits for it.
  const point = points?.find(p => p.id === placeId) ?? (points?.length === 1 ? points[0] : undefined)
  const choosePlace = (id: string) => {
    const next = points?.find(p => p.id === id)

    setPlaceId(id)
    // The day stays only when the new point is open that day.
    setPickupDate(date => (date && next && isPickupDay(next.hours, date.toString(), now) ? date : null))
  }
  const chosenDay = point && pickupDate ? t('detail.date.chosen', { date: formatShortDate(pickupDate.toString(), zurichDate(now), intlLocale), place: point.name }) : undefined
  const readState = pickupRead.isError && !pickupRead.isFetching
    ? { error: t('detail.places.failed'), retryLabel: t('routeError.retry'), onRetry: () => void pickupRead.refetch() }
    : 'loading' as const
  const pickupPlace = { label: t('detail.place.label'), value: point?.id ?? null, onChange: choosePlace }

  const { page, variant, choice, soldOut } = publicKeepsakePage({ ...detail, fallback: preferredLanguage !== undefined && !detail.availableLanguages.includes(preferredLanguage) }, { t, intlLocale, availability, chosen: picked })
  const max = Math.max(1, choice?.available ?? 1)
  const count = Math.min(quantity, max)
  const total = choice ? formatMoney((choice.priceRappen * count) / 100, intlLocale) : undefined
  const ready = availability.state === 'ready'

  return {
    ...page,
    // Until the points are read the pickup lines show a skeleton, or the error with a retry (a failed read leaves the highlight out).
    highlights: !points
      ? readState === 'loading'
        ? [{ ...page.highlights[0], body: '', loading: true }, ...page.highlights.slice(1)]
        : page.highlights.slice(1)
      : [{ ...page.highlights[0], body: pickupHighlight(points, t) }, ...page.highlights.slice(1)],
    place: points ? { options: placeOptions(points, t, intlLocale), emptyText: t('detail.places.none') } : { options: [], state: readState },
    sections: points?.length === 0 ? page.sections : { ...page.sections, dateRow: { title: t('detail.date.label'), value: chosenDay, action: t('detail.bar.choose') } },
    note: points?.length === 0 ? t('detail.places.none') : t('detail.date.note'),
    pickup: !points
      ? { place: { ...pickupPlace, state: readState } }
      : points.length === 0
        ? undefined
        : { place: pickupPlace, date: point ? pickupDateField({ point, now, value: pickupDate, onChange: setPickupDate, t, intlLocale }) : undefined },
    favourite: { isSaved: saved, onToggle: toggle, label: t(saved ? 'card.unsave' : 'card.save', { name: page.name }) },
    soldOut: soldOut
      ? { label: t('gifts.soldOut'), message: t('detail.soldOut.message'), actionLabel: t('detail.soldOut.action') }
      : undefined,
    sheet: {
      ...page.sheet,
      addLabel: total ? t('detail.sheet.add', { total }) : t('detail.bar.add'),
      addDisabled: !choice,
    },
    variant: {
      ...variant,
      onChange: (optionId, valueId) => setPicked(settleChoice(variant.options, variant.variants, variant.chosen, optionId, valueId)),
    },
    quantity: {
      label: t('detail.quantity.label'),
      value: count,
      max,
      hint: choice ? t('detail.quantity.available', { count: choice.available }) : undefined,
      onChange: setQuantity,
    },
    bar: {
      price: total ?? '',
      summary: points?.length === 0 ? t('detail.preview.atCheckout') : chosenDay ?? t('detail.bar.choose'),
      chip: t('detail.bar.nothingNow'),
      addLabel: t('detail.bar.add'),
      addDisabled: !ready,
      viewCartLabel: t('detail.bar.viewCart'),
      priceState: ready
        ? undefined
        : availability.state === 'failed'
          ? { error: t('detail.price.failed'), retryLabel: t('routeError.retry'), onRetry: () => void read.refetch() }
          : 'loading',
    },
    onAdd: () => false,
    onSheetOpen: () => {},
    backLabel: t('detail.back'),
  }
}
