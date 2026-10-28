/**
 * Lab, slice S2: the guest home (C01) in its current direction, V9 "A local friend's briefing",
 * in English. One compact toolbar (visitor state, replay, jump links), then three numbered panels:
 * the home, the section options still to pick, and the approved search (S2). Taps inside a phone
 * say where they would go. Mock data, Wed 28 Oct 2026, 10:00 in Lucerne.
 */
import type { HomeState } from '@/features/lab/home-kit'

import { Button } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { copy } from '@/features/lab/home-data'
import { HomePhone, homeStates, LabNote, useHome } from '@/features/lab/home-kit'
import { SearchMixed } from '@/features/lab/home-search'
import { v9OptionSets } from '@/features/lab/home-v9-options'
import { HomeV9Phone } from '@/features/lab/home-v9-phone'

const control
  = 'h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

/** What each visitor state shows on this home, in a line (the kit's own notes describe the old shelves). */
const stateNotes: Record<HomeState, string> = {
  'after-onboarding': 'Just answered onboarding (short stay, food). The page arrives in the curated order, then the cards inside the sorted sections re-order once; nothing above the services moves.',
  'short-food': 'Answered: short stay, food and drink. Walks before day trips; food places a short-stay visitor can reach first.',
  'multi-history': 'Answered: a few days, history and culture. Day trips first; history-led cards first where they exist.',
  'lake-shopping': 'Answered: a few days, lake and mountains, shopping and keepsakes.',
  'skipped': 'Skipped onboarding. The curated order everywhere; the sort pill invites “Sort for my trip”.',
  'loading': 'Data still loading: placeholders hold each section’s shape so nothing jumps when it fills.',
  'language': 'Some texts exist only in the other language and carry an “Only in German” tag.',
  'few-items': 'Few published items: sections show what exists and never look broken.',
  'thin-shelf': 'A section with fewer than three items.',
  'no-events': 'No upcoming events: What’s on is left out.',
  'qr': 'Arrived by a partner’s QR code.',
}

const hasOptions = v9OptionSets.length > 0

const panels = [
  { id: 'home', title: 'The home' },
  { id: 'options', title: 'Section options' },
  { id: 'search', title: 'Search (approved)' },
] as const

/** The approved search (S2) on its own: a home phone that opens on the search screen. */
function SearchReferencePhone({ state, slow }: { state: HomeState, slow: boolean }) {
  const home = useHome(state, 'en', { kind: 'search' })

  return (
    <HomePhone home={home} language="en" overlay={home.screen.kind === 'search' ? <SearchMixed home={home} language="en" slow={slow} /> : null}>
      <div className="flex flex-col gap-3 p-4">
        <LabNote>The search screen covers the home. Back returns to it.</LabNote>
        <Button className="min-h-11 self-start" size="sm" variant="secondary" onPress={() => home.setScreen({ kind: 'search' })}>
          {copy.en.searchOpen}
        </Button>
      </div>
    </HomePhone>
  )
}

/** One numbered panel: a white sheet with its own heading and intro, clearly apart from the next. */
function Panel({ index, id, title, intro, actions, children }: {
  index: number
  id: string
  title: string
  intro: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface lg:p-8" id={id}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-separator pb-4">
        <div className="flex max-w-3xl items-start gap-3">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background tabular-nums">{index}</span>
          <div className="flex flex-col gap-1">
            <h2 className="text-heading" id={`${id}-title`}>{title}</h2>
            <p className="text-sm text-muted">{intro}</p>
          </div>
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

/** A phone with a short label above it, so two phones side by side are told apart. */
function Labelled({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold">{label}</figcaption>
      {children}
    </figure>
  )
}

export function HomeCompare() {
  const [state, setState] = useState<HomeState>('after-onboarding')
  const [run, setRun] = useState(0)
  const [slow, setSlow] = useState(false)
  const stateId = useId()
  const current = homeStates.find(s => s.id === state) ?? homeStates[0]!
  const key = `${state}-${run}`

  return (
    <div className="flex flex-1 flex-col gap-8 bg-default/40 px-4 py-6 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-1">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Home: a local friend’s briefing (C01, S2)</h1>
        <p className="text-sm text-muted">
          A first visit, briefed by a local: the sky hero and the map, the practical bits, the must-visits, free routes,
          where we eat, what’s on, and one ending with keepsakes and advice. Section order is fixed; the visitor’s answers
          only order cards inside sections. English only. Today is Wed 28 Oct 2026, 10:00 in Lucerne.
        </p>
      </div>

      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface/95 px-4 py-2.5 shadow-surface backdrop-blur">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold" htmlFor={stateId}>Visitor</label>
          <select
            className={`${control} pe-8`}
            id={stateId}
            value={state}
            onChange={(event) => { setState(event.target.value as HomeState); setRun(r => r + 1) }}
          >
            {homeStates.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className={control} type="button" onClick={() => setRun(r => r + 1)}>Replay</button>
        </div>
        <nav aria-label="Panels" className="flex flex-wrap items-center gap-1 text-sm">
          {panels.filter(panel => hasOptions || panel.id !== 'options').map((panel, i) => (
            <a key={panel.id} className="rounded-full px-3 py-1.5 font-medium text-muted outline-none hover:bg-default hover:text-foreground focus-visible:focus-ring" href={`#${panel.id}`}>
              {i + 1}
              {'. '}
              {panel.title}
            </a>
          ))}
        </nav>
      </div>

      <Panel id="home" index={1} intro={stateNotes[state]} title="The home">
        <div className="flex flex-wrap items-start gap-8">
          <Labelled label={`Visitor: ${current.label}`}>
            <HomeV9Phone key={`v9-${key}`} language="en" state={state} />
          </Labelled>
          <Labelled label="For comparison: multi-day + history">
            <HomeV9Phone key={`v9-history-${run}`} language="en" state="multi-history" />
          </Labelled>
        </div>
      </Panel>

      {hasOptions && (
        <Panel id="options" index={2} intro="Sections still being decided, each in its own row with the options side by side. Must-visits is decided (Postcards). The home above uses the designer’s pick for each open section." title="Section options">
          <div className="flex flex-col gap-6">
            {v9OptionSets.map((set, i) => (
              <section key={set.id} aria-labelledby={`options-${set.id}`} className="flex flex-col gap-4 rounded-2xl bg-default/50 p-4 lg:p-6">
                <h3 className="text-base font-semibold" id={`options-${set.id}`}>
                  {`2${'abc'[i]}. ${set.title}`}
                </h3>
                <div className="flex flex-wrap items-start gap-6">
                  {set.options.map(({ id, title, note, recommended, Component }) => (
                    <figure key={id} className="flex w-[375px] max-w-full flex-col gap-3">
                      <figcaption className="flex flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {title}
                          {recommended && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">Designer’s pick</span>}
                        </span>
                        <span className="min-h-10 text-label text-muted">{note}</span>
                      </figcaption>
                      <Component language="en" />
                    </figure>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        actions={(
          <button aria-pressed={slow} className={control} type="button" onClick={() => setSlow(s => !s)}>
            Slow results (loading state)
          </button>
        )}
        id="search"
        index={hasOptions ? 3 : 2}
        intro="Opens from the search box on the home. Empty field: the five interests as photo tiles. Results in one list by how well the title matches, each row naming its kind, with a filter once there are results."
        title="Search (S2, approved)"
      >
        <SearchReferencePhone key={`s2-${key}-${slow}`} slow={slow} state={state} />
      </Panel>
    </div>
  )
}
