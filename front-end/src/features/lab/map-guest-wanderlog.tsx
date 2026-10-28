import type { Language, Pin } from '@/features/lab/map-guest-data'
/**
 * Option W, after Wanderlog's map: round pins in the category's colour with the rank number
 * in white and the place name beside the leading ones; a row of place cards above the tab bar
 * that swipes in step with the pins; a card opens the place in a sheet that stops at the tab
 * bar. Chips carry the same colour as a dot. Design only: local state, mock data.
 */
import type { LabProps } from '@/features/lab/map-guest-kit'

import { Button } from '@heroui/react'
import { useEffect, useId, useRef, useState } from 'react'

import { BulletListIcon, ChevronDownIcon, PickupIcon } from '@/components/icons'
import { Media } from '@/components/media'
import {
  DirectionsAction,
  PinFacts,
  PinHeading,
  PinPhoto,
  PinTip,
} from '@/features/lab/map-guest-card'
import {
  ALL,
  copy,
  factLine,
  isHighlighted,
  nextDate,
  pickText,
  pinColor,
} from '@/features/lab/map-guest-data'
import {
  CategoryChips,
  childrenOf,
  GoneNotice,
  MapCredits,
  MapStatusLayer,
  parentOf,
  PinList,
  sortLine,
  TAB_BAR,
  topLevel,
  useGuestMap,
} from '@/features/lab/map-guest-kit'
import { GuestMap, reducedMotion } from '@/features/lab/map-guest-map'

const CARD_WIDTH = 296
const CARD_GAP = 8
/** The card row's height, with its padding. */
const ROW = 120
/** The assistant button rises this far above the tab bar; nothing readable sits under it. */
const BUMP = 36
const SHEET = { half: 380, full: 600 } as const

const halo = '[text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_3px_#fff,0_0_4px_#fff]'

