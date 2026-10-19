import type { Product } from '@sk/domain/catalog'
import type { ProductCardProps } from '../components/product-card'

import { fromPrice, isSoldOut, productEarliestPickup, zurichDate } from '@sk/domain/catalog'

import {
  formatMoney,
  formatShortDate,
  numberFormat,
  pickText,
  pluralCategory,
} from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useReviews } from '@/features/reviews/api/queries'
import { useFavourites } from './use-favourites'

export type ProductCardView = ProductCardProps & {
  /** Earliest pickup as YYYY-MM-DD, for sorting and filtering. */
  pickup: string
  soldOut: boolean
}

/** Returns a function that turns a product into the shared gift card's props. */
export function useProductCard(): (product: Product) => ProductCardView {
  const { t, language, intlLocale } = useLocale()
  const now = useDemoNow()
  const today = zurichDate(now)
  const orders = useOrders()
  const demoReviews = useReviews()
  const { isFavourite, toggle } = useFavourites()
  const number = numberFormat(intlLocale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  return (p) => {
    const pickup = productEarliestPickup(p, now)
    const name = pickText(p.name, language)
    const soldOut = isSoldOut(p, orders)
    const reviews = demoReviews.filter(r => r.productId === p.id)
    const average
      = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1)
    const saved = isFavourite(p.id)

    return {
      slug: p.slug,
      name: name.text,
      photo: p.photo,
      fromLabel: t('home.from'),
      price: formatMoney(fromPrice(p) / 100, intlLocale),
      pickupLine: t('home.earliestPickup', {
        date: formatShortDate(pickup, today, intlLocale),
      }),
      badge: p.engraving ? t('home.engravingBadge') : undefined,
      soldOutLabel: soldOut ? t('gifts.soldOut') : undefined,
      languageNote: name.isFallback
        ? t(
            name.language === 'en'
              ? 'gifts.textInEnglish'
              : 'gifts.textInGerman',
          )
        : undefined,
      rating: reviews.length
        ? {
            value: number.format(average),
            count: String(reviews.length),
            label: t(
              pluralCategory(intlLocale, reviews.length) === 'one'
                ? 'card.ratingLabel.one'
                : 'card.ratingLabel.other',
              {
                rating: number.format(average),
                count: reviews.length,
              },
            ),
          }
        : undefined,
      favourite: {
        isSaved: saved,
        onToggle: () => toggle(p.id),
        label: t(saved ? 'card.unsave' : 'card.save', { name: name.text }),
      },
      pickup,
      soldOut,
    }
  }
}
