import type { PartnerFilter } from '@/features/merchant/partners/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { MerchantPartners } from '@/features/merchant/partners/components/merchant-partners'
import { PARTNER_FILTERS } from '@/features/merchant/partners/lib/search-params'

interface PartnersSearch {
  /** Absent = all active partners; several add up. */
  filter?: PartnerFilter[]
}

// M15 Partners › All partners (step 5.2). Analytics is /store/partners/analytics, M16
// partner detail /store/partners/$partnerId.
export const Route = createFileRoute('/store/partners/')({
  validateSearch: (search: Record<string, unknown>): PartnersSearch => ({
    filter: Array.isArray(search.filter)
      ? PARTNER_FILTERS.filter(id =>
          (search.filter as unknown[]).includes(id),
        )
      : undefined,
  }),
  component: PartnersPage,
})

function PartnersPage() {
  const { t } = useLocale()
  const { filter = [] } = Route.useSearch()
  const navigate = useNavigate({ from: '/store/partners/' })

  return (
    <SectionFrame
      hasOwnTitle
      page="partners"
      section="partners"
      title={t('nav.partners')}
    >
      <MerchantPartners
        filter={filter}
        onFilterChange={next =>
          void navigate({
            search: s => ({ ...s, filter: next.length ? next : undefined }),
            replace: true,
            resetScroll: false,
          })}
      />
    </SectionFrame>
  )
}
