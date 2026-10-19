import type { TourBooking } from '../types'
import type { Review } from '@/features/catalog/types'
import type { ReviewableProduct } from '@/features/reviews/hooks/use-order-reviews'

import { Button, toast } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ReviewItem } from '@/features/catalog/components/review-item'

import { useProductReviews } from '@/features/catalog/hooks/use-product-reviews'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { WriteReviewSheet } from '@/features/reviews/components/write-review-sheet'
import { reviewerName, reviewId } from '@/features/reviews/lib/review'
import { pickText } from '@/lib/localized'
import { useBookingFormat, useGroupText } from '../booking/booking-summary'
import { bookingBalance } from '../lib/selectors'

/** A completed, settled tour booking opens the same review sheet as a gift order. */
export function TourBookingReview({ booking }: { booking: TourBooking }) {
  const { update } = useDemoActions()
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const guests = useDemoSelector(s => s.data.guests)
  const demoReviews = useDemoSelector(s => s.data.reviews)
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const demoTours = useDemoSelector(s => s.data.tours)
  const { t, language } = useLocale()
  const { date } = useBookingFormat()
  const groupText = useGroupText()
  const [isOpen, setIsOpen] = useState(false)
  const productId = `tour:${booking.tourId}`
  const id = reviewId(booking.id, productId)
  const tour = demoTours?.tours.find(item => item.id === booking.tourId)
  const review = useProductReviews(productId, { kind: 'tour' }).items.find(
    item => item.id === id,
  )
  const product: ReviewableProduct = {
    productId,
    reviewId: id,
    name: pickText(booking.tourName, language).text,
    detail: `${date(booking.startsAt)} · ${groupText(booking)}`,
    photo: tour?.photos[0],
    isReviewed: Boolean(review),
  }
  const latest = demoTours?.bookings.find(item => item.id === booking.id)
  const eligible
    = latest?.status === 'completed'
      && bookingBalance(latest) === 0
      && latest.guestId === signedInGuestId

  if (!eligible)
    return null

  const submit = (rating: Review['rating'], text: string) => {
    const current = demoTours?.bookings.find(item => item.id === booking.id)
    const guest = guests.find(item => item.id === current?.guestId)

    setIsOpen(false)
    if (
      !current
      || current.status !== 'completed'
      || bookingBalance(current) !== 0
      || current.guestId !== signedInGuestId
      || !guest
      || demoReviews.some(item => item.id === id)
      || !text.trim()
      || text.length > 1000
      || !Number.isInteger(rating)
      || rating < 1
      || rating > 5
    ) {
      toast.danger(t('review.failed'))

      return
    }
    const submitted: Review = {
      id,
      productId,
      guestName: reviewerName(guest.name),
      rating,
      text: { [language]: text.trim() },
      createdAt: demoNow(clockStartedAt).toISOString(),
      purchasedAt: current.startsAt,
    }

    update((snapshot) => {
      const live = snapshot.data.tours?.bookings.find(
        item => item.id === booking.id,
      )

      if (
        live?.status !== 'completed'
        || bookingBalance(live) !== 0
        || live.guestId !== snapshot.data.signedInGuestId
        || snapshot.data.reviews.some(item => item.id === id)
      ) {
        return snapshot
      }

      return {
        ...snapshot,
        data: {
          ...snapshot.data,
          reviews: [...snapshot.data.reviews, submitted],
        },
      }
    })
    toast.success(t('review.posted'))
  }

  return (
    <>
      {review
        ? (
      // Gift 1.13t's borderless grey inset; C16 shows it in its ticket, as C15 does.
            <section
              aria-label={t('review.yours', { name: product.name })}
              className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-4"
            >
              <h3 className="text-sm font-semibold">
                {t('review.yours', { name: product.name })}
              </h3>
              <ReviewItem layout="full" review={review} />
              {tour && (
                <Link
                  className="text-sm font-semibold underline underline-offset-4"
                  params={{ slug: tour.slug }}
                  to="/tours/$slug"
                >
                  {t('tourReviews.viewOnTour')}
                </Link>
              )}
            </section>
          )
        : (
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              onPress={() => setIsOpen(true)}
            >
              {t('review.write')}
            </Button>
          )}
      <WriteReviewSheet
        isOpen={isOpen}
        kind="tour"
        product={product}
        onOpenChange={setIsOpen}
        onSubmit={submit}
      />
    </>
  )
}
