import { createFileRoute } from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import {
  AnalyticsPage,
  ReportsMoneyPage,
} from "@/features/reports/components/report-pages";

// M21 Reports › Money (owner review 15.10.2026).
export const Route = createFileRoute("/store/reports/")({ component: Page });

function Page() {
  const { t } = useLocale();

  return (
    <AnalyticsPage
      withFilters
      page="money"
      question={t("reportPages.question.money")}
      section="reports"
      title={t("reports.title")}
    >
      <ReportsMoneyPage />
    </AnalyticsPage>
  );
}
