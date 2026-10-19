import type { Language } from '@/contexts/locale-context'

import { formatDate, pickText } from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { useProducts } from '@/features/catalog/api/queries'
import { useCommand } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'
import { useReviews } from '@/features/reviews/api/queries'
import { useTourRecords } from '@/features/tours/api/queries'
import { avatarUrl } from '@/lib/avatars'
import { publicStaffName } from '../lib/staff'

export const REVIEW_FILTERS = ['notReplied', 'replied'] as const
export type ReviewFilter = (typeof REVIEW_FILTERS)[number]

export interface ReviewRowProps {
  id: string
  guestName: string
  avatar: string
  rating: number
  ratingLabel: string
  date: string
  text: string
  textLanguage: Language
  /** "Text in German" when the review exists only in the other language (AC30). */
  languageNote: string | null
  item: { kind: string, name: string, photo?: string }
  reply: {
    text: string
    language: Language
    /** "Reply from Sonja · 14.10.2026". */
    meta: string
    languageNote: string | null
  } | null
  /** The language a new reply starts in: the language the guest wrote in. */
  replyLanguage: Language
}

/**
 * M23 Reviews (spec §4.11, AC17): gift and tour reviews (one list in demo data; tour reviews
 * carry the `tour:` prefix), newest first. The shop replies or edits its reply; a review is
 * never deleted, so there is no delete action anywhere. Replies show on C03 and C09.
 */
export function useMerchantReviews(filter: ReviewFilter[]) {
  const { t, language, intlLocale } = useLocale()
  const { mutate: replyToReview } = useCommand('reviews', 'replyToReview')
  const reviews = useReviews()
  const products = useProducts()
  const tours = useTourRecords()
  const role = useDemoSelector(s => s.role)
  const note = (lang: Language) =>
    t(lang === 'en' ? 'gifts.textInEnglish' : 'gifts.textInGerman')

  const all: ReviewRowProps[] = [...reviews]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const text = pickText(r.text, language)
      const tourId = r.productId.startsWith('tour:')
        ? r.productId.slice('tour:'.length)
        : null
      const tour = tourId
        ? tours.tours.find(x => x.id === tourId)
        : undefined
      const product = tourId
        ? undefined
        : products.find(p => p.id === r.productId)
      const written = Object.keys(r.text) as Language[]

      return {
        id: r.id,
        guestName: r.guestName,
        avatar: avatarUrl(r.guestName),
        rating: r.rating,
        ratingLabel: t('detail.reviews.stars', { rating: r.rating }),
        date: formatDate(new Date(r.createdAt), intlLocale),
        text: text.text,
        textLanguage: text.language,
        languageNote: text.isFallback ? note(text.language) : null,
        item: {
          kind: t(
            tourId
              ? 'merchantArticles.kind.tour'
              : 'merchantArticles.kind.gift',
          ),
          name: pickText(tour?.name ?? product?.name ?? {}, language).text,
          photo: tour?.photos[0] ?? product?.photo,
        },
        reply: r.reply
          ? {
              text: r.reply.text,
              language: r.reply.language,
              meta: t('merchantReviews.replyFrom', {
                name: r.reply.by,
                date: formatDate(new Date(r.reply.at), intlLocale),
              }),
              languageNote:
                r.reply.language === language ? null : note(r.reply.language),
            }
          : null,
        replyLanguage: written.length === 1 ? written[0] : language,
      }
    })

  const inFilter = (row: ReviewRowProps, id: ReviewFilter) =>
    (id === 'replied') === !!row.reply

  return {
    rows: all.filter(
      row => !filter.length || filter.some(id => inFilter(row, id)),
    ),
    filters: REVIEW_FILTERS.map(id => ({
      id,
      label: t(`merchantReviews.filter.${id}`),
      count: all.filter(row => inFilter(row, id)).length,
    })),
    total: all.length,
    staffName: publicStaffName(role),
    /** Adds or replaces the shop's reply; the review itself never changes. */
    saveReply: (id: string, text: string, replyLanguage: Language) =>
      replyToReview({ id, text, language: replyLanguage }),
  }
}
