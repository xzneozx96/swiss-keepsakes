import type { ReactNode } from 'react'
import type { PrivateTourOptionProps } from './private-tour-options'

import { buttonVariants } from '@heroui/react'

import { ArrowRightIcon, TravelGroupIcon } from '@/components/icons'
import { Media } from '@/components/media'

/** Lab round 2: variations on option C (a polaroid with a sticky note). */

const pill = `${buttonVariants({ variant: 'primary' })} transition-transform active:scale-[0.98]`
const shell
  = 'flex flex-col items-center gap-5 rounded-3xl bg-hero-cream px-5 pt-6 pb-6 text-center'
const yellow = 'bg-[#fdf2a8]'
const pink = 'bg-[#fbd5d0]'

function Action({ label, full = false }: { label: string, full?: boolean }) {
  return (
    <a
      className={`${pill} ${full ? 'w-full' : ''}`}
      href="#/tours/private-tour"
    >
      {label}
      <ArrowRightIcon aria-hidden size={18} />
    </a>
  )
}

function Heading({
  title,
  body,
  align = 'center',
}: {
  title: string
  body: string
  align?: 'center' | 'start'
}) {
  return (
    <div
      className={`flex max-w-[30ch] flex-col gap-1.5 ${align === 'start' ? 'text-start' : ''}`}
    >
      <h3 className="font-serif text-title text-balance">{title}</h3>
      <p className="text-sm text-foreground/75">{body}</p>
    </div>
  )
}

function Polaroid({
  photo,
  caption,
  className,
  aspect = 'aspect-[4/3]',
  children,
}: {
  photo: string
  caption: string
  className: string
  aspect?: string
  children?: ReactNode
}) {
  return (
    <figure
      className={`absolute flex flex-col gap-1 bg-white p-2 pb-3 shadow-overlay ${className}`}
    >
      <Media alt="" className={aspect} photo={photo} />
      <figcaption className="font-serif text-sm italic">{caption}</figcaption>
      {children}
    </figure>
  )
}

/** A strip of semi-transparent tape. */
function Tape({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute h-4 w-12 bg-white/70 shadow-sm ${className}`}
    />
  )
}

/** A red push-pin. */
function Pin({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute size-4 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,0.3)] ring-2 ring-white/60 ${className}`}
    />
  )
}

function Note({
  facts,
  colour = yellow,
  className,
  children,
}: {
  facts?: string[]
  colour?: string
  className: string
  children?: ReactNode
}) {
  return (
    <div
      className={`absolute flex flex-col gap-1 p-3 text-start font-serif text-xs italic shadow-overlay ${colour} ${className}`}
    >
      {children}
      {facts?.map(f => (
        <span key={f}>· {f}</span>
      ))}
    </div>
  )
}

function caption(language: 'en' | 'de', en: string, de: string) {
  return language === 'de' ? de : en
}

/** C1 · Two polaroids, the note pinned between them. */
export function PrivateTwoPolaroids(p: PrivateTourOptionProps) {
  return (
    <section className={shell}>
      <div aria-hidden className="relative h-48 w-full">
        <Polaroid
          aspect="aspect-square"
          caption={caption(p.language, 'your dates', 'eure Daten')}
          className="start-[2%] top-3 w-[44%] -rotate-6"
          photo="lake-steamboat"
        />
        <Polaroid
          aspect="aspect-square"
          caption={caption(p.language, 'your group', 'eure Gruppe')}
          className="end-[2%] top-0 w-[44%] rotate-3"
          photo="lucerne-old-town"
        />
        <Note
          className="start-1/2 top-24 z-10 w-[40%] -translate-x-1/2 -rotate-2"
          facts={p.facts}
        >
          <Pin className="-top-2 start-1/2 -translate-x-1/2" />
        </Note>
      </div>
      <Heading body={p.body} title={p.title} />
      <Action label={p.action} />
    </section>
  )
}

/** C2 · A bigger photo, the note held on by a push-pin, handwritten in one sentence. */
export function PrivatePinnedNote(p: PrivateTourOptionProps) {
  return (
    <section className={shell}>
      <div aria-hidden className="relative h-56 w-full">
        <Polaroid
          caption={caption(p.language, 'just your group', 'nur eure Gruppe')}
          className="start-0 top-0 w-[82%] -rotate-2"
          photo="lucerne-kapellbruecke-1200"
        />
        <Note
          className="end-0 bottom-0 w-[46%] rotate-3 text-sm"
          colour={yellow}
        >
          <Pin className="-top-2 start-4" />
          {caption(
            p.language,
            'Up to 50 of you, any day you like. We plan the rest.',
            'Bis zu 50 Personen, an jedem Tag. Den Rest planen wir.',
          )}
        </Note>
      </div>
      <Heading body={p.body} title={p.title} />
      <Action label={p.action} />
    </section>
  )
}

