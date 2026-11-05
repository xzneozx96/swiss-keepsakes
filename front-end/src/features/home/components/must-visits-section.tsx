import type { PublicMapItem } from '@sk/api-contract'

import { Skeleton } from '@heroui/react'
import { zurichTime } from '@sk/domain/dates'
import { Link, useHydrated } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { ClockIcon, OpenInMapsIcon, PickupIcon } from '@/components/icons'
import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { directionsUrl } from '@/features/map/lib/directions'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { statusAt, weekdayName, zurichWeekday } from '@/lib/hours'
import { pickVariant, widestVariant } from '@/lib/pick-variant'
import { streetOf } from '../lib/food-map'
import { mustVisitOrder, mustVisitsOf } from '../lib/must-visits'
import { SectionHeading } from './section-heading'

const POSTCARD_PHOTO_WIDTH = 640

/** The pill and the round button: one height (48 px), one press. */
const TAP = 'pointer-events-auto flex min-h-12 items-center justify-center rounded-full outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.97]'

/** The postcard's clock fact, in the food cards' words: "Open until 18:30", "Opens 09:30", "Opens tomorrow 09:30", "Opens Mon 08:00". */
function useHoursFact() {
  const { t, intlLocale } = useLocale()
  // One clock for the whole rail, read once, so every card says the same about now.
  const [now] = useState(() => new Date())
  const day = zurichWeekday(now)
  const time = zurichTime(now)

  return (pin: PublicMapItem) => {
    const status = statusAt(pin.weeklyHours, day, time)

    if (!status)
      return undefined
    if (status.state === 'open')
      return `${t('homePage.food.status.open')} ${t('homePage.food.status.until', { time: status.until })}`
    if (status.state === 'opens-later')
      return t('homePage.food.status.opensAt', { time: status.opensAt })

    return status.inDays === 1
      ? t('homePage.food.status.opensTomorrow', { time: status.opensAt })
      : t('homePage.food.status.opensOn', { day: weekdayName(status.nextDay, intlLocale), time: status.opensAt })
  }
}

/**
 * A postcard, "Immersive" (owner, 05.11.2026, lab option G): a 300 px card with a 10 px white frame and a 32 px radius around a
 * full-bleed photo with a dark gradient under the text (owner, 05.11.2026: the frosted blur was tried and dropped). On it: the name in a bold white sans (it wraps and hyphenates, never cut), the language notice when the place is
 * described in the other language, a meta row (pin + street; clock + today's hours where the place has them, drawn after
 * hydration so the server never disagrees with the browser's clock), then the actions: a white pill "Read the story" with the
 * round Google Maps button beside it, or, without a story, the pill is "Directions" to Google Maps alone. The card's map
 * link is an invisible layer under everything, named by the place, so no link is nested in another. No tip, no price.
 */
