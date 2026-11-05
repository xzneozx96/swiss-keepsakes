import type { KeepsakesSearch } from '@/features/keepsakes/lib/list'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { KeepsakeList } from '@/features/keepsakes/components/keepsake-list'
import { parseKeepsakesSearch } from '@/features/keepsakes/lib/list'

// M11 Products › Keepsakes. Pickup points are a page of their own (/store/products/pickup). M12 is
// /store/products/$productId and the create flow is /store/products/new. The filter, the search and the page are in the URL.
export const Route = createFileRoute('/store/products/')({
  validateSearch: (search: Record<string, unknown>): KeepsakesSearch => parseKeepsakesSearch(search),
  component: Page,
})

function Page() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/store/products/' })

  return (
    <KeepsakeList
      search={search}
      onSearch={patch => void navigate({ search: previous => ({ ...previous, ...patch }), replace: true, resetScroll: false })}
    />
  )
}
