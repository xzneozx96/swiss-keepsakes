import { createFileRoute } from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import { AnalyticsPage } from "@/features/reports/components/report-pages";
import { ReportPagesProvider } from "@/features/reports/hooks/use-report-pages";
import { InquiriesAnalyticsPage } from "@/features/reports/components/report-pages";

// Requests › Analytics (owner review 15.10.2026).
export const Route = createFileRoute("/store/requests/analytics")({
  component: Page,
});

function Page() {
  const { t } = useLocale();

  return (
    <ReportPagesProvider>
      <AnalyticsPage
        page="analytics"
        question={t("reportPages.question.inquiries")}
        section="requests"
        title={t("nav.requests")}
      >
        <InquiriesAnalyticsPage />
      </AnalyticsPage>
    </ReportPagesProvider>
  );
}
