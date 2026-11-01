import type { VariantLabSearch } from '@/features/lab/variant-design-data'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { parseVariantSearch } from '@/features/lab/variant-design-data'
import { VariantDesignLab, VariantFrame } from '@/features/lab/variant-design-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab: three calm designs for seeing, creating and editing a keepsake's variants (round 2). Not part of the product. */
export const Route = createFileRoute('/lab/keepsake-variant-design')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): VariantLabSearch => parseVariantSearch(search),
  component: KeepsakeVariantDesignRoute,
})

function KeepsakeVariantDesignRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/keepsake-variant-design' })

  // Inside the frame: only the design, at the frame's own width.
  if (search.embed === 1)
    return <VariantFrame search={search} />

  return <VariantDesignLab search={search} onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })} />
}
