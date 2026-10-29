import type { CategoriesLabSearch } from '@/features/lab/categories-search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { CategoriesLab } from '@/features/lab/categories-lab'
import { CategoriesLabApp } from '@/features/lab/categories-lab-app'
import { parseCategoriesLabSearch } from '@/features/lab/categories-search-params'
import { noIndexHead } from '@/lib/no-index'

/** Lab: three structures for the merchant category editor (N23), side by side. */
export const Route = createFileRoute('/lab/categories')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): CategoriesLabSearch => parseCategoriesLabSearch(search),
  component: CategoriesLabRoute,
})

function CategoriesLabRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/categories' })

  // Inside a frame: only the screen.
  if (search.embed === 1)
    return <CategoriesLabApp search={search} />

  return (
    <CategoriesLab
      search={search}
      onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })}
    />
  )
}
