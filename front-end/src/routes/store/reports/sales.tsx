import { createFileRoute } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import {
  AnalyticsPage,
  ReportsSalesPage,
} from '@/features/reports/components/report-pages'

// M21 Reports › Sales (owner review 15.10.2026).
export const Route = createFileRoute('/store/reports/sales')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <AnalyticsPage
      withFilters
      page="sales"
      question={t('reportPages.question.sales')}
      section="reports"
      title={t('reports.title')}
    >
      <ReportsSalesPage />
    </AnalyticsPage>
  )
}
