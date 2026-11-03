import { createFileRoute, redirect } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { StoriesScreen } from '@/features/stories/components/stories-screen'

interface ContentSearch {
  /** The old tab link; it redirects to the page of that name. */
  tab?: 'comments' | 'reviews'
}

// Content › Stories (M17). Comments (M18) and Reviews (M23) are pages next to it; the old
// `?tab=` links still land on them. The story editor is /store/content/articles/$articleId.
export const Route = createFileRoute('/store/content/')({
  validateSearch: (search: Record<string, unknown>): ContentSearch => ({
    tab:
      search.tab === 'comments' || search.tab === 'reviews'
        ? search.tab
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

  return (
    <SectionFrame
      hasOwnTitle
      page="articles"
      section="content"
      title={t('nav.content')}
    >
      <StoriesScreen />
    </SectionFrame>
  )
}
