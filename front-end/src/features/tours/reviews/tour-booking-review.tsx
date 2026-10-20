import type { TourBooking } from '@sk/domain/bookings'
import type { Review } from '@sk/domain/catalog'
import type { ReviewableProduct } from '@/features/reviews/hooks/use-order-reviews'

import { Button, toast } from '@heroui/react'
import { bookingBalance } from '@sk/domain/bookings'
import { reviewerName, reviewId } from '@sk/domain/catalog'

import { pickText } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { ReviewItem } from '@/features/catalog/components/review-item'
import { useProductReviews } from '@/features/catalog/hooks/use-product-reviews'
import { useCommand } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { useReviews } from '@/features/reviews/api/queries'
import { WriteReviewSheet } from '@/features/reviews/components/write-review-sheet'
import { useTourRecords } from '@/features/tours/api/queries'
import { useBookingFormat, useGroupText } from '../booking/booking-summary'

/** A completed, settled tour booking opens the same review sheet as a gift order. */
export function TourBookingReview({ booking }: { booking: TourBooking }) {
  const { mutate: addReview } = useCommand('reviews', 'addReview')
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const guests = useGuests()
  const demoReviews = useReviews()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const demoTours = useTourRecords()
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

    addReview({
      review: submitted,
      purchase: { kind: 'booking', id: booking.id },
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
