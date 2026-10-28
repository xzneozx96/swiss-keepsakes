import type { Tour } from '@sk/domain/bookings'
import type { Article, ArticleComment } from '@sk/domain/content'
import type { ProductCardProps } from '@/features/catalog/components/product-card'

import { isPublished } from '@sk/domain/catalog'
import { MAX_ARTICLE_LINKS, MAX_RELATED_STORIES } from '@sk/domain/content'

import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { useProducts } from '@/features/catalog/api/queries'
import { useProductCard } from '@/features/catalog/hooks/use-product-card'
import { useCommand } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'
import { useTourRecords } from '@/features/tours/api/queries'
import { avatarUrl } from '@/lib/avatars'
import { formatZurichInstant } from '@/lib/shop-dates'
import { useArticles, useComments } from '../api/queries'
import { publishedArticles } from '../lib/articles'
import { fixtureArticles } from '../lib/story-versions'

const WHITESPACE_RUN = /\s+/

export interface CommentView {
  id: string
  name: string
  avatar: string
  isShop: boolean
  date: string
  text: string
  replies: CommentView[]
}

export interface ArticleView {
  article: Article
  /** Set when the guest's language has no version and the other one is shown (R02, D6). */
  onlyInOtherLanguage: boolean
  meta: string
  authorAvatar: string
  /** Linked gifts and tours in the merchant's order (R16); unpublished ones drop out. */
  links: (
    { kind: 'gift', card: ProductCardProps } | { kind: 'tour', tour: Tour }
  )[]
  /** "More to discover" (R18): the shop's picks, else the newest others in this language. */
  related: { slug: string, photo: string, title: string, meta: string }[]
  comments: CommentView[]
  commentCount: number
  /** The signed-in guest's display name, as their comments show it. */
  commenterName: string | null
  addComment: (text: string, parentId?: string) => string | null
}

/** "Anna Keller" → "Anna K.", as guest names show on reviews. */
function shortName(name: string) {
  const [first, ...rest] = name.trim().split(WHITESPACE_RUN)

  return rest.length ? `${first} ${rest.at(-1)![0]}.` : first
}

const published = (a: Article) => a.publication.status === 'published'

/**
 * C20 data (spec §4.11): the story in the guest's language, or the other language's version
 * with a notice; visible comment threads, most recently active first, replies oldest first; the linked gifts and
 * tours in the shop's order (R16); and posting, which needs a signed-in guest (AC16) and shows at once (D11).
 */
export function useArticle(slug: string): ArticleView | null {
  const { t, language, intlLocale } = useLocale()
  const { mutate: postComment } = useCommand('content', 'addComment')
  const demoArticles = useArticles()
  const demoComments = useComments()
  const demoGuests = useGuests()
  const products = useProducts()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const demoTours = useTourRecords()
  const toCard = useProductCard()

  // Fixture stories (outside production) are not in the browser store; only this lookup sees them, so lists and search stay as they are.
  const versions = [...demoArticles.filter(a => a.slug === slug && published(a)), ...fixtureArticles(slug)]
  const article = versions.find(a => a.language === language) ?? versions[0]

  if (!article)
    return null

  const guests = new Map(demoGuests.map(g => [g.id, g]))
  // The shop's calendar day (Zurich), so the server's HTML and every reader's browser print the same date, in any time zone.
  const date = (iso: string) => formatZurichInstant(iso, intlLocale)
  const toView = (c: ArticleComment): CommentView => {
    const isShop = c.author.kind === 'shop'
    const name
      = c.author.kind === 'shop'
        ? c.author.staffName
        : shortName(guests.get(c.author.guestId)?.name ?? 'Guest')

    return {
      id: c.id,
      name,
      avatar: avatarUrl(name),
      isShop,
      date: date(c.createdAt),
      text: c.text,
      replies: [],
    }
  }

  const shown = demoComments.filter(
    c => c.articleId === article.id && !c.hidden,
  )
  const shownIds = new Set(shown.map(c => c.id))
  // A reply hides with its comment (M18 hides a whole thread), so it is not counted either.
  const visible = shown
    .filter(c => !c.parentId || shownIds.has(c.parentId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  // Threads by latest activity, so a new comment or reply shows in the first three (C20).
  const lastActivity = (c: ArticleComment) =>
    visible
      .filter(r => r.id === c.id || r.parentId === c.id)
      .reduce((latest, r) => (r.createdAt > latest ? r.createdAt : latest), '')
  const comments = visible
    .filter(c => !c.parentId)
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
    .map(c => ({
      ...toView(c),
      replies: visible.filter(r => r.parentId === c.id).map(toView),
    }))

  const relatedStories = () => {
    const others = publishedArticles(demoArticles, language).filter(
      a => a.slug !== article.slug,
    )
    const picked = article.related.flatMap(
      slug => others.find(a => a.slug === slug) ?? [],
    )

    return (picked.length ? picked : others)
      .slice(0, MAX_RELATED_STORIES)
      .map(a => ({
        slug: a.slug,
        photo: a.photo,
        title: a.title,
        meta: t('home.stories.read', { minutes: a.readMinutes }),
      }))
  }

  const guestId = signedInGuestId
  const guest = guestId ? guests.get(guestId) : undefined
  const publishedAt
    = article.publication.status === 'published'
      ? article.publication.publishedAt
      : article.updatedAt

  return {
    article,
    onlyInOtherLanguage: article.language !== language,
    meta: t('article.meta', {
      date: date(publishedAt),
      minutes: article.readMinutes,
    }),
    authorAvatar: avatarUrl(article.author.name),
    links: article.links
      .slice(0, MAX_ARTICLE_LINKS)
      .flatMap<ArticleView['links'][number]>((link) => {
        if (link.kind === 'tour') {
          const tour = demoTours?.tours.find(x => x.id === link.id)

          return tour?.published ? [{ kind: 'tour' as const, tour }] : []
        }
        const product = products.find(p => p.id === link.id)

        return product && isPublished(product)
          ? [{ kind: 'gift' as const, card: toCard(product) }]
          : []
      }),
    related: relatedStories(),
    comments,
    commentCount: visible.length,
    commenterName: guest ? shortName(guest.name) : null,
    addComment: (text, parentId) => {
      if (!guestId)
        return null
      const id = `c-${Date.now().toString(36)}`

      postComment({ id, articleId: article.id, text, parentId })

      return id
    },
  }
}
