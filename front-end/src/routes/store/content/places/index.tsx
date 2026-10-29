import { createFileRoute } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { PlacesScreen } from '@/features/places/components/places-screen'

// Content › Places (N16). The editor is /store/content/places/$placeId.
export const Route = createFileRoute('/store/content/places/')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <SectionFrame
      hasOwnTitle
      page="places"
      section="content"
      title={t('nav.content')}
    >
      <PlacesScreen />
    </SectionFrame>
  )
}
