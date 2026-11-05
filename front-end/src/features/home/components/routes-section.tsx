import type { PublicTourCard } from '@sk/api-contract'
import type { Swiper as SwiperInstance } from 'swiper'

import { Button, Skeleton } from '@heroui/react'
import { Link, useHydrated } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { EffectCards } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { ErrorNotice } from '@/components/error-notice'
import { CategoryRouteIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { coverSrc } from '@/features/content/lib/cover-src'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { loopSlides, routeOrder, splitTitle } from '../lib/routes'
import { SectionHeading } from './section-heading'

import 'swiper/css'
import 'swiper/css/effect-cards'

/**
 * Swiper's cards effect as in its demo, spread into a fan (owner, 05.11.2026): with the loop the card before shows on the left and
 * the card after on the right. Swiper applies the offset as a percentage of the card width (16 % of 248 px, about 40 px) plus 5° of
 * turn per card; at a 248 px card that keeps the whole fan inside the 16 px gutter of a 390 px phone. The slide shadows stay off:
 * they grey the cards behind, and our own gradient already carries the text.
 */
const CARDS = { perSlideOffset: 16, perSlideRotate: 5, rotate: true, slideShadows: false }

/**
 * The deck card's face (owner, 05.11.2026): the place alone as the serif masthead at the top ("Rigi"), and at the foot the rest of
 * the title ("From Lake to Sky") over a hairline and the stops and hours, each with its icon. A title without a colon is all masthead
 * and has no foot line. No summary, no PDF line. `text` fades the words of the cards behind the first.
 */
function DeckFace({ tour, text }: { tour: PublicTourCard, text: string }) {
  const { t, language, intlLocale } = useLocale()
  const { place, line } = splitTitle(tour.title)

  return (
    <>
      <span className="absolute inset-0">
        <Media alt="" className="size-full" photo={coverSrc(tour.cover)} />
      </span>
      <span aria-hidden className="absolute inset-x-0 top-0 h-[55%] bg-[linear-gradient(to_bottom,rgb(0_0_0/0.7),rgb(0_0_0/0.45)_45%,transparent)]" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[50%] bg-[linear-gradient(to_top,rgb(0_0_0/0.85),rgb(0_0_0/0.45)_55%,transparent)]" />
      <span className={`relative flex flex-col items-start gap-2 p-5 ${text}`}>
        <h3 className="font-serif text-[54px] leading-[52px] font-semibold tracking-[-0.035em] text-balance hyphens-auto">{place}</h3>
        {tour.language !== language && <span className="w-fit rounded-full bg-white/20 px-2 py-0.5 text-[11px] leading-4 font-medium text-white">{t(`map.card.onlyIn.${tour.language}`)}</span>}
      </span>
      <span className={`relative flex flex-col gap-3 p-5 ${text}`}>
        {line && <span className="font-serif text-[22px] leading-7 text-balance italic">{line}</span>}
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/35 pt-3 text-[13px] leading-4 font-medium text-white/90 tabular-nums">
          <span className="flex items-center gap-1.5">
            <CategoryRouteIcon aria-hidden size={15} />
            {t('homePage.routes.stops', { count: tour.stopCount })}
          </span>
          {tour.durationMinutes !== null && (
            <span className="flex items-center gap-1.5">
              <ClockIcon aria-hidden size={15} />
              {t('homePage.routes.hours', { hours: new Intl.NumberFormat(intlLocale).format(tour.durationMinutes / 60) })}
            </span>
          )}
        </span>
      </span>
    </>
  )
}

/**
 * The routes as Swiper cards. Swiper owns the gesture: the card follows the finger, a swipe or a flick changes it, a short drag
 * springs back, a click after a drag is swallowed, and the horizontal Swiper sets `touch-action: pan-y`, so a vertical swipe scrolls
 * the page. The loop never ends; the arrows and "1 of 3" use the instance. Only the front card is focusable and shows its words.
 * With reduced motion the change has no animation (speed 0).
 */
function RoutesDeck({ tours, label }: { tours: readonly PublicTourCard[], label: string }) {
  const { t, language } = useLocale()
  const reduced = useReducedMotion()
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null)
  const [active, setActive] = useState(0)
  const count = tours.length
  const only = count === 1 ? tours[0] : undefined

  // One route is one card: nothing to swipe, so no deck, arrows or "1 of 1".
  if (only) {
    return (
      <Link
        className="relative mx-auto flex h-[356px] w-[248px] flex-col justify-between overflow-hidden rounded-3xl text-start text-white outline-none focus-visible:focus-ring"
        lang={only.language === language ? undefined : only.language}
        params={{ lang: only.language, slug: only.slug }}
        to="/$lang/tours/$slug"
      >
        <DeckFace text="" tour={only} />
      </Link>
    )
  }

  return (
    // Swiper's cards effect turns its own clipping off so the fan shows, and the loop keeps hidden cards off to the side:
    // the region clips sideways at the screen edges (it spans the gutters), or the page grows wider than the phone.
    <div aria-label={label} aria-roledescription="carousel" className="-mx-4 flex flex-col gap-4 overflow-x-clip px-4" role="region">
      <Swiper
        cardsEffect={CARDS}
        className="w-[248px] [&_.swiper-slide]:[transition-property:transform,opacity] [&.swiper-initialized_.swiper-slide:not(.swiper-slide-active,.swiper-slide-prev,.swiper-slide-next)]:opacity-0"
        effect="cards"
        grabCursor
        loop
        modules={[EffectCards]}
        speed={reduced ? 0 : 300}
        onSlideChange={instance => setActive(instance.realIndex % count)}
        onSwiper={setSwiper}
      >
        {loopSlides(tours).map((tour, index) => (
          <SwiperSlide key={`${tour.id}-${index}`} aria-roledescription="slide" className="rounded-3xl" role="group">
            {({ isActive: active }) => {
              // Before Swiper starts (the server, and the hydrating render) no slide is active: the first card is the front one.
              const isActive = active || (!swiper && index === 0)

              return (
                <Link
                  className="relative flex h-[356px] flex-col justify-between overflow-hidden rounded-3xl text-start text-white outline-none select-none focus-visible:focus-ring focus-visible:ring-inset"
                  draggable={false}
                  inert={!isActive}
                  lang={tour.language === language ? undefined : tour.language}
                  // A route in the other language than the guest's links to its own address (ADR-002).
                  params={{ lang: tour.language, slug: tour.slug }}
                  to="/$lang/tours/$slug"
                >
                  {/* Only the front card speaks: the cards behind show their photo, so their words never peek out under the first. */}
                  <DeckFace text={`motion-safe:transition-opacity motion-safe:duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} tour={tour} />
                </Link>
              )
            }}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="flex items-center justify-between gap-3">
        <Button isIconOnly aria-label={t('homePage.routes.previous')} size="lg" variant="secondary" onPress={() => swiper?.slidePrev()}>
          <ChevronLeftIcon aria-hidden size={20} />
        </Button>
        <p aria-live="polite" className="min-w-0 text-center text-[13px] leading-[18px] text-muted tabular-nums">
          <span className="font-semibold text-foreground">{t('homePage.routes.counter', { current: active + 1, total: count })}</span>
          <span className="sr-only">{`: ${tours[active]?.title ?? ''}`}</span>
          {` · ${t('homePage.routes.swipe')}`}
        </p>
        <Button isIconOnly aria-label={t('homePage.routes.next')} size="lg" variant="secondary" onPress={() => swiper?.slideNext()}>
          <ChevronRightIcon aria-hidden size={20} />
        </Button>
      </div>
    </div>
  )
}

/** The deck's own boxes: one card-shaped box with two tilted boxes behind it, and the control row (two round buttons and the counter line). */
function RoutesSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4" data-skeleton="routes">
      <div className="relative h-[356px] w-[248px]">
        <Skeleton className="absolute inset-0 origin-bottom -translate-x-10 -rotate-5 rounded-3xl" />
        <Skeleton className="absolute inset-0 origin-bottom translate-x-10 rotate-5 rounded-3xl" />
        <Skeleton className="absolute inset-0 rounded-3xl" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="size-12 rounded-full" />
      </div>
    </div>
  )
}

/**
 * "Walk it the way we would": the published tours as free routes that open the existing tour page. The server draws the
 * server order; once the page is hydrated the guest's stay length orders them. `tours` is undefined while the read loads and
 * null when it failed. With no tour the section is not drawn.
 */
export function RoutesSection({ tours, onRetry }: { tours: readonly PublicTourCard[] | null | undefined, onRetry: () => void }) {
  const { t } = useLocale()
  const headingId = useId()
  const hydrated = useHydrated()
  const stay = useOnboardingAnswers().stay ?? null

  if (tours && tours.length === 0)
    return null

  const ordered = tours ? routeOrder(tours, hydrated ? stay : null) : []

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.routes.body')} id={headingId} title={t('homePage.routes.title')} />
      {tours === null
        ? <ErrorNotice compact message={t('homePage.routes.failed')} onRetry={onRetry} />
        : tours === undefined
          ? <RoutesSkeleton />
          : <RoutesDeck key={ordered.map(tour => tour.id).join()} label={t('homePage.routes.title')} tours={ordered} />}
    </section>
  )
}
