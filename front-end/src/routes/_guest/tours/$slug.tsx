import { createFileRoute } from "@tanstack/react-router";

import { TourDetailPage } from "@/features/tours/discovery";

export const Route = createFileRoute("/_guest/tours/$slug")({
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  // `?book=true` opens C10, the departure and group sheet, over C09 (2.4-r5).
  validateSearch: (search: Record<string, unknown>): { book?: true } => ({
    book: search.book === true ? true : undefined,
  }),
  component: Page,
});

function Page() {
  return (
    <TourDetailPage
      isBooking={Route.useSearch().book === true}
      slug={Route.useParams().slug}
    />
  );
}
