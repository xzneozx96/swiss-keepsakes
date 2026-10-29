import type { KeepsakeLabSearch } from '@/features/lab/keepsake-editor-search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { KeepsakeEditorLabApp } from '@/features/lab/keepsake-editor-app'
import { KeepsakeEditorLab } from '@/features/lab/keepsake-editor-lab'
import { parseKeepsakeLabSearch } from '@/features/lab/keepsake-editor-search-params'
import { noIndexHead } from '@/lib/no-index'

/** Lab, slice S7: the merchant catalog (M11, M12 with N14 and N15, the variant page, N13; E6.1 to E6.3), Medusa-shaped, in a frame. */
export const Route = createFileRoute('/lab/keepsake-editor')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): KeepsakeLabSearch => parseKeepsakeLabSearch(search),
  component: KeepsakeEditorLabRoute,
})

function KeepsakeEditorLabRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/keepsake-editor' })

  // Inside the frame: only the merchant screens.
  if (search.embed === 1)
    return <KeepsakeEditorLabApp search={search} />

  return <KeepsakeEditorLab search={search} onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })} />
}
