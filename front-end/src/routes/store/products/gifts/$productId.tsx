import type { KeepsakeStep, KeepsakeView } from '@/features/keepsakes/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { KeepsakeEditorScreen } from '@/features/keepsakes/components/keepsake-editor'
import { isKeepsakeStep, isKeepsakeView } from '@/features/keepsakes/lib/search-params'

// M12 for one keepsake: the stepped editor at `?step=options` (none means Details), and Review and publish at `?view=review`.
export const Route = createFileRoute('/store/products/gifts/$productId')({
  validateSearch: (search: Record<string, unknown>): { step?: Exclude<KeepsakeStep, 'details'>, view?: Exclude<KeepsakeView, 'edit'> } => ({
    step: isKeepsakeStep(search.step) && search.step !== 'details' ? search.step : undefined,
    view: isKeepsakeView(search.view) && search.view !== 'edit' ? search.view : undefined,
  }),
  component: KeepsakePage,
})

function KeepsakePage() {
  const { productId } = Route.useParams()
  const { step = 'details', view = 'edit' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <KeepsakeEditorScreen
      id={productId}
      step={step}
      view={view}
      onOpen={next => void navigate({ search: { step: next.step === 'details' ? undefined : next.step, view: next.view === 'edit' ? undefined : next.view }, replace: true })}
    />
  )
}
