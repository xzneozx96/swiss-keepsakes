import type { RequestsTab } from '@/features/requests/merchant/lib/search-params'

import { createFileRoute, redirect } from '@tanstack/react-router'
import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { MerchantRequests } from '@/features/requests/merchant/components/merchant-requests'
import { isRequestsTab } from '@/features/requests/merchant/lib/search-params'

// M19 Inquiries › Advice. Questions is a page next to it; an old `?tab=questions` link still
// lands on it. Private tours (M20) are dormant (ADR-012). The M19 request detail is
// /store/requests/advice/$requestId.
export const Route = createFileRoute('/store/requests/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: Exclude<RequestsTab, 'advice'> } => ({
    tab:
      isRequestsTab(search.tab) && search.tab !== 'advice'
        ? search.tab
        : undefined,
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
