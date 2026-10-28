/**
 * The pin card body (N03), shared by the three options so they differ only in the container:
 * A's draggable sheet, B's floating card and its detail sheet, C's full sheet. Every optional
 * field can be missing. No price anywhere (AC42). Focus goes to the title when it opens.
 */
import type { Language, Pin, Story } from '@/features/lab/map-guest-data'

import { Button, buttonVariants } from '@heroui/react'
import { useEffect, useRef } from 'react'

import {
  ArrowUpRightIcon,
  ClockIcon,
  CloseIcon,
  LinkIcon,
  OpenInMapsIcon,
  PickupDateIcon,
  PickupIcon,
} from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { Media } from '@/components/media'
import {
  categoryName,
  copy,
  findStory,
  googleMapsUrl,
  nextDate,
  nextDateParts,
  openToday,
  pickText,
  todayHours,
  weekGroups,
} from '@/features/lab/map-guest-data'

export interface CardContext {
  language: Language
  onDirections: (url: string) => void
}

/** Stories with a published version in the visitor's language; the others are left out. */
export function storiesFor(pin: Pin, language: Language) {
  const main = pin.mainStory ? findStory(pin.mainStory) : undefined

  return {
    main: main?.title[language] ? main : undefined,
    others: pin.otherStories
      .map(findStory)
      .filter(story => story?.title[language] && story.slug !== pin.mainStory),
  }
}

/**
 * Opens the place in Google Maps in a new tab: a link, not a choice of apps. Google Maps opens
 * its app on phones that have it. Destination only, no origin: the site never reads where the
 * guest is.
 */
export function DirectionsAction({
  pin,
  context: { language, onDirections },
  compact = false,
  bare = false,
}: {
  pin: Pin
  context: CardContext
  compact?: boolean | 'quiet'
  /** The full button without the note under it, for a sheet's footer. */
  bare?: boolean
}) {
  const c = copy[language]
  const href = googleMapsUrl(pin.coordinates)
  const link = {
    'href': href,
    'target': '_blank',
    'rel': 'noreferrer',
    'onClick': () => onDirections(href),
    'aria-label': c.directions,
  } as const

  // An icon link: quiet (ghost, like the website row's arrow) on the address row, filled on a card.
  if (compact) {
    return (
      <a {...link} className={buttonVariants({ isIconOnly: true, variant: compact === 'quiet' ? 'ghost' : 'primary', className: `size-11 min-w-11 ${compact === 'quiet' ? 'text-muted' : ''}` })}>
        <OpenInMapsIcon size={20} />
      </a>
    )
  }

  const button = (
    <a {...link} aria-label={undefined} className={buttonVariants({ fullWidth: true, size: 'lg', variant: 'primary', className: 'min-h-12' })}>
      <OpenInMapsIcon size={20} />
      {c.directions}
    </a>
  )

  if (bare)
    return button

  return (
    <div className="flex flex-col gap-1.5">
      {button}
      <p className="text-center text-xs text-muted">{c.directionsNote}</p>
    </div>
  )
}

const row = 'flex min-h-11 items-center gap-3 text-sm'
const LEADING_WWW = /^www\./

/**
 * Opening hours, always open (no fold): today's state on top, open in green or closed in
 * muted ink, then the week in a few lines, days with the same hours on one line and today's
 * line in bold.
 */
