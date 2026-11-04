import { Link } from '@tanstack/react-router'

import brandLogo from '@/assets/brand/swiss-keepsakes-logo.png'
import { CartButton, CompactBar, SearchButton } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { useLocale } from '@/contexts/locale-context'
import { TripAdviceButton } from '@/features/discovery/components/trip-advice-button'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { HomeEndingBlock } from './home-ending-block'
import { HomeHero } from './home-hero'
import { MapInvitation } from './map-invitation'
import { ServiceTiles } from './service-tiles'

/**
 * The guest home C01 in its one fixed order, the same for every visitor: the hero with the search pill, "First time in Lucerne?",
 * "Sorted before you unpack", the ending. The blocks of E4.13d to E4.13f go between the tiles and the ending; a block that is not
 * built is not drawn. Each block reads for itself, so one failed read shows one error and the rest of the page stays.
 */
export function HomePage() {
  const { t, language } = useLocale()
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
        <ServiceTiles />
        <HomeEndingBlock />
      </div>
      <TripAdviceButton above="tabBar" />
    </>
  )
}
