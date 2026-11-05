import type { PlacesSearch } from '@/features/places/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { PlacesScreen } from '@/features/places/components/places-screen'
import { parsePlacesSearch } from '@/features/places/lib/search-params'

// Content › Places (N16). The editor is /store/content/places/$placeId. The filters, the search and the page are in the URL.
export const Route = createFileRoute('/store/content/places/')({
  validateSearch: (search: Record<string, unknown>): PlacesSearch => parsePlacesSearch(search),
  component: Page,
})

function Page() {
  const { t } = useLocale()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/store/content/places/' })

  return (
    <SectionFrame
      hasOwnTitle
      page="places"
      section="content"
      title={t('nav.content')}
    >
      <PlacesScreen
        search={search}
        onSearch={patch => void navigate({ search: previous => ({ ...previous, ...patch }), replace: true, resetScroll: false })}
      />
    </SectionFrame>
  )
}
