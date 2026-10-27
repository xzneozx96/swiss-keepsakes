import { createFileRoute } from '@tanstack/react-router'

import { TourDetailPage } from '@/features/tours/discovery'

export const Route = createFileRoute('/_guest/$lang/tours/$slug')({
  ssr: true,
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: Page,
})

function Page() {
  return <TourDetailPage slug={Route.useParams().slug} />
}
