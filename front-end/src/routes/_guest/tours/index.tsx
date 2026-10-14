import { createFileRoute } from "@tanstack/react-router";

import { TourListPage } from "@/features/tours/discovery";

export const Route = createFileRoute("/_guest/tours/")({
  component: Page,
});

function Page() {
  return <TourListPage />;
}
