/**
 * Lab: five competing layouts for the Victorinox partner section on the guest home (C01),
 * compared on /lab/victorinox. This file holds the shared pieces and options V1 and V2;
 * V3 to V5 are in victorinox-options-2.tsx. Lab-only copy is written in English.
 */
import type { ProductCardProps } from '@/features/catalog/components/product-card'
import type { StoryView } from '@/features/discovery/components/discovery-home'

import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { ChevronRightIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { knifeArt, knifeDesigns } from '@/lib/victorinox-art'

const VICTORINOX_NAME_PREFIX = /^Victorinox /

export interface VictorinoxOptionProps {
  items: ProductCardProps[]
  isLoading: boolean
  /** "See all 12 designs". */
  seeAll: string
  subtitle: string
  intro: string
  story?: StoryView
}

export type Group = (typeof knifeDesigns)[number]['group']

export interface Design {
  key: string
  group: Group
  slug: string
  art: string
  name: string
  line: string
  scene: string
  price?: string
  fromLabel?: string
}

const meta: Record<string, { name: string, line: string, scene: string }> = {
  'swan': {
    name: 'Swan on the lake',
    line: 'The white swans of Lake Luzerne',
    scene: 'lucerne-swan',
  },
  'chapel-bridge': {
    name: 'Chapel Bridge',
    line: 'The Chapel Bridge and the Water Tower',
    scene: 'lucerne-kapellbruecke-1200',
  },
  'pilatus': {
    name: 'Pilatus',
    line: 'Pilatus and the Dragon Ride cable car',
    scene: 'pilatus',
  },
  'lion': {
    name: 'Lion Monument',
    line: 'The Lion Monument',
    scene: 'lion-monument',
  },
  'old-town': {
    name: 'Old town on the Reuss',
    line: 'The old town on the Reuss',
    scene: 'lucerne-old-town',
  },
  'steamboat': {
    name: 'Paddle steamer',
    line: 'A historic paddle steamer on the lake',
    scene: 'lake-steamboat',
  },
  'furka': {
    name: 'Furka Pass',
    line: 'Furka · 2,429 m',
    scene: 'furka-hairpins',
  },
  'grimsel': {
    name: 'Grimsel Pass',
    line: 'Grimsel · 2,164 m',
    scene: 'grimsel-dam',
  },
  'susten': {
    name: 'Susten Pass',
    line: 'Susten · 2,224 m',
    scene: 'susten-steinsee',
  },
  'gotthard': {
    name: 'Gotthard Pass',
    line: 'Gotthard · 2,106 m',
    scene: 'gotthard-devils-bridge',
  },
  'nufenen': {
    name: 'Nufenen Pass',
    line: 'Nufenen · 2,478 m',
    scene: 'nufenen-pass',
  },
  'finsterwald': {
    name: 'Finsterwald bees',
    line: 'Bees, a beehouse and wildflowers',
    scene: 'finsterwald-beehouse',
  },
}

export const collections: {
  id: Group
  title: string
  line: string
}[] = [
  {
    id: 'lucerne',
    title: 'Luzerne icons',
    line: 'The lake, the bridges and the mountain above town',
  },
  {
    id: 'passes',
    title: 'Alpine passes',
    line: 'Five high roads over the Alps, from 2,106 to 2,478 m',
  },
  {
    id: 'finsterwald',
    title: 'Finsterwald',
    line: 'Bees, a beehouse and wildflowers',
  },
]

/**
 * The twelve designs in showcase order. The art is local, so it shows while the demo data
 * loads (without prices); once loaded, only designs that are on sale are kept.
 */
export function toDesigns(
  items: ProductCardProps[],
  isLoading: boolean,
): Design[] {
  const bySlug = new Map(items.map(item => [item.slug, item]))

  return knifeDesigns
    .map(({ key, group }) => {
      const slug = `victorinox-${key}`
      const item = bySlug.get(slug)

      return {
        key,
        group,
        slug,
        art: knifeArt[key],
        name: item?.name.replace(VICTORINOX_NAME_PREFIX, '') ?? meta[key].name,
        line: meta[key].line,
        scene: meta[key].scene,
        price: item?.price,
        fromLabel: item?.fromLabel,
        onSale: Boolean(item),
      }
    })
    .filter(d => isLoading || d.onSale)
}

/** Tiny Cross and Shield glyph in CSS: red shield, white cross (inverse on red grounds). */
export function ShieldMark({ inverse = false }: { inverse?: boolean }) {
  const cross = inverse ? 'bg-accent' : 'bg-white'

  return (
    <span
      aria-hidden
      className={`relative inline-flex h-3.5 w-3 shrink-0 items-center justify-center rounded-t-[3px] rounded-b-[6px] ${inverse ? 'bg-white' : 'bg-accent'}`}
    >
      <span className={`absolute h-[7px] w-[2px] ${cross}`} />
      <span className={`absolute h-[2px] w-[7px] ${cross}`} />
    </span>
  )
}

/** "Our partner · Victorinox" line with the glyph. */
export function PartnerLine({
  tone = 'ink',
  extra,
}: {
  tone?: 'ink' | 'white'
  extra?: string
}) {
  return (
    <p
      className={`flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase ${tone === 'white' ? 'text-white' : 'text-muted'}`}
    >
      <ShieldMark inverse={tone === 'white'} />
      Our partner
      {extra && (
        <>
          <span aria-hidden>·</span>
          {extra}
        </>
      )}
    </p>
  )
}

export function Price({
  design,
  className = '',
}: {
  design: Design
  className?: string
}) {
  if (!design.price) {
    return (
      <span
        aria-hidden
        className={`inline-block h-3.5 w-20 animate-pulse rounded-full bg-current opacity-20 ${className}`}
      />
    )
  }

  return (
    <span className={className}>
      {design.fromLabel}
      {' '}
      <span className="font-semibold">{design.price}</span>
    </span>
  )
}

const focusLight = 'outline-none focus-visible:focus-ring'
const focusDark
  = 'outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2'

export const ctaRed = `flex h-12 items-center justify-center gap-1 rounded-full bg-accent px-5 text-base font-semibold text-accent-foreground ${focusLight} active:opacity-85`

/** The main call to action: the list of all designs. */
export function SeeAll({
  label,
  variant = 'red',
}: {
  label: string
  variant?: 'red' | 'white' | 'outline'
}) {
  const { language } = useLocale()
  const classes = {
    red: ctaRed,
    white: `flex h-12 items-center justify-center gap-1 rounded-full bg-white px-5 text-base font-semibold text-foreground ${focusDark} focus-visible:ring-offset-transparent active:opacity-85`,
    outline: `flex h-12 items-center justify-center gap-1 rounded-full border border-foreground px-5 text-base font-semibold text-foreground ${focusLight} active:opacity-70`,
  }

  return (
    <Link
      className={classes[variant]}
      search={{ subcategory: 'victorinox' }}
      to="/$lang/gifts"
      params={{ lang: language }}
    >
      {label}
      <ChevronRightIcon aria-hidden size={18} />
    </Link>
  )
}

/** The brand story as a row; tone follows the ground it sits on. */
export function StoryLink({
  story,
  tone = 'ink',
}: {
  story?: StoryView
  tone?: 'ink' | 'white'
}) {
  const { language } = useLocale()
  if (!story)
    return null
  const white = tone === 'white'

  return (
    <Link
      className={`flex min-h-11 items-center gap-3 rounded-2xl py-1 select-none active:opacity-80 ${white ? focusDark : focusLight}`}
      params={{ lang: language, slug: story.slug }}
      to="/$lang/stories/$slug"
    >
      <Media
        alt=""
        className="size-14 shrink-0 rounded-2xl"
        photo={story.photo}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-serif text-card-title text-balance">
          {story.title}
        </span>
        <span className={`text-label ${white ? 'text-white' : 'text-muted'}`}>
          {story.meta}
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className={`shrink-0 ${white ? 'text-white' : 'text-muted'}`}
        size={18}
      />
    </Link>
  )
}

/**
 * A swipe rail without the edge fade, for coloured grounds (ScrollShadow fades to white).
 * Runs to the screen edges like Rail.
 */
export function PlainRail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      aria-label={label}
      className="-mx-4 overflow-x-auto [scrollbar-width:none]"
      role="region"
    >
      <ul className="flex snap-x snap-mandatory scroll-px-4 gap-3 px-4 pt-1 pb-2">
        {children}
      </ul>
    </div>
  )
}

