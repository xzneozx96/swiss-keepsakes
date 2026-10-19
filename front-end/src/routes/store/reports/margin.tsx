import { createFileRoute } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import {
  AnalyticsPage,
  ReportsMarginPage,
} from '@/features/reports/components/report-pages'

// M21 Reports › Margin (owner review 15.10.2026).
export const Route = createFileRoute('/store/reports/margin')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <AnalyticsPage
      withFilters
      page="margin"
      question={t('reportPages.question.margin')}
      section="reports"
      title={t('reports.title')}
    >
      <ReportsMarginPage />
    </AnalyticsPage>
  )
}
