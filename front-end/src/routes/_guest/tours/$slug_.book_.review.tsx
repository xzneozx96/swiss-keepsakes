import { createFileRoute } from '@tanstack/react-router'

import { TourReviewPage } from '@/features/tours/booking'

export const Route = createFileRoute('/_guest/tours/$slug_/book_/review')({
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: Page,
})

function Page() {
  return <TourReviewPage slug={Route.useParams().slug} />
}
