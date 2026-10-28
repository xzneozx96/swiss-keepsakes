/**
 * Lab, home V9, revision 9: "While you're in town". "This week" is the poster the owner chose
 * (H1), drawn like the must-visit postcards: the photo fills the card, white type on a soft
 * dark gradient, the outlined date. The "Coming up" timeline is the owner's keeper (month markers in italic
 * serif, a vertical line with dots, the weekday over the date, the title and one line, "See all
 * on the map" inside the card), photo-free. One event this week fills the width; two or more
 * become a rail with the next poster peeking. `data-v9-highlight` and `data-v9-coming-row` are
 * for tests.
 */
import type { Language } from '@/features/lab/home-data'
import type { HomeModel } from '@/features/lab/home-kit'
import type { V9Event } from '@/features/lab/home-v9-data'

import { buttonVariants } from '@heroui/react'
import { dateTimeFormat } from '@sk/domain/shared'

import { Media } from '@/components/media'
import { dayParts, occurrenceTime } from '@/features/lab/home-data'
import { eventGroups, eventPhoto, v9Copy } from '@/features/lab/home-v9-data'
import { SectionHead } from '@/features/lab/home-v9-parts'
import { pickText } from '@/features/lab/map-guest-data'
import { LAB_TODAY } from '@/features/lab/pins-merchant-data'

export interface EventsProps {
  home: HomeModel
  language: Language
  /** Opens the events-only map. */
  onViewAll: () => void
  /** Lab only: another "today", to see the section with more events this week. */
  today?: string
}

const press = 'outline-none focus-visible:focus-ring active:opacity-80'
const openEvent = (home: HomeModel, event: V9Event, language: Language) => home.open(`/${language}/map?place=${event.pin.slug}`)
const locale = (language: Language) => language === 'en' ? 'en-CH' : 'de-CH'
const longDay = (iso: string, language: Language) => dateTimeFormat(locale(language), { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
const monthName = (iso: string, language: Language) => dateTimeFormat(locale(language), { month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))

interface CardProps {
  event: V9Event
  home: HomeModel
  language: Language
  /** The only event this week: the card takes the full width. */
  wide: boolean
}

function facts(event: V9Event, language: Language) {
  return {
    parts: dayParts(event.day, language),
    weekday: longDay(event.day, language),
    title: pickText(event.pin.title, language),
    tip: pickText(event.pin.tip, language),
    time: occurrenceTime(event, language),
  }
}

const width = (wide: boolean) => wide ? 'w-full' : 'w-[288px] shrink-0 snap-start'

// ---------------------------------------------------------------- this week: the poster

/**
 * The "This week" poster (owner's pick, H1), in the must-visit postcards' manner: the photo
 * fills the card, a soft dark gradient at its foot carries the white type (the outlined date,
 * the weekday and month, the title in serif, the time). No accent block.
 */
function InkPoster({ event, home, language, wide }: CardProps) {
  const { parts, weekday, title, time } = facts(event, language)

  return (
    <button
      className={`${width(wide)} relative block overflow-hidden rounded-2xl text-start text-white shadow-surface ${press}`}
      data-v9-highlight={event.pin.id}
      type="button"
      onClick={() => openEvent(home, event, language)}
    >
      <Media alt="" className={`${wide ? 'aspect-[4/3]' : 'aspect-[4/5]'} w-full`} photo={eventPhoto(event)}>
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_20%,rgb(0_0_0/0.55)_55%,rgb(0_0_0/0.85)_100%)]" />
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
          <span className="flex items-end gap-3">
            <span className="text-[80px] leading-[66px] font-extrabold tracking-[-0.05em] text-transparent tabular-nums [-webkit-text-stroke:1.5px_rgb(255_255_255/0.95)]">{parts.day}</span>
            <span className="flex flex-col pb-0.5 text-[12px] leading-4 font-semibold tracking-[0.1em] uppercase">
              <span>{weekday}</span>
              <span className="text-white/75">{parts.month}</span>
            </span>
          </span>
          <span className="flex flex-col gap-1 border-t border-white/30 pt-3">
            <span className="font-serif text-[23px] leading-7 font-medium text-balance" lang={title?.lang}>{title?.value}</span>
            {time && <span className="text-[13px] leading-[18px] text-white/85 tabular-nums">{time}</span>}
          </span>
        </span>
      </Media>
    </button>
  )
}

