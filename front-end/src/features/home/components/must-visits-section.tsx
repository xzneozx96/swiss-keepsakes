import type { PublicMapItem } from '@sk/api-contract'

import { Alert, Button, Skeleton } from '@heroui/react'
import { Link, useHydrated } from '@tanstack/react-router'
import { useId } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { FilterIcon, StoryIcon } from '@/components/icons'
import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'
import { Rail } from '@/features/discovery/components/section'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { openOnboarding } from '@/features/onboarding/lib/opener'
import { pickVariant, widestVariant } from '@/lib/pick-variant'
import { mustVisitOrder, mustVisitsOf } from '../lib/must-visits'
import { SectionHeading } from './section-heading'

const PRESS = 'outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.98]'
const POSTCARD_PHOTO_WIDTH = 640

/**
 * The sort notice under the heading, a full-width HeroUI Alert: what the postcards are sorted for, or the offer to sort them,
 * with a button that opens the onboarding flow in change mode. It is the page's only personalisation signal. The title rises
 * in when it changes, only with motion allowed.
 */
function SortNotice({ stay, interests }: { stay: string | null | undefined, interests: readonly string[] }) {
  const { t } = useLocale()
  const named = [...(stay ? [t(`stories.sort.stay.${stay as 'short_stay' | 'multi_day'}`)] : []), ...interests.map(code => t(`places.interest.${code}` as 'places.interest.food-drink'))]
  const answered = named.length > 0
  const text = answered ? t('homePage.sort.for', { answers: named.join(', ') }) : t('homePage.sort.personalise')

  return (
    <Alert className="w-full items-center" status="accent">
      <Alert.Indicator>
        <FilterIcon aria-hidden size={18} />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title key={text} className="motion-safe:animate-rise">{text}</Alert.Title>
        {!answered && <Alert.Description>{t('homePage.sort.hint')}</Alert.Description>}
      </Alert.Content>
      {/* The visible word is short; the name says what is sorted, so the button makes sense on its own. */}
      <Button aria-label={answered ? `${text}, ${t('homePage.sort.change')}` : text} className="shrink-0" size="sm" variant="secondary" onPress={() => openOnboarding('change')}>
        {answered ? t('homePage.sort.change') : t('homePage.sort.start')}
      </Button>
    </Alert>
  )
}

/** A postcard: the photo fills the 300 px card at 4:5, the name and the tip (at most two lines) sit on a soft dark gradient, the story is a pill on the photo. */
function Postcard({ pin }: { pin: PublicMapItem }) {
  const { t, language } = useLocale()
  const photo = (pickVariant(pin.photoVariants, POSTCARD_PHOTO_WIDTH) ?? widestVariant(pin.photoVariants))?.url ?? pin.photoUrl ?? undefined
  const other = pin.language === language ? undefined : pin.language

  return (
    <li className="shrink-0 snap-start">
      <article className="relative w-[300px] overflow-hidden rounded-2xl shadow-surface">
        <Link className={`relative block ${PRESS}`} params={{ lang: language }} search={pin.slug ? { place: pin.slug } : {}} to="/$lang/map">
          <MapThumb className="aspect-[4/5] w-full" iconSize={56} src={photo} />
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_38%,rgb(0_0_0/0.78)_100%)]" />
          <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 text-white">
            <h3 className="font-serif text-[23px] leading-7 font-medium text-balance" lang={other}>{pin.title}</h3>
            {other && <span className="w-fit rounded-full bg-black/45 px-2 py-0.5 text-[11px] leading-4 font-medium">{t(`map.card.onlyIn.${other}`)}</span>}
            {pin.tip && <span className="line-clamp-2 text-sm leading-5 text-white/90">{pin.tip}</span>}
          </span>
        </Link>
        {pin.mainStorySlug && (
          <Link
            className="absolute start-3 top-3 flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-black/45 px-3 text-sm font-semibold text-white outline-none backdrop-blur-sm focus-visible:focus-ring active:opacity-80"
            params={{ lang: language, slug: pin.mainStorySlug }}
            to="/$lang/stories/$slug"
          >
            <StoryIcon aria-hidden size={18} />
            {t('homePage.must.story')}
          </Link>
        )}
      </article>
    </li>
  )
}

/** The rail's own boxes: a 300 px card at 4:5 with a name line and a tip line, three of them. */
function MustSkeleton() {
  return (
    <div aria-hidden className="-mx-4 flex gap-3 overflow-hidden px-4" data-skeleton="must-visits">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex aspect-[4/5] w-[300px] shrink-0 flex-col justify-end gap-2 rounded-2xl bg-surface p-4 shadow-surface">
          <Skeleton className="h-7 w-2/3 rounded-md" />
          <Skeleton className="h-5 w-full rounded-md" />
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
                <SortNotice interests={answers.interests ?? []} stay={answers.stay} />
                <Rail label={t('homePage.must.title')}>
                  {mustVisitOrder(must, answers).map(pin => <Postcard key={pin.id} pin={pin} />)}
                </Rail>
              </>
            )}
    </section>
  )
}
