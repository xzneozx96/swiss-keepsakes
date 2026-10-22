import { createFileRoute } from '@tanstack/react-router'

import { AdminStoresScreen } from '@/features/stores/components/admin-stores-screen'

// A01 Stores (Super Admin). Outside the shop shell: the Super Admin never holds a store role.
export const Route = createFileRoute('/admin')({ component: AdminStoresScreen })
