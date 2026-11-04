import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { KeepsakeEditorScreen } from '@/features/keepsakes/components/keepsake-editor'
import { keepsakeSearch } from '@/features/keepsakes/lib/search-params'

// M12 for one keepsake: the stepped editor at `?step=options` (none means Details), ending in Review and publish at
// `?step=review`. The old `?view=review` address opens that step too.
export const Route = createFileRoute('/store/products/$productId')({
  validateSearch: keepsakeSearch,
  component: KeepsakePage,
})

function KeepsakePage() {
  const { productId } = Route.useParams()
  const { step = 'details' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <KeepsakeEditorScreen
      id={productId}
      step={step}
      onStep={next => void navigate({ search: { step: next === 'details' ? undefined : next }, replace: true })}
    />
  )
}
