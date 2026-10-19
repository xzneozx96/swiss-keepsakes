import type { GiftStep } from '@/features/merchant/products/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { GiftIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useDemo } from '@/features/demo'
import { EditorSkeleton } from '@/features/merchant/products/components/editor-parts'
import { GiftEditor } from '@/features/merchant/products/components/gift-editor'
import {
  GIFT_STEPS,

} from '@/features/merchant/products/lib/search-params'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

interface GiftEditorSearch {
  /** The stepper's step (revision 2); absent = Basics. */
  step?: GiftStep
}

// M12 Edit gift (step 4.9; stepper since revision 2). M11 gift cards and table rows link
// here with the product id; `?step=` opens a step.
export const Route = createFileRoute('/store/products/gifts/$productId')({
  validateSearch: (search: Record<string, unknown>): GiftEditorSearch => ({
    step: GIFT_STEPS.includes(search.step as GiftStep)
      ? (search.step as GiftStep)
      : undefined,
  }),
  component: GiftEditorPage,
})

function GiftEditorPage() {
  const { productId } = Route.useParams()
  const { step = 'basics' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { t } = useLocale()
  const { state } = useDemo()
  const isLoading = useSimulatedLoading()
  const product = state.data.products.find(p => p.id === productId)

  if (isLoading)
    return <EditorSkeleton />

  if (!product) {
    return (
      <EmptyState
        action={{ label: t('products.back'), to: '/store/products' }}
        icon={GiftIcon}
        message={t('products.notFound.gift')}
      />
    )
  }

  // Keyed by product, so a draft never carries over to another gift.
  return (
    <GiftEditor
      key={product.id}
      product={product}
      step={step}
      onStep={next =>
        void navigate({
          search: next === 'basics' ? {} : { step: next },
          replace: true,
        })}
    />
  )
}
