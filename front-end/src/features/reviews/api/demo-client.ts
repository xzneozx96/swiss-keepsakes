import type { ReviewsClient } from './client'
import type { DemoStore } from '@/features/demo/store'
import type { DemoData } from '@/features/demo/types'

import { bookingBalance } from '@sk/domain/bookings'
import { publicStaffName } from '@/features/content/merchant/lib/staff'
import { demoNow } from '@/features/demo/clock'
import { updateCollection } from '@/features/demo/store'

/** Checked again on the latest data, so a double tap or a changed purchase adds nothing. */
function canReview(
  data: DemoData,
  { kind, id }: { kind: 'order' | 'booking', id: string },
  productId: string,
): boolean {
  const guestId = data.signedInGuestId

  if (kind === 'booking') {
    const booking = data.tours?.bookings.find(b => b.id === id)

    return booking?.status === 'completed'
      && bookingBalance(booking) === 0
      && booking.guestId === guestId
  }
  const order = data.orders.find(o => o.id === id)

  return order?.status === 'completed'
    && order.guestId === guestId
    && order.lines.some(l => l.productId === productId)
}

export function createReviewsDemoClient(store: DemoStore): ReviewsClient {
  const data = () => store.getState().data

  return {
    reviews: async () => data().reviews,
    addReview: async ({ review, purchase }) => {
      updateCollection(store, 'reviews', (reviews, s) =>
        reviews.some(r => r.id === review.id)
        || !canReview(s.data, purchase, review.productId)
          ? reviews
          : [...reviews, review])
    },
    replyToReview: async ({ id, text, language }) => {
      updateCollection(store, 'reviews', (reviews, s) =>
        reviews.map(r =>
          r.id === id
            ? {
                ...r,
                reply: {
                  text: text.trim(),
                  language,
                  by: publicStaffName(s.role),
                  at: demoNow(s.clockStartedAt).toISOString(),
                },
              }
            : r,
        ))
    },
  }
}
