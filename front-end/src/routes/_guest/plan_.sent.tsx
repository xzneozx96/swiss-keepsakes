import { createFileRoute } from "@tanstack/react-router";

import { AdviceSent } from "@/features/requests/components/advice-sent";

/** C21 sent. The review step opens it with `replace`; `?request=` is the new request's id. */
export const Route = createFileRoute("/_guest/plan_/sent")({
  validateSearch: (search: Record<string, unknown>): { request?: string } =>
    typeof search.request === "string" ? { request: search.request } : {},
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: SentPage,
});

function SentPage() {
  const { request } = Route.useSearch();

  return <AdviceSent requestId={request} />;
}
