import type { StartStep } from '@/features/places/lib/search-params'

import { createFileRoute } from '@tanstack/react-router'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { START_STEPS } from '@/features/places/lib/search-params'

interface EditorSearch {
  /** Add event opens a new place on the dates step. */
  start?: StartStep
}

// Content › Places › editor (N17). `new` opens an empty pin that the first save creates.
export const Route = createFileRoute('/store/content/places/$placeId')({
  validateSearch: (search: Record<string, unknown>): EditorSearch => ({
    start: START_STEPS.find(step => step === search.start),
  }),
  component: PlaceEditorPage,
})

function PlaceEditorPage() {
  const { placeId } = Route.useParams()
  const { start } = Route.useSearch()

  return <PlaceEditorScreen placeId={placeId} start={start} />
}
