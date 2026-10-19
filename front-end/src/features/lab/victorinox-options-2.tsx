/**
 * Lab: Victorinox section options V3 to V5 (shared pieces in victorinox-options.tsx).
 */
import type {
  Design,
  Group,
  VictorinoxOptionProps,
} from './victorinox-options'

import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EngraveIcon,
} from '@/components/icons'

import { Media } from '@/components/media'
import { knifeArt } from '@/lib/victorinox-art'
import {
  collections,
  ctaRed,
  PartnerLine,
  PlainRail,
  Price,
  SeeAll,
  StoryLink,
  toDesigns,
} from './victorinox-options'

const chapterStyle: Record<
  Group,
  { scene: string, card: string, veil: string, text: string, sub: string }
> = {
  lucerne: {
    scene: 'lucerne-kapellbruecke-1200',
    card: 'bg-[#0e3a5c]',
    veil: 'bg-gradient-to-b from-[#0e3a5c]/30 via-[#0e3a5c]/80 to-[#0e3a5c]',
    text: 'text-white',
    sub: 'text-white',
  },
  passes: {
    scene: 'furka-hairpins',
    card: 'bg-[#2c3138]',
    veil: 'bg-gradient-to-b from-[#2c3138]/30 via-[#2c3138]/80 to-[#2c3138]',
    text: 'text-white',
    sub: 'text-white',
  },
  finsterwald: {
    scene: 'finsterwald-beehouse',
    card: 'bg-[#f4cf62]',
    veil: 'bg-gradient-to-b from-[#f4cf62]/70 via-[#f4cf62]/90 to-[#f4cf62]',
    text: 'text-foreground',
    sub: 'text-foreground',
  },
}

