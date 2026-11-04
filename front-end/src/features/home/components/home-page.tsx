import type { HomeRead } from '../api/home-reads'

import { Link, useRouter } from '@tanstack/react-router'

import brandLogo from '@/assets/brand/swiss-keepsakes-logo.png'
import { CartButton, CompactBar, SearchButton } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { useLocale } from '@/contexts/locale-context'
import { TripAdviceButton } from '@/features/discovery/components/trip-advice-button'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { EventsSection } from './events-section'
import { FoodMapSection } from './food-map-section'
import { HomeEndingBlock } from './home-ending-block'
import { HomeHero } from './home-hero'
import { MapInvitation } from './map-invitation'
import { MustVisitsSection } from './must-visits-section'
import { RoutesSection } from './routes-section'
import { ServiceTiles } from './service-tiles'

/**
 * The guest home C01 in its one fixed order, the same for every visitor: the hero with the search pill, "First time in Lucerne?",
 * "Sorted before you unpack", the ending. The postcards, the routes, the food map and the events go between the tiles and the ending. `read` is what the route
 * loader read (undefined while it loads). Each block reads for itself, so one failed read shows one error and the rest of the page stays.
 */
export function HomePage({ read }: { read?: HomeRead }) {
  const { t, language } = useLocale()
  const router = useRouter()
  const retry = () => void router.invalidate()
  const [heroEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()

  return (
    <>
      <CompactBar visible={scrolledPast}>
        <div className="min-w-0 flex-1">
          <Link
            aria-label={t('app.name')}
            className="flex rounded-lg outline-none focus-visible:focus-ring"
            params={{ lang: language }}
            to="/$lang"
          >
            <img alt="" className="h-auto max-h-11 w-full max-w-[232px] object-contain object-left" decoding="async" loading="lazy" src={brandLogo} />
          </Link>
        </div>
        <SearchButton label={t('search.open')} to="/$lang/search" tone="bar" />
        <LanguageButton tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>
      <div className="flex flex-col gap-10 px-4 pb-4">
        <div className="relative -mx-4 px-4">
          <HomeHero ref={heroEnd} />
        </div>
        <MapInvitation />
        <ServiceTiles tiles={read?.tiles} onRetry={retry} />
        <MustVisitsSection pins={read?.pins} onRetry={retry} />
        <RoutesSection tours={read?.tours} onRetry={retry} />
        <FoodMapSection categories={read?.categories} pins={read?.pins} onRetry={retry} />
        <EventsSection categories={read?.categories} pins={read?.pins} onRetry={retry} />
        <HomeEndingBlock />
      </div>
      <TripAdviceButton above="tabBar" />
    </>
  )
}
