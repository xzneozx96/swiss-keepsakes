import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { MapScreen } from '@/features/map/components/map-screen'
import { validateMapSearch } from '@/features/map/lib/search-params'

// N02 guest map. The shell is server-rendered, the pins load in the browser (ADR-006); the screen fills the space above the tab bar.
// `?place=<slug>` opens the map with that place's card showing (N03, AC90); `?category=<slug>` opens it filtered (E4.13).
// An old `?dated=1` still validates and goes to the screen, which cleans it from the address.
// The screen writes its filter back to the address with replace, so a copied link reproduces the view.
export const Route = createFileRoute('/_guest/$lang/map')({
  ssr: true,
  staticData: { ownsBottomSpace: true },
  validateSearch: validateMapSearch,
  component: MapRoute,
})

function MapRoute() {
  const { place, category, dated } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return <MapScreen category={category} dated={dated} place={place} onSearchChange={search => void navigate({ search, replace: true })} />
}
