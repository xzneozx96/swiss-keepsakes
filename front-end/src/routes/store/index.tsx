import { createFileRoute, redirect } from '@tanstack/react-router'

import { isReady } from '@/components/layout/nav-ready'
import { OverviewFrame } from '@/features/merchant/today/components/overview-pages'
import { TodayOverview } from '@/features/merchant/today/components/today-overview'

// M02 Overview › Today: the merchant's first screen, for Owner and Manager alike. What needs
// doing today, gifts and tours side by side (owner review 15.10.2026). While Today is hidden until
// ready (nav-ready.ts) the merchant lands on Keepsakes instead (owner, 04.11.2026).
export const Route = createFileRoute('/store/')({
  beforeLoad: () => {
    if (!isReady('/store')) {
      throw redirect({ to: '/store/products', replace: true })
    }
  },
  component: TodayPage,
})

function TodayPage() {
  return (
    <OverviewFrame page="today">
      <TodayOverview />
    </OverviewFrame>
  )
}
