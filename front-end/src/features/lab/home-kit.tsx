/**
 * Lab kit for the guest home (C01) and search: the phone frame with the guest tab bar, the
 * state the three home options share, the cards, the shelf parts, the language switch, the
 * sorted line, the hero, the aerial map entry and the settle animation. Design only: state is local
 * and nothing leaves the lab page.
 */
import type { Answers, HomeItem, Language, SectionId, Shelf } from '@/features/lab/home-data'

import { Button, Skeleton } from '@heroui/react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { DateTile } from '@/components/date-tile'
import {
  AccountIcon,
  BackIcon,
  ChevronRightIcon,
  ExploreIcon,
  GiftIcon,
  LanguageIcon,
  PickupIcon,
  SearchIcon,
  SelectedIcon,
  SparkleIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { AdviceBanner } from '@/features/discovery/components/advice-banner'
import {
  answerSummary,
  copy,
  dayParts,
  HERO_PHOTO,
  homeItems,
  homeShelves,
  itemHref,
  itemMeta,
  itemTitle,
  keepsakes,
  mapCounts,
  occurrenceLabel,
  occurrences,
  occurrenceTime,
  shelfMapHref,
  whenOf,
} from '@/features/lab/home-data'
import { publicPins } from '@/features/lab/map-guest-data'
import { photoUrl } from '@/lib/photos'

// ---------------------------------------------------------------- lab states

export type HomeState
  = | 'after-onboarding'
    | 'short-food'
    | 'multi-history'
    | 'lake-shopping'
    | 'skipped'
    | 'loading'
    | 'language'
    | 'few-items'
    | 'thin-shelf'
    | 'no-events'
    | 'qr'

export const homeStates: { id: HomeState, label: string, note: string }[] = [
  { id: 'after-onboarding', label: 'Just after onboarding', note: 'The server HTML arrives newest first. After hydration the client re-ranks once for “Just today · Food and drink”: shelves and cards slide to their new places (only those that move), the sorted line swaps its text in the slot it already had. Nothing above the shelves moves. Reduced motion snaps.' },
  { id: 'short-food', label: 'Answered: short-stay + food', note: 'Food and drink first, Free and useful second, then Lake and mountains, Local activities, History and culture, Shopping and keepsakes, More in Lucerne. Nothing is hidden.' },
  { id: 'multi-history', label: 'Answered: multi-day + history', note: 'History and culture first, Free and useful second, then the rest in default order. Events still ahead lead inside each section.' },
  { id: 'lake-shopping', label: 'Answered: multi-day + lake and shopping', note: 'Lake and mountains first, Free and useful second, Shopping and keepsakes third (the other chosen interest), then the rest in default order.' },
  { id: 'skipped', label: 'Skipped (default order)', note: 'Default order: Lake and mountains, Free and useful, Food and drink, Local activities, History and culture, Shopping and keepsakes, then More in Lucerne. The line offers “Sort for my trip”.' },
  { id: 'loading', label: 'Loading (skeletons)', note: 'Client navigation only: the server HTML normally carries the content. The top block is static copy and shows at once; skeletons hold the shelves’ exact shape. Stays on until you switch state.' },
  { id: 'language', label: 'Missing in your language', note: 'Cards whose text exists only in the other language show it with a small “Only in German” or “Nur auf Englisch” tag and the right lang attribute. EN: Bäckerei am Weinmarkt and the Fasnacht story. DE: the Chapel Bridge story, the swans, the Weinmarkt morning. No machine translation (AC64).' },
  { id: 'few-items', label: 'Few published items (O35)', note: 'Six items. Shelves with one or two items turn into plain rows without “See all”; an empty shelf and its jump point are left out. No separate “thin home” layout is needed.' },
  { id: 'thin-shelf', label: 'A shelf with fewer than three', note: 'Food and drink has two items (the Weinmarkt story removed): rows instead of a swipe rail, no “See all”, the map action stays.' },
  { id: 'no-events', label: 'No upcoming events', note: 'Local activities keeps only its items without a date; a section that ends up empty is left out with its jump point. Events come back by themselves when the merchant adds a date.' },
  { id: 'qr', label: 'Arrival by partner QR', note: 'Looks the same (AC24): content at once, nothing to choose first. The visitor has not answered, so the line reads “Newest first · Sort for my trip”. N24 does not show on the home (stories only).' },
]

const FEW_ITEMS = new Set(['p1', 'p3', 'p8', 'story-the-dying-lion', 'story-steamboats', 'tour-rigi'])

export function itemsFor(state: HomeState): HomeItem[] {
  if (state === 'few-items')
    return homeItems.filter(item => FEW_ITEMS.has(item.id))
  if (state === 'thin-shelf')
    return homeItems.filter(item => item.id !== 'story-slow-morning-weinmarkt')
  if (state === 'no-events')
    return homeItems.filter(item => !item.pin?.dates)

  return homeItems
}

function answersFor(state: HomeState): Answers {
  if (state === 'short-food' || state === 'thin-shelf')
    return 'short-food'

  if (state === 'multi-history' || state === 'lake-shopping')
    return state

  return 'none'
}

// ---------------------------------------------------------------- shared home state

export type Screen
  = | { kind: 'home' }
    | { kind: 'all', id: SectionId }
    | { kind: 'map', id?: SectionId }
    | { kind: 'search' }
    | { kind: 'trip' }

/** Everything the three options share: answers with the hydration settle, screens, the lab toast. */
export function useHome(state: HomeState, language: Language, initial: Screen = { kind: 'home' }) {
  const items = itemsFor(state)
  const [answers, setAnswers] = useState<Answers>(() => state === 'after-onboarding' ? 'none' : answersFor(state))
  const [screen, setScreen] = useState<Screen>(initial)
  const [toast, setToast] = useState<string>()
  const prefix = useId()

  // Stand-in for hydration: the server order first, then one re-rank on the client.
  useEffect(() => {
    if (state !== 'after-onboarding')
      return
    const timer = setTimeout(setAnswers, 1200, 'short-food')

    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    if (!toast)
      return
    const timer = setTimeout(setToast, 3200, undefined)

    return () => clearTimeout(timer)
  }, [toast])

  const shelves = homeShelves(items, answers)

  return {
    items,
    answers,
    setAnswers,
    shelves,
    loading: state === 'loading',
    screen,
    setScreen,
    toast,
    /** The product would navigate; the lab says where. */
    open: (href: string) => setToast(href),
    headingId: (id: string) => `${prefix}-${id}`,
    /** Jump points: scroll the shelf's heading into view in the phone, then move focus to it. */
    jump(id: string) {
      const heading = document.getElementById(`${prefix}-${id}`)

      if (!heading)
        return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      heading.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
      heading.focus({ preventScroll: true })
    },
    shelfTitle: (id: SectionId) => copy[language].sections[id].title,
  }
}

export type HomeModel = ReturnType<typeof useHome>

// ---------------------------------------------------------------- settle (re-rank) animation

const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)'