function ChapterKnives({ designs }: { designs: Design[] }) {
  if (designs.length === 1) {
    const d = designs[0]

    return (
      <Link
        className="flex items-center gap-5 rounded-2xl px-4 outline-none focus-visible:focus-ring active:opacity-85"
        params={{ slug: d.slug }}
        to="/gifts/$slug"
      >
        <img
          alt=""
          className="h-44 rotate-[12deg] drop-shadow-[0_16px_18px_rgba(90,60,0,0.45)] motion-safe:animate-[vx-bob_4s_ease-in-out_infinite]"
          src={d.art}
        />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-serif text-card-title">{d.name}</span>
          <Price className="text-sm" design={d} />
          <span className="mt-2 inline-flex h-11 items-center gap-1 self-start rounded-full bg-foreground px-4 text-sm font-semibold text-white">
            View design
            <ChevronRightIcon aria-hidden size={16} />
          </span>
        </span>
      </Link>
    )
  }

  const mid = (designs.length - 1) / 2

  return (
    <ul className="flex items-end justify-center">
      {designs.map((d, i) => {
        const offset = i - mid

        return (
          <li key={d.key} className="-mx-0.5 flex-1">
            <Link
              aria-label={`${d.name}, ${d.line}`}
              className="flex flex-col items-center gap-1.5 rounded-xl pb-1 outline-none focus-visible:ring-2 focus-visible:ring-white active:opacity-85"
              params={{ slug: d.slug }}
              to="/gifts/$slug"
            >
              <img
                alt=""
                className="h-32 drop-shadow-[0_10px_10px_rgba(0,0,0,0.45)]"
                src={d.art}
                style={{
                  transform: `rotate(${offset * 6}deg) translateY(${(Math.abs(offset) - mid) * 8}px)`,
                }}
              />
              {d.group === 'passes' && (
                <span
                  aria-hidden
                  className="relative z-10 text-[11px] font-semibold"
                >
                  {d.line.split(' · ')[1]}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * V3 Three chapters: Luzerne icons, Alpine passes and Finsterwald as three stacked cards,
 * each with its own colour world and photo. The cards stick and pile up as you scroll.
 */
export function VxChapters({
  items,
  isLoading,
  seeAll,
  subtitle,
  story,
}: VictorinoxOptionProps) {
  const designs = toDesigns(items, isLoading)

  return (
    <section aria-labelledby="vx-chapters" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <PartnerLine />
        <h2 className="font-serif text-display" id="vx-chapters">
          Victorinox
        </h2>
        <p className="text-body text-muted">
          {subtitle}, in three collections.
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {collections.map((c, i) => {
          const style = chapterStyle[c.id]
          const own = designs.filter(d => d.group === c.id)

          return (
            <li
              key={c.id}
              className={`sticky overflow-hidden rounded-3xl shadow-overlay ${style.card} ${style.text}`}
              style={{ top: `${12 + i * 10}px` }}
            >
              <div aria-hidden className="absolute inset-x-0 top-0 h-48">
                <Media alt="" className="size-full" photo={style.scene} />
              </div>
              <div
                aria-hidden
                className={`absolute inset-x-0 top-0 h-48 ${style.veil}`}
              />
              <div className="relative flex flex-col gap-4 px-4 pt-5 pb-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-title">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white">
                    {own.length} {own.length === 1 ? 'design' : 'designs'}
                  </span>
                </div>
                <div className="mt-10 flex flex-col gap-1">
                  <h3 className="font-serif text-display">{c.title}</h3>
                  <p className={`text-sm font-medium ${style.sub}`}>{c.line}</p>
                </div>
                <ChapterKnives designs={own} />
              </div>
            </li>
          )
        })}
      </ol>

      <SeeAll label={seeAll} />
      <StoryLink story={story} />
    </section>
  )
}

/* ------------------------------------------------------------------------------------- */

const timeline = [
  {
    year: '1884',
    text: 'Karl Elsener opens a cutler’s workshop in Ibach, canton Schwyz, with the support of his mother, Victoria.',
  },
  { year: '1891', text: 'The first soldier’s knives for the Swiss Army.' },
  {
    year: '1897',
    text: 'The Officer’s and Sports Knife is patented: the Swiss Army Knife.',
  },
  {
    year: '1909',
    text: 'The brand is named Victoria in her memory, and the Cross and Shield is registered.',
  },
]

const later = [
  { year: '2017', text: 'In July, the 500 millionth pocket knife.' },
  {
    year: 'Today',
    text: '90% owned by a family foundation, with a lifetime warranty on every knife. The Victorinox Store is at Hirschenplatz 12, in the old town.',
  },
]

function Step({ year, text }: { year: string, text: string }) {
  return (
    <li className="relative flex flex-col gap-0.5 pl-6">
      <span
        aria-hidden
        className="absolute top-2 left-[-5px] size-2.5 rounded-full bg-accent ring-4 ring-hero-cream"
      />
      <span className="font-serif text-title text-accent-soft-foreground">
        {year}
      </span>
      <span className="text-body text-pretty">{text}</span>
    </li>
  )
}

/**
 * V4 Heritage first: the brand story from 1884 as a short timeline, with one knife pinned
 * beside it while you scroll, the 1921 name as a type moment, then a swipe carousel of
 * the designs on their scenery photos.
 */
export function VxHeritage({
  items,
  isLoading,
  seeAll,
  subtitle,
  story,
}: VictorinoxOptionProps) {
  const designs = toDesigns(items, isLoading)

  return (
    <section
      aria-labelledby="vx-heritage"
      className="-mx-4 bg-hero-cream px-4 pt-8 pb-8"
    >
      <PartnerLine />
      <h2
        className="mt-3 font-serif text-display text-balance"
        id="vx-heritage"
      >
        Victorinox, made in Ibach since 1884
      </h2>

      <div className="mt-6 grid grid-cols-[1fr_6rem] gap-2">
        <ol className="flex flex-col gap-5 border-l-2 border-accent/30">
          {timeline.map(s => (
            <Step key={s.year} {...s} />
          ))}
        </ol>
        <div className="relative">
          <img
            alt=""
            className="sticky top-6 mx-auto h-52 rotate-[7deg] drop-shadow-[0_18px_20px_rgba(80,40,0,0.35)]"
            src={knifeArt.lion}
          />
        </div>
      </div>

      <div className="my-7 flex flex-col items-center gap-1 rounded-3xl bg-white px-4 py-5 text-center shadow-surface">
        <span className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
          1921 · stainless steel
        </span>
        <p className="font-serif text-title">
          Victoria
          {' '}
          <span className="text-accent-soft-foreground">+</span>
          {' '}
          inox
        </p>
        <span aria-hidden className="text-muted">
          =
        </span>
        <p className="font-serif text-[44px] leading-none tracking-tight">
          Victor
          <span className="text-accent-soft-foreground">inox</span>
        </p>
      </div>

      <ol className="flex flex-col gap-5 border-l-2 border-accent/30">
        {later.map(s => (
          <Step key={s.year} {...s} />
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-1">
        <h3 className="font-serif text-title">Your Luzerne design</h3>
        <p className="text-sm text-muted">{subtitle}.</p>
      </div>

      <div className="mt-4">
        <PlainRail label="Victorinox designs">
          {designs.map(d => (
            <li key={d.key} className="w-[15.5rem] shrink-0 snap-start">
              <Link
                className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-surface outline-none select-none focus-visible:focus-ring active:opacity-85"
                params={{ slug: d.slug }}
                to="/gifts/$slug"
              >
                <span className="relative block h-60">
                  <Media alt="" className="h-40 w-full" photo={d.scene} />
                  <img
                    alt=""
                    className="absolute right-4 bottom-0 h-48 rotate-[8deg] drop-shadow-[0_14px_14px_rgba(0,0,0,0.35)]"
                    src={d.art}
                  />
                </span>
                <span className="flex flex-col gap-0.5 px-4 pt-1 pb-4">
                  <span className="font-serif text-card-title">{d.name}</span>
                  <span className="text-label text-muted">{d.line}</span>
                  <Price className="mt-1 text-sm" design={d} />
                </span>
              </Link>
            </li>
          ))}
        </PlainRail>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <SeeAll label={seeAll} />
        <StoryLink story={story} />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------------------- */

const roundButton
  = 'flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-foreground shadow-surface outline-none focus-visible:focus-ring active:opacity-70 disabled:opacity-40'

/**
 * V5 Workshop: a light, cream workbench. One big knife at a time (previous, next and a strip
 * of all twelve), its front beside a steel back that shows the name and date as the guest
 * types them. Nothing turns on its own.
 */
export function VxWorkshop({
  items,
  isLoading,
  seeAll,
  story,
}: VictorinoxOptionProps) {
  const designs = toDesigns(items, isLoading)
  const [index, setIndex] = useState(1)
  const [text, setText] = useState('Anna 16.10.2026')
  const textId = useId()
  const current = designs[Math.min(index, designs.length - 1)]
  const step = (by: number) =>
    setIndex(i => (i + by + designs.length) % designs.length)

  if (!current)
    return null

  return (
    <section
      aria-labelledby="vx-workshop"
      className="-mx-4 bg-hero-cream px-4 pt-8 pb-8"
    >
      <PartnerLine extra="Victorinox" />
      <h2
        className="mt-3 font-serif text-display text-balance"
        id="vx-workshop"
      >
        A Swiss Army Knife with your name on it
      </h2>

      <div className="mt-6 flex items-end justify-center gap-6">
        <figure className="flex flex-col items-center gap-2">
          <img
            key={current.key}
            alt={`${current.name}, front of the knife`}
            className="h-72 -rotate-3 drop-shadow-[0_20px_22px_rgba(80,50,0,0.35)] motion-safe:animate-[vx-swap_350ms_ease-out_both]"
            src={current.art}
          />
          <figcaption className="text-label text-muted">Front</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-2">
          <div
            aria-label={`Back of the knife, engraved: ${text || 'your name'}`}
            className="relative flex h-[17rem] w-[6.5rem] rotate-3 items-center justify-center rounded-[3.25rem] bg-[linear-gradient(100deg,#8f959b_0%,#e6e9ec_28%,#b9bec3_52%,#f3f4f5_74%,#9aa0a6_100%)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),0_20px_22px_rgba(80,50,0,0.3)]"
            role="img"
          >
            <span
              aria-hidden
              className="max-h-60 rotate-180 overflow-hidden font-serif text-xl whitespace-nowrap italic [writing-mode:vertical-rl] text-[#4b5056] [text-shadow:0_1px_0_rgb(255_255_255/0.75),0_-1px_0_rgb(0_0_0/0.25)]"
            >
              {text || 'Your name'}
            </span>
          </div>
          <figcaption className="text-label text-muted">
            Back, engraved
          </figcaption>
        </figure>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          aria-label="Previous design"
          className={roundButton}
          type="button"
          onClick={() => step(-1)}
        >
          <ChevronLeftIcon size={20} />
        </button>
        <div
          aria-live="polite"
          className="flex min-w-0 flex-1 flex-col text-center"
        >
          <span className="truncate font-serif text-card-title">
            {current.name}
          </span>
          <span className="text-label text-muted">
            {index + 1} of {designs.length} · {current.line}
          </span>
        </div>
        <button
          aria-label="Next design"
          className={roundButton}
          type="button"
          onClick={() => step(1)}
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>

      <div className="mt-3">
        <PlainRail label="Choose a design">
          {designs.map((d, i) => (
            <li key={d.key} className="shrink-0">
              <button
                aria-label={d.name}
                aria-pressed={i === index}
                className={`flex h-16 w-11 items-center justify-center rounded-xl outline-none focus-visible:focus-ring ${i === index ? 'bg-white shadow-surface ring-2 ring-foreground' : ''}`}
                type="button"
                onClick={() => setIndex(i)}
              >
                <img alt="" className="h-14" src={d.art} />
              </button>
            </li>
          ))}
        </PlainRail>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-surface">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <EngraveIcon aria-hidden size={18} />
          Try the engraving
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="flex justify-between text-label text-muted">
            <label htmlFor={textId}>Name and date</label>
            <span aria-hidden>{text.length}/20</span>
          </span>
          <input
            className="h-11 w-full min-w-0 rounded-xl border border-field-border bg-field-background px-3 text-base outline-none focus-visible:focus-ring"
            id={textId}
            maxLength={20}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>
        <p className="text-label text-muted">
          Engraved on the back in the shop. Three sizes: 58, 91 and 111 mm.
        </p>
        <div className="flex items-center justify-between gap-3">
          <Price className="text-sm" design={current} />
          <Link
            className={`${ctaRed} h-11 text-sm`}
            params={{ slug: current.slug }}
            to="/gifts/$slug"
          >
            Engrave this design
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <SeeAll label={seeAll} variant="outline" />
        <StoryLink story={story} />
      </div>
    </section>
  )
}
