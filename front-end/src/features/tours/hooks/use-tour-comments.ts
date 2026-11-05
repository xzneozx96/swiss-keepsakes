import type { ArticleComment } from '@sk/domain/content'

import type { Language } from '@/contexts/locale-context'
import { reviewerName } from '@sk/domain/catalog'
import { dateTimeFormat } from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { avatarUrl } from '@/lib/avatars'
import { tourCommentSeed } from '../lucerne/comments'

export interface TourCommentView {
  id: string
  name: string
  avatar: string
  date: string
  text: string
  /** Under the comment, indented: the shop's answer or a guest's reply (one level). */
  replies: { id: string, name: string, isShop: boolean, date: string, text: string }[]
}

/**
 * The comments on a tour in the current language (or the other one, with its `lang`, when there are none), newest first, each with its replies. They are
 * demo data (features/tours/lucerne/comments.ts); a tour without a set has none.
 */
export function useTourComments(tourId: string): { comments: TourCommentView[], lang: Language } {
  const { language, intlLocale } = useLocale()
  const guests = useGuests()
  const day = dateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' })
  const setOf = (lang: Language) => tourCommentSeed.filter(c => c.articleId === `${tourId}-${lang}` && !c.hidden)
  // A tour with no comments in the guest's language shows the other language's, marked with its language.
  const other: Language = language === 'en' ? 'de' : 'en'
  const lang = setOf(language).length > 0 ? language : other
  const own = setOf(lang)
  const name = ({ author }: ArticleComment) => {
    if (author.kind === 'shop')
      return author.staffName

    return reviewerName(guests.find(g => g.id === author.guestId)?.name ?? 'Guest')
  }

  const comments = own
    .filter(c => !c.parentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(c => ({
      id: c.id,
      name: name(c),
      avatar: avatarUrl(name(c)),
      date: day.format(new Date(c.createdAt)),
      text: c.text,
      replies: own
        .filter(r => r.parentId === c.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(r => ({ id: r.id, name: name(r), isShop: r.author.kind === 'shop', date: day.format(new Date(r.createdAt)), text: r.text })),
    }))

  return { comments, lang }
}
