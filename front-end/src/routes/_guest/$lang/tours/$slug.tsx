import { createFileRoute } from '@tanstack/react-router'

import { TourDetailPage } from '@/features/tours/discovery'
import { parseTourSearch } from '@/features/tours/discovery/tour-tabs'

export const Route = createFileRoute('/_guest/$lang/tours/$slug')({
  ssr: true,
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  validateSearch: parseTourSearch,
  component: Page,
})

function Page() {
  const { slug } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <TourDetailPage
      slug={slug}
      tab={tab}
      // Overview is the default and leaves the URL; a tab change replaces the entry and keeps the scroll the page sets.
      onTabChange={next => void navigate({
        search: next === 'overview' ? {} : { tab: next },
        replace: true,
        resetScroll: false,
      })}
    />
  )
}
