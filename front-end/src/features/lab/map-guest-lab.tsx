/**
 * The guest side of `/lab/pins`: the Map tab (N02) with its pin card (N03) in a phone, A, B or
 * C, with switches for the state, the visitor's answers, and the card's content,
 * and a small tour route panel in the same flat style. The pins come from the dashboard.
 */
import type {
  Answers,
  ContentCase,
  Language,
  Pin,
} from '@/features/lab/map-guest-data'
import type { LabState } from '@/features/lab/map-guest-kit'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { publicPins } from '@/features/lab/map-guest-data'
import { MapCredits, MapPhone } from '@/features/lab/map-guest-kit'
import { GuestMap } from '@/features/lab/map-guest-map'
import { OptionCards, OptionNumbers, OptionSheet } from '@/features/lab/map-guest-options'
import { OptionWanderlog } from '@/features/lab/map-guest-wanderlog'

export const labChip
  = 'min-h-9 rounded-full border border-separator bg-surface px-3.5 py-1.5 text-start text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

const options = [
  {
    id: 'W',
    title: 'W · Wanderlog',
    note: 'After Wanderlog: round pins in the category’s colour with the rank number, names beside the leading pins, chips with the same colour dot. A row of place cards above the tab bar swipes in step with the pins; a card opens the place in a sheet that stops at the tab bar.',
    Component: OptionWanderlog,
  },
  {
    id: 'A',
    title: 'A · Sheet',
    note: 'Chips float on top; a family’s sub-chips open beside it. Dots, with labels on the five best-ranked pins. One draggable sheet: the ranked list at rest, the card when a pin opens (peek, half, full).',
    Component: OptionSheet,
  },
  {
    id: 'B',
    title: 'B · Cards (chosen)',
    note: 'Photo pins. Categories opens the app’s sheet: top-level categories as checkboxes, Select all or Deselect all, Clear filter. The list and the card row hold only the filtered places; the map dims the others. Show more opens the place in the app’s sheet, laid out like the tour stop sheet, with a photo carousel and Previous / Next place.',
    Component: OptionCards,
  },
  {
    id: 'C',
    title: 'C · Numbers',
    note: 'Map | List switch, then a chip row with a second row for sub-categories. Pins numbered by rank, the same numbers as the list. The card is a full sheet over a strip of map.',
    Component: OptionNumbers,
  },
] as const

const states: { id: LabState, label: string, expect: string }[] = [
  { id: 'loaded', label: 'Loaded', expect: 'Pins appear as soon as the map is drawn.' },
  { id: 'loading', label: 'Loading', expect: 'Skeleton chips on a blank map, then the map with “Loading places…”, then the pins (about 2.5 s later, lab delay).' },
  { id: 'empty', label: 'Empty', expect: 'No pins published: the map with a short message and a way to Explore. The dashboard’s “Empty” list state gives the same.' },
  { id: 'failed', label: 'Failed', expect: 'The pins could not load: a short message and Try again. Retry succeeds.' },
  { id: 'deep-link', label: '?place=chapel-bridge', expect: 'The map opens with the Chapel Bridge card already open.' },
  { id: 'deep-link-gone', label: 'Link to a gone pin', expect: '?place=organ-concert-hofkirche (its only date, 26 Oct, is over). A hidden pin (toilets-schwanenplatz) or an unknown slug behaves the same: the map opens with the notice, which leaves after 8 s.' },
  { id: 'other-language', label: 'Pin without this language', expect: 'EN opens the bakery on the Weinmarkt (German only); DE opens the swans (English only). The text shows in the other language with a notice. No machine translation.' },
  { id: 'first-visit', label: 'First visit', expect: 'A first-time guest sees the same map with no onboarding UI. N01 opens at their first Explore visit (S1).' },
]

const answerOptions: { id: Answers, label: string }[] = [
  { id: 'none', label: 'None (newest first)' },
  { id: 'short-food', label: 'Short-stay + food' },
  { id: 'multi-history', label: 'Multi-day + history' },
]

const contentOptions: { id: ContentCase, label: string }[] = [
  { id: 'data', label: 'As entered' },
  { id: 'all', label: 'Every field' },
  { id: 'none', label: 'No optional field' },
]

export function LabGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div aria-label={label} className="flex flex-wrap items-center gap-2" role="group">
      <span className="w-full text-label text-muted">{label}</span>
      {children}
    </div>
  )
}

export type GuestView = 'preview' | 'live'

