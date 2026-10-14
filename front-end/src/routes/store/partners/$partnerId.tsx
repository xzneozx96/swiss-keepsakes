import { Skeleton } from "@heroui/react";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { PartnersIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { PartnerDetail } from "@/features/merchant/partners/components/partner-detail";
import { usePartnerDetail } from "@/features/merchant/partners/hooks/use-partner-detail";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

// M16 Partner detail (steps 5.3–5.5). M15 cards and table rows link here.
export const Route = createFileRoute("/store/partners/$partnerId")({
  component: PartnerDetailPage,
});

function PartnerDetailPage() {
  const { partnerId } = Route.useParams();
  const { t } = useLocale();
  const isLoading = useSimulatedLoading();
  const view = usePartnerDetail(partnerId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 lg:gap-6">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="h-8 w-1/2 rounded-lg" />
        <Skeleton className="h-52 rounded-3xl sm:h-28" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (!view) {
    return (
      <EmptyState
        action={{ label: t("merchantPartners.back"), to: "/store/partners" }}
        icon={PartnersIcon}
        message={t("partnerDetail.notFound")}
      />
    );
  }

  return <PartnerDetail view={view} />;
}
