import { createFileRoute, Outlet } from '@tanstack/react-router'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { noIndexHead } from '@/lib/no-index'

export const Route = createFileRoute('/store')({
  ssr: false,
  head: noIndexHead,
  component: StoreLayout,
})

function StoreLayout() {
  return (
    <MerchantShell>
      <Outlet />
    </MerchantShell>
  )
}
