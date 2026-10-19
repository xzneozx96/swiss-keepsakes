import type { PhotoGalleryLabels } from '@/components/photo-gallery'

import { useState } from 'react'

import { StatusSuccessIcon } from '@/components/icons'
import { PhotoViewer } from '@/components/photo-gallery'
import { Stars } from '@/components/rating'
import { photoUrl } from '@/lib/photos'

export interface ReviewView {
  id: string
  guestName: string
  /** Avatar image URL. */
  avatar: string
  verifiedLabel: string
  rating: number
  ratingLabel: string
  date: string
  text: string
  languageNote?: string
  /** Guest photos: thumbnails that open the fullscreen viewer. */
  photos?: { slugs: string[], labels: PhotoGalleryLabels }
  /** The shop's public reply (M23), in the language it was written in. */
  reply?: {
    /** "Reply from Sonja". */
    title: string
    date: string
    text: string
    lang: string
    /** "Text in German" when the reply is not in the guest's language (AC30). */
    languageNote?: string
  }
}

/** The shop's reply under a review, indented like a reply on C20; clamped on the swipe card. */
function ShopReply({
  reply,
  clamp = false,
}: {
  reply: NonNullable<ReviewView['reply']>
  clamp?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 border-s border-separator ps-4">
      <span className="text-sm font-semibold">{reply.title}</span>
      <span className="text-xs text-muted">
        {reply.date}
        {reply.languageNote && ` · ${reply.languageNote}`}
      </span>
      <p className={`text-sm ${clamp ? 'line-clamp-3' : ''}`} lang={reply.lang}>
        {reply.text}
      </p>
    </div>
  )
}

/** Guest photos under a review: square thumbnails, tap to view fullscreen. */
function ReviewPhotos({
  photos,
}: {
  photos: NonNullable<ReviewView['photos']>
}) {
  const [viewerAt, setViewerAt] = useState<number | null>(null)
  const count = photos.slugs.length

  return (
    <>
      <ul className="flex gap-2">
        {photos.slugs.map((slug, i) => (
          <li key={slug}>
            <button
              aria-label={photos.labels.photo(i + 1, count)}
              className="block size-20 overflow-hidden rounded-xl bg-surface-secondary outline-none transition-transform focus-visible:focus-ring active:scale-95"
              type="button"
              onClick={() => setViewerAt(i)}
            >
              <img
                alt=""
                className="size-full object-cover"
                decoding="async"
                loading="lazy"
                src={photoUrl(slug)}
              />
            </button>
          </li>
        ))}
      </ul>
      <PhotoViewer
        labels={photos.labels}
        photos={photos.slugs}
        startAt={viewerAt}
        onClose={() => setViewerAt(null)}
      />
    </>
  )
}

function Reviewer({ review }: { review: ReviewView }) {
  return (
    <div className="flex items-center gap-3">
      <img
        alt=""
        className="size-12 shrink-0 rounded-full bg-surface-secondary object-cover"
        decoding="async"
        loading="lazy"
        src={review.avatar}
      />
      <div className="flex flex-col">
        <span className="font-semibold">{review.guestName}</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          <StatusSuccessIcon aria-hidden size={14} />
          {review.verifiedLabel}
        </span>
      </div>
    </div>
  )
}

function RatingLine({ review }: { review: ReviewView }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Stars label={review.ratingLabel} rating={review.rating} />
      <span aria-hidden>·</span>
      <span className="font-semibold">{review.date}</span>
    </div>
  )
}

/**
 * One verified-purchase review, two layouts from the Airbnb references:
 * "card" for the swipeable row on the detail page (stars and date, text clamped to
 * four lines with "Show more", reviewer at the bottom; screen 42) and "full" for the
 * review list (reviewer first, then stars and date, then the whole text; screen 83).
 */
export function ReviewItem({
  review,
  layout,
  showMore,
}: {
  review: ReviewView
  layout: 'card' | 'full'
  /** Card only: link to the full list, e.g. "Show more". */
  showMore?: React.ReactNode
}) {
  if (layout === 'full') {
    return (
      <article className="flex flex-col gap-3">
        <Reviewer review={review} />
        <RatingLine review={review} />
        {review.languageNote && (
          <span className="text-xs text-muted">{review.languageNote}</span>
        )}
        <p className="text-body">{review.text}</p>
        {review.photos && <ReviewPhotos photos={review.photos} />}
        {review.reply && <ShopReply reply={review.reply} />}
      </article>
    )
  }

  return (
    <article className="flex h-full flex-col gap-3">
      <RatingLine review={review} />
      {review.languageNote && (
        <span className="text-xs text-muted">{review.languageNote}</span>
      )}
      <p className="line-clamp-4 text-body">{review.text}</p>
      {review.reply && <ShopReply clamp reply={review.reply} />}
      {showMore}
      {review.photos && <ReviewPhotos photos={review.photos} />}
      <div className="mt-auto pt-2">
        <Reviewer review={review} />
      </div>
    </article>
  )
}
