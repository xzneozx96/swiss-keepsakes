import type { PinsLabSearch } from '@/features/lab/pins-merchant-search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { PinsLab } from '@/features/lab/pins-lab'
import { PinsLabApp } from '@/features/lab/pins-merchant-app'
import { parsePinsLabSearch } from '@/features/lab/pins-merchant-search-params'
import { noIndexHead } from '@/lib/no-index'

/**
 * Lab, slice S4: the merchant pins list (N16) and pin editor (N17) beside the guest map (N02)
 * and pin card (N03), on one list of pins.
 */
export const Route = createFileRoute('/lab/pins')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): PinsLabSearch => parsePinsLabSearch(search),
  component: PinsLabRoute,
})

function PinsLabRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/pins' })

  // Inside the frame: only the dashboard.
  if (search.embed === 1)
    return <PinsLabApp search={search} />

  return (
    <PinsLab
      search={search}
      onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })}
    />
  )
}
