import { createFileRoute } from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import {
  AnalyticsPage,
  ReportsGuestsPage,
} from "@/features/reports/components/report-pages";

// M21 Reports › Guests (owner review 15.10.2026).
export const Route = createFileRoute("/store/reports/guests")({
  component: Page,
});

function Page() {
  const { t } = useLocale();

  return (
    <AnalyticsPage
      withFilters
      page="guests"
      question={t("reportPages.question.guests")}
      section="reports"
      title={t("reports.title")}
    >
      <ReportsGuestsPage />
    </AnalyticsPage>
  );
}
