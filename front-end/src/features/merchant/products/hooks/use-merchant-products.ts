import type { Tour } from '@sk/domain/bookings'
import type { LanguageStatus, Product } from '@sk/domain/catalog'

import { availableUnits, fromPrice, giftText, isPublished, languageStatus, missingText, placeText, tourText } from '@sk/domain/catalog'

import { formatMoney, numberFormat, pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces, useProducts, useStoreSubcategories } from '@/features/catalog/api/queries'
import { useCommand } from '@/features/data-client'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useTourRecords } from '@/features/tours/api/queries'

export interface ProductRow {
  id: string
  /** Opens M12 or M13. */
  href: string
  name: string
  photo?: string
  /** "Pocket knives · 3 options" or "2 h". */
  meta: string
  /** A keepsake's sub-category, for the Keepsakes filter; tours have none. */
  subcategoryId?: string
  published: boolean
  /** A tour paused for maintenance: guests cannot book it (R21). */
  maintenance?: boolean
  /** Archived from the row menu: listed under "Archived" only, hidden from guests. */
  archived: boolean
  languages: LanguageStatus
  /** Footer and table facts, in column order: price, availability, commission. */
  facts: { label: string, value: string, isWarning?: boolean }[]
}

export interface PlaceRow {
  id: string
  name: string
  address: string
  hours: string
  instructions: string
  languages: LanguageStatus
}

/** Tours that have not started and are not cancelled, as M05 counts them. */
function upcomingCount(
  tour: Tour,
  departures: { tourId: string, startsAt: string, cancelledAt?: string }[],
  now: Date,
) {
  return departures.filter(
    d =>
      d.tourId === tour.id
      && !d.cancelledAt
      && Date.parse(d.startsAt) > now.getTime(),
  ).length
}

/** M11 rows for the three tabs, in the seed's order (the shop's own order). */
export function useMerchantProducts() {
  const { t, language, intlLocale } = useLocale()
  const now = useDemoNow()
  const products = useProducts()
  const subcategories = useStoreSubcategories()
  const orders = useOrders()
  const pickupPlaces = usePickupPlaces()
  const tourData = useTourRecords()
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const percent = numberFormat(intlLocale, {
    style: 'percent',
    maximumFractionDigits: 1,
  })
  const pick = (text: Partial<Record<'en' | 'de', string>>) =>
    pickText(text, language).text

  const giftRow = (product: Product): ProductRow => {
    const category = subcategories.find(c => c.id === product.subcategoryId)
    const count = product.variants.length
    const available = product.variants.reduce(
      (sum, v) => sum + availableUnits(product, v, orders),
      0,
    )

    return {
      id: product.id,
      href: `/store/products/gifts/${product.id}`,
      name: pick(product.name),
      photo: product.photo,
      subcategoryId: product.subcategoryId,
      meta: [
        category ? pick(category.name) : undefined,
        t(count === 1 ? 'products.options.one' : 'products.options.other', {
          count,
        }),
      ]
        .filter(Boolean)
        .join(' · '),
      published: isPublished(product),
      archived: !!product.archivedAt,
      languages: languageStatus(missingText(giftText(product))),
      facts: [
        { label: t('products.fact.from'), value: money(fromPrice(product)) },
        {
          label: t('products.fact.available'),
          value: available > 0 ? String(available) : t('products.soldOut'),
          isWarning: available === 0,
        },
        {
          label: t('products.fact.commission'),
          value: percent.format(product.commissionRate),
        },
      ],
    }
  }

  const tourRow = (tour: Tour): ProductRow => ({
    id: tour.id,
    href: `/store/products/tours/${tour.id}`,
    name: pick(tour.name),
    photo: tour.photos[0],
    meta: t('products.duration', {
      hours: numberFormat(intlLocale, {
        maximumFractionDigits: 1,
      }).format(tour.durationMinutes / 60),
    }),
    published: tour.published,
    maintenance: !!tour.maintenance?.active,
    archived: !!tour.archivedAt,
    languages: languageStatus(missingText(tourText(tour))),
    facts: [
      { label: t('products.fact.adults'), value: money(tour.adultPrice) },
      {
        label: t('products.fact.upcoming'),
        value: String(upcomingCount(tour, tourData.departures, now)),
      },
      {
        label: t('products.fact.commission'),
        value: percent.format(tour.commissionRate),
      },
    ],
  })

  const placeRow = (place: (typeof pickupPlaces)[number]): PlaceRow => ({
    id: place.id,
    name: pick(place.name),
    address: place.address,
    hours: pick(place.openingHours),
    instructions: pick(place.instructions),
    languages: languageStatus(missingText(placeText(place))),
  })

  return {
    gifts: products.map(giftRow),
    tours: tourData.tours.map(tourRow),
    places: pickupPlaces.map(placeRow),
  }
}

export type ProductKind = 'gift' | 'tour'

/**
 * Archive and restore from the M11 row menu (owner, 15.10.2026). Archiving hides the gift or
 * tour from guests (a tour is also unpublished) and moves it under "Archived"; orders and
 * bookings that point at it are kept. Restoring brings it back as a draft to publish again.
 */
export function useProductArchive() {
  const { mutate: setProductArchived } = useCommand('catalog', 'setProductArchived')
  const { mutate: setTourArchived } = useCommand('tours', 'setTourArchived')

  const set = (kind: ProductKind, id: string, archived: boolean) =>
    kind === 'gift'
      ? setProductArchived({ id, archived })
      : setTourArchived({ id, archived })

  return {
    archive: (kind: ProductKind, id: string) => set(kind, id, true),
    restore: (kind: ProductKind, id: string) => set(kind, id, false),
  }
}
