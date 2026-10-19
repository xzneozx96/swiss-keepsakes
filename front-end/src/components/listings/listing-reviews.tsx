import type { ReviewView } from '@/features/catalog/components/review-item'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { ReviewItem } from '@/features/catalog/components/review-item'
import { ReviewSummary } from '@/features/catalog/components/review-summary'
import { ReviewsSheet } from '@/features/catalog/components/reviews-sheet'

export interface ListingReviewsProps {
  title: string
  count: number
  average: number
  averageText: string
  averageLabel: string
  countLabel: string
  favourite?: { title: string, body: string }
  distribution: { stars: number, share: number }[]
  showAllLabel: string
  showMoreLabel: string
  overallLabel: string
  sheetTitle: string
  closeLabel: string
  rule: string
  empty: string
  items: ReviewView[]
}

const SHOW_MORE_FROM = 140
const REPLY_SHOW_MORE_FROM = 100

export function ListingReviews({
  reviews,
  id,
}: {
  reviews: ListingReviewsProps
  id: string
}) {
  const [reviewsOpen, setReviewsOpen] = useState(false)

  return (
    <>
      <section
        className="flex flex-col gap-3 border-t border-separator py-7"
        id={id}
      >
        {reviews.count === 0
          ? (
              <>
                <h2 className="font-serif text-title">{reviews.title}</h2>
                <p className="text-sm text-muted">{reviews.empty}</p>
              </>
            )
          : (
              <>
                <h2 className="sr-only">{reviews.title}</h2>
                <div className="pb-4">
                  <ReviewSummary
                    average={reviews.average}
                    averageLabel={reviews.averageLabel}
                    averageText={reviews.averageText}
                    countLabel={reviews.countLabel}
                    favourite={reviews.favourite}
                  />
                </div>
                {/* Swipeable review cards, a hairline between them (Airbnb). */}
                <ul className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-6 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {reviews.items.map((r, i) => (
                    <li
                      key={r.id}
                      className={`w-[85%] shrink-0 snap-start ${
                        i < reviews.items.length - 1
                          ? 'border-e border-separator pe-6'
                          : ''
                      }`}
                    >
                      <ReviewItem
                        layout="card"
                        review={r}
                        showMore={
                          // Only when four lines are likely to cut the text off, or three
                          // lines the shop's reply (M23).
                          (r.text.length > SHOW_MORE_FROM
                            || (r.reply?.text.length ?? 0) > REPLY_SHOW_MORE_FROM) && (
                            <button
                              className="w-fit rounded text-start font-semibold underline underline-offset-4 outline-none focus-visible:focus-ring"
                              type="button"
                              onClick={() => setReviewsOpen(true)}
                            >
                              {reviews.showMoreLabel}
                            </button>
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
                <Button
                  fullWidth
                  className="mt-3"
                  size="lg"
                  variant="secondary"
                  onPress={() => setReviewsOpen(true)}
                >
                  {reviews.showAllLabel}
                </Button>
              </>
            )}
        <p className="pt-2 text-center text-xs text-muted">{reviews.rule}</p>
      </section>
      <ReviewsSheet
        closeLabel={reviews.closeLabel}
        isOpen={reviewsOpen}
        items={reviews.items}
        overall={{ label: reviews.overallLabel, rows: reviews.distribution }}
        summary={{
          average: reviews.average,
          averageLabel: reviews.averageLabel,
          averageText: reviews.averageText,
          countLabel: reviews.countLabel,
          favourite: reviews.favourite,
        }}
        title={reviews.sheetTitle}
        onOpenChange={setReviewsOpen}
      />
    </>
  )
}
