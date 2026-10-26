import { createFileRoute } from '@tanstack/react-router'

import { useDemoNow } from '@/features/demo'
import { DiscoveryHome } from '@/features/discovery/components/discovery-home'
import { isFestiveSeason } from '@/features/discovery/components/snowfall'
import { useDiscoveryView } from '@/features/discovery/hooks/use-discovery-view'

interface HomeSearch {
  /** Prototype only: `?season=christmas` previews the Christmas snow outside its dates. */
  season?: 'christmas'
}

// C01 Discovery home: the platform's home page (spec §4.1, decision D6).
export const Route = createFileRoute('/_guest/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch =>
    search.season === 'christmas' ? { season: 'christmas' } : {},
  ssr: true,
  component: ExplorePage,
})

function ExplorePage() {
  const view = useDiscoveryView()
  const now = useDemoNow()
  const { season } = Route.useSearch()

  return (
    <DiscoveryHome
      // The server renders the page itself, so the first HTML holds its text and not a skeleton.
      isLoading={false}
      snowing={season === 'christmas' || isFestiveSeason(now)}
      view={view}
    />
  )
}
