import { createFileRoute } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { ContentPage } from '@/features/content/merchant/components/content-page'

// Content › Reviews (M23).
export const Route = createFileRoute('/store/content/reviews')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <SectionFrame
      hasOwnTitle
      page="reviews"
      section="content"
      title={t('nav.content')}
    >
      <ContentPage
        articleFilter={[]}
        tab="reviews"
        onArticleFilterChange={() => {}}
      />
    </SectionFrame>
  )
}
