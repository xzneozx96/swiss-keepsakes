/**
 * Lab, home V9 "a local friend's briefing" (C01, round 8, owner revision 9). The page follows a
 * first-time visitor's first day: the shipped sky hero with the map preview hanging under its
 * search pill, the practical bits as tiles that open the map with only those places, the
 * must-visits as postcards (with the sort chip under their heading), free routes, the food map,
 * the events (this week highlighted, the next few listed), then the shipped Victorinox showcase,
 * a small bridge and the shipped advice banner. Every section is decided (revision 9). No price anywhere.
 */
import type { IconComponent } from '@/components/icons'
import type { Language } from '@/features/lab/home-data'
import type { HomeModel, HomeState, Screen } from '@/features/lab/home-kit'
import type { ServiceId } from '@/features/lab/home-v9-data'
import type { MapPoint } from '@/features/lab/home-v9-parts'

import { useRef, useState } from 'react'
import { Briefcase, Bus, Drop, Simcard, Wallet } from 'reicon-react'

import { ChevronRightIcon, FilterIcon, PickupIcon } from '@/components/icons'
import { answerSummary, copy, occurrenceLabel } from '@/features/lab/home-data'
import {
  AerialMap,
  AllScreen,
  HomePhone,
  LabAdviceBanner,
  MapScreen,
  ShelfSkeletons,
  TripSheet,
  useHome,
  useSettle,
} from '@/features/lab/home-kit'
import { SearchMixed } from '@/features/lab/home-search'
import { SkyHero } from '@/features/lab/home-sky-hero'
import { eventsFor, mustVisitsFor, pointsOf, routesFor, SERVICES, v9Copy } from '@/features/lab/home-v9-data'
import { Events } from '@/features/lab/home-v9-events'
import { Food } from '@/features/lab/home-v9-food'
import { MustVisits } from '@/features/lab/home-v9-must'
import { PointsScreen, SectionHead } from '@/features/lab/home-v9-parts'
import { Routes } from '@/features/lab/home-v9-routes'
import { HomeVictorinox } from '@/features/lab/home-victorinox'
import { pickText } from '@/features/lab/map-guest-data'

// ---------------------------------------------------------------- 2. the map preview

/** 3:2 at the content width: the whole old town, from the Jesuit Church to the Lion Monument. */
const MAP_W = 343
const MAP_H = 229
const MAP_SHIFT = 48

/**
 * No box: the heading starts right under the hero's search pill, so pill, words and map read as
 * one column hanging from the photo. The whole aerial is one button.
 */
function MapPreview({ home, language }: { home: HomeModel, language: Language }) {
  const c = v9Copy[language]

  return (
    <section aria-labelledby={home.headingId('v9-map')} className="flex flex-col gap-3 px-4 pt-4" data-v9-map>
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-[22px] leading-7 font-medium" id={home.headingId('v9-map')}>{c.mapTitle}</h2>
        <p className="text-sm text-muted text-pretty">{c.mapBody}</p>
      </div>
      <button
        aria-label={c.mapAction}
        className="group relative block aspect-[3/2] w-full overflow-hidden rounded-2xl text-start shadow-surface outline-none focus-visible:focus-ring"
        type="button"
        onClick={() => home.setScreen({ kind: 'map' })}
      >
        {/* Drawn taller and cut at the top, so the old town's cluster sits above the button. */}
        <span className="absolute start-1/2 -translate-x-1/2" style={{ top: -MAP_SHIFT }}>
          <AerialMap height={MAP_H + MAP_SHIFT} pinSize={28} scale={0.45} width={MAP_W} />
        </span>
        <span aria-hidden className="absolute start-2 bottom-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] leading-4 text-white">{copy[language].mapCredit}</span>
        <span
          aria-hidden
          className="absolute end-2.5 bottom-2.5 flex h-10 items-center gap-1.5 rounded-full bg-accent ps-3 pe-3.5 text-sm font-semibold text-accent-foreground shadow-overlay motion-safe:transition-transform group-active:scale-95"
        >
          <PickupIcon size={18} />
          {c.mapAction}
        </span>
      </button>
    </section>
  )
}

