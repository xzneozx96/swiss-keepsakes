import { createFileRoute } from '@tanstack/react-router'

import { TourManifestPage } from '@/features/tours/merchant'

export const Route = createFileRoute('/store/bookings/departures/$departureId')(
  {
    component: Page,
  },
)

function Page() {
  return <TourManifestPage departureId={Route.useParams().departureId} />
}
