import { createFileRoute } from '@tanstack/react-router'

import { MerchantTourBookingPage } from '@/features/tours/merchant'

export const Route = createFileRoute('/store/bookings/$bookingId')({
  component: Page,
})

function Page() {
  return <MerchantTourBookingPage bookingId={Route.useParams().bookingId} />
}