function Postcard({ pin, hours }: { pin: PublicMapItem, hours: string | undefined }) {
  const { t, language } = useLocale()
  const hydrated = useHydrated()
  const photo = (pickVariant(pin.photoVariants, POSTCARD_PHOTO_WIDTH) ?? widestVariant(pin.photoVariants))?.url ?? pin.photoUrl ?? undefined
  const other = pin.language === language ? undefined : pin.language
  const street = pin.address ? streetOf(pin.address) : undefined
  const fact = hydrated ? hours : undefined
  const maps = directionsUrl({ latitude: pin.latitude, longitude: pin.longitude, mapsLink: null })

  return (
    <li className="flex shrink-0 snap-start">
      <article className="relative w-[300px] rounded-[32px] bg-white p-2.5 shadow-overlay motion-safe:transition-transform motion-safe:active:scale-[0.98]">
        <div className="relative flex h-full min-h-[420px] flex-col justify-end overflow-hidden rounded-[22px]">
          <span className="absolute inset-0">
            <MapThumb className="size-full" iconSize={56} src={photo} />
          </span>
          <Link aria-label={pin.title} className="absolute inset-0 rounded-[22px] outline-none focus-visible:focus-ring focus-visible:ring-inset" params={{ lang: language }} search={pin.slug ? { place: pin.slug } : {}} to="/$lang/map" />
          <div className="pointer-events-none relative flex flex-col gap-1 p-4 pt-6 text-white">
            {/* The gradient follows the text block: it starts 96 px above it, so a long name never leaves it. */}
            <span aria-hidden className="absolute inset-x-0 -top-24 bottom-0 bg-[linear-gradient(to_bottom,transparent,rgb(0_0_0/0.5)_40%,rgb(0_0_0/0.82)_100%)]" />
            <h3 className="relative text-[30px] leading-[33px] font-bold tracking-[-0.025em] text-balance hyphens-auto [overflow-wrap:anywhere]" lang={other}>{pin.title}</h3>
            {other && <span className="relative w-fit rounded-full bg-black/35 px-2 py-0.5 text-[11px] leading-4 font-medium">{t(`map.card.onlyIn.${other}`)}</span>}
            {(street || fact) && (
              <p className="relative mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] leading-4 font-medium text-white/90">
                {street && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <PickupIcon aria-hidden className="shrink-0" size={15} />
                    {street}
                  </span>
                )}
                {fact && (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <ClockIcon aria-hidden className="shrink-0" size={15} />
                    {fact}
                  </span>
                )}
              </p>
            )}
            <div className="relative mt-3 flex items-center gap-2">
              {pin.mainStorySlug
                ? (
                    <>
                      <Link className={`${TAP} flex-1 bg-white px-5 text-[15px] font-semibold text-foreground`} params={{ lang: language, slug: pin.mainStorySlug }} to="/$lang/stories/$slug">
                        {t('homePage.must.story')}
                      </Link>
                      <a aria-label={t('map.directions')} className={`${TAP} size-12 shrink-0 bg-black/30 text-white ring-1 ring-white/50 ring-inset`} href={maps} rel="noreferrer" target="_blank">
                        <OpenInMapsIcon aria-hidden size={20} />
                      </a>
                    </>
                  )
                : (
                    <a className={`${TAP} flex-1 gap-2 bg-white px-5 text-[15px] font-semibold text-foreground`} href={maps} rel="noreferrer" target="_blank">
                      <OpenInMapsIcon aria-hidden size={18} />
                      {t('homePage.must.directions')}
                    </a>
                  )}
            </div>
          </div>
        </div>
      </article>
    </li>
  )
}

/** The rail's own boxes: the framed 300 px card with a name line, a meta line and the pill with the round button, three of them. */
function MustSkeleton() {
  return (
    <div aria-hidden className="-mx-4 flex gap-3 overflow-hidden px-4" data-skeleton="must-visits">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="w-[300px] shrink-0 rounded-[32px] bg-white p-2.5 shadow-overlay">
          <div className="flex min-h-[420px] flex-col justify-end gap-2 rounded-[22px] bg-surface-secondary p-4">
            <Skeleton className="h-8 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <div className="mt-2 flex items-center gap-2">
              <Skeleton className="h-12 flex-1 rounded-full" />
              <Skeleton className="size-12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * "See these first": the pins with the must-visit flag as postcards. The server draws the curated order; once the page is
 * hydrated the guest's answers order them (interests, then stay fit) and none is hidden. `pins` is the map list: undefined
 * while it loads, null when the read failed. With no must-visit pin the section is not drawn.
 */
export function MustVisitsSection({ pins, onRetry }: { pins: readonly PublicMapItem[] | null | undefined, onRetry: () => void }) {
  const { t } = useLocale()
  const headingId = useId()
  const hydrated = useHydrated()
  const stored = useOnboardingAnswers()
  const answers = hydrated ? stored : { stay: null, interests: [] }
  const must = pins ? mustVisitsOf(pins) : []
  const hoursOf = useHoursFact()

  if (pins && must.length === 0)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.must.body')} id={headingId} title={t('homePage.must.title')} />
      {pins === null
        ? <ErrorNotice compact message={t('homePage.must.failed')} onRetry={onRetry} />
        : pins === undefined
          ? <MustSkeleton />
          : (
              <>
                <Rail label={t('homePage.must.title')}>
                  {mustVisitOrder(must, answers).map(pin => <Postcard key={pin.id} hours={hoursOf(pin)} pin={pin} />)}
                </Rail>
              </>
            )}
    </section>
  )
}