/**
 * When `order` changes, every `[data-settle]` element inside `ref` glides from where it was to
 * where it is now (FLIP). Positions are relative to the nearest settling parent, so a card in a
 * moving shelf only moves by its own shift. DOM order stays the ranked order, so screen readers
 * hear what is shown. Reduced motion snaps.
 */
export function useSettle(ref: React.RefObject<HTMLElement | null>, order: string) {
  const placesRef = useRef(new Map<string, { x: number, y: number }>())
  const orderRef = useRef('')

  useLayoutEffect(() => {
    const root = ref.current

    if (!root)
      return
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-settle]'))
    const place = (node: HTMLElement) => {
      const parent = node.parentElement?.closest<HTMLElement>('[data-settle]') ?? root
      const a = node.getBoundingClientRect()
      const b = parent.getBoundingClientRect()

      return { x: a.left - b.left, y: a.top - b.top }
    }
    const before = placesRef.current
    const changed = orderRef.current !== '' && orderRef.current !== order

    placesRef.current = new Map(nodes.map(node => [node.dataset.settle ?? '', place(node)]))
    orderRef.current = order
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    for (const node of nodes) {
      const old = before.get(node.dataset.settle ?? '')
      const now = placesRef.current.get(node.dataset.settle ?? '')

      if (!old || !now)
        continue
      const dx = old.x - now.x
      const dy = old.y - now.y

      if (dx !== 0 || dy !== 0)
        node.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 560, easing: EASE })
    }
  })
}

/** A string that changes exactly when the shown order of shelves or cards changes. */
export function orderKey(shelves: Shelf[]) {
  return shelves.map(shelf => `${shelf.id}:${shelf.items.map(item => item.id).join(',')}`).join('|')
}

// ---------------------------------------------------------------- phone frame and tab bar

type Tab = 'explore' | 'keepsakes' | 'map' | 'account'

const tabLinkClass = 'flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] leading-4 font-medium text-muted select-none outline-none focus-visible:focus-ring active:opacity-70 data-[status=active]:text-accent'