// ---------------------------------------------------------------- 3. services

/** The toilet has no icon in the set: "WC" is what the signs in Lucerne say. */
function WcMark({ size = 22 }: { size?: number }) {
  return (
    <span aria-hidden className="flex items-center justify-center text-[13px] leading-none font-extrabold tracking-tight" style={{ width: size, height: size }}>WC</span>
  )
}

const serviceIcons: Record<ServiceId, IconComponent | typeof WcMark> = {
  water: Drop,
  toilets: WcMark,
  connect: Simcard,
  transport: Bus,
  lockers: Briefcase,
  cash: Wallet,
}

function Services({ home, language, onPick }: { home: HomeModel, language: Language, onPick: (id: ServiceId) => void }) {
  const c = v9Copy[language]

  return (
    <section aria-labelledby={home.headingId('v9-services')} className="flex flex-col gap-3" data-v9-services>
      <SectionHead body={c.servicesBody} home={home} id="v9-services" title={c.servicesTitle} />
      <ul className="grid grid-cols-3 gap-2 px-4">
        {SERVICES.map(({ id, label }) => {
          const Icon = serviceIcons[id]

          return (
            <li key={id} className="flex">
              <button
                className="flex min-h-[78px] w-full flex-col items-start justify-between gap-2 rounded-2xl bg-surface p-3 text-start shadow-surface outline-none focus-visible:focus-ring active:scale-[0.97] motion-safe:transition-transform"
                type="button"
                onClick={() => onPick(id)}
              >
                <span className="text-accent">
                  <Icon size={22} />
                </span>
                <span className="text-[13px] leading-4 font-semibold text-balance">{label[language]}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------- the sort chip

/**
 * The one sign of personalisation, under the must-visits heading (the first sorted section): a
 * soft pill with an icon, so it reads as a control. Its text rises in when the answers change.
 */
function SortChip({ home, language }: { home: HomeModel, language: Language }) {
  const c = v9Copy[language]
  const summary = answerSummary(home.answers, language)

  return (
    <button
      className="mt-2 flex min-h-11 w-fit max-w-full items-center gap-2 rounded-full border border-separator bg-surface ps-3 pe-2.5 text-[13px] leading-[18px] font-semibold shadow-surface outline-none focus-visible:focus-ring active:scale-[0.98] motion-safe:transition-transform"
      data-v9-sort
      type="button"
      onClick={() => home.setScreen({ kind: 'trip' })}
    >
      <FilterIcon className="shrink-0 text-accent" size={16} />
      <span key={summary ?? 'none'} className="truncate motion-safe:animate-rise">{summary ? c.sortedFor(summary) : c.sortFor}</span>
      {summary && <span className="shrink-0 text-accent">{c.change}</span>}
      <ChevronRightIcon className="shrink-0 text-muted" size={16} />
    </button>
  )
}

// ---------------------------------------------------------------- 7. events

/** The events as map points: the next date is the note. */
function eventPoints(home: HomeModel, language: Language): MapPoint[] {
  return eventsFor(home.items).map(event => ({
    id: event.pin.id,
    title: pickText(event.pin.title, language)?.value ?? '',
    note: occurrenceLabel(event, language),
    coordinates: event.pin.coordinates,
  }))
}

// ---------------------------------------------------------------- 8. the ending

/** The showcase's tiles and button are router links: the lab says where they would go instead. */
function LabVictorinox({ home, language }: { home: HomeModel, language: Language }) {
  return (
    <div
      data-v9-victorinox
      onClickCapture={(event) => {
        const link = (event.target as Element).closest('a')

        if (link) {
          event.preventDefault()
          event.stopPropagation()
          home.open(link.getAttribute('href') ?? '')
        }
      }}
    >
      <HomeVictorinox language={language} />
    </div>
  )
}

/**
 * The connecting piece between the showcase and the advice banner (both untouched): a thread
 * that drops from the blue showcase, one handing-over line in serif, and the thread again, ending
 * on a red dot just above the banner, so the eye travels from the knives to the question.
 */
function Bridge({ language }: { language: Language }) {
  return (
    <div className="flex flex-col items-center px-10" data-v9-bridge>
      <span aria-hidden className="h-8 w-px bg-[linear-gradient(to_bottom,#173f52,var(--separator))]" />
      <p className="py-2 text-center font-serif text-[17px] leading-6 text-balance italic">{v9Copy[language].bridge}</p>
      <span aria-hidden className="h-6 w-px bg-separator" />
      <span aria-hidden className="size-2 rounded-full bg-accent" />
    </div>
  )
}

// ---------------------------------------------------------------- the phone

type PointsView = { kind: 'service', id: ServiceId, screen: Screen } | { kind: 'events', screen: Screen }

export function HomeV9Phone({ state, language }: { state: HomeState, language: Language }) {
  const home = useHome(state, language)
  const ref = useRef<HTMLDivElement>(null)
  /** A points map shows while the screen it opened is still the current one (a tab tap replaces it). */
  const [pointsView, setPointsView] = useState<PointsView>()
  const screen = home.screen

  useSettle(ref, [
    mustVisitsFor(home.answers).map(m => m.id),
    routesFor(home.answers).map(r => r.id),
  ].join('|'))

  function openPoints(view: { kind: 'service', id: ServiceId } | { kind: 'events' }) {
    const next: Screen = { kind: 'map' }

    setPointsView({ ...view, screen: next })
    home.setScreen(next)
  }

  function closePoints() {
    setPointsView(undefined)
    home.setScreen({ kind: 'home' })
  }

  const points = pointsView && pointsView.screen === screen
    ? pointsView.kind === 'service'
      ? {
          title: SERVICES.find(s => s.id === pointsView.id)!.label[language],
          points: pointsOf(pointsView.id).map(p => ({ id: p.id, title: p.title[language], note: p.note[language], coordinates: p.coordinates })),
        }
      : { title: v9Copy[language].eventsMapTitle, points: eventPoints(home, language) }
    : undefined

  const overlay = points
    ? <PointsScreen home={home} language={language} points={points.points} title={points.title} onBack={closePoints} />
    : screen.kind === 'search'
      ? <SearchMixed home={home} language={language} />
      : screen.kind === 'all'
        ? <AllScreen home={home} id={screen.id} language={language} />
        : screen.kind === 'map'
          ? <MapScreen home={home} id={screen.id} language={language} />
          : screen.kind === 'trip' ? <TripSheet home={home} language={language} /> : null

  return (
    <HomePhone home={home} language={language} overlay={overlay}>
      <SkyHero home={home} language={language} onLanguage={next => home.open(`/${next} (the same home in the other language)`)} />
      <MapPreview home={home} language={language} />
      <div ref={ref} className="mt-8 flex flex-col gap-9">
        <Services home={home} language={language} onPick={id => openPoints({ kind: 'service', id })} />
        {home.loading
          ? (
              <div className="px-4">
                <ShelfSkeletons layout="rail" />
              </div>
            )
          : (
              <>
                <MustVisits aside={<SortChip home={home} language={language} />} home={home} language={language} />
                <Routes home={home} language={language} />
                <Food home={home} language={language} />
                <Events home={home} language={language} onViewAll={() => openPoints({ kind: 'events' })} />
              </>
            )}
        <div className="flex flex-col">
          <LabVictorinox home={home} language={language} />
          <Bridge language={language} />
          <div className="px-4 pt-2">
            <LabAdviceBanner home={home} language={language} />
          </div>
        </div>
      </div>
    </HomePhone>
  )
}
