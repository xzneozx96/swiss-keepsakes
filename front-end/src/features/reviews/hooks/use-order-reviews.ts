import type { Review } from '@/features/catalog/types'
import type { Order } from '@/features/orders/types'

import { useLocale } from '@/contexts/locale-context'

import { useDemo, useDemoNow } from '@/features/demo'
import { pickText } from '@/lib/localized'
import { buildReview, reviewId } from '../lib/review'

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
  const { state, update } = useDemo()
  const now = useDemoNow()
  const seen = new Set<string>()
  const products = order.lines
    .filter(line => !seen.has(line.productId) && seen.add(line.productId))
    .map((line) => {
      const id = reviewId(order.id, line.productId)
      const product = state.data.products.find(p => p.id === line.productId)

      return {
        productId: line.productId,
        reviewId: id,
        name: pickText(line.productName, language).text,
        detail: pickText(line.variantLabel, language).text,
        photo: product?.photo,
        slug: product?.slug,
        isReviewed: state.data.reviews.some(r => r.id === id),
      }
    })

  const submit: OrderReviews['submit'] = (productId, rating, text) => {
    const current = state.data
    const latest = current.orders.find(o => o.id === order.id)
    const guest = current.guests.find(g => g.id === latest?.guestId)
    const allowed
      = latest?.status === 'completed'
        && latest.guestId === current.signedInGuestId
        && latest.lines.some(l => l.productId === productId)
        && !current.reviews.some(r => r.id === reviewId(order.id, productId))

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

    // Checked again inside the update so a double tap cannot add a second review.
    update(s =>
      s.data.reviews.some(r => r.id === review.id)
        ? s
        : { ...s, data: { ...s.data, reviews: [...s.data.reviews, review] } },
    )

    return true
  }

  return { products, submit }
}