/**
 * The product's tab bar, copied from `components/layout/guest-shell.tsx`: the same notch, five
 * slots, classes, icons and sizes, and the raised Assistant button (advice form). The only
 * change is the product's own decision D5: Map in the slot Tours has today, with the S4 map's
 * icon. Buttons stand in for the router links, with the same `data-status` styling.
 */
function ShellTabBar({ language, active, onTab }: {
  language: Language
  active: Tab
  onTab: (tab: Tab | 'assistant') => void
}) {
  const c = copy[language]
  const item = (id: Tab, Icon: typeof ExploreIcon) => {
    const isActive = active === id

    return (
      <li key={id}>
        <button
          aria-current={isActive ? 'page' : undefined}
          className={`w-full ${tabLinkClass}`}
          data-status={isActive ? 'active' : undefined}
          type="button"
          onClick={() => onTab(id)}
        >
          <Icon size={26} weight={isActive ? 'Filled' : 'Outline'} />
          {c.tabs[id]}
        </button>
      </li>
    )
  }

  return (
    <nav aria-label={c.tabBar} className="absolute bottom-0 z-30 w-full max-w-[430px]" data-lab-tabbar>
      <div
        aria-hidden
        className="absolute inset-0 flex [filter:drop-shadow(0_-1px_0_color-mix(in_oklab,var(--separator)_70%,transparent))_drop-shadow(0_-6px_14px_rgba(0,0,0,0.07))]"
      >
        <div className="flex-1 bg-surface" />
        <div className="flex w-[92px] flex-col">
          <svg className="block h-[30px] w-full text-surface" viewBox="0 0 92 30">
            <path d="M0 30V0H8.53A6 6 0 0 1 14.15 3.9A34 34 0 0 0 77.85 3.9A6 6 0 0 1 83.47 0H92V30Z" fill="currentColor" />
          </svg>
          <div className="-mt-px flex-1 bg-surface" />
        </div>
        <div className="flex-1 bg-surface" />
      </div>
      <ul className="relative grid grid-cols-5 pb-[env(safe-area-inset-bottom,0px)]">
        {item('explore', ExploreIcon)}
        {item('keepsakes', GiftIcon)}
        <li className="relative">
          <button
            className="group flex h-[60px] w-full flex-col items-center justify-end gap-0.5 pb-[7px] text-[11px] leading-4 font-medium text-muted data-[status=active]:text-accent outline-none select-none focus-visible:focus-ring"
            type="button"
            onClick={() => onTab('assistant')}
          >
            <span
              aria-hidden
              className="absolute -top-9 flex size-14 items-center justify-center rounded-full bg-assistant text-white shadow-[0_10px_18px_-6px_rgba(213,43,30,0.5)] transition-transform group-active:scale-95"
            >
              <SparkleIcon className="animate-sparkle" size={26} weight="Filled" />
            </span>
            {c.tabs.assistant}
          </button>
        </li>
        {item('map', PickupIcon)}
        {item('account', AccountIcon)}
      </ul>
    </nav>
  )
}

/**
 * 375 × 740 phone, the guest shell's width. The home scrolls inside it; other screens (see all,
 * the map stand-in, search) cover it above the tab bar. The lab toast says where a tap would go.
 */
export function HomePhone({ language, home, children, overlay }: {
  language: Language
  home: HomeModel
  children: React.ReactNode
  /** The screen that covers the home, from the option (search differs per option). */
  overlay?: React.ReactNode
}) {
  const active: Tab = home.screen.kind === 'map' ? 'map' : 'explore'

  function onTab(tab: Tab | 'assistant') {
    if (tab === 'explore')
      home.setScreen({ kind: 'home' })
    else if (tab === 'map')
      home.setScreen({ kind: 'map' })
    else if (tab === 'assistant')
      home.open(`/${language}/plan (the advice form, C21)`)
    else
      home.open('Another tab: not part of this lab')
  }

  return (
    <div className="relative h-[740px] w-[375px] max-w-full overflow-hidden rounded-[28px] bg-background shadow-overlay ring-1 ring-separator [transform:translateZ(0)]">
      <div className="h-full overflow-y-auto overscroll-contain pb-[104px] [scrollbar-width:none]" data-home-scroller>
        {children}
      </div>
      {home.screen.kind !== 'home' && overlay}
      {home.toast && (
        <p
          className="absolute inset-x-3 bottom-[80px] z-40 rounded-2xl border border-dashed border-field-border bg-surface px-3 py-2 text-label shadow-overlay motion-safe:animate-rise"
          role="status"
        >
          <span className="text-muted">Lab: would open </span>
          <span className="font-mono text-[12px] break-all">{home.toast}</span>
        </p>
      )}
      <ShellTabBar active={active} language={language} onTab={onTab} />
    </div>
  )
}

