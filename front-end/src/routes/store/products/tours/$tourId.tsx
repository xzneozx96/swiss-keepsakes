import type { TourStep } from '@/features/merchant/products/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { TourIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { EditorSkeleton } from '@/features/merchant/products/components/editor-parts'
import { TourEditor } from '@/features/merchant/products/components/tour-editor'
import {
  TOUR_STEPS,

} from '@/features/merchant/products/lib/search-params'
import { useTourRecords } from '@/features/tours/api/queries'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

// M13 Edit tour and departures (step 4.10; stepper since revision 2). M11 tour cards and
// table rows link here; `?step=` opens a step.
export const Route = createFileRoute('/store/products/tours/$tourId')({
  validateSearch: (search: Record<string, unknown>): { step?: TourStep } => ({
    step: TOUR_STEPS.includes(search.step as TourStep)
      ? (search.step as TourStep)
      : undefined,
  }),
  component: TourEditorPage,
})

function TourEditorPage() {
  const { tourId } = Route.useParams()
  const { step = 'basics' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { t } = useLocale()
  const isLoading = useSimulatedLoading()
  const tour = useTourRecords(records =>
    records.tours.find(item => item.id === tourId),
  )

  if (isLoading)
    return <EditorSkeleton />

  if (!tour) {
    return (
      <EmptyState
        action={{
          label: t('products.back'),
          to: '/store/products',
        }}
        icon={TourIcon}
        message={t('products.notFound.tour')}
      />
    )
  }

  // Keyed by tour, so a draft never carries over to another tour.
  return (
    <TourEditor
      key={tour.id}
      step={step}
      tour={tour}
      onStep={next =>
        void navigate({
          search: next === 'basics' ? {} : { step: next },
          replace: true,
        })}
    />
  )
}