// ---------------------------------------------------------------- the timeline (owner's keeper)

/** A title, then the time and the tip on one quiet line. */
function EventText({ event, language }: { event: V9Event, language: Language }) {
  const { title, tip, time } = facts(event, language)

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="font-serif text-[17px] leading-[22px] font-medium" lang={title?.lang}>{title?.value}</span>
      <span className="line-clamp-1 text-label font-normal text-muted">
        {time && <span className="tabular-nums">{`${time} · `}</span>}
        {tip && <span lang={tip.lang}>{tip.value}</span>}
      </span>
    </span>
  )
}

function Timeline({ coming, hidden, home, language, onViewAll }: { coming: V9Event[], hidden: number, home: HomeModel, language: Language, onViewAll: () => void }) {
  const c = v9Copy[language]

  return (
    <div className="mx-4 flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-surface" data-v9-timeline>
      <h3 className="text-[15px] leading-5 font-semibold">{c.later}</h3>
      <ol className="relative flex flex-col ps-5">
        <span aria-hidden className="absolute start-[5px] top-2 bottom-2 w-px bg-separator" />
        {coming.map((event, i) => {
          const newMonth = i === 0 || monthName(event.day, language) !== monthName(coming[i - 1]!.day, language)
          const parts = dayParts(event.day, language)

          return (
            <li key={event.pin.id} className="relative flex flex-col">
              {newMonth && <span className="pt-1 pb-0.5 font-serif text-[15px] leading-5 italic">{monthName(event.day, language)}</span>}
              <button className={`relative flex items-start gap-3 py-2.5 text-start ${press}`} data-v9-coming-row={event.pin.id} type="button" onClick={() => openEvent(home, event, language)}>
                <span aria-hidden className="absolute -start-5 top-[22px] size-[11px] rounded-full border-2 border-surface bg-foreground/60" />
                <span className="w-9 shrink-0 text-center tabular-nums">
                  <span className="block text-[11px] leading-4 text-muted">{parts.weekday}</span>
                  <span className="block text-[17px] leading-6 font-semibold">{parts.day}</span>
                </span>
                <EventText event={event} language={language} />
              </button>
            </li>
          )
        })}
      </ol>
      {hidden > 0 && (
        <button
          className={`${buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`}
          data-v9-events-all
          type="button"
          onClick={onViewAll}
        >
          {c.viewAllEvents}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- the section

export function Events({ home, language, onViewAll, today = LAB_TODAY }: EventsProps) {
  const c = v9Copy[language]
  const { all, week, coming, hidden } = eventGroups(home.items, today)

  if (all.length === 0)
    return null

  return (
    <section aria-labelledby={home.headingId('v9-events')} className="flex flex-col gap-3" data-v9-events>
      <SectionHead body={c.eventsBody} home={home} id="v9-events" title={c.eventsTitle} />
      {week.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="px-4 text-[15px] leading-5 font-semibold">{c.thisWeek}</h3>
          {week.length === 1
            ? (
                <div className="flex px-4">
                  <InkPoster wide event={week[0]!} home={home} language={language} />
                </div>
              )
            : (
                <ul aria-label={c.thisWeek} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pt-1 pb-2 [scrollbar-width:none]">
                  {week.map(event => (
                    <li key={event.pin.id} className="relative flex">
                      <InkPoster event={event} home={home} language={language} wide={false} />
                    </li>
                  ))}
                </ul>
              )}
        </div>
      )}
      {coming.length > 0 && <Timeline coming={coming} hidden={hidden} home={home} language={language} onViewAll={onViewAll} />}
    </section>
  )
}
