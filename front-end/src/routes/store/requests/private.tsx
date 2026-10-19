import { createFileRoute } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { MerchantRequests } from '@/features/requests/merchant/components/merchant-requests'

// M19 Inquiries › Private.
export const Route = createFileRoute('/store/requests/private')({
  component: Page,
})

function Page() {
  const { t } = useLocale()

  return (
    <SectionFrame
      hasOwnTitle
      page="private"
      section="requests"
      title={t('nav.requests')}
    >
      <MerchantRequests tab="private" />
    </SectionFrame>
  )
}
