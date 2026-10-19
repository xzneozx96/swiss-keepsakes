import { createFileRoute } from '@tanstack/react-router'

import { OverviewFrame } from '@/features/merchant/today/components/overview-pages'
import { TodayOverview } from '@/features/merchant/today/components/today-overview'

// M02 Overview › Today: the merchant's first screen, for Owner and Manager alike. What needs
// doing today, gifts and tours side by side (owner review 15.10.2026).
export const Route = createFileRoute('/store/')({ component: TodayPage })

function TodayPage() {
  return (
    <OverviewFrame page="today">
      <TodayOverview />
    </OverviewFrame>
  )
}
