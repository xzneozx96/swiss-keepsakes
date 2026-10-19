import type { TourStep } from '@/features/merchant/products/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { EditorSkeleton } from '@/features/merchant/products/components/editor-parts'
import { TourEditor } from '@/features/merchant/products/components/tour-editor'
import {
  TOUR_STEPS,

} from '@/features/merchant/products/lib/search-params'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

// "Add tour" on M11 (owner, 15.10.2026): the M13 stepper with a blank draft, walked with
// Back and Next. It is stored at its first save and then opens at
// /store/products/tours/$tourId on the same step. A static segment, so it wins.
export const Route = createFileRoute('/store/products/tours/new')({
  validateSearch: (search: Record<string, unknown>): { step?: TourStep } => ({
    step: TOUR_STEPS.includes(search.step as TourStep)
      ? (search.step as TourStep)
      : undefined,
  }),
  component: NewTourPage,
})

function NewTourPage() {
  const isLoading = useSimulatedLoading()
  const { step = 'basics' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return isLoading
    ? (
        <EditorSkeleton />
      )
    : (
        <TourEditor
          step={step}
          tour={null}
          onStep={next =>
            void navigate({
              search: next === 'basics' ? {} : { step: next },
              replace: true,
            })}
        />
      )
}
