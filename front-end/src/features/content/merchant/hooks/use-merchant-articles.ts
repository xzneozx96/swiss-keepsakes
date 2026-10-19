import type { Article } from '@sk/domain/content'
import type { StatusTone } from '@/components/status-chip'
import type { Language } from '@/contexts/locale-context'
import type { ArticleFilter } from '@/features/content/merchant/lib/search-params'

import type { DemoData } from '@/features/demo/types'

import { isPublished } from '@sk/domain/catalog'
import { MAX_ARTICLE_LINKS } from '@sk/domain/content'
import { formatDate } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import {
  ARTICLE_FILTERS,

} from '@/features/content/merchant/lib/search-params'
import { useDemoSelector } from '@/features/demo'
import { useArticles, useComments } from '../../api/queries'

export interface ArticleRowProps {
  id: string
  /** Opens the M17 editor. */
  href: string
  title: string
  language: Language
  /** "EN" or "DE". */
  languageCode: string
  photo: string
  author: string
  readTime: string
  status: { tone: StatusTone, text: string }
  /** "Published 02.10.2026" or "Edited 13.10.2026". */
  changed: string
  /** "2 of 6". */
  links: string
  comments: number
  /** "No German version": the story is missing from C19 in that language (R02). */
  missingVersion: string | null
  /** Linked gifts or tours that are unpublished, so C20 hides them (R16). */
  unpublishedLinks: string | null
}

/** A linked gift or tour that guests can't open any more (R16: it drops out of C20). */
export function isLinkHidden(
  data: Pick<DemoData, 'tours' | 'products'>,
  link: Article['links'][number],
): boolean {
  if (link.kind === 'tour')
    return !data.tours?.tours.find(t => t.id === link.id)?.published
  const product = data.products.find(p => p.id === link.id)

  return !product || !isPublished(product)
}

/**
 * M17 list (spec §3.2, §4.11): every language version of every story, drafts included, newest
 * change first, filtered by language. Each row says what guests miss: an absent language
 * version or a link that no longer shows.
 */
export function useMerchantArticles(filter: ArticleFilter[]) {
  const { t, intlLocale } = useLocale()
  const articles = useArticles()
  const comments = useComments()
  const tours = useDemoSelector(s => s.data.tours)
  const products = useDemoSelector(s => s.data.products)
  const date = (iso: string) => formatDate(new Date(iso), intlLocale)

  const all: ArticleRowProps[] = [...articles]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((article) => {
      const published = article.publication.status === 'published'
      const other: Language = article.language === 'en' ? 'de' : 'en'
      const hasOther = articles.some(
        a => a.slug === article.slug && a.language === other,
      )
      const hidden = article.links.filter(l =>
        isLinkHidden({ tours, products }, l),
      ).length

      return {
        id: article.id,
        href: `#/store/content/articles/${encodeURIComponent(article.id)}`,
        title: article.title || t('merchantArticles.untitled'),
        language: article.language,
        languageCode: article.language.toUpperCase(),
        photo: article.photo,
        author: article.author.name,
        readTime: t('merchantArticles.readTime', {
          minutes: article.readMinutes,
        }),
        status: published
          ? { tone: 'success', text: t('merchantArticles.status.published') }
          : { tone: 'neutral', text: t('merchantArticles.status.draft') },
        changed:
          article.publication.status === 'published'
            ? t('merchantArticles.publishedOn', {
                date: date(article.publication.publishedAt),
              })
            : t('merchantArticles.editedOn', { date: date(article.updatedAt) }),
        links: t('merchantArticles.links.count', {
          count: Math.min(article.links.length, MAX_ARTICLE_LINKS),
        }),
        comments: comments.filter(c => c.articleId === article.id).length,
        missingVersion: hasOther
          ? null
          : t(
              other === 'en'
                ? 'merchantArticles.missing.en'
                : 'merchantArticles.missing.de',
            ),
        unpublishedLinks: hidden
          ? t(
              hidden === 1
                ? 'merchantArticles.unpublishedLinks.one'
                : 'merchantArticles.unpublishedLinks.other',
              { count: hidden },
            )
          : null,
      }
    })

  return {
    // Languages add up; none ticked is every article.
    rows: all.filter(row => !filter.length || filter.includes(row.language)),
    filters: ARTICLE_FILTERS.map(id => ({
      id,
      label: t(`merchantContent.lang.${id}`),
      count: all.filter(row => row.language === id).length,
    })),
    total: all.length,
  }
}
