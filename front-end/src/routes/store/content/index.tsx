import type { ArticleFilter } from '@/features/content/merchant/lib/search-params'

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { ContentPage } from '@/features/content/merchant/components/content-page'
import {
  ARTICLE_FILTERS,

} from '@/features/content/merchant/lib/search-params'

interface ContentSearch {
  /** Articles in the ticked languages; absent = both. */
  lang?: ArticleFilter[]
  /** The old tab link; it redirects to the page of that name. */
  tab?: 'comments' | 'reviews'
}

// Content › Articles (M17). Comments (M18) and Reviews (M23) are pages next to it; the old
// `?tab=` links still land on them. The M17 editor is /store/content/articles/$articleId.
export const Route = createFileRoute('/store/content/')({
  validateSearch: (search: Record<string, unknown>): ContentSearch => ({
    tab:
      search.tab === 'comments' || search.tab === 'reviews'
        ? search.tab
        : undefined,
    lang: Array.isArray(search.lang)
      ? ARTICLE_FILTERS.filter(id => (search.lang as unknown[]).includes(id))
      : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.tab) {
      throw redirect({ to: `/store/content/${search.tab}`, replace: true })
    }
  },
  component: ContentRoute,
})

function ContentRoute() {
  const { t } = useLocale()
  const { lang = [] } = Route.useSearch()
  const navigate = useNavigate({ from: '/store/content/' })

  return (
    <SectionFrame
      hasOwnTitle
      page="articles"
      section="content"
      title={t('nav.content')}
    >
      <ContentPage
        articleFilter={lang}
        tab="articles"
        onArticleFilterChange={next =>
          void navigate({
            search: s => ({ ...s, lang: next.length ? next : undefined }),
            replace: true,
            resetScroll: false,
          })}
      />
    </SectionFrame>
  )
}
