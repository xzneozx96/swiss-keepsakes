import { createFileRoute } from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import { TourTodayQueue } from "@/features/tours/merchant";
import { MerchantToday } from "@/features/merchant/today/components/merchant-today";
import { OverviewAnalytics } from "@/features/merchant/today/components/overview-analytics";
import { useMerchantToday } from "@/features/merchant/today/hooks/use-merchant-today";
import { useOverviewAnalytics } from "@/features/merchant/today/hooks/use-overview-analytics";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

// M02 Overview: the merchant's first screen, for Owner and Manager alike. Today's work on
// top, analytics for a chosen period below (step 1.9s).
export const Route = createFileRoute("/store/")({ component: OverviewPage });

function OverviewPage() {
  const { t } = useLocale();
  const today = useMerchantToday();
  const analytics = useOverviewAnalytics();
  const isLoading = useSimulatedLoading();

  return (
    <MerchantToday
      {...today}
      analytics={<OverviewAnalytics {...analytics} />}
      attentionHeading={t("merchantToday.attention")}
      empty={{
        message: t("merchantToday.empty"),
        actionLabel: t("merchantToday.empty.action"),
      }}
      isLoading={isLoading}
      tasksHeading={t("merchantToday.tasksHeading")}
      title={t("merchantToday.title")}
      todayHeading={t("overview.today")}
      tours={<TourTodayQueue />}
    />
  );
}
