import { createFileRoute } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { ContentPage } from '@/features/content/merchant/components/content-page'

// Content › Comments (M18).
export const Route = createFileRoute('/store/content/comments')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <SectionFrame
      hasOwnTitle
      page="comments"
      section="content"
      title={t('nav.content')}
    >
      <ContentPage
        articleFilter={[]}
        tab="comments"
        onArticleFilterChange={() => {}}
      />
    </SectionFrame>
  )
}
