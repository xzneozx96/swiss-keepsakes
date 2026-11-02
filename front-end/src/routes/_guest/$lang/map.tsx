import { createFileRoute } from '@tanstack/react-router'

import { MapScreen } from '@/features/map/components/map-screen'

// N02 guest map. The shell is server-rendered, the pins load in the browser (ADR-006); the screen fills the space above the tab bar.
// `?place=<slug>` opens the map with that place's card showing (N03, AC90); any other value of the parameter is dropped.
export const Route = createFileRoute('/_guest/$lang/map')({
  ssr: true,
  staticData: { ownsBottomSpace: true },
  validateSearch: (search: Record<string, unknown>): { place?: string } => (typeof search.place === 'string' && search.place !== '' ? { place: search.place } : {}),
  component: MapRoute,
})

function MapRoute() {
  const { place } = Route.useSearch()

  return <MapScreen place={place} />
}
