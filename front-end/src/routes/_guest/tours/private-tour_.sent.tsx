import { createFileRoute } from "@tanstack/react-router";

import { PrivateTourSent } from "@/features/requests/components/private-tour-sent";

/** C22 sent. The form opens it with `replace`; `?request=` is the new request's id. */
export const Route = createFileRoute("/_guest/tours/private-tour_/sent")({
  validateSearch: (search: Record<string, unknown>): { request?: string } =>
    typeof search.request === "string" ? { request: search.request } : {},
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: SentPage,
});

function SentPage() {
  const { request } = Route.useSearch();

  return <PrivateTourSent requestId={request} />;
}
