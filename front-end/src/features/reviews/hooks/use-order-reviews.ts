import type { Review } from '@sk/domain/catalog'
import type { Order } from '@sk/domain/orders'

import { buildReview, reviewId } from '@sk/domain/catalog'

import { pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { useProducts } from '@/features/catalog/api/queries'
import { useCommand } from '@/features/data-client'
import { useDemoNow, useDemoSelector } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useReviews } from '@/features/reviews/api/queries'

export interface ReviewableProduct {
  productId: string
  /** Id the guest's review of this product has, or would have. */
  reviewId: string
  name: string
  /** Variant as ordered (AC15 snapshot). */
  detail: string
  photo?: string
  /** C03 slug, for the link to the posted review. */
  slug?: string
  isReviewed: boolean
}

export interface OrderReviews {
  products: ReviewableProduct[]
  /** Stores the review; returns false when the order can no longer be reviewed. */
  submit: (
    productId: string,
    rating: Review['rating'],
    text: string,
  ) => boolean
}

/**
 * C18 for one order: each product in it once (spec §4.11: one review per product per
 * transaction). Only the signed-in guest's completed orders can be reviewed (AC17).
 */
export function useOrderReviews(order: Order): OrderReviews {
  const { language } = useLocale()
  const { mutate: addReview } = useCommand('reviews', 'addReview', {
    meta: { success: 'review.posted' },
  })
  const storedProducts = useProducts()
  const reviews = useReviews()
  const orders = useOrders()
  const guests = useGuests()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const now = useDemoNow()
  const seen = new Set<string>()
  const products = order.lines
    .filter(line => !seen.has(line.productId) && seen.add(line.productId))
    .map((line) => {
      const id = reviewId(order.id, line.productId)
      const product = storedProducts.find(p => p.id === line.productId)

      return {
        productId: line.productId,
        reviewId: id,
        name: pickText(line.productName, language).text,
        detail: pickText(line.variantLabel, language).text,
        photo: product?.photo,
        slug: product?.slug,
        isReviewed: reviews.some(r => r.id === id),
      }
    })

  const submit: OrderReviews['submit'] = (productId, rating, text) => {
    const latest = orders.find(o => o.id === order.id)
    const guest = guests.find(g => g.id === latest?.guestId)
    const allowed
      = latest?.status === 'completed'
        && latest.guestId === signedInGuestId
        && latest.lines.some(l => l.productId === productId)
        && !reviews.some(r => r.id === reviewId(order.id, productId))

    if (!allowed || !guest)
      return false

    const review = buildReview({
      order: latest,
      productId,
      guest,
      rating,
      text,
      language,
      now,
    })

    addReview({ review, purchase: { kind: 'order', id: order.id } })

    return true
  }

  return { products, submit }
}