function Hours({ pin, language }: { pin: Pin, language: Language }) {
  const c = copy[language]
  const today = todayHours(pin, language)

  if (!today)
    return null
  const open = openToday(pin)

  return (
    <div className="flex items-start gap-3 py-2 text-sm">
      <ClockIcon className="mt-0.5 shrink-0 text-muted" size={20} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${open ? 'bg-success' : 'bg-muted'}`} />
          <span className={`font-semibold ${open ? 'text-success' : 'text-muted'}`}>{open ? c.openNow : c.closedToday}</span>
        </span>
        <dl aria-label={c.hours} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 tabular-nums">
          {weekGroups(pin, language).map(group => (
            <div key={group.days} className={`contents ${group.today ? 'font-semibold text-foreground' : 'text-muted'}`}>
              <dt>{group.days}</dt>
              <dd className={group.closed && !group.today ? 'text-muted/80' : ''}>{group.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

/** One story row: thumbnail, title on up to two lines, and what it is with its reading time. */
function StoryRow({ story, language, meta }: { story: Story, language: Language, meta: string }) {
  return (
    <li>
      <a
        className="flex min-h-[72px] items-center gap-3 rounded-2xl py-1.5 outline-none focus-visible:focus-ring active:bg-default"
        href={`/${language}/stories/${story.slug}`}
        onClick={event => event.preventDefault()}
      >
        <Media alt="" className="size-14 shrink-0 rounded-xl" photo={story.photo} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 font-serif text-base leading-5 text-balance">{story.title[language]}</span>
          <span className="text-label text-muted">{meta}</span>
        </span>
      </a>
    </li>
  )
}

/**
 * The facts: next date, hours, address, stories, website. Each one only when present. With
 * `directions`, the address row carries the map button (an icon), and shows even without an
 * address, so the button is always there.
 */
export function PinFacts({ pin, language, directions }: { pin: Pin, language: Language, directions?: CardContext }) {
  const c = copy[language]
  const date = nextDate(pin, language)
  const parts = nextDateParts(pin, language)
  const { main, others } = storiesFor(pin, language)
  const listed = [
    ...(main ? [{ story: main, meta: c.minRead(main.minutes) }] : []),
    ...others.flatMap(story => story ? [{ story, meta: c.minRead(story.minutes) }] : []),
  ]
  const showPlace = Boolean(pin.address || directions)

  const nextLink = pin.link ? hostOf(pin.link) : undefined
  const hasInfo = Boolean((date && parts) || pin.hours || showPlace || nextLink)

  // The info rows sit together (next date, hours, address, website), then the stories.
  return (
    <div className="flex flex-col gap-4">
      {hasInfo && (
        <div className="flex flex-col divide-y divide-separator">
          {date && parts && (
            <div className={`${row} py-1`}>
              <PickupDateIcon className="shrink-0 text-muted" size={20} />
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-muted">{c.nextDate}</span>
                <span className="font-medium tabular-nums">{date.label}</span>
                {date.more.length > 0 && (
                  <span className="text-xs text-muted tabular-nums">
                    {c.alsoOn}
                    {' '}
                    {date.more.join(' · ')}
                  </span>
                )}
              </span>
            </div>
          )}
          <Hours language={language} pin={pin} />
          {showPlace && (
            <div className={`${row} flex-wrap py-1`}>
              <PickupIcon className="shrink-0 text-muted" size={20} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs text-muted">{pin.address ? c.address : c.directionsLabel}</span>
                <span>{pin.address ?? c.openInMaps}</span>
              </span>
              {directions && <DirectionsAction compact="quiet" context={directions} pin={pin} />}
            </div>
          )}
          {pin.link && nextLink && (
            <a
              className={`${row} py-1 outline-none focus-visible:focus-ring`}
              href={pin.link}
              rel="noreferrer"
              target="_blank"
              onClick={event => event.preventDefault()}
            >
              <LinkIcon className="shrink-0 text-muted" size={20} />
              <span className="flex flex-1 flex-col">
                <span className="text-xs text-muted">{c.website}</span>
                <span className="text-link underline underline-offset-4">{nextLink}</span>
              </span>
              <ArrowUpRightIcon className="shrink-0 text-muted" size={18} />
            </a>
          )}
        </div>
      )}
      {listed.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-label text-muted">{c.storiesHere}</h3>
          <ul className="flex flex-col">
            {listed.map(({ story, meta }) => <StoryRow key={story.slug} language={language} meta={meta} story={story} />)}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Title block: the language notice first when the pin has no version in this language. */
export function PinHeading({
  pin,
  language,
  headingId,
  onClose,
  large = false,
  focusOnOpen = true,
}: {
  pin: Pin
  language: Language
  headingId: string
  onClose?: () => void
  large?: boolean
  /** Off in the dashboard's preview, where focus stays in the form. */
  focusOnOpen?: boolean
}) {
  const c = copy[language]
  const title = pickText(pin.title, language)
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (focusOnOpen)
      ref.current?.focus({ preventScroll: true })
  }, [pin.id, focusOnOpen])

  return (
    <div className="flex flex-col gap-2">
      {title?.fallback && <InfoNote text={c.onlyIn[title.lang]} />}
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2
            ref={ref}
            className={`font-serif text-balance outline-none ${large ? 'text-title' : 'text-[22px] leading-7'}`}
            id={headingId}
            lang={title?.lang}
            tabIndex={-1}
          >
            {title?.value}
          </h2>
          {pin.categories.length > 0 && (
            <p className="text-label text-muted">
              {pin.categories.map(id => categoryName(id, language)).join(' · ')}
            </p>
          )}
        </div>
        {onClose && (
          <Button
            isIconOnly
            aria-label={c.close}
            className="-me-1 size-11 min-w-11 shrink-0 rounded-full"
            variant="tertiary"
            onPress={onClose}
          >
            <CloseIcon size={20} />
          </Button>
        )}
      </div>
    </div>
  )
}

export function PinTip({ pin, language, clamp = false }: { pin: Pin, language: Language, clamp?: boolean }) {
  const tip = pickText(pin.tip, language)

  return tip
    ? <p className={`text-body ${clamp ? 'line-clamp-2 text-sm' : ''}`} lang={tip.lang}>{tip.value}</p>
    : null
}

export function PinPhoto({ pin, language, className }: { pin: Pin, language: Language, className: string }) {
  const title = pickText(pin.title, language)?.value ?? ''
  // The merchant's alt text in this language, else a plain "Photo: title".
  const alt = pin.alt?.[language] ?? copy[language].photoOf(title)

  return pin.photo
    ? <Media alt={alt} className={className} photo={pin.photo} />
    : null
}

/** The host of an outbound link, or undefined while the merchant's link is not a URL yet. */
function hostOf(link: string) {
  try {
    return new URL(link).host.replace(LEADING_WWW, '')
  }
  catch {
    return undefined
  }
}