/** A round pin in its category's colour with the rank in white; the leading ones show their name. */
function RoundPin({ pin, rank, map, language, onSelect }: {
  pin: Pin
  rank: number
  map: ReturnType<typeof useGuestMap>
  language: Language
  onSelect: (id: string) => void
}) {
  const c = copy[language]
  const highlighted = isHighlighted(pin, map.chip)
  const tier = map.tiers.get(pin.id) ?? 'normal'
  const selected = map.selected === pin.id
  const lit = map.chip !== ALL && highlighted
  const dimmed = !highlighted && !selected
  const size = selected ? 'size-9 text-[15px]' : tier === 'lead' || lit ? 'size-7 text-[13px]' : tier === 'quiet' ? 'size-5 text-[10px]' : 'size-6 text-xs'
  const title = pickText(pin.title, language)?.value ?? ''
  const date = nextDate(pin, language)
  const showName = !dimmed && (selected || lit || tier === 'lead')

  return (
    <button
      aria-label={[`${rank}. ${title}`, date && `${c.event}, ${date.label}`, dimmed && c.dimmed].filter(Boolean).join(', ')}
      aria-pressed={selected}
      className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent transition-opacity duration-300 motion-reduce:transition-none ${dimmed ? 'opacity-45 saturate-0' : ''}`}
      data-lift={lit || tier === 'lead' ? '' : undefined}
      data-pin-return={pin.id}
      type="button"
      onClick={() => onSelect(pin.id)}
    >
      <span
        className={`flex items-center justify-center rounded-full border-2 border-white font-bold text-white tabular-nums shadow-[0_2px_6px_rgb(0_0_0/0.35)] transition-[width,height] duration-200 motion-reduce:transition-none ${size} ${selected ? 'ring-4 ring-white/60' : ''}`}
        style={{ backgroundColor: pinColor(pin) }}
      >
        {rank}
      </span>
      {date && (
        <span aria-hidden className="pointer-events-none absolute -top-1 left-7 rounded-full bg-white px-1 text-[10px] leading-4 font-bold text-foreground shadow-surface tabular-nums">
          {date.short}
        </span>
      )}
      {showName && (
        <span aria-hidden className={`pointer-events-none absolute top-1/2 left-[calc(50%+18px)] max-w-32 -translate-y-1/2 truncate text-xs leading-4 font-bold text-foreground ${halo}`}>
          {title}
        </span>
      )}
    </button>
  )
}

/** A place card in the row: colour badge and number, name, one fact, the tip, and the photo. */
function PlaceCard({ pin, rank, active, language, onOpen }: {
  pin: Pin
  rank: number
  active: boolean
  language: Language
  onOpen: () => void
}) {
  const title = pickText(pin.title, language)
  const tip = pickText(pin.tip, language)
  const fact = factLine(pin, language)

  return (
    <button
      aria-current={active ? 'true' : undefined}
      className="flex h-[104px] w-[296px] shrink-0 snap-center items-stretch gap-3 rounded-2xl bg-surface p-2.5 text-start shadow-overlay outline-none focus-visible:focus-ring aria-[current=true]:ring-2 aria-[current=true]:ring-foreground/80"
      data-card={pin.id}
      type="button"
      onClick={onOpen}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white tabular-nums" style={{ backgroundColor: pinColor(pin) }}>
            {rank}
          </span>
          <span className="truncate text-sm font-semibold" lang={title?.lang}>{title?.value}</span>
        </span>
        {fact && <span className="truncate text-xs text-muted tabular-nums">{fact}</span>}
        {tip && <span className="line-clamp-2 text-xs leading-4" lang={tip.lang}>{tip.value}</span>}
      </span>
      {pin.photo && <Media alt="" className="size-[84px] shrink-0 rounded-xl" photo={pin.photo} />}
    </button>
  )
}

export function OptionWanderlog(props: LabProps) {
  const { language, answers, focus } = props
  const c = copy[language]
  const map = useGuestMap(props)
  const headingId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [detail, setDetail] = useState<false | 'half' | 'full'>(() =>
    props.state === 'deep-link' || props.state === 'other-language' || focus ? 'half' : false)
  // A pin opened from the dashboard opens its sheet (adjusted during render).
  const [focused, setFocused] = useState(focus)

  if (focus !== focused) {
    setFocused(focus)
    if (focus)
      setDetail('half')
  }

  const rank = new Map(map.ranked.map((pin, i) => [pin.id, i + 1]))
  const family = parentOf(map.chip) ?? map.chip
  const chipIds = [ALL, ...topLevel.flatMap(id => id === family ? [id, ...childrenOf(id)] : [id])]
  const sheetOpen = Boolean(map.openPin && detail)
  const rowOpen = view === 'map' && map.pinsReady && map.ranked.length > 0 && !sheetOpen
  const bottom = sheetOpen ? SHEET[detail || 'half'] : rowOpen ? ROW + BUMP : 0

  // The selected pin's card slides to the middle of the row.
  useEffect(() => {
    const row = rowRef.current
    const card = row?.querySelector<HTMLElement>(`[data-card="${map.selected}"]`)

    if (!row || !card)
      return
    row.scrollTo({ left: card.offsetLeft - (375 - CARD_WIDTH) / 2, behavior: reducedMotion() ? 'instant' : 'smooth' })
  }, [map.selected, rowOpen])

  // Swiping settles on a card and its pin becomes the selected one, once per swipe.
  function onScrollEnd(event: React.UIEvent<HTMLDivElement>) {
    const pin = map.ranked[Math.round(event.currentTarget.scrollLeft / (CARD_WIDTH + CARD_GAP))]

    if (pin && pin.id !== map.selected)
      map.select(pin.id)
  }

  function closeSheet() {
    setDetail(false)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card="${map.selected}"]`)?.focus())
  }

  return (
    <>
      <div className="absolute inset-0" inert={sheetOpen && detail === 'full'}>
        <GuestMap
          attempt={map.attempt}
          insets={{ top: 52, bottom: bottom + TAB_BAR }}
          label={c.mapLabel}
          pins={map.ranked}
          renderCluster={(members, zoomIn) => (
            <button
              aria-label={c.cluster(members.length)}
              className="flex size-11 items-center justify-center outline-none focus-visible:outline-3 focus-visible:outline-accent"
              type="button"
              onClick={zoomIn}
            >
              <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-foreground text-xs font-bold text-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] tabular-nums">
                {members.length}
              </span>
            </button>
          )}
          renderPin={pin => <RoundPin language={language} map={map} pin={pin} rank={rank.get(pin.id) ?? 0} onSelect={map.select} />}
          selected={map.selected}
          showPins={map.pinsReady}
          onStatus={map.onStatus}
        />
        <MapStatusLayer className="top-[60px]" language={language} map={map} state={props.state} />

        {view === 'list' && (
          <div className="absolute inset-x-0 top-0 z-[8] overflow-y-auto bg-background px-4 pt-[60px] pb-4" style={{ bottom: TAB_BAR }}>
            <div className="flex items-baseline justify-between gap-2 pb-2">
              <h2 className="text-card-title font-semibold">{c.places(map.filtered.length)}</h2>
              <span className="text-label text-muted">{sortLine(language, answers)}</span>
            </div>
            {map.pinsReady && (
              <PinList
                numbered
                language={language}
                map={{ ...map, select: (id) => {
                  map.select(id)
                  setDetail('half')
                } }}
              />
            )}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2 pt-3 ps-3">
            <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
              <CategoryChips
                chip={map.chip}
                ids={chipIds}
                label={c.categories}
                language={language}
                listClassName="flex-nowrap gap-1.5 py-1.5 pe-2"
                onChip={map.setChip}
              />
            </div>
            <button
              aria-pressed={view === 'list'}
              className="relative me-3 flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium shadow-surface outline-none focus-visible:focus-ring after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"
              type="button"
              onClick={() => setView(view === 'map' ? 'list' : 'map')}
            >
              {view === 'map' ? <BulletListIcon size={16} /> : <PickupIcon size={16} />}
              {view === 'map' ? c.list : c.map}
            </button>
          </div>
          {map.notice && <GoneNotice className="mx-3" language={language} onDismiss={map.dismissNotice} />}
        </div>
        <p aria-live="polite" className="sr-only">{map.announce}</p>

        {view === 'map' && (
          <MapCredits className="absolute end-2 z-10" style={{ bottom: TAB_BAR + bottom + 6 }} />
        )}

        {rowOpen && (
          <div
            ref={rowRef}
            aria-label={c.places(map.ranked.length)}
            className="absolute inset-x-0 z-20 flex snap-x snap-mandatory gap-2 overflow-x-auto px-10 pt-2 pb-3 [scrollbar-width:none]"
            role="group"
            style={{ bottom: TAB_BAR + BUMP }}
            onScrollEnd={onScrollEnd}
          >
            {map.ranked.map(pin => (
              <PlaceCard
                key={pin.id}
                active={pin.id === map.selected}
                language={language}
                pin={pin}
                rank={rank.get(pin.id) ?? 0}
                onOpen={() => {
                  map.select(pin.id)
                  setDetail('half')
                }}
              />
            ))}
          </div>
        )}
      </div>

      {sheetOpen && map.openPin && (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape closes the sheet
        <section
          aria-labelledby={headingId}
          className="absolute inset-x-0 z-[25] flex flex-col rounded-t-3xl bg-surface shadow-[0_-8px_24px_rgb(31_24_17/0.18)] transition-[height] duration-300 ease-out motion-safe:animate-rise motion-reduce:transition-none"
          // The sheet stops at the tab bar's top edge; it never slides under it.
          style={{ bottom: TAB_BAR, height: SHEET[detail || 'half'] }}
          onKeyDown={(event) => {
            if (event.key === 'Escape')
              closeSheet()
          }}
        >
          <button
            aria-label={`${c.resize}: ${detail === 'full' ? c.showLess : c.showMore}`}
            className="flex h-7 shrink-0 items-center justify-center rounded-t-3xl outline-none focus-visible:focus-ring"
            type="button"
            onClick={() => setDetail(detail === 'full' ? 'half' : 'full')}
          >
            <span aria-hidden className="h-1.5 w-10 rounded-full bg-separator" />
          </button>
          <div key={map.openPin.id} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white tabular-nums" style={{ backgroundColor: pinColor(map.openPin) }}>
                {rank.get(map.openPin.id)}
              </span>
              <div className="min-w-0 flex-1">
                <PinHeading headingId={headingId} language={language} pin={map.openPin} onClose={closeSheet} />
              </div>
            </div>
            <PinPhoto className="aspect-[16/9] w-full shrink-0 rounded-2xl" language={language} pin={map.openPin} />
            <PinTip language={language} pin={map.openPin} />
            <DirectionsAction context={props} pin={map.openPin} />
            <PinFacts language={language} pin={map.openPin} />
            {detail === 'half' && (
              <Button className="self-center" size="sm" variant="tertiary" onPress={() => setDetail('full')}>
                <ChevronDownIcon className="rotate-180" size={16} />
                {c.showMore}
              </Button>
            )}
          </div>
          <div aria-hidden className="shrink-0" style={{ height: BUMP }} />
        </section>
      )}
    </>
  )
}