/** Keyframes for the lab's few motions; all of them sit behind motion-safe. */
export function VxKeyframes() {
  return (
    <style>
      {`
@keyframes vx-rise { from { opacity: 0; translate: 0 24px; } }
@keyframes vx-swap { from { opacity: 0; translate: 0 12px; rotate: -4deg; } }
@keyframes vx-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -6px; } }
`}
    </style>
  )
}

/* ------------------------------------------------------------------------------------- */

const fan = [
  { key: 'steamboat', rotate: -26 },
  { key: 'furka', rotate: -13 },
  { key: 'chapel-bridge', rotate: 0 },
  { key: 'finsterwald', rotate: 13 },
  { key: 'pilatus', rotate: 26 },
]

/**
 * V1 Marquee: the page's one Swiss-red, full-bleed spread. An oversized serif wordmark with
 * a fan of five knives rising over it, then a swipe gallery of all twelve on white tiles.
 */
export function VxMarquee({
  items,
  isLoading,
  seeAll,
  subtitle,
  intro,
  story,
}: VictorinoxOptionProps) {
  const { language } = useLocale()
  const designs = toDesigns(items, isLoading)

  return (
    <section
      aria-labelledby="vx-marquee"
      className="relative isolate -mx-4 overflow-hidden bg-accent pt-7 pb-8 text-white"
    >
      <div className="flex items-center justify-between px-4">
        <PartnerLine tone="white" />
        <span className="text-xs font-semibold tracking-[0.18em] uppercase">
          Since 1884
        </span>
      </div>

      <div className="relative mt-4 h-[330px]">
        <h2
          className="absolute inset-x-0 top-0 text-center font-serif text-[76px] leading-none tracking-[-0.03em]"
          id="vx-marquee"
        >
          Victorinox
        </h2>
        <div aria-hidden className="absolute inset-x-0 top-[70px] h-[260px]">
          {fan.map(({ key, rotate }, i) => (
            <img
              key={key}
              alt=""
              className="absolute top-0 left-1/2 h-[230px] origin-[50%_150%] drop-shadow-[0_10px_14px_rgba(60,0,0,0.4)] motion-safe:animate-[vx-rise_700ms_cubic-bezier(0.2,0.8,0.2,1)_both]"
              src={knifeArt[key]}
              style={{
                transform: `translateX(-50%) rotate(${rotate}deg)`,
                animationDelay: `${i * 70}ms`,
                zIndex: 10 - Math.abs(i - 2),
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 px-4">
        <p className="font-serif text-title text-balance">{subtitle}</p>
        <p className="text-body text-pretty">{intro}</p>
      </div>

      <div className="mt-6 px-4">
        <PlainRail label="Victorinox designs">
          {designs.map(d => (
            <li key={d.key} className="w-36 shrink-0 snap-start">
              <Link
                className="flex flex-col gap-2 rounded-2xl bg-white p-2 pb-3 text-foreground outline-none select-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-accent active:opacity-85"
                params={{ lang: language, slug: d.slug }}
                to="/$lang/gifts/$slug"
              >
                <span className="flex h-44 items-center justify-center rounded-xl bg-hero-cream">
                  <img
                    alt=""
                    className="h-40 -rotate-6 drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)]"
                    src={d.art}
                  />
                </span>
                <span className="flex flex-col gap-0.5 px-1">
                  <span className="line-clamp-2 text-sm leading-tight font-semibold">
                    {d.name}
                  </span>
                  <Price className="text-label text-muted" design={d} />
                </span>
              </Link>
            </li>
          ))}
        </PlainRail>
      </div>

      <div className="mt-5 flex flex-col gap-4 px-4">
        <SeeAll label={seeAll} variant="white" />
        <StoryLink story={story} tone="white" />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------------------- */

function groupTitle(group: Group) {
  return collections.find(c => c.id === group)?.title ?? ''
}

/**
 * V2 Collector's cabinet: a dark pegboard case with all twelve knives upright on two
 * labelled shelves. Tapping one brings it forward into the feature panel at the top.
 */
export function VxCabinet({
  items,
  isLoading,
  seeAll,
  subtitle,
  story,
}: VictorinoxOptionProps) {
  const { language } = useLocale()
  const designs = toDesigns(items, isLoading)
  const [selectedKey, setSelectedKey] = useState('chapel-bridge')
  const selected
    = designs.find(d => d.key === selectedKey) ?? designs[0] ?? undefined
  const shelves = [
    {
      label: 'Luzerne icons',
      designs: designs.filter(d => d.group === 'lucerne'),
    },
    {
      label: 'Alpine passes · Finsterwald',
      designs: designs.filter(d => d.group !== 'lucerne'),
    },
  ]

  return (
    <section
      aria-labelledby="vx-cabinet"
      className="-mx-4 bg-foreground bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1.6px)] bg-[length:14px_14px] px-4 pt-8 pb-8 text-white"
    >
      <PartnerLine tone="white" />
      <h2 className="mt-3 font-serif text-display" id="vx-cabinet">
        The Victorinox cabinet
      </h2>
      <p className="mt-1 text-body text-pretty">
        {subtitle}
        .
      </p>

      {selected && (
        <div className="mt-6 grid min-h-64 grid-cols-[7.5rem_1fr] items-center gap-4 rounded-3xl bg-white/[0.07] p-4 ring-1 ring-white/15">
          <div className="flex h-60 items-center justify-center">
            <img
              key={selected.key}
              alt={`${selected.name}, front of the knife`}
              className="h-56 -rotate-[8deg] drop-shadow-[0_20px_24px_rgba(0,0,0,0.6)] motion-safe:animate-[vx-swap_400ms_ease-out_both]"
              src={selected.art}
            />
          </div>
          <div aria-live="polite" className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
              {groupTitle(selected.group)}
            </span>
            <span className="font-serif text-title text-balance">
              {selected.name}
            </span>
            <span className="text-label text-white">{selected.line}</span>
            <Price className="text-sm text-white" design={selected} />
            <Link
              className="mt-2 flex h-11 items-center justify-center gap-1 rounded-full bg-accent px-4 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-foreground active:opacity-85"
              params={{ lang: language, slug: selected.slug }}
              to="/$lang/gifts/$slug"
            >
              View design
              <ChevronRightIcon aria-hidden size={16} />
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-5">
        {shelves.map(shelf => (
          <div key={shelf.label} className="flex flex-col">
            <ul className="grid grid-cols-6 items-end gap-1">
              {shelf.designs.map((d) => {
                const isSelected = d.key === selected?.key

                return (
                  <li key={d.key}>
                    <button
                      aria-label={d.name}
                      aria-pressed={isSelected}
                      className="group flex h-36 w-full flex-col items-center justify-end gap-1.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white"
                      type="button"
                      onClick={() => setSelectedKey(d.key)}
                    >
                      <img
                        alt=""
                        className={`h-28 drop-shadow-[0_6px_6px_rgba(0,0,0,0.5)] motion-safe:transition-transform motion-safe:duration-200 ${isSelected ? '-translate-y-2 scale-105' : 'opacity-80 group-hover:-translate-y-1'}`}
                        src={d.art}
                      />
                      <span
                        aria-hidden
                        className={`h-1 w-5 rounded-full ${isSelected ? 'bg-white' : 'bg-transparent'}`}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div
              aria-hidden
              className="h-2 rounded-sm bg-gradient-to-b from-white/30 to-white/5 shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
            />
            <span className="mt-2 text-xs font-semibold tracking-[0.14em] text-white uppercase">
              {shelf.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-4">
        <SeeAll label={seeAll} variant="white" />
        <StoryLink story={story} tone="white" />
      </div>
    </section>
  )
}
