import { createFileRoute } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { CategoriesScreen } from '@/features/categories/components/categories-screen'

// Content › Categories (N23).
export const Route = createFileRoute('/store/content/categories')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <SectionFrame
      hasOwnTitle
      page="categories"
      section="content"
      title={t('nav.content')}
    >
      <CategoriesScreen />
    </SectionFrame>
  )
}
