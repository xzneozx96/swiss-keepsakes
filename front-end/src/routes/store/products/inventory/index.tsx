import type { InventorySearch } from '@/features/inventory/lib/list'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { InventoryList } from '@/features/inventory/components/inventory-list'
import { parseInventorySearch } from '@/features/inventory/lib/list'

// N13 Products › Inventory. The item page of a variant is /store/products/inventory/$skuId. The tab, the search and the page are in the URL.
export const Route = createFileRoute('/store/products/inventory/')({
  validateSearch: (search: Record<string, unknown>): InventorySearch => parseInventorySearch(search),
  component: Page,
})

function Page() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/store/products/inventory/' })

  return (
    <InventoryList
      search={search}
      onSearch={patch => void navigate({ search: previous => ({ ...previous, ...patch }), replace: true, resetScroll: false })}
    />
  )
}
