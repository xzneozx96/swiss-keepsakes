import type { KeepsakeView } from '@/features/keepsakes/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { KeepsakeEditorScreen } from '@/features/keepsakes/components/keepsake-editor'
import { isKeepsakeView } from '@/features/keepsakes/lib/search-params'

// M12 for one keepsake: the edit screen, and Review and publish at `?view=review`.
export const Route = createFileRoute('/store/products/gifts/$productId')({
  validateSearch: (search: Record<string, unknown>): { view?: Exclude<KeepsakeView, 'edit'> } => ({
    view: isKeepsakeView(search.view) && search.view !== 'edit' ? search.view : undefined,
  }),
  component: KeepsakePage,
})

function KeepsakePage() {
  const { productId } = Route.useParams()
  const { view = 'edit' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <KeepsakeEditorScreen
      id={productId}
      view={view}
      onView={next => void navigate({ search: next === 'edit' ? {} : { view: next }, replace: true })}
    />
  )
}
