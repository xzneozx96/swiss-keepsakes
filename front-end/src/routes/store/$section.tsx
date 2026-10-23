import type { MerchantSection } from '@/components/layout/merchant-shell'

import { createFileRoute, notFound } from '@tanstack/react-router'

import { SettingsScreen } from '@/features/stores/components/settings-screen'

const sections: MerchantSection[] = ['settings']

// Dashboard sections from later phases: only Settings (Phase 6) is still a placeholder, and it hosts M22's members tab (E2.4).
export const Route = createFileRoute('/store/$section')({
  beforeLoad: ({ params }) => {
    if (!sections.includes(params.section as MerchantSection))
      throw notFound()
  },
  component: SettingsScreen,
})
