import type { StartStep } from '../lib/search-params'

import { EmptyState } from '@/components/empty-state'
import { ErrorNotice } from '@/components/error-notice'
import { ContentIcon, InfoIcon } from '@/components/icons'
import { StepEditorSkeleton } from '@/components/layout/detail-skeletons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'
import { usePlace } from '../api/queries'
import { NEW_PLACE_ID, PLACES_PATH } from '../lib/search-params'
import { PlaceEditor } from './place-editor'

/**
 * N17 at /store/content/places/$placeId. `new` opens an empty pin that the first save creates; any other id is
 * read from the API. The editor starts from that read, so it is keyed by the id and a move to the id of a pin
 * that was just created starts it again from the cached pin.
 */
export function PlaceEditorScreen({ placeId, start }: { placeId: string, start: StartStep | undefined }) {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const store = currentStore(me.data)
  const isNew = placeId === NEW_PLACE_ID
  const place = usePlace(store?.storeId, placeId, !isNew)
  const back = { label: t('places.back'), to: PLACES_PATH }

  if (!apiEnabled)
    return <EmptyState icon={InfoIcon} message={t('places.apiOnly')} />
  if (me.isError)
    return <EmptyState icon={InfoIcon} message={t('places.loadFailed')} />
  if (!me.isPending && !store)
    return <EmptyState icon={InfoIcon} message={t('places.noStore')} />
  if (me.isPending || (!isNew && place.isPending))
    return <StepEditorSkeleton cards={3} />
  if (!isNew && place.isError) {
    const problem = place.error instanceof ApiProblem ? place.error : undefined

    if (problem?.type === 'not-found' || problem?.status === 404 || problem?.status === 400)
      return <EmptyState action={back} icon={ContentIcon} message={t('places.notFound')} />

    return (
      <ErrorNotice reference={place.error instanceof ApiProblem ? place.error.requestId : undefined} message={t(problem?.type === 'forbidden' ? 'places.problem.forbidden' : 'places.loadFailed')} onRetry={() => void place.refetch()} />
    )
  }

  return <PlaceEditor key={placeId} initial={isNew ? undefined : place.data} start={start} storeId={store!.storeId} />
}
