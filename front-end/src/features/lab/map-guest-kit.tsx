/**
 * Lab kit for the guest map (N02): the phone frame with the guest tab bar (Map in the Tours
 * slot), the credits line, the category chips, the notice, the status overlays, the ranked
 * list alternative and the state hook the three options share. Design only: state is local.
 */
import type { Key } from '@heroui/react'
import type {
  Answers,
  ContentCase,
  Language,
  Pin,
  Tier,
} from '@/features/lab/map-guest-data'
import type { MapStatus } from '@/features/lab/map-guest-map'

import { Button, Skeleton, Spinner, Tag, TagGroup } from '@heroui/react'
import { createContext, use, useEffect, useState } from 'react'

import {
  AccountIcon,
  CloseIcon,
  ExploreIcon,
  GiftIcon,
  InfoIcon,
  PickupIcon,
  SelectedIcon,
  SparkleIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import {
  ALL,
  categories,
  categoryColor,
  categoryName,
  copy,
  credits,
  factLine,
  isHighlighted,
  pickText,
  rankPins,
  tierOf,
  withContentCase,
} from '@/features/lab/map-guest-data'

export type LabState
  = | 'loaded'
    | 'loading'
    | 'empty'
    | 'failed'
    | 'deep-link'
    | 'deep-link-gone'
    | 'other-language'
    | 'first-visit'

export interface LabProps {
  /** The pins on the map, from the merchant's list (or the preview of an unsaved edit). */
  pins: Pin[]
  language: Language
  answers: Answers
  state: LabState
  contentCase: ContentCase
  /** A pin id to open from outside the phone: the one being edited in the dashboard. */
  focus?: string
  onDirections: (url: string) => void
  /** The open pin changed, so the lab can offer to edit it. */
  onSelected?: (id: string | undefined) => void
}

/**
 * The `?place=` slug each lab state opens with (AC90, AC64). The organ concert's only date
 * (26 Oct) is over, so its link gets the notice.
 */
function deepLinkSlug(state: LabState, language: Language) {
  if (state === 'deep-link')
    return 'chapel-bridge'
  if (state === 'deep-link-gone')
    return 'organ-concert-hofkirche'
  if (state === 'other-language')
    return language === 'en' ? 'baeckerei-weinmarkt' : 'swan-view'

  return undefined
}

/**
 * Everything the options share: ranked pins, tiers, the chosen chip, the open pin, the
 * notice, and the lab's loading sequence (map shell first, then the pins).
 */
export function useGuestMap({ pins, language, answers, state, contentCase, focus, onSelected }: LabProps) {
  const ranked = state === 'empty' ? [] : rankPins(pins, answers)
  const tiers = new Map<string, Tier>(ranked.map((pin, i) => [pin.id, tierOf(pin, i, answers)]))
  const [chip, setChip] = useState(ALL)
  // Option B filters by several top-level categories at once; null means all of them.
  const [picked, setPicked] = useState<string[] | null>(null)
  const [selected, setSelected] = useState(() => {
    const slug = deepLinkSlug(state, language)

    return slug ? pins.find(pin => pin.slug === slug)?.id : focus
  })
  const [notice, setNotice] = useState(() => {
    const slug = deepLinkSlug(state, language)

    return slug !== undefined && !pins.some(pin => pin.slug === slug)
  })
  // A new pin to open from the dashboard replaces the open one (adjusted during render).
  const [focused, setFocused] = useState(focus)

  if (focus !== focused) {
    setFocused(focus)
    if (focus)
      setSelected(focus)
  }
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading')
  const [pinsStatus, setPinsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  function loadPins(outcome: 'ready' | 'error', delay: number) {
    setPinsStatus('loading')
    setTimeout(setPinsStatus, delay, outcome)
  }

  function onStatus(status: MapStatus) {
    setMapStatus(status)
    if (status === 'ready')
      loadPins(state === 'failed' ? 'error' : 'ready', state === 'loading' ? 2600 : 250)
  }

  function retry() {
    if (mapStatus === 'error') {
      setMapStatus('loading')
      setAttempt(a => a + 1)
    }
    else {
      loadPins('ready', 900)
    }
  }

  // The notice reads for a while, then leaves; the visitor can dismiss it sooner.
  useEffect(() => {
    if (!notice)
      return
    const timer = setTimeout(setNotice, 8000, false)

    return () => clearTimeout(timer)
  }, [notice])

  const pinsReady = mapStatus === 'ready' && pinsStatus === 'ready'
  const open = pinsReady && selected ? ranked.find(p => p.id === selected) : undefined
  const highlight = (pin: Pin) => picked
    ? picked.some(id => isHighlighted(pin, id))
    : isHighlighted(pin, chip)
  const filtered = ranked.filter(highlight)
  const highlightedCount = filtered.length

  function select(id: string) {
    setSelected(id)
    onSelected?.(id)
  }

  function close() {
    const id = selected

    setSelected(undefined)
    onSelected?.(undefined)
    // Back to what opened it: the pin on the map, or the row in the list.
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-pin-return="${id}"]`)?.focus(),
    )
  }

  return {
    ranked,
    tiers,
    chip,
    setChip,
    picked,
    setPicked,
    highlight,
    filtered,
    selected: open?.id,
    openPin: open ? withContentCase(open, contentCase) : undefined,
    select,
    close,
    notice,
    dismissNotice: () => setNotice(false),
    mapStatus,
    pinsStatus,
    pinsReady,
    attempt,
    onStatus,
    retry,
    highlightedCount,
    announce: picked
      ? copy[language].highlighted(picked.map(id => categoryName(id, language)).join(', '), highlightedCount, ranked.length)
      : chip === ALL
        ? copy[language].allShown(ranked.length)
        : copy[language].highlighted(categoryName(chip, language), highlightedCount, ranked.length),
  }
}

export type GuestMapState = ReturnType<typeof useGuestMap>

// ---------------------------------------------------------------- frame

const tabIcons = [ExploreIcon, GiftIcon, SparkleIcon, PickupIcon, AccountIcon]

/** The guest tab bar as `guest-shell.tsx` draws it, with Map in the Tours slot (E4.6). */
function TabBar({ language }: { language: Language }) {
  const c = copy[language]

  return (
    <nav aria-label={c.tabBar} className="absolute inset-x-0 bottom-0 z-30">
      <div
        aria-hidden
        className="absolute inset-0 flex [filter:drop-shadow(0_-1px_0_color-mix(in_oklab,var(--separator)_70%,transparent))_drop-shadow(0_-6px_14px_rgba(0,0,0,0.07))]"
      >
        <div className="flex-1 bg-surface" />
        <div className="flex w-[92px] flex-col">
          <svg className="block h-[30px] w-full text-surface" viewBox="0 0 92 30">
            <path
              d="M0 30V0H8.53A6 6 0 0 1 14.15 3.9A34 34 0 0 0 77.85 3.9A6 6 0 0 1 83.47 0H92V30Z"
              fill="currentColor"
            />
          </svg>
          <div className="-mt-px flex-1 bg-surface" />
        </div>
        <div className="flex-1 bg-surface" />
      </div>
      <ul className="relative grid grid-cols-5 pb-2">
        {tabIcons.map((Icon, i) => {
          const active = i === 3

          return (
            <li key={c.tabs[i]} className="relative">
              <button
                aria-current={active ? 'page' : undefined}
                className={`flex h-[60px] w-full flex-col items-center gap-0.5 text-[11px] leading-4 font-medium outline-none focus-visible:focus-ring ${i === 2 ? 'justify-end pb-[7px]' : 'justify-center'} ${active ? 'text-accent' : 'text-muted'}`}
                type="button"
              >
                {i === 2
                  ? (
                      <span
                        aria-hidden
                        className="absolute -top-9 flex size-14 items-center justify-center rounded-full bg-assistant text-white shadow-[0_10px_18px_-6px_rgba(213,43,30,0.5)]"
                      >
                        <Icon size={26} weight="Filled" />
                      </span>
                    )
                  : <Icon size={26} weight={active ? 'Filled' : 'Outline'} />}
                {c.tabs[i]}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Height of the tab bar inside the frame, for the overlays that sit on it. */
export const TAB_BAR = 68

const phoneSheetSize
  = '[data-lab-phone] .drawer__backdrop{--visual-viewport-height:740px!important;--visual-viewport-width:375px!important}'

const PhoneContext = createContext<Element | undefined>(undefined)

/** The phone frame, for the app's sheets (`SheetFrame`) to open inside it, not over the page. */
export function usePhoneFrame() {
  return use(PhoneContext)
}

/**
 * 375 × 740 phone, the guest shell's width. The map fills it; the tab bar sits on top. The
 * transform makes the sheets' fixed layers fill the phone, not the window.
 */
export function MapPhone({ language, children }: { language: Language, children: React.ReactNode }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)

  return (
    <div
      ref={setFrame}
      className="relative h-[740px] w-[375px] max-w-full overflow-hidden rounded-[28px] bg-background shadow-overlay ring-1 ring-separator [transform:translateZ(0)]"
      data-lab-phone=""
    >
      {/* HeroUI sizes the sheet to the window; inside the lab phone it is the phone. */}
      <style>{phoneSheetSize}</style>
      <PhoneContext value={frame ?? undefined}>{children}</PhoneContext>
      <TabBar language={language} />
    </div>
  )
}

/**
 * The four required credits, always written out (MapLibre's compact "i" hides them). A
 * translucent pill keeps 11 px text legible on any photo.
 */
export function MapCredits({ className = '', style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <p style={style} className={`pointer-events-auto flex w-fit flex-wrap items-center gap-x-1.5 rounded-full bg-surface/85 px-2.5 py-0.5 text-[11px] leading-4 text-foreground/80 backdrop-blur-sm ${className}`}>
      {credits.map((credit, i) => (
        <span key={credit.label} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden className="text-muted">·</span>}
          <a className="outline-none hover:underline focus-visible:focus-ring" href={credit.href} rel="noreferrer" target="_blank">
            {credit.label}
          </a>
        </span>
      ))}
    </p>
  )
}

/**
 * The credits folded to one short line ("© swisstopo · © OpenStreetMap" and an info button);
 * a tap shows all four. Lab proposal: check the providers' terms before shipping it folded.
 */
export function CompactCredits({ className = '', style }: { className?: string, style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false)

  if (open)
    return <MapCredits className={className} style={style} />

  return (
    <button
      aria-expanded={false}
      aria-label="Map credits: © swisstopo, OpenFreeMap, © OpenMapTiles, © OpenStreetMap"
      className={`pointer-events-auto flex h-5 items-center gap-1 rounded-full bg-surface/80 px-1.5 text-[10px] leading-none text-foreground/75 outline-none backdrop-blur-sm focus-visible:focus-ring ${className}`}
      style={style}
      type="button"
      onClick={() => setOpen(true)}
    >
      © swisstopo · © OSM
      <InfoIcon aria-hidden size={11} />
    </button>
  )
}

// ---------------------------------------------------------------- chips

/**
 * The app's selected pattern (gift-detail option cards): red border, fill kept, check on the
 * edge. The chip is drawn 32 px high so it covers less map; an invisible strip above and below
 * keeps the 44 px tap target.
 */
export const chipClass
  = 'group relative h-8 shrink-0 gap-1.5 rounded-full border-[1.5px] border-transparent bg-surface px-3 text-[13px] font-medium text-foreground shadow-surface before:hidden after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[\'\'] hover:bg-surface data-[selected=true]:border-accent data-[selected=true]:bg-surface data-[selected=true]:hover:bg-surface'

export function ChipCheck() {
  return (
    <SelectedIcon
      aria-hidden
      className="absolute -end-1 -top-1 hidden size-3.5 rounded-full bg-surface text-accent group-data-[selected=true]:block"
      weight="Filled"
    />
  )
}

/** The category's colour, the same as its pins (Wanderlog-style). */
export function ChipDot({ id }: { id: string }) {
  return <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(id) }} />
}

export function chipChange(onChip: (id: string) => void) {
  return (keys: 'all' | Set<Key>) => {
    const [first] = keys === 'all' ? [] : [...keys]

    if (first !== undefined)
      onChip(String(first))
  }
}

/** A single-select chip group. `ids` are the chips to show, in order; All first. */
export function CategoryChips({
  language,
  chip,
  onChip,
  ids,
  label,
  listClassName,
  allId = ALL,
}: {
  language: Language
  chip: string
  onChip: (id: string) => void
  ids: string[]
  /** The chip that reads "All": the whole map, or a whole family on a sub-chip row. */
  allId?: string
  label: string
  listClassName: string
}) {
  const c = copy[language]

  return (
    <TagGroup
      disallowEmptySelection
      aria-label={label}
      selectedKeys={new Set([chip])}
      selectionMode="single"
      onSelectionChange={chipChange(onChip)}
    >
      <TagGroup.List className={listClassName}>
        {ids.map((id) => {
          const name = id === allId ? c.all : categoryName(id, language)

          return (
            <Tag key={id} className={chipClass} id={id} textValue={name}>
              {id !== allId && <ChipDot id={id} />}
              {name}
              <ChipCheck />
            </Tag>
          )
        })}
      </TagGroup.List>
    </TagGroup>
  )
}

export const topLevel = categories.filter(cat => !cat.parent).map(cat => cat.id)
export const childrenOf = (id: string) => categories.filter(cat => cat.parent === id).map(cat => cat.id)
export const parentOf = (id: string) => categories.find(cat => cat.id === id)?.parent

// ---------------------------------------------------------------- notices and states

/** The short notice for a `?place=` link to a hidden, ended or unknown pin (AC90). */
export function GoneNotice({ language, onDismiss, className = '' }: { language: Language, onDismiss: () => void, className?: string }) {
  const c = copy[language]

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl bg-surface py-1 ps-3 pe-1 text-sm font-medium shadow-overlay motion-safe:animate-rise ${className}`}
      role="status"
    >
      <InfoIcon className="shrink-0 text-muted" size={18} />
      <span className="flex-1">{c.gone}</span>
      <Button isIconOnly aria-label={c.dismiss} className="size-11 min-w-11" size="sm" variant="tertiary" onPress={onDismiss}>
        <CloseIcon size={18} />
      </Button>
    </div>
  )
}

