import type { HomeRoute } from '../lib/demo-routes'

import { Skeleton } from '@heroui/react'
import { Link, useHydrated } from '@tanstack/react-router'
import { useId } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { ClockIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { routeOrder } from '../lib/routes'
import { SectionHeading } from './section-heading'

/** A route card in the look of the shipped tour rail: a 240 px card, the 4:3 photo, the serif title, the duration. No price, no booking, no departure. */
function RouteCard({ tour }: { tour: HomeRoute }) {
  const { t, language, intlLocale } = useLocale()
  const other = tour.language === language ? undefined : tour.language

  return (
    <li className="flex shrink-0 snap-start">
      <Link
        className="flex w-60 flex-col gap-2.5 rounded-3xl text-start outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.98]"
        // A route in the other language than the guest's links to its own address (ADR-002).
        params={{ lang: tour.language, slug: tour.slug }}
        to="/$lang/tours/$slug"
      >
        <Media alt="" className="aspect-[4/3] w-full rounded-3xl" photo={tour.photo} />
        <span className="flex flex-col gap-0.5 px-0.5">
          <h3 className="font-serif text-card-title text-balance" lang={other}>{tour.title}</h3>
          {other && <span className="w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] leading-4 font-medium text-muted">{t(`map.card.onlyIn.${other}`)}</span>}
          {tour.durationMinutes !== null && (
            <span className="flex items-start gap-1.5 text-label text-muted tabular-nums">
              <ClockIcon aria-hidden className="mt-0.5 shrink-0" size={14} />
              {t('homePage.routes.duration', { hours: new Intl.NumberFormat(intlLocale).format(tour.durationMinutes / 60) })}
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}

/** The rail's own boxes: a 240 px card with a 4:3 photo box, a title line and a duration line, three of them. */
function RoutesSkeleton() {
  return (
    <div aria-hidden className="-mx-4 flex gap-3 overflow-hidden px-4" data-skeleton="routes">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex w-60 shrink-0 flex-col gap-2.5">
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
      ))}
    </div>
  )
}

/**
 * "Walk it the way we would": the published tours as free routes that open the existing tour page. The server draws the
 * server order; once the page is hydrated the guest's stay length orders them. `tours` is undefined while the read loads and
 * null when it failed. With no tour the section is not drawn.
 */
export function RoutesSection({ tours, onRetry }: { tours: readonly HomeRoute[] | null | undefined, onRetry: () => void }) {
  const { t } = useLocale()
  const headingId = useId()
  const hydrated = useHydrated()
  const stay = useOnboardingAnswers().stay ?? null

  if (tours && tours.length === 0)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.routes.body')} id={headingId} title={t('homePage.routes.title')} />
      {tours === null
        ? <ErrorNotice compact message={t('homePage.routes.failed')} onRetry={onRetry} />
        : tours === undefined
          ? <RoutesSkeleton />
          : <Rail label={t('homePage.routes.title')}>{routeOrder(tours, hydrated ? stay : null).map(tour => <RouteCard key={tour.id} tour={tour} />)}</Rail>}
    </section>
  )
}
