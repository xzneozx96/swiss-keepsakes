import { createFileRoute, Outlet } from '@tanstack/react-router'

import { GuestShell } from '@/components/layout/guest-shell'

export const Route = createFileRoute('/_guest')({ ssr: true, component: GuestLayout })

function GuestLayout() {
  return (
    <GuestShell>
      <Outlet />
    </GuestShell>
  )
}