/** C3 · Text on the left, the polaroid and the note on the right; full-width button. */
export function PrivateSideBySide(p: PrivateTourOptionProps) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-hero-cream p-5">
      <div className="grid grid-cols-[1fr_42%] items-center gap-3">
        <Heading align="start" body={p.body} title={p.title} />
        <div aria-hidden className="relative h-44">
          <Polaroid
            aspect="aspect-[3/4]"
            caption={caption(p.language, 'your group', 'eure Gruppe')}
            className="end-1 top-0 w-[92%] rotate-3"
            photo="musegg-wall"
          />
          <Note
            className="-start-3 bottom-0 w-[80%] -rotate-6"
            facts={[p.facts[0], p.facts[1]]}
          >
            <Tape className="-top-2 start-1/2 -translate-x-1/2 -rotate-3" />
          </Note>
        </div>
      </div>
      <Action full label={p.action} />
    </section>
  )
}

/** C4 · The note as a checklist: what the guest gives, and what the team does. */
export function PrivateChecklist(p: PrivateTourOptionProps) {
  const items
    = p.language === 'de'
      ? [
          ['✓', 'Gruppengrösse'],
          ['✓', 'Eure Daten'],
          ['☐', 'Tourplan: macht unser Team'],
        ]
      : [
          ['✓', 'Group size'],
          ['✓', 'Your dates'],
          ['☐', 'Tour plan: our team does it'],
        ]

  return (
    <section className={shell}>
      <div aria-hidden className="relative h-52 w-full">
        <Polaroid
          caption={caption(p.language, 'your own tour', 'eure eigene Tour')}
          className="start-[4%] top-0 w-[64%] -rotate-3"
          photo="lucerne-water-tower"
        />
        <Note className="end-[2%] top-14 w-[46%] rotate-3 gap-1.5 text-sm">
          <Tape className="-top-2 start-1/2 -translate-x-1/2 rotate-2" />
          {items.map(([mark, text]) => (
            <span key={text} className="flex gap-1.5">
              <span className="not-italic">{mark}</span>
              {text}
            </span>
          ))}
        </Note>
      </div>
      <Heading body={p.body} title={p.title} />
      <Action label={p.action} />
    </section>
  )
}

/** C5 · Taped photo corners and a pink note, a little looser. */
export function PrivateTapedCorners(p: PrivateTourOptionProps) {
  return (
    <section className={shell}>
      <div aria-hidden className="relative h-52 w-full">
        <Polaroid
          caption={caption(
            p.language,
            'Luzerne, just for you',
            'Luzern, nur für euch',
          )}
          className="start-[10%] top-2 w-[70%] rotate-2"
          photo="pilatus"
        >
          <Tape className="-start-4 -top-1 -rotate-[35deg]" />
          <Tape className="-end-4 -top-1 rotate-[35deg]" />
        </Polaroid>
        <Note
          className="start-0 bottom-0 w-[44%] -rotate-6"
          colour={pink}
          facts={p.facts}
        />
      </div>
      <Heading body={p.body} title={p.title} />
      <Action label={p.action} />
    </section>
  )
}

/** C6 · A small pinboard: the polaroid, the note and a tour ticket stub. */
export function PrivatePinboard(p: PrivateTourOptionProps) {
  return (
    <section className={shell}>
      <div
        aria-hidden
        className="relative h-56 w-full rounded-2xl bg-[#e9dcc4] shadow-[inset_0_1px_4px_rgba(0,0,0,0.12)]"
      >
        <Polaroid
          caption={caption(p.language, 'just your group', 'nur eure Gruppe')}
          className="start-4 top-4 w-[52%] -rotate-3"
          photo="lucerne-old-town"
        >
          <Pin className="-top-1.5 start-1/2 -translate-x-1/2" />
        </Polaroid>
        <Note className="end-4 top-6 w-[38%] rotate-3" facts={p.facts}>
          <Pin className="-top-1.5 start-1/2 -translate-x-1/2" />
        </Note>
        <div className="absolute end-6 bottom-4 flex -rotate-6 items-center gap-1.5 rounded-md border border-dashed border-accent/50 bg-white px-2.5 py-1.5 font-serif text-[11px] text-accent italic shadow-sm">
          <TravelGroupIcon size={14} />
          {caption(p.language, 'Private tour', 'Private Tour')}
        </div>
      </div>
      <Heading body={p.body} title={p.title} />
      <Action label={p.action} />
    </section>
  )
}
