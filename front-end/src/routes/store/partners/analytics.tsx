import { createFileRoute } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import { PartnersAnalyticsPage } from '@/features/merchant/partners/components/partner-analytics-page'
import { AnalyticsPage } from '@/features/reports/components/report-pages'
import { ReportPagesProvider } from '@/features/reports/hooks/use-report-pages'

// Partners › Analytics (owner review 15.10.2026).
export const Route = createFileRoute('/store/partners/analytics')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <ReportPagesProvider>
      <AnalyticsPage
        page="analytics"
        question={t('reportPages.question.partners')}
        section="partners"
        title={t('nav.partners')}
      >
        <PartnersAnalyticsPage />
      </AnalyticsPage>
    </ReportPagesProvider>
  )
}
