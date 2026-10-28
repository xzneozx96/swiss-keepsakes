import type { Tour } from '@sk/domain/bookings'
import type { JourneyStep } from './journey-steps'
import type { MovingStory } from './moving-story-rail'
import type { StoryCategoryLink } from './story-categories'
import type { ProductCardProps } from '@/features/catalog/components/product-card'

import { buttonVariants, Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import brandLogo from '@/assets/brand/swiss-keepsakes-logo.png'
import { ChevronRightIcon, StoryIcon } from '@/components/icons'
import {
  CartButton,
  CompactBar,
  SearchButton,
} from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { useLocale } from '@/contexts/locale-context'
import { ProductCard } from '@/features/catalog/components/product-card'
import { TourCard } from '@/features/tours/discovery/tour-card'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { AdviceBanner } from './advice-banner'
import { Hero } from './hero'
import { JourneySteps } from './journey-steps'

import { MovingStoryRail } from './moving-story-rail'
import { PartHeading } from './part-heading'
import { Rail } from './section'
import { Snowfall } from './snowfall'
import { StoryCategories } from './story-categories'
import { TripAdviceButton } from './trip-advice-button'
import { VictorinoxShowcase } from './victorinox-showcase'

export interface StoryView {
  slug: string
  photo: string
  title: string
  meta: string
}

interface PartView {
  eyebrow: string
  title: string
  subtitle: string
}

export interface DiscoveryHomeView {
  hero: {
    appName: string
    hello: string
    title: string
    photoAlt: string
    searchLabel: string
    searchPrompt: string
  }
  journey: { title: string, subtitle: string, steps: JourneyStep[] }
  stories: PartView & {
    categoriesLabel: string
    categories: StoryCategoryLink[]
    items: MovingStory[]
    showAll: string
  }
  tours: PartView & {
    seeAll: string
    items: Tour[]
    fromStory: string
    storyFor: (tourId: string) => { slug: string, title: string } | undefined
    /** The tours' story for the lab's earlier layouts. */
    story?: StoryView
  }
  keep: PartView
  victorinox: {
    title: string
    subtitle: string
    eyebrow: string
    since: string
    seeAll: string
    intro: string
    items: ProductCardProps[]
    story?: StoryView
  }
  keepsakes: {
    title: string
    subtitle: string
    seeAll: string
    items: ProductCardProps[]
  }
  advice: {
    title: string
    body: string
    action: string
    captions: [string, string, string]
  }
}

function RailSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex w-60 shrink-0 flex-col gap-3">
          <Skeleton className="aspect-[4/3] rounded-3xl" />
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/**
 * C01 Discovery home, stories first (owner, Lab round 3, 17.10.2026): one narrator and one
 * walk through Luzerne. The hero welcomes, the journey steps preview the three parts, then
 * 01 Read it (stories), 02 Walk it (tours, each with the story it comes from) and 03 Keep it
 * (Victorinox and keepsakes as one ending), with "ask me" as the epilogue. In the Christmas
 * season the hero snows.
 */
export function DiscoveryHome({
  view,
  isLoading,
  snowing,
}: {
  view: DiscoveryHomeView
  isLoading: boolean
  snowing: boolean
}) {
  const { language } = useLocale()
  const { hero, journey, stories, tours, keep, victorinox, keepsakes, advice }
    = view

  const [heroEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()

  return (
    <>
      <CompactBar visible={scrolledPast}>
        <div className="min-w-0 flex-1">
          <Link
            aria-label={hero.appName}
            className="flex rounded-lg outline-none focus-visible:focus-ring"
            params={{ lang: language }}
            to="/$lang"
          >
            <img
              alt=""
              className="h-auto max-h-11 w-full max-w-[232px] object-contain object-left"
              decoding="async"
              loading="lazy"
              src={brandLogo}
            />
          </Link>
        </div>
        <SearchButton label={hero.searchLabel} to="/$lang/search" tone="bar" />
        <LanguageButton tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>
      <div className="flex flex-col gap-10 px-4 pb-4">
        <div className="relative -mx-4 px-4">
          <Hero ref={heroEnd} {...hero} />
          {snowing && <Snowfall />}
        </div>

        <JourneySteps {...journey} />

        <section
          aria-labelledby="read-title"
          className="flex scroll-mt-20 flex-col gap-4"
          id="read"
        >
          <PartHeading
            color={journey.steps[0]?.color ?? 'var(--accent)'}
            eyebrow={stories.eyebrow}
            id="read-title"
            subtitle={stories.subtitle}
            title={stories.title}
          />
          <StoryCategories
            items={stories.categories}
            label={stories.categoriesLabel}
          />
          {isLoading
            ? (
                <RailSkeleton />
              )
            : (
                <MovingStoryRail label={stories.title} stories={stories.items} />
              )}
          {/* Same treatment as "Show all {count} reviews" and the comments' show-all. */}
          <Link
            className={`${buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`}
            to="/$lang/stories"
            params={{ lang: language }}
          >
            {stories.showAll}
          </Link>
        </section>

        <section
          aria-labelledby="walk-title"
          className="flex scroll-mt-20 flex-col gap-4"
          id="walk"
        >
          <PartHeading
            color={journey.steps[1]?.color ?? 'var(--accent)'}
            eyebrow={tours.eyebrow}
            id="walk-title"
            seeAll={{ label: tours.seeAll, to: '/$lang/tours' }}
            subtitle={tours.subtitle}
            title={tours.title}
          />
          {isLoading
            ? (
                <RailSkeleton />
              )
            : (
                <Rail label={tours.title}>
                  {tours.items.map((tour) => {
                    const story = tours.storyFor(tour.id)

                    return (
                      <li key={tour.id} className="flex flex-col gap-2">
                        <TourCard layout="carousel" tour={tour} />
                        {story && (
                          <Link
                            className="flex w-60 items-start gap-2 rounded-xl px-1 text-label outline-none focus-visible:focus-ring"
                            params={{ lang: language, slug: story.slug }}
                            to="/$lang/stories/$slug"
                          >
                            <StoryIcon
                              className="mt-0.5 shrink-0 text-accent"
                              size={16}
                            />
                            <span className="min-w-0">
                              <span className="text-muted">
                                {tours.fromStory}
                                :
                                {' '}
                              </span>
                              <span className="underline decoration-separator underline-offset-4">
                                {story.title}
                              </span>
                            </span>
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </Rail>
              )}
        </section>

        <section
          aria-labelledby="keep-title"
          className="flex scroll-mt-20 flex-col gap-4"
          id="keep"
        >
          <PartHeading
            color={journey.steps[2]?.color ?? 'var(--accent)'}
            id="keep-title"
            {...keep}
          />
          <VictorinoxShowcase isLoading={isLoading} {...victorinox} />
          <div className="flex items-end justify-between gap-4 pt-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="text-heading">{keepsakes.title}</h3>
              <p className="text-label text-muted">{keepsakes.subtitle}</p>
            </div>
            <Link
              className="flex shrink-0 items-center gap-0.5 rounded-md py-1 text-sm font-medium text-muted outline-none select-none focus-visible:focus-ring active:opacity-60"
              to="/$lang/gifts"
              params={{ lang: language }}
            >
              {keepsakes.seeAll}
              <ChevronRightIcon size={16} />
            </Link>
          </div>
          {isLoading
            ? (
                <RailSkeleton />
              )
            : (
                <Rail label={keepsakes.title}>
                  {keepsakes.items.map(item => (
                    <li key={item.slug} className="flex">
                      <ProductCard {...item} layout="carousel" />
                    </li>
                  ))}
                </Rail>
              )}
        </section>

        <AdviceBanner {...advice} />
      </div>
      <TripAdviceButton above="tabBar" />
    </>
  )
}