/** The phone, its switches, and the bridge back to the dashboard. */
export function GuestPanel({ pins, view, onView, viewNote, focus, onEdit }: {
  pins: Pin[]
  view: GuestView
  onView: (view: GuestView) => void
  /** What the phone shows right now, in a sentence. */
  viewNote: string
  focus?: string
  onEdit: (id: string) => void
}) {
  const locale = useLocale()
  const [option, setOption] = useState<'W' | 'A' | 'B' | 'C'>('B')
  const [state, setState] = useState<LabState>('loaded')
  const [language, setLanguage] = useState<Language>(locale.language)
  const [answers, setAnswers] = useState<Answers>('none')
  const [contentCase, setContentCase] = useState<ContentCase>('data')
  const [run, setRun] = useState(0)
  const [lastLink, setLastLink] = useState<string>()
  const [open, setOpen] = useState<string>()
  const current = options.find(o => o.id === option) ?? options[0]
  const currentState = states.find(s => s.id === state) ?? states[0]
  const Option = current.Component
  const openPin = pins.find(pin => pin.id === open)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex w-[375px] max-w-full flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface">
          <LabGroup label="The phone shows">
            <button aria-pressed={view === 'preview'} className={labChip} type="button" onClick={() => onView('preview')}>
              Preview with my edits
            </button>
            <button aria-pressed={view === 'live'} className={labChip} type="button" onClick={() => onView('live')}>
              What guests see now
            </button>
            <p className="w-full text-sm text-muted">{viewNote}</p>
          </LabGroup>
        </div>
        <MapPhone language={language}>
          <Option
            key={`${option}-${state}-${language}-${run}`}
            answers={answers}
            contentCase={contentCase}
            focus={focus}
            language={language}
            pins={pins}
            state={state}
            onDirections={setLastLink}
            onSelected={setOpen}
          />
        </MapPhone>
        <div className="flex min-h-11 w-[375px] max-w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2 shadow-surface">
          <span className="min-w-0 truncate text-sm text-muted">
            {openPin ? `Open: ${openPin.title.en ?? openPin.title.de}` : 'Tap a pin to open its card.'}
          </span>
          <Button isDisabled={!openPin} size="sm" variant="secondary" onPress={() => openPin && onEdit(openPin.id)}>
            Edit in the dashboard
          </Button>
        </div>
        <p className="w-[375px] max-w-full rounded-2xl bg-surface p-3 text-label break-all text-muted shadow-surface" role="status">
          <span className="font-medium text-foreground">Directions link the button would open: </span>
          {lastLink ?? 'none yet'}
        </p>
      </div>
      <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
        <h2 className="text-base font-semibold">Guest phone: Map tab (N02) and pin card (N03)</h2>
        <LabGroup label="Map structure">
          {options.map(o => (
            <button key={o.id} aria-pressed={option === o.id} className={labChip} type="button" onClick={() => setOption(o.id)}>
              {o.title}
            </button>
          ))}
          <p className="w-full text-sm text-muted">{current.note}</p>
        </LabGroup>
        <LabGroup label="State (restarts the phone)">
          {states.map(s => (
            <button key={s.id} aria-pressed={state === s.id} className={labChip} type="button" onClick={() => setState(s.id)}>
              {s.label}
            </button>
          ))}
          <p className="w-full rounded-2xl bg-surface-secondary px-3 py-2 text-sm">
            <span className="font-medium">Expect: </span>
            {currentState.expect}
          </p>
        </LabGroup>
        <LabGroup label="Visitor answers (ranking and prominence)">
          {answerOptions.map(a => (
            <button key={a.id} aria-pressed={answers === a.id} className={labChip} type="button" onClick={() => setAnswers(a.id)}>
              {a.label}
            </button>
          ))}
        </LabGroup>
        <LabGroup label="Card content">
          {contentOptions.map(o => (
            <button key={o.id} aria-pressed={contentCase === o.id} className={labChip} type="button" onClick={() => setContentCase(o.id)}>
              {o.label}
            </button>
          ))}
        </LabGroup>
        <LabGroup label="Guest language">
          {(['en', 'de'] as const).map(l => (
            <button key={l} aria-pressed={language === l} className={labChip} type="button" onClick={() => setLanguage(l)}>
              {l.toUpperCase()}
            </button>
          ))}
          <button className={labChip} type="button" onClick={() => setRun(r => r + 1)}>
            Restart the phone
          </button>
        </LabGroup>
      </div>

    </div>
  )
}

/** Mock merchant route through the old town, for the tour panel. */
const tourStops = ['chapel-bridge', 'kornmarkt-bakery', 'musegg-wall', 'lion-monument']
  .map(slug => publicPins.find(p => p.slug === slug))
  .filter((pin): pin is Pin => Boolean(pin))

/**
 * The tour route map (C09, AC67) on the same flat style and credits as N02: the merchant's
 * stops and line, no location prompt, no "you are here". Same marker as option C.
 */
export function TourRoutePanel() {
  const [active, setActive] = useState(tourStops[0]?.id)

  return (
    <section className="flex w-full max-w-[420px] flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading">Tour route map, same style</h2>
        <p className="text-sm text-muted">
          The tour page reuses the map component: flat SWISSIMAGE with names, the same credits
          line, the merchant’s stops as numbered markers and a dashed route. No location
          prompt, no “you are here”, no route builder (AC67, G9).
        </p>
      </div>
      <div className="relative h-[300px] w-[375px] max-w-full overflow-hidden rounded-3xl shadow-surface ring-1 ring-separator">
        <GuestMap
          route
          insets={{ top: 16, bottom: 40 }}
          label="Tour route"
          pins={tourStops}
          renderCluster={() => null}
          renderPin={(pin) => {
            const n = tourStops.indexOf(pin) + 1

            return (
              <button
                aria-label={`Stop ${n}`}
                aria-pressed={active === pin.id}
                className="flex size-11 items-center justify-center outline-none focus-visible:outline-3 focus-visible:outline-accent"
                type="button"
                onClick={() => setActive(pin.id)}
              >
                <span className={`flex size-9 items-center justify-center rounded-full border-2 border-[#fffaf4] text-[15px] font-bold shadow-[0_4px_14px_rgb(31_24_17/0.3)] ${active === pin.id ? 'bg-accent text-white' : 'bg-[#fffaf4] text-charcoal'}`}>
                  {n}
                </span>
              </button>
            )
          }}
        />
        <MapCredits className="absolute start-2 bottom-2 z-10" />
      </div>
    </section>
  )
}
