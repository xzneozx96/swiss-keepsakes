import type { Review } from '@sk/domain/catalog'
import type { Language } from '@/contexts/locale-context'

/** Reviews of gifts and tours, and the shop's replies (C15, C18, M23). */
export interface ReviewsClient {
  reviews: () => Promise<Review[]>
  /** The signed-in guest reviews one product of a completed purchase, once (AC17). */
  addReview: (input: {
    review: Review
    purchase: { kind: 'order' | 'booking', id: string }
  }) => Promise<void>
  /** Adds or replaces the shop's reply, signed by the staff member; the review never changes. */
  replyToReview: (input: {
    id: string
    text: string
    language: Language
  }) => Promise<void>
}
