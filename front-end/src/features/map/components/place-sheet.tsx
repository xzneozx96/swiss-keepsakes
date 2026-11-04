import type { PublicMapItem } from '@sk/api-contract'
import type { PlaceDetail, PlaceStory } from '@/features/map/lib/place-detail'
import { Button, Skeleton } from '@heroui/react'

import { zurichDate } from '@sk/domain/dates'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, LinkIcon, PickupDateIcon, PickupIcon, StoryIcon } from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { nextDateLine } from '@/features/map/lib/next-date'
import { hoursOfWeek, zurichWeekday } from '@/lib/hours'
import { DirectionsLink } from './directions-link'
import { PlacePhotos } from './place-photos'

const LEADING_WWW = /^www\./
const row = 'flex min-h-11 items-center gap-3 text-sm'

/** The host of an outbound link, or undefined while the merchant's link is not a URL. */
function hostOf(link: string) {
  try {
    return new URL(link).host.replace(LEADING_WWW, '')
  }
  catch {
    return undefined
  }
}

function Hours({ detail }: { detail: PlaceDetail }) {
  const { t, intlLocale } = useLocale()
  // The day is read once per open sheet, not on every render.
  const [today] = useState(() => zurichWeekday(new Date()))
  const { groups, openToday } = hoursOfWeek(detail.hours, today, intlLocale, t('map.sheet.closed'))

  if (groups.length === 0)
    return null

  return (
    <div className="flex items-start gap-3 py-2 text-sm">
      <ClockIcon className="mt-0.5 shrink-0 text-muted" size={20} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${openToday ? 'bg-success' : 'bg-muted'}`} />
          <span className={`font-semibold ${openToday ? 'text-success' : 'text-muted'}`}>{t(openToday ? 'map.sheet.openToday' : 'map.sheet.closedToday')}</span>
        </span>
        <dl aria-label={t('map.sheet.hours')} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 tabular-nums">
          {groups.map(group => (
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

function StoryRow({ story, main, onReadStory, onStoryClick }: { story: PlaceStory, main: boolean, onReadStory?: () => void, onStoryClick?: () => void }) {
  const { t, language } = useLocale()
  const className = 'flex min-h-14 w-full items-center gap-3 rounded-2xl py-1.5 text-start outline-none focus-visible:focus-ring active:bg-default'
  const body = (
    <>
      <StoryIcon aria-hidden className="shrink-0 text-muted" size={20} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 font-serif text-base leading-5 text-balance">{story.title}</span>
        <span className="text-label text-muted">
          {[main ? t('map.card.readStory') : undefined, story.readMinutes === null ? undefined : t('map.sheet.minRead', { minutes: story.readMinutes })].filter(Boolean).join(' · ')}
        </span>
      </span>
      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
    </>
  )

  return (
    <li>
      {main && onReadStory
        ? (
            <button
              className={className}
              type="button"
              onClick={() => {
                onStoryClick?.()
                onReadStory()
              }}
            >
              {body}
            </button>
          )
        : <Link className={className} params={{ lang: language, slug: story.slug }} to="/$lang/stories/$slug" onClick={onStoryClick}>{body}</Link>}
    </li>
  )
}

/** The facts of a place, each only when present: next date, hours, address with the map button, website, then the stories. */
function Facts({ detail, directions, onReadStory, onStoryClick, onOutboundClick }: { detail: PlaceDetail, directions: boolean, onReadStory?: () => void, onStoryClick?: () => void, onOutboundClick?: () => void }) {
  const { t, intlLocale } = useLocale()
  const [today] = useState(() => zurichDate(new Date()))
  const date = detail.nextDate
    ? nextDateLine(detail.nextDate, today, intlLocale, { until: day => t('map.date.until', { day }), from: time => t('map.date.from', { time }) })
    : undefined
  const host = detail.link ? hostOf(detail.link) : undefined
  const stories = [...(detail.mainStory ? [{ story: detail.mainStory, main: true }] : []), ...detail.otherStories.map(story => ({ story, main: false }))]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-separator">
        {date && (
          <div className={`${row} py-1`}>
            <PickupDateIcon className="shrink-0 text-muted" size={20} />
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-muted">{t('map.sheet.nextDate')}</span>
              <span className="font-medium tabular-nums">{date}</span>
            </span>
          </div>
        )}
        <Hours detail={detail} />
        <div className={`${row} flex-wrap py-1`}>
          <PickupIcon className="shrink-0 text-muted" size={20} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted">{detail.address ? t('map.sheet.address') : t('map.directions.label')}</span>
            <span>{detail.address ?? t('map.directions')}</span>
          </span>
          {directions && <DirectionsLink icon="quiet" place={detail} />}
        </div>
        {detail.link && host && (
          <a className={`${row} py-1 outline-none focus-visible:focus-ring`} href={detail.link} rel="noopener" target="_blank" onClick={onOutboundClick}>
            <LinkIcon className="shrink-0 text-muted" size={20} />
            <span className="flex flex-1 flex-col">
              <span className="text-xs text-muted">{t('map.sheet.website')}</span>
              <span className="text-link underline underline-offset-4">{host}</span>
            </span>
            <ArrowUpRightIcon className="shrink-0 text-muted" size={18} />
          </a>
        )}
      </div>
      {stories.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-label text-muted">{t('map.sheet.stories')}</h3>
          <ul className="flex flex-col">
            {stories.map(({ story, main }) => <StoryRow key={story.slug} main={main} story={story} onReadStory={onReadStory} onStoryClick={onStoryClick} />)}
          </ul>
        </section>
      )}
    </div>
  )
}

/** The sheet while the pin's details load: the same rows as grey blocks. */
function SheetSkeleton() {
  const { t } = useLocale()

  return (
    <div aria-busy className="flex flex-col gap-4" role="status">
      <span className="sr-only">{t('map.sheet.loading')}</span>
      {/* The tip, then the hours and address rows (icon, label, value), then the Google Maps button. */}
      <Skeleton className="h-5 w-full rounded-lg" />
      <Skeleton className="h-5 w-2/3 rounded-lg" />
      {[0, 1].map(row => (
        <div key={row} className="flex items-start gap-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3 rounded-lg" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
          </div>
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  )
}

/**
 * The details sheet of a place (N03): photos, tip, facts and stories, with Previous and Next place and "Open in Google
 * Maps" in the footer. `detail` is undefined while the pin's read is on its way (`failed` when it did not load); the
 * title and the directions come from the map list, so the sheet is useful at once. A story link goes to the story page,
 * or to `onReadStory` where the page stays (the place editor's preview).
 */
export function PlaceSheet({ item, detail, failed = false, directions = true, onRetry, position, onStep, isOpen, onClose, container, onReadStory, onStoryClick, onOutboundClick }: {
  item: PublicMapItem
  detail?: PlaceDetail
  failed?: boolean
  /** Off while the place has no position (the place editor's preview of a draft): there is nothing to open in Google Maps. */
  directions?: boolean
  onRetry?: () => void
  position: { index: number, count: number }
  onStep: (delta: 1 | -1) => void
  isOpen: boolean
  onClose: () => void
  container?: Element
  onReadStory?: () => void
  /** A story row was followed (analytics, ADR-032). The place editor's preview passes none. */
  onStoryClick?: () => void
  /** The website link was followed (analytics, ADR-032). */
  onOutboundClick?: () => void
}) {
  const { t, language } = useLocale()
  const title = detail?.title ?? item.title
  const shown = detail?.language ?? item.language

  return (
    <SheetFrame
      container={container}
      tightBottom
      footer={(
        // One row: the previous and next place as round buttons around the map button, which takes the rest.
        <div className="flex w-full items-center gap-2">
          {position.count > 1 && (
            <Button isIconOnly aria-label={t('map.sheet.previous')} className="size-12 min-w-12 shrink-0" isDisabled={position.index <= 0} variant="secondary" onPress={() => onStep(-1)}>
              <ChevronLeftIcon size={20} />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            {directions && <DirectionsLink place={detail ?? { ...item, mapsLink: null }} />}
          </div>
          {position.count > 1 && (
            <Button isIconOnly aria-label={t('map.sheet.next')} className="size-12 min-w-12 shrink-0" isDisabled={position.index >= position.count - 1} variant="secondary" onPress={() => onStep(1)}>
              <ChevronRightIcon size={20} />
            </Button>
          )}
        </div>
      )}
      isOpen={isOpen}
      title={title}
      onClose={onClose}
    >
      {shown !== language && <InfoNote text={t(`map.sheet.onlyIn.${shown}`)} />}
      {failed && (
        <div className="flex flex-col items-start gap-2" role="alert">
          <p className="text-sm">{t('map.sheet.failed')}</p>
          {onRetry && <Button className="min-h-11" variant="secondary" onPress={onRetry}>{t('map.sheet.retry')}</Button>}
        </div>
      )}
      {!failed && !detail && <SheetSkeleton />}
      {detail && (
        <>
          {detail.photos.length > 0 && <PlacePhotos key={detail.id} photos={detail.photos} title={title} />}
          {detail.tip && <p className="text-body" lang={detail.language}>{detail.tip}</p>}
          <Facts detail={detail} directions={directions} onOutboundClick={onOutboundClick} onReadStory={onReadStory} onStoryClick={onStoryClick} />
        </>
      )}
    </SheetFrame>
  )
}
