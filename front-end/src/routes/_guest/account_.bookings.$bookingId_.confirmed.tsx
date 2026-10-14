import { createFileRoute } from "@tanstack/react-router";

import { TourConfirmedPage } from "@/features/tours/booking";

export const Route = createFileRoute(
  "/_guest/account_/bookings/$bookingId_/confirmed",
)({
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: Page,
});

function Page() {
  return <TourConfirmedPage bookingId={Route.useParams().bookingId} />;
}
