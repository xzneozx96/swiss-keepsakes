import type { MediaLabSearch } from '@/features/lab/media-search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { MediaLabApp } from '@/features/lab/media-app'
import { MediaLab } from '@/features/lab/media-lab'
import { parseMediaLabSearch } from '@/features/lab/media-search-params'
import { noIndexHead } from '@/lib/no-index'

/** Lab, slice S4: the merchant media library (N18) as three options, each in a frame. */
export const Route = createFileRoute('/lab/media')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): MediaLabSearch => parseMediaLabSearch(search),
  component: MediaLabRoute,
})

function MediaLabRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/media' })

  // Inside a frame: only that option's dashboard.
  if (search.embed === 1)
    return <MediaLabApp search={search} />

  return <MediaLab search={search} onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })} />
}
