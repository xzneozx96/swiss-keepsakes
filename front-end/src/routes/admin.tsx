import { createFileRoute } from '@tanstack/react-router'

import { AdminStoresScreen } from '@/features/stores/components/admin-stores-screen'
import { noIndexHead } from '@/lib/no-index'

// A01 Stores (Super Admin). Outside the shop shell: the Super Admin never holds a store role.
export const Route = createFileRoute('/admin')({
  ssr: false,
  head: noIndexHead,
  component: AdminStoresScreen,
})
