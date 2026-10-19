import type { ReviewableProduct } from '../hooks/use-order-reviews'
import type { Order } from '@/features/orders/types'

import { Button, toast } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'

import { ReviewItem } from '@/features/catalog/components/review-item'

import { useProductReviews } from '@/features/catalog/hooks/use-product-reviews'
import { useOrderReviews } from '../hooks/use-order-reviews'
import { WriteReviewSheet } from './write-review-sheet'

/**
 * The review slot on C15 for a completed order (AC17): "Write a review" per product,
 * replaced by the guest's review once it is posted (state: already reviewed).
 */
export function OrderReviews({ order }: { order: Order }) {
  const { t } = useLocale()
  const { products, submit } = useOrderReviews(order)
  const [writing, setWriting] = useState<ReviewableProduct>()
  const [isOpen, setIsOpen] = useState(false)
  const named = products.length > 1

  return (
    <>
      {products.map(product =>
        product.isReviewed
          ? (
              <PostedReview key={product.productId} product={product} />
            )
          : (
              <Button
                key={product.productId}
                fullWidth
                size="lg"
                variant="secondary"
                onPress={() => {
                  setWriting(product)
                  setIsOpen(true)
                }}
              >
                {named
                  ? t('review.writeFor', { name: product.name })
                  : t('review.write')}
              </Button>
            ),
      )}
      <WriteReviewSheet
        isOpen={isOpen}
        product={writing}
        onOpenChange={setIsOpen}
        onSubmit={(rating, text) => {
          if (!writing)
            return
          setIsOpen(false)
          if (submit(writing.productId, rating, text)) {
            toast.success(t('review.posted'))
          }
          else {
            toast.danger(t('review.failed'))
          }
        }}
      />
    </>
  )
}

/**
 * The guest's own review, as it reads on the gift page, with a link there. It sits inside the
 * C15 ticket card, so it is a borderless inset rather than a card of its own.
 */
function PostedReview({ product }: { product: ReviewableProduct }) {
  const { t } = useLocale()
  const review = useProductReviews(product.productId).items.find(
    r => r.id === product.reviewId,
  )

  if (!review)
    return null

  return (
    <section
      aria-label={t('review.yours', { name: product.name })}
      className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-4"
    >
      <h3 className="text-sm font-semibold">
        {t('review.yours', { name: product.name })}
      </h3>
      <ReviewItem layout="full" review={review} />
      {product.slug && (
        <Link
          className="text-sm font-semibold underline underline-offset-4"
          params={{ slug: product.slug }}
          to="/gifts/$slug"
        >
          {t('review.viewOnGift')}
        </Link>
      )}
    </section>
  )
}
