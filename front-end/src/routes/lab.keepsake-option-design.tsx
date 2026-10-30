import type { OptionDesignSearch } from '@/features/lab/option-design-data'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { parseSearch } from '@/features/lab/option-design-data'
import { OptionDesignFrame } from '@/features/lab/option-design-frame'
import { OptionDesignLab } from '@/features/lab/option-design-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab v2: three calmer designs for a keepsake's options and values (O1 to O3). Not part of the product. */
export const Route = createFileRoute('/lab/keepsake-option-design')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): OptionDesignSearch => parseSearch(search),
  component: OptionDesignRoute,
})

function OptionDesignRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/keepsake-option-design' })

  // Inside the frame: only the design, at the frame's own width.
  if (search.embed === 1)
    return <OptionDesignFrame search={search} />

  return <OptionDesignLab search={search} onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })} />
}
