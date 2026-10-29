import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { useStoreGate } from '@/features/stores/hooks/use-store-gate'
import { noIndexHead } from '@/lib/no-index'

export const Route = createFileRoute('/store')({
  ssr: false,
  head: noIndexHead,
  component: StoreLayout,
})

function StoreLayout() {
  const gate = useStoreGate()

  if (gate === 'checking')
    return <main aria-busy className="flex-1" />
  if (gate === 'onboarding')
    return <Navigate replace to="/store/onboarding" />

  return (
    <MerchantShell>
      <Outlet />
    </MerchantShell>
  )
}
