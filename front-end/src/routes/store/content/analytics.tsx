import { createFileRoute } from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import { AnalyticsPage } from "@/features/reports/components/report-pages";
import { ReportPagesProvider } from "@/features/reports/hooks/use-report-pages";
import { ContentAnalyticsPage } from "@/features/reports/components/report-pages";

// Content › Analytics (owner review 15.10.2026).
export const Route = createFileRoute("/store/content/analytics")({
  component: Page,
});

function Page() {
  const { t } = useLocale();

  return (
    <ReportPagesProvider>
      <AnalyticsPage
        page="analytics"
        question={t("reportPages.question.content")}
        section="content"
        title={t("nav.content")}
      >
        <ContentAnalyticsPage />
      </AnalyticsPage>
    </ReportPagesProvider>
  );
}
