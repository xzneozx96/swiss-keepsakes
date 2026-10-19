import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '@/components/empty-state'
import { PartnersIcon } from '@/components/icons'
import { DetailSkeleton } from '@/components/layout/detail-skeletons'
import { useLocale } from '@/contexts/locale-context'
import { PartnerDetail } from '@/features/merchant/partners/components/partner-detail'
import { usePartnerDetail } from '@/features/merchant/partners/hooks/use-partner-detail'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

// M16 Partner detail (steps 5.3–5.5). M15 cards and table rows link here.
export const Route = createFileRoute('/store/partners/$partnerId')({
  component: PartnerDetailPage,
})

function PartnerDetailPage() {
  const { partnerId } = Route.useParams()
  const { t } = useLocale()
  const isLoading = useSimulatedLoading()
  const view = usePartnerDetail(partnerId)

  if (isLoading) {
    return <DetailSkeleton chips={1} facts={3} side={0} />
  }

  if (!view) {
    return (
      <EmptyState
        action={{ label: t('merchantPartners.back'), to: '/store/partners' }}
        icon={PartnersIcon}
        message={t('partnerDetail.notFound')}
      />
    )
  }

  return <PartnerDetail view={view} />
}
