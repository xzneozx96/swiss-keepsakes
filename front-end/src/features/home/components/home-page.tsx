import type { ReactNode } from 'react'
import type { HomeRead } from '../api/home-reads'
import type { HomeSectionKey } from '../lib/section-order'

import { Link, useHydrated, useRouter } from '@tanstack/react-router'
import { Fragment } from 'react'

import brandLogo from '@/assets/brand/swiss-keepsakes-logo.png'
import { CartButton, CompactBar, SearchButton } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { useLocale } from '@/contexts/locale-context'
import { TripAdviceButton } from '@/features/discovery/components/trip-advice-button'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { homeSectionOrder } from '../lib/section-order'
import { EventsSection } from './events-section'
import { FoodMapSection } from './food-map-section'
import { HomeEnding } from './home-ending'
import { HomeHero } from './home-hero'
import { MapInvitation } from './map-invitation'
import { MustVisitsSection } from './must-visits-section'
import { RoutesSection } from './routes-section'
import { ServiceTiles } from './service-tiles'
import { StoriesSection } from './stories-section'
import { VictorinoxSection } from './victorinox-section'

/**
 * The guest home C01. The head is fixed: the hero with the search pill, "First time in Lucerne?", "Sorted before you unpack".
 * The tail is fixed: the ending line and the advice banner. Between them the sections the guest's onboarding interests match
 * come first, then the rest in the default order (docs/decisions/2026-10-28-home-local-briefing.md, amendment 05.11.2026).
 * The server and the first client render use the default order. `read` is what the route loader read (undefined while it
 * loads). Each block reads for itself, so one failed read shows one error and the rest of the page stays.
 */
export function HomePage({ read }: { read?: HomeRead }) {
  const { t, language } = useLocale()
  const router = useRouter()
  const retry = () => void router.invalidate()
  const [heroEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const hydrated = useHydrated()
  const stored = useOnboardingAnswers()
  const order = homeSectionOrder(hydrated ? stored.interests ?? [] : [])
  const sections: Record<HomeSectionKey, ReactNode> = {
    'must-visits': <MustVisitsSection pins={read?.pins} onRetry={retry} />,
    'stories': <StoriesSection stories={read?.stories} onRetry={retry} />,
    'routes': <RoutesSection tours={read?.tours} onRetry={retry} />,
    'food-map': <FoodMapSection categories={read?.categories} pins={read?.pins} onRetry={retry} />,
    'events': <EventsSection categories={read?.categories} pins={read?.pins} onRetry={retry} />,
    'victorinox': <VictorinoxSection />,
  }

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
        {order.map(key => <Fragment key={key}>{sections[key]}</Fragment>)}
        <HomeEnding afterShowcase={order.at(-1) === 'victorinox'} />
      </div>
      <TripAdviceButton above="tabBar" />
    </>
  )
}
