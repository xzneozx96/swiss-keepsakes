import { createFileRoute, redirect } from '@tanstack/react-router'
import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { MerchantRequests } from '@/features/requests/merchant/components/merchant-requests'

// M19 Inquiries › Advice. Private tours (M20) and Questions are pages next to it; the old
// `?tab=` links (N17 mails) still land on them. The M19 request detail is
// /store/requests/advice/$requestId.
export const Route = createFileRoute('/store/requests/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: 'questions' } => ({
    tab: search.tab === 'questions' ? 'questions' : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.tab) {
      throw redirect({ to: `/store/requests/${search.tab}`, replace: true })
    }
  },
  component: RequestsPage,
})

function RequestsPage() {
  const { t } = useLocale()

  return (
    <SectionFrame
      hasOwnTitle
      page="advice"
      section="requests"
      title={t('nav.requests')}
    >
      <MerchantRequests tab="advice" />
    </SectionFrame>
  )
}
