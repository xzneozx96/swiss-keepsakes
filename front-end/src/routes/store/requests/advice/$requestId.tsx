import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { DetailSkeleton } from "@/components/layout/detail-skeletons";
import { RequestsIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { AdviceRequestDetail } from "@/features/requests/merchant/components/advice-request-detail";
import { useAdviceRequest } from "@/features/requests/merchant/hooks/use-advice-request";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

// M19 advice request detail (step 4.14): opening it marks the request read. The M19 cards,
// table rows and the N16 email link here.
export const Route = createFileRoute("/store/requests/advice/$requestId")({
  component: AdviceRequestPage,
});

function AdviceRequestPage() {
  const { requestId } = Route.useParams();
  const { t } = useLocale();
  const isLoading = useSimulatedLoading();
  const view = useAdviceRequest(requestId);

  if (isLoading) {
    return <DetailSkeleton chips={1} side={1} />;
  }

  if (!view) {
    return (
      <EmptyState
        action={{ label: t("adviceRequest.back"), to: "/store/requests" }}
        icon={RequestsIcon}
        message={t("adviceRequest.notFound")}
      />
    );
  }

  return <AdviceRequestDetail view={view} />;
}
