import { createFileRoute } from "@tanstack/react-router";

import { TourSelectionPage } from "@/features/tours/discovery";

export const Route = createFileRoute("/_guest/tours/$slug_/book")({
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: Page,
});

function Page() {
  return <TourSelectionPage slug={Route.useParams().slug} />;
}