/**
 * Loading (shell, then pins), empty and failed. The map keeps its place underneath, so the
 * chips and the tab bar never jump when the state changes.
 */
export function MapStatusLayer({
  language,
  state,
  map,
  className = '',
}: {
  language: Language
  state: LabState
  map: GuestMapState
  className?: string
}) {
  const c = copy[language]

  if (map.mapStatus === 'loading') {
    return (
      <div aria-busy className="absolute inset-0 z-[4] flex flex-col bg-surface-secondary" role="status">
        <span className="sr-only">{c.loading}</span>
        <div className="flex gap-2 px-3 pt-4">
          {['w-11', 'w-18', 'w-24', 'w-16'].map(w => <Skeleton key={w} className={`h-8 shrink-0 rounded-full ${w}`} />)}
        </div>
      </div>
    )
  }

  const failed = map.mapStatus === 'error' || map.pinsStatus === 'error'

  if (failed || (state === 'empty' && map.pinsReady)) {
    return (
      <div className={`pointer-events-none absolute inset-x-3 z-[6] flex justify-center ${className}`}>
        <div className="pointer-events-auto flex w-full flex-col items-center gap-2 rounded-3xl bg-surface p-5 text-center shadow-overlay" role={failed ? 'alert' : 'status'}>
          {failed
            ? <InfoIcon className="text-danger" size={26} />
            : <PickupIcon className="text-muted" size={26} />}
          <p className="font-serif text-card-title text-balance">{failed ? c.failedTitle : c.emptyTitle}</p>
          <p className="text-sm text-muted text-balance">{failed ? c.failedBody : c.emptyBody}</p>
          <Button className="mt-1 min-h-11" variant={failed ? 'primary' : 'secondary'} onPress={failed ? map.retry : undefined}>
            {failed ? c.retry : c.emptyAction}
          </Button>
        </div>
      </div>
    )
  }

  if (!map.pinsReady) {
    return (
      <div className={`pointer-events-none absolute inset-x-0 z-[6] flex justify-center ${className}`} role="status">
        <span className="flex min-h-11 items-center gap-2.5 rounded-full bg-surface py-1.5 ps-2 pe-4 text-sm font-medium shadow-overlay">
          <Spinner size="sm" />
          {c.loading}
        </span>
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------- list alternative

/**
 * The places the filter keeps, as a ranked list, for screen readers, keyboards and anyone who
 * prefers it. A row opens the same card.
 */
export function PinList({
  language,
  map,
  numbered = false,
  className = '',
}: {
  language: Language
  map: GuestMapState
  numbered?: boolean
  className?: string
}) {
  const rank = new Map(map.ranked.map((pin, i) => [pin.id, i + 1]))

  return (
    <ul className={`flex flex-col ${className}`}>
      {map.filtered.map((pin) => {
        const title = pickText(pin.title, language)

        return (
          <li key={pin.id}>
            <button
              className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl px-1 py-2 text-start outline-none focus-visible:focus-ring active:bg-default"
              data-pin-return={pin.id}
              type="button"
              onClick={() => map.select(pin.id)}
            >
              {numbered && (
                <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted tabular-nums">{rank.get(pin.id)}</span>
              )}
              <Media alt="" className="size-14 shrink-0 rounded-xl" photo={pin.photo} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-serif text-base leading-5 text-balance" lang={title?.lang}>{title?.value}</span>
                <span className="truncate text-label text-muted tabular-nums">
                  {[factLine(pin, language), ...pin.categories.map(id => categoryName(id, language))].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function sortLine(language: Language, answers: Answers) {
  return answers === 'none' ? copy[language].newestFirst : copy[language].sortedForYou
}
