import type { OptionsLabSearch } from '@/features/lab/keepsake-options-data'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { parseSearch } from '@/features/lab/keepsake-options-data'
import { OptionsFrame } from '@/features/lab/keepsake-options-frame'
import { KeepsakeOptionsLab } from '@/features/lab/keepsake-options-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab: three designs for managing an option and its values, three for creating a variant (keepsake editor). Not part of the product. */
export const Route = createFileRoute('/lab/keepsake-options')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): OptionsLabSearch => parseSearch(search),
  component: KeepsakeOptionsRoute,
})

function KeepsakeOptionsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/keepsake-options' })

  // Inside the frame: only the design, at the frame's own width.
  if (search.embed === 1)
    return <OptionsFrame search={search} />

  return <KeepsakeOptionsLab search={search} onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })} />
}