/** A screen that covers the home above the tab bar, with a back button and a heading. */
export function CoverScreen({ language, title, onBack, children, action }: {
  language: Language
  title: string
  onBack: () => void
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => ref.current?.focus(), [])

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background pb-[96px] motion-safe:animate-rise">
      <div className="sticky top-0 z-10 flex items-center gap-1 bg-background/95 px-2 pt-3 pb-2 backdrop-blur">
        <Button isIconOnly aria-label={copy[language].back} className="size-11 min-w-11" variant="ghost" onPress={onBack}>
          <BackIcon size={22} />
        </Button>
        <h2 ref={ref} className="min-w-0 flex-1 truncate text-heading outline-none" tabIndex={-1}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- top block parts

/** Lab-only marker inside the frame. Dashed so it never reads as UI. */
export function LabNote({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <p className={`rounded-xl border border-dashed border-field-border px-2.5 py-1.5 text-[11px] leading-4 text-muted ${className}`}>
      {children}
    </p>
  )
}

/**
 * Language switch proposals (E3.11, owner decision), drawn on the hero photo. "name" shows the
 * other language by its own name, one tap; "segmented" shows both; "icon" is a round globe button.
 */
export function LanguageSwitch({ language, variant, onSwitch, className = '' }: {
  language: Language
  variant: 'name' | 'segmented' | 'icon'
  onSwitch: (language: Language) => void
  className?: string
}) {
  const c = copy[language]
  const other: Language = language === 'en' ? 'de' : 'en'

  if (variant === 'segmented') {
    return (
      <div aria-label={c.languageLabel} className={`flex h-9 items-center rounded-full bg-black/40 p-0.5 text-[13px] font-semibold text-white backdrop-blur ${className}`} role="group">
        {(['en', 'de'] as const).map(lang => (
          <button
            key={lang}
            aria-pressed={lang === language}
            className="relative h-8 min-w-11 rounded-full px-2.5 uppercase outline-none after:absolute after:inset-x-0 after:-inset-y-1.5 focus-visible:focus-ring aria-pressed:bg-surface aria-pressed:text-foreground aria-pressed:shadow-surface"
            lang={lang}
            type="button"
            onClick={() => onSwitch(lang)}
          >
            {lang}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        aria-label={`${c.languageLabel}: ${c.otherLanguage}`}
        className={`flex h-11 items-center gap-1.5 rounded-full bg-surface/90 ps-2.5 pe-3 text-[13px] font-semibold shadow-surface backdrop-blur outline-none focus-visible:focus-ring ${className}`}
        lang={other}
        type="button"
        onClick={() => onSwitch(other)}
      >
        <LanguageIcon size={18} />
        {other.toUpperCase()}
      </button>
    )
  }

  return (
    <button
      className={`flex h-11 items-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-white outline-none focus-visible:focus-ring active:opacity-70 ${className}`}
      lang={other}
      type="button"
      onClick={() => onSwitch(other)}
    >
      <LanguageIcon size={18} />
      {c.otherLanguage}
    </button>
  )
}

/**
 * The sorted line from N01, restyled for the home. The slot is always there (server HTML shows
 * "Newest first"), so swapping in "Sorted for …" after hydration moves nothing.
 */
export function SortedLine({ language, answers, onChange, className = '' }: {
  language: Language
  answers: Answers
  onChange: () => void
  className?: string
}) {
  const c = copy[language]
  const summary = answerSummary(answers, language)

  return (
    <div className={`flex min-h-11 items-center justify-between gap-2 ${className}`}>
      <p className="min-w-0 truncate text-label" key={summary ?? 'none'}>
        <span className="text-muted">{summary ? `${c.sortedFor}: ` : c.newest}</span>
        {summary && <span className="motion-safe:animate-rise">{summary}</span>}
      </p>
      <Button className="min-h-11 shrink-0" size="sm" variant="ghost" onPress={onChange}>
        {summary ? c.change : c.personalise}
      </Button>
    </div>
  )
}

/** The hero's search box: looks like a field, opens the search screen (the field lives there). */
function HeroSearch({ language, onOpen }: { language: Language, onOpen: () => void }) {
  const c = copy[language]

  return (
    <button
      aria-label={c.searchLabel}
      className="flex h-[52px] w-full items-center gap-3 rounded-full bg-surface px-4 text-start text-muted shadow-overlay outline-none focus-visible:focus-ring active:scale-[0.99] motion-safe:transition-transform"
      type="button"
      onClick={onOpen}
    >
      <SearchIcon className="shrink-0 text-foreground" size={22} />
      <span className="truncate text-body">{c.searchPlaceholder}</span>
    </button>
  )
}

/**
 * The hero banner: the Chapel Bridge photo, the headline and one line on a dark scrim (top for
 * the brand row, bottom for the text), and the search box inside the photo. Replaces the old
 * shop-first hero. The photo loads with high priority; it is the page's largest image.
 */
export function Hero({ language, home, languageSwitch }: {
  language: Language
  home: HomeModel
  languageSwitch: React.ReactNode
}) {
  const c = copy[language]

  return (
    <section aria-labelledby={home.headingId('hero')} className="relative flex h-[372px] flex-col overflow-hidden" data-hero>
      <img
        alt={c.heroAlt}
        className="absolute inset-0 size-full object-cover object-[62%_55%]"
        decoding="async"
        fetchPriority="high"
        src={photoUrl(HERO_PHOTO)}
      />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.6)_0%,rgb(0_0_0/0.3)_20%,rgb(0_0_0/0.3)_34%,rgb(0_0_0/0.68)_54%,rgb(0_0_0/0.8)_100%)]" />
      <div className="relative flex h-11 items-center justify-between px-4 pt-2 text-white">
        <p className="font-serif text-[15px] font-semibold">{c.brand}</p>
        {languageSwitch}
      </div>
      <div className="relative mt-auto flex flex-col gap-3 px-4 pb-4">
        <div className="flex flex-col gap-1 text-white" data-hero-text>
          <h1 className="font-serif text-[30px] leading-[35px] font-medium text-balance" id={home.headingId('hero')}>{c.title}</h1>
          <p className="text-sm text-white/90">{c.intro}</p>
        </div>
        <HeroSearch language={language} onOpen={() => home.setScreen({ kind: 'search' })} />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- aerial map stand-in

const TILE_URL = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857'
const ZOOM = 16
const WORLD = 256 * 2 ** ZOOM

function toWorld([lng, lat]: [number, number]) {
  const sin = Math.sin(lat * Math.PI / 180)

  return { x: (lng + 180) / 360 * WORLD, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD }
}

/** The middle of the old town, between the Chapel Bridge and the Lion Monument. */
const CENTRE = toWorld([8.3076, 47.0548])

/**
 * The flat swisstopo aerial photo (the map's own basemap, decision G11) as plain tile images,
 * with the pins as photo pins at their real coordinates, like the approved map (option B).
 * A stand-in for a static image the product would serve; no MapLibre on the home. Highlighted
 * pins grow with a red ring, the rest dim; none disappear.
 */
export function AerialMap({ width, height, scale = 0.42, pinSize = 32, highlight, className = '' }: {
  width: number
  height: number
  scale?: number
  pinSize?: number
  highlight?: Set<string>
  className?: string
}) {
  const left = CENTRE.x - width / 2 / scale
  const top = CENTRE.y - height / 2 / scale
  const tiles: { x: number, y: number }[] = []

  for (let x = Math.floor(left / 256); x <= Math.floor((left + width / scale) / 256); x++) {
    for (let y = Math.floor(top / 256); y <= Math.floor((top + height / scale) / 256); y++)
      tiles.push({ x, y })
  }
  const pins = [...publicPins].sort((a, b) => Number(highlight?.has(a.id) ?? false) - Number(highlight?.has(b.id) ?? false))

  return (
    <div aria-hidden className={`relative overflow-hidden bg-charcoal ${className}`} style={{ width, height }}>
      {tiles.map(tile => (
        <img
          key={`${tile.x}-${tile.y}`}
          alt=""
          className="absolute max-w-none"
          decoding="async"
          loading="eager"
          src={`${TILE_URL}/${ZOOM}/${tile.x}/${tile.y}.jpeg`}
          style={{ left: (tile.x * 256 - left) * scale, top: (tile.y * 256 - top) * scale, width: 256 * scale, height: 256 * scale }}
        />
      ))}
      {pins.map((pin) => {
        const p = toWorld(pin.coordinates)
        const lit = highlight?.has(pin.id)
        const dim = highlight && !lit
        const size = lit ? pinSize + 8 : pinSize

        return (
          <span
            key={pin.id}
            className={`absolute -translate-1/2 overflow-hidden rounded-full border-[3px] bg-charcoal shadow-[0_4px_14px_rgb(31_24_17/0.3)] ${lit ? 'border-accent' : 'border-surface'} ${dim ? 'opacity-40' : ''}`}
            style={{ left: (p.x - left) * scale, top: (p.y - top) * scale, width: size, height: size }}
          >
            {pin.photo && <img alt="" className="size-full object-cover" decoding="async" loading="eager" src={photoUrl(pin.photo)} />}
          </span>
        )
      })}
    </div>
  )
}

/**
 * The way into the map, the product's most important screen: the real aerial view of the old
 * town with the pins' own photos where they are, the count from the data, and one clear button.
 */
export function MapEntry({ language, home, width, height, highlight, label, onOpen }: {
  language: Language
  home: HomeModel
  width: number
  /** Height of the aerial part; the text sits under it. */
  height: number
  highlight?: Set<string>
  /** The button's words; "Open the map" unless a need is lit. */
  label?: string
  onOpen?: () => void
}) {
  const c = copy[language]
  const { places, events } = mapCounts(publicPins)
  // Fit the old town's pins (about 512 × 490 px at zoom 16) into the picture.
  const scale = Math.min(width / 560, height / 520)

  return (
    <section aria-labelledby={home.headingId('map')} className="overflow-hidden rounded-3xl bg-surface shadow-surface" data-map-entry style={{ width }}>
      <div className="relative">
        <AerialMap height={height} highlight={highlight} pinSize={28} scale={scale} width={width} />
        <p className="absolute start-2 bottom-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] leading-4 text-white">{c.mapCredit}</p>
        <Button className="absolute end-3 bottom-3 min-h-11 shadow-overlay" variant="primary" onPress={onOpen ?? (() => home.setScreen({ kind: 'map' }))}>
          <PickupIcon size={18} />
          {label ?? c.mapAction}
        </Button>
      </div>
      <div className="flex flex-col gap-0.5 px-4 pt-3 pb-4">
        <h2 className="font-serif text-[20px] leading-[25px] font-medium text-balance" id={home.headingId('map')}>{c.mapTitle}</h2>
        <p className="text-label text-muted">{c.mapBody(places, events)}</p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- cards

function LanguageTag({ lang, language }: { lang: Language, language: Language }) {
  return (
    <span className="w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] leading-4 font-medium text-muted">
      {copy[language].onlyIn[lang]}
    </span>
  )
}

/** The title in the visitor's language, or the other language with its tag (AC64). */
function Title({ item, language, className }: { item: HomeItem, language: Language, className: string }) {
  const title = itemTitle(item, language)

  return <span className={className} lang={title?.lang}>{title?.value}</span>
}

/** A swipe-rail card: 4:3 photo, one fact, serif title. Events use rows with a date tile instead. */
export function ItemCard({ item, language, onOpen, width = 'w-[232px]' }: {
  item: HomeItem
  language: Language
  onOpen: (href: string) => void
  width?: string
}) {
  const title = itemTitle(item, language)

  return (
    <button
      className={`flex ${width} shrink-0 snap-start flex-col gap-2 rounded-3xl text-start outline-none focus-visible:focus-ring active:scale-[0.98] motion-safe:transition-transform`}
      type="button"
      onClick={() => onOpen(itemHref(item, language))}
    >
      <Media alt="" className="aspect-[4/3] w-full rounded-2xl" photo={item.photo} />
      <span className="flex flex-col gap-0.5 px-1">
        <span className="text-label text-muted tabular-nums">{itemMeta(item, language)}</span>
        <Title className="line-clamp-2 font-serif text-[17px] leading-[22px] font-medium text-balance" item={item} language={language} />
        {title?.fallback && <LanguageTag lang={title.lang} language={language} />}
      </span>
    </button>
  )
}

/** A list row: thumbnail, title, one fact. Events get the date tile instead of the photo. */
export function ItemRow({ item, language, onOpen, rank }: {
  item: HomeItem
  language: Language
  onOpen: (href: string) => void
  /** Show the photo even for an event (search, see-all). */
  rank?: number
}) {
  const c = copy[language]
  const title = itemTitle(item, language)
  const dates = item.pin ? occurrences(item.pin) : []
  const next = dates[0]
  const when = next ? whenOf(next.day) : undefined

  return (
    <button
      className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl py-2 text-start outline-none focus-visible:focus-ring active:bg-default"
      type="button"
      onClick={() => onOpen(itemHref(item, language))}
    >
      {rank !== undefined && <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted tabular-nums">{rank}</span>}
      {next
        ? <DateTile date={dayParts(next.day, language)} />
        : <Media alt="" className="size-16 shrink-0 rounded-2xl" photo={item.photo} />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {when && when !== 'date' && <span className="text-[12px] leading-4 font-semibold text-accent">{c.when[when]}</span>}
        <Title className="font-serif text-[17px] leading-[22px] font-medium text-balance" item={item} language={language} />
        {/* Beside the date tile the line only needs the time. */}
        {(!next || next.starts) && (
          <span className="text-label text-muted tabular-nums">{next ? occurrenceTime(next, language) : itemMeta(item, language)}</span>
        )}
        {dates.length > 1 && (
          <span className="text-label text-muted tabular-nums">{c.alsoOn(dates.slice(1).map(d => occurrenceLabel(d, language)).join('; '))}</span>
        )}
        {title?.fallback && <LanguageTag lang={title.lang} language={language} />}
      </span>
      <ChevronRightIcon className="shrink-0 text-muted" size={18} />
    </button>
  )
}

/** Keepsakes: small, last, no price. Square photo and the design's name. */
export function KeepsakeStrip({ language, onOpen }: { language: Language, onOpen: (href: string) => void }) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]">
      {keepsakes.map(keepsake => (
        <li key={keepsake.slug} className="shrink-0 snap-start">
          <button
            className="flex w-[120px] flex-col gap-1.5 rounded-2xl text-start outline-none focus-visible:focus-ring active:scale-[0.98]"
            type="button"
            onClick={() => onOpen(`/${language}/gifts/${keepsake.slug}`)}
          >
            <Media alt="" className="aspect-square w-full rounded-2xl" photo={keepsake.photo} />
            <span className="line-clamp-2 px-0.5 text-[13px] leading-[18px] font-medium">{keepsake.name[language]}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * The current home's trip-advice banner (`AdviceBanner`, layout J), rendered unchanged with the
 * pivot's wording. Its button is a router link: the lab catches the tap and says where it
 * would go, so the lab page does not navigate away.
 */
export function LabAdviceBanner({ home, language }: { home: HomeModel, language: Language }) {
  return (

    <div
      data-advice-banner
      onClickCapture={(event) => {
        const link = (event.target as Element).closest('a')

        if (link) {
          event.preventDefault()
          event.stopPropagation()
          home.open(link.getAttribute('href') ?? '')
        }
      }}
    >
      <AdviceBanner {...copy[language].adviceBanner} />
    </div>
  )
}

/** "See all" for a shelf heading: a 44 px tall text button with a chevron. */
export function SeeAll({ language, count, onPress }: { language: Language, count: number, onPress: () => void }) {
  return (
    <button
      className="flex h-11 shrink-0 items-center gap-0.5 rounded-md text-sm font-medium text-muted outline-none focus-visible:focus-ring active:opacity-60"
      type="button"
      onClick={onPress}
    >
      {copy[language].seeAll(count)}
      <ChevronRightIcon size={16} />
    </button>
  )
}

/** "Show these 6 on the map": opens the Map tab with the shelf's places highlighted (new). */
export function OnMapButton({ language, count, onPress, className = '' }: {
  language: Language
  count: number
  onPress: () => void
  className?: string
}) {
  return (
    <button
      className={`flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold outline-none focus-visible:focus-ring active:opacity-60 ${className}`}
      type="button"
      onClick={onPress}
    >
      <PickupIcon className="shrink-0" size={18} />
      {copy[language].onMap(count)}
    </button>
  )
}

/** The rail or the rows, by count: below three items a rail looks broken, so rows. */
export function ShelfBody({ shelf, language, onOpen, layout, limit }: {
  shelf: Shelf
  language: Language
  onOpen: (href: string) => void
  layout: 'rail' | 'rows'
  limit: number
}) {
  const shown = shelf.items.slice(0, limit)

  if (layout === 'rows' || shelf.items.length < 3 || shelf.id === 'local-activities') {
    return (
      <ul className="flex flex-col divide-y divide-separator">
        {shown.map(item => (
          <li key={item.id} data-settle={`${shelf.id}/${item.id}`}>
            <ItemRow item={item} language={language} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul aria-label={copy[language].sections[shelf.id].title} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]">
      {shown.map(item => (
        <li key={item.id} className="flex" data-settle={`${shelf.id}/${item.id}`}>
          <ItemCard item={item} language={language} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------- cover screens

/** "See all": the whole shelf, ranked, as rows. Product: a new list route (departure). */
export function AllScreen({ home, language, id }: { home: HomeModel, language: Language, id: SectionId }) {
  const shelf = home.shelves.find(s => s.id === id)
  const c = copy[language]

  if (!shelf)
    return null

  return (
    <CoverScreen language={language} title={c.sections[id].title} onBack={() => home.setScreen({ kind: 'home' })}>
      <div className="flex flex-col gap-2 px-4">
        <p className="text-sm text-muted">{c.sections[id].promise}</p>
        {shelf.places.length > 0 && (
          <OnMapButton count={shelf.places.length} language={language} onPress={() => home.setScreen({ kind: 'map', id })} />
        )}
        <ul className="flex flex-col divide-y divide-separator">
          {shelf.items.map(item => (
            <li key={item.id}>
              <ItemRow item={item} language={language} onOpen={home.open} />
            </li>
          ))}
        </ul>
        <LabNote>{`Product: a list page for this need, e.g. /${language}/for/${id}. New route, not in the inventory.`}</LabNote>
      </div>
    </CoverScreen>
  )
}

/** The Map tab, as a stand-in: the shelf's places highlighted, the rest dimmed (none hidden). */
export function MapScreen({ home, language, id }: { home: HomeModel, language: Language, id?: SectionId }) {
  const c = copy[language]
  const shelf = id ? home.shelves.find(s => s.id === id) : undefined
  const highlight = shelf ? new Set(shelf.places.map(item => item.id)) : undefined

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-surface-secondary motion-safe:animate-rise">
      <AerialMap className="absolute! inset-0" height={672} highlight={highlight} scale={0.9} width={375} />
      <div className="relative flex flex-col gap-2 p-3">
        <p className="w-fit rounded-full bg-surface px-3.5 py-2 text-sm font-semibold shadow-overlay" role="status">
          {shelf ? c.mapShelf(`${c.sections[shelf.id].title}`, shelf.places.length) : c.mapAll(publicPins.length)}
        </p>
        <LabNote className="bg-surface/90">
          {`Stand-in for the Map tab (N02, see /lab/pins). Opens ${id ? shelfMapHref(id, language) : `/${language}/map`}: the shelf’s places highlighted like a category, the rest dimmed, card row on the first.`}
        </LabNote>
      </div>
    </div>
  )
}

/** Lab stand-in for N01's change mode (the real flow is designed in S1). */
export function TripSheet({ home, language }: { home: HomeModel, language: Language }) {
  const c = copy[language]
  const options: Answers[] = ['short-food', 'multi-history', 'lake-shopping', 'none']

  return (
    <CoverScreen language={language} title={c.changeTitle} onBack={() => home.setScreen({ kind: 'home' })}>
      <div className="flex flex-col gap-3 px-4">
        <LabNote>Lab only: N01 opens here in change mode (see /lab/onboarding-fullscreen). Pick a visitor to watch the shelves re-rank.</LabNote>
        {options.map(a => (
          <button
            key={a}
            aria-pressed={home.answers === a}
            className="group relative flex min-h-14 items-center rounded-2xl border-[1.5px] border-transparent bg-surface px-4 text-start text-sm font-medium shadow-surface outline-none focus-visible:focus-ring aria-pressed:border-accent"
            type="button"
            onClick={() => {
              home.setAnswers(a)
              home.setScreen({ kind: 'home' })
            }}
          >
            {answerSummary(a, language) ?? c.newest}
            <SelectedIcon aria-hidden className="absolute -end-1.5 -top-1.5 hidden size-5 rounded-full bg-surface text-accent group-aria-pressed:block" weight="Filled" />
          </button>
        ))}
      </div>
    </CoverScreen>
  )
}

/** Loading: skeletons in the shelves' exact shape, so nothing moves when they fill. */
export function ShelfSkeletons({ layout }: { layout: 'rail' | 'rows' }) {
  return (
    <div aria-busy className="flex flex-col gap-8" role="status">
      {[0, 1].map(i => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
          {layout === 'rail'
            ? (
                <div className="-mx-4 flex gap-3 overflow-hidden px-4">
                  {[0, 1].map(j => (
                    <div key={j} className="flex w-[232px] shrink-0 flex-col gap-2">
                      <Skeleton className="aspect-[4/3] rounded-2xl" />
                      <Skeleton className="h-4 w-24 rounded-lg" />
                      <Skeleton className="h-5 w-40 rounded-lg" />
                    </div>
                  ))}
                </div>
              )
            : [0, 1, 2].map(j => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <Skeleton className="size-16 shrink-0 rounded-2xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-44 rounded-lg" />
                    <Skeleton className="h-4 w-28 rounded-lg" />
                  </div>
                </div>
              ))}
        </div>
      ))}
    </div>
  )
}
