import type { ReviewView } from '../components/review-item'

import { zurichDate } from '@sk/domain/catalog'

import { dateTimeFormat, formatShortDate, numberFormat, pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { useDemoNow } from '@/features/demo'
import { useReviews } from '@/features/reviews/api/queries'
import { avatarUrl } from '@/lib/avatars'

/**
 * "Guest favourite" (Airbnb pattern, UX proposal): at least two reviews averaging 4.5 or
 * more. Reviews only come from completed purchases (AC17), so the badge is earned.
 */
const FAVOURITE_MIN_REVIEWS = 2
const FAVOURITE_MIN_AVERAGE = 4.5

export interface ProductReviews {
  count: number
  average: number
  /** "4.5" in the locale's number format. */
  averageText: string
  /** "4.5 out of 5 stars". */
  averageLabel: string
  /** "2 reviews". */
  countLabel: string
  isFavourite: boolean
  /** Share of reviews per star, 5 down to 1, as 0–1 (the "Overall rating" bars). */
  distribution: { stars: number, share: number }[]
  items: ReviewView[]
}

const DAY = 86_400_000

/**
 * Airbnb-style review date: "yesterday", "3 days ago", "2 weeks ago", then the month
 * and year ("September 2026") once it is more than four weeks old.
 */
function reviewDate(at: Date, now: Date, locale: string): string {
  // Calendar days in Zurich, so last night's review reads "yesterday", not "today".
  const days = Math.round(
    (Date.parse(`${zurichDate(now)}T12:00:00Z`)
      - Date.parse(`${zurichDate(at)}T12:00:00Z`))
    / DAY,
  )
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (days < 7)
    return relative.format(-Math.max(days, 0), 'day')
  if (days < 29)
    return relative.format(-Math.floor(days / 7), 'week')

  return dateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(at)
}

/** A product's verified-purchase reviews, newest first, formatted for display. */
export function useProductReviews(
  productId: string | undefined,
  options: { kind: 'gift' | 'tour' } = { kind: 'gift' },
): ProductReviews {
  const { t, language, intlLocale } = useLocale()
  const demoReviews = useReviews()
  const now = useDemoNow()

  const reviews = demoReviews
    .filter(r => r.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const count = reviews.length
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / (count || 1)
  const averageText = numberFormat(intlLocale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average)
  const plural
    = new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'

  return {
    count,
    average,
    averageText,
    averageLabel: t('detail.reviews.stars', { rating: averageText }),
    countLabel: t(`detail.reviewsCount.${plural}`, { count }),
    isFavourite:
      count >= FAVOURITE_MIN_REVIEWS && average >= FAVOURITE_MIN_AVERAGE,
    distribution: [5, 4, 3, 2, 1].map(stars => ({
      stars,
      share: reviews.filter(r => r.rating === stars).length / (count || 1),
    })),
    items: reviews.map((r) => {
      const text = pickText(r.text, language)

      return {
        id: r.id,
        guestName: r.guestName,
        avatar: avatarUrl(r.guestName),
        // The latest completed order of this gift by the reviewer (AC17: reviews only
        // after completion), which says more than "verified purchase".
        verifiedLabel: t(
          options.kind === 'tour'
            ? 'tours.reviews.attended'
            : 'detail.reviews.purchased',
          {
            date: formatShortDate(
              zurichDate(new Date(r.purchasedAt)),
              zurichDate(now),
              intlLocale,
            ),
          },
        ),
        rating: r.rating,
        ratingLabel: t('detail.reviews.stars', { rating: r.rating }),
        date: reviewDate(new Date(r.createdAt), now, intlLocale),
        text: text.text,
        languageNote: text.isFallback
          ? t(
              text.language === 'en'
                ? 'gifts.textInEnglish'
                : 'gifts.textInGerman',
            )
          : undefined,
        photos: r.photos?.length
          ? {
              slugs: r.photos,
              labels: {
                gallery: t('gallery.reviewLabel', { name: r.guestName }),
                photo: (n, total) => t('gallery.photo', { n, count: total }),
                previous: t('gallery.previous'),
                next: t('gallery.next'),
                close: t('gallery.close'),
              },
            }
          : undefined,
        // The shop's reply from M23, in the language it was written in (AC30 note otherwise).
        reply: r.reply
          ? {
              title: t('reviewReply.from', { name: r.reply.by }),
              date: reviewDate(new Date(r.reply.at), now, intlLocale),
              text: r.reply.text,
              lang: r.reply.language,
              languageNote:
                r.reply.language === language
                  ? undefined
                  : t(
                      r.reply.language === 'en'
                        ? 'gifts.textInEnglish'
                        : 'gifts.textInGerman',
                    ),
            }
          : undefined,
      }
    }),
  }
}
