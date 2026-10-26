import { createFileRoute } from '@tanstack/react-router'

import { TourPaymentPage } from '@/features/tours/booking'

export const Route = createFileRoute(
  '/_guest/account_/bookings/$bookingId_/pay',
)({
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: Page,
})

function Page() {
  return <TourPaymentPage bookingId={Route.useParams().bookingId} />
}
