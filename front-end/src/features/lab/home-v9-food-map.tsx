/**
 * Lab, home V9: the approved guest map, option B "Cards" from `/lab/pins`, for the food section.
 * Copied unchanged from `map-guest-options.tsx` (its pin pieces, card, filter and place sheets
 * are not exported), drawn with the cooperative-gestures copy of `GuestMap`
 * (`home-v9-guest-map.tsx`). Changes are marked "V9 change": on load the filter is set to the
 * "Local food and drink" category, as if picked in Categories; the card row sits near the
 * frame's foot; cards share one shape; and a place without a photo shows its kind's icon
 * (`home-v9-pin-icon.tsx`) on its pin, in a cluster and in the card, never its initial. Everything
 * else (photo pins, clusters, Categories sheet, List, the floating card row, the place sheet,
 * credits) is the approved design.
 */
import type { Language, Pin, Tier } from '@/features/lab/map-guest-data'
import type { LabProps } from '@/features/lab/map-guest-kit'

import { Button, Checkbox, CheckboxGroup } from '@heroui/react'
import { useEffect, useId, useRef, useState } from 'react'

import {
  BulletListIcon,
  CloseIcon,
  FilterIcon,
  PickupIcon,
} from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { Media } from '@/components/media'
import { PhotoGallery } from '@/components/photo-gallery'
import { SheetFrame } from '@/components/sheet-frame'
import { CooperativeGuestMap as GuestMap } from '@/features/lab/home-v9-guest-map'
import { PinIconFace } from '@/features/lab/home-v9-pin-icon'
import {
  DirectionsAction,
  PinFacts,
  PinTip,
} from '@/features/lab/map-guest-card'
import {
  ALL,
  categoryName,
  copy,
  factLine,
  isHighlighted,
  nextDate,
  pickText,
} from '@/features/lab/map-guest-data'
import {
  ChipCheck,
  CompactCredits,
  GoneNotice,
  MapStatusLayer,
  PinList,
  TAB_BAR,
  topLevel,
  useGuestMap,
  usePhoneFrame,
} from '@/features/lab/map-guest-kit'
import { reducedMotion } from '@/features/lab/map-guest-map'

function LiveRegion({ text }: { text: string }) {
  return <p aria-live="polite" className="sr-only">{text}</p>
}

// ---------------------------------------------------------------- shared pin pieces

interface PinLook {
  pin: Pin
  tier: Tier
  /** A chip is chosen and this pin is in it. */
  lit: boolean
  dimmed: boolean
  selected: boolean
}

function lookOf(pin: Pin, map: ReturnType<typeof useGuestMap>): PinLook {
  const highlighted = map.highlight(pin)

  return {
    pin,
    tier: map.tiers.get(pin.id) ?? 'normal',
    lit: (map.chip !== ALL || map.picked !== null) && highlighted,
    dimmed: !highlighted,
    selected: map.selected === pin.id,
  }
}

function pinLabel({ pin, dimmed }: PinLook, language: Language, prefix = '') {
  const c = copy[language]
  const date = nextDate(pin, language)

  return [
    `${prefix}${pickText(pin.title, language)?.value ?? ''}`,
    date && `${c.event}, ${date.label}`,
    dimmed && c.dimmed,
  ].filter(Boolean).join(', ')
}

/** Events carry their next date on the pin; places carry nothing. No type icons. */
function DateTag({ pin, language, className = '' }: { pin: Pin, language: Language, className?: string }) {
  const date = nextDate(pin, language)

  return date
    ? (
        <span aria-hidden className={`pointer-events-none absolute rounded-full bg-accent px-1.5 text-[10px] leading-4 font-bold whitespace-nowrap text-accent-foreground shadow-surface tabular-nums ${className}`}>
          {date.short}
        </span>
      )
    : null
}

/** The marker's button: 44 px hit area, pressed when its card is open, focus back here on close. */
function PinButton({
  look,
  label,
  onSelect,
  className = '',
  children,
}: {
  look: PinLook
  label: string
  onSelect: (id: string) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={look.selected}
      className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent transition-[opacity,filter] duration-300 motion-reduce:transition-none ${look.dimmed && !look.selected ? 'opacity-40 saturate-0' : ''} ${className}`}
      data-lift={look.lit || look.tier === 'lead' ? '' : undefined}
      data-pin-return={look.pin.id}
      type="button"
      onClick={() => onSelect(look.pin.id)}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- B: Cards

const CARD_WIDTH = 311

function PhotoPin({ look, language, onSelect }: { look: PinLook, language: Language, onSelect: (id: string) => void }) {
  const size = look.selected ? 'size-14' : look.tier === 'lead' || look.lit ? 'size-12' : look.tier === 'quiet' ? 'size-8' : 'size-10'
  return (
    <PinButton className="flex-col" label={pinLabel(look, language)} look={look} onSelect={onSelect}>
      <span className={`relative block overflow-hidden rounded-full border-[3px] bg-charcoal shadow-[0_4px_14px_rgb(31_24_17/0.35)] transition-[width,height] duration-200 motion-reduce:transition-none ${look.selected ? 'border-accent' : 'border-[#fffaf4]'} ${size}`}>
        {look.pin.photo
          ? <Media alt="" className="size-full" photo={look.pin.photo} />
          // V9 change: an icon for the place's kind, never its initial.
          : <PinIconFace pin={look.pin} size={look.selected ? 24 : 18} />}
      </span>
      {look.selected && <span aria-hidden className="-mt-1 size-2.5 rotate-45 bg-accent" />}
      <DateTag className="-bottom-1.5 left-1/2 -translate-x-1/2" language={language} pin={look.pin} />
    </PinButton>
  )
}

function PhotoCluster({ members, zoomIn, language, map }: { members: Pin[], zoomIn: () => void, language: Language, map: ReturnType<typeof useGuestMap> }) {
  const lit = members.filter(map.highlight).length

  return (
    <button
      aria-label={copy[language].cluster(members.length)}
      className={`relative flex h-12 items-center outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent ${lit === 0 ? 'opacity-50 saturate-0' : ''}`}
      type="button"
      onClick={zoomIn}
    >
      {/* V9 change: a member without a photo shows its kind's icon. */}
      {members.slice(0, 2).map((m, i) => m.photo
        ? <Media key={m.id} alt="" className={`size-10 rounded-full border-[3px] border-[#fffaf4] bg-charcoal shadow-[0_4px_14px_rgb(31_24_17/0.3)] ${i > 0 ? '-ms-5' : ''}`} photo={m.photo} />
        : (
            <span key={m.id} className={`size-10 overflow-hidden rounded-full border-[3px] border-[#fffaf4] shadow-[0_4px_14px_rgb(31_24_17/0.3)] ${i > 0 ? '-ms-5' : ''}`}>
              <PinIconFace pin={m} size={16} />
            </span>
          ))}
      <span className="absolute -end-2 -top-1 flex min-w-6 items-center justify-center rounded-full bg-charcoal px-1.5 text-xs leading-6 font-bold text-white tabular-nums">
        {members.length}
      </span>
    </button>
  )
}

function CompactCard({
  pin,
  active,
  language,
  props,
  onDetails,
}: {
  pin: Pin
  active: boolean
  language: Language
  props: LabProps
  onDetails: () => void
}) {
  const c = copy[language]
  const title = pickText(pin.title, language)
  const tip = pickText(pin.tip, language)

  return (
    <article
      aria-labelledby={`b-card-${pin.id}`}
      className="flex w-[311px] shrink-0 snap-center flex-col gap-3 rounded-3xl bg-surface p-3 shadow-overlay"
      data-card={pin.id}
    >
      <div className="flex gap-3">
        {/* V9 change: the thumbnail slot is always there (the kind's icon when it has no photo), so all cards share one shape. */}
        {pin.photo
          ? <Media alt="" className="size-[84px] shrink-0 rounded-2xl" photo={pin.photo} />
          : (
              <span className="size-[84px] shrink-0 overflow-hidden rounded-2xl">
                <PinIconFace pin={pin} size={32} />
              </span>
            )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate font-serif text-card-title outline-none" id={`b-card-${pin.id}`} lang={title?.lang} tabIndex={-1}>
            {title?.value}
          </h2>
          {/* V9 change: the language notice joins the fact line, so every card's text fits beside its 84 px thumbnail and all cards share one height. */}
          {(title?.fallback || factLine(pin, language)) && (
            <p className="truncate text-label text-muted tabular-nums">
              {[title?.fallback ? c.onlyIn[title.lang] : undefined, factLine(pin, language)].filter(Boolean).join(' · ')}
            </p>
          )}
          {tip && <p className="line-clamp-2 text-sm leading-5" lang={tip.lang}>{tip.value}</p>}
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2" inert={!active}>
        <Button className="min-h-11 flex-1" variant="secondary" onPress={onDetails}>
          {c.showMore}
        </Button>
        <DirectionsAction compact context={props} pin={pin} />
      </div>
    </article>
  )
}

/**
 * B's category filter in the app's own sheet (`SheetFrame`): top-level categories only, each
 * a checkbox row (a parent covers its sub-categories), Select all or Deselect all, Clear
 * filter (back to all), and a button that applies the choice with its count.
 */
function FilterSheet({ map, language, isOpen, onClose, onApplied }: {
  map: ReturnType<typeof useGuestMap>
  language: Language
  isOpen: boolean
  onClose: () => void
  /** The filter is set: the first place it keeps, to show its card. */
  onApplied: (firstId: string | undefined) => void
}) {
  const c = copy[language]
  const container = usePhoneFrame()
  const [draft, setDraft] = useState<string[]>(() => map.picked ?? topLevel)
  const allPicked = draft.length === topLevel.length
  const count = allPicked
    ? map.ranked.length
    : map.ranked.filter(pin => draft.some(id => isHighlighted(pin, id))).length

  function apply() {
    map.setPicked(allPicked ? null : draft)
    onClose()
    onApplied(map.ranked.find(pin => allPicked || draft.some(id => isHighlighted(pin, id)))?.id)
  }

  return (
    <SheetFrame
      container={container}
      footer={(
        <>
          <Button fullWidth isDisabled={draft.length === 0} size="lg" variant="primary" onPress={apply}>
            {c.showPlaces(count)}
          </Button>
          <Button fullWidth isDisabled={allPicked} variant="tertiary" onPress={() => setDraft(topLevel)}>
            {c.clearFilter}
          </Button>
        </>
      )}
      isOpen={isOpen}
      title={c.filterTitle}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">{draft.length === 0 ? c.pickOne : c.categoriesHint}</p>
        <div className="flex flex-col">
          {/* The header row ticks or clears every category, as a table's select-all does. */}
          <Checkbox
            className="min-h-12 border-b border-separator py-2"
            isIndeterminate={draft.length > 0 && !allPicked}
            isSelected={allPicked}
            onChange={() => setDraft(allPicked ? [] : topLevel)}
          >
            <Checkbox.Content className="w-full flex-row items-center gap-3">
              <Checkbox.Control className="size-5 shrink-0 rounded-md">
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span className="flex-1 font-semibold">{c.allCategories}</span>
              <span className="text-sm text-muted tabular-nums">{map.ranked.length}</span>
            </Checkbox.Content>
          </Checkbox>
          <CheckboxGroup
            aria-label={c.filterTitle}
            className="flex flex-col gap-0"
            value={draft}
            onChange={value => setDraft(topLevel.filter(id => value.includes(id)))}
          >
            {topLevel.map(id => (
              <Checkbox key={id} className="min-h-12 border-b border-separator py-2 last:border-b-0" value={id}>
                <Checkbox.Content className="w-full flex-row items-center gap-3">
                  <Checkbox.Control className="size-5 shrink-0 rounded-md">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="flex-1">{categoryName(id, language)}</span>
                  <span className="text-sm text-muted tabular-nums">{map.ranked.filter(pin => isHighlighted(pin, id)).length}</span>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </div>
      </div>
    </SheetFrame>
  )
}

/**
 * B's place sheet, laid out like the tour stop sheet (C09): the app's `SheetFrame` with the
 * name as its title, the photos as a swipeable gallery, the tip, the info rows, the stories,
 * and Open in Google Maps in the footer.
 */
function PlaceSheet({ map, language, props, isOpen, onClose }: {
  map: ReturnType<typeof useGuestMap>
  language: Language
  props: LabProps
  isOpen: boolean
  onClose: () => void
}) {
  const c = copy[language]
  const container = usePhoneFrame()
  const pin = map.openPin

  if (!pin)
    return null
  const title = pickText(pin.title, language)

  return (
    <SheetFrame
      container={container}
      tightBottom
      footer={<DirectionsAction bare context={props} pin={pin} />}
      isOpen={isOpen}
      title={title?.value ?? ''}
      onClose={onClose}
    >
      {title?.fallback && <InfoNote text={c.onlyIn[title.lang]} />}
      {pin.photos.length > 0 && (
        <PhotoGallery
          key={pin.id}
          className="aspect-[16/10] w-full shrink-0 rounded-2xl"
          labels={{
            gallery: c.gallery(title?.value ?? ''),
            photo: c.photoN,
            previous: c.previousPhoto,
            next: c.nextPhoto,
            close: c.close,
          }}
          photos={pin.photos}
        />
      )}
      <PinTip language={language} pin={pin} />
      <PinFacts language={language} pin={pin} />
    </SheetFrame>
  )
}

export function FoodOptionCards(props: LabProps) {
  const { language, focus } = props
  const c = copy[language]
  const map = useGuestMap(props)
  // V9 change: start filtered to "Local food and drink", once, as if picked in Categories.
  const [seeded, setSeeded] = useState(false)

  if (!seeded) {
    setSeeded(true)
    map.setPicked(['food'])
  }
  const headingId = useId()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filterOpen, setFilterOpen] = useState(false)
  const [details, setDetails] = useState(() => props.state === 'deep-link' || props.state === 'other-language' || Boolean(focus))
  // A pin opened from the dashboard opens its sheet (adjusted during render).
  const [focused, setFocused] = useState(focus)

  if (focus !== focused) {
    setFocused(focus)
    if (focus)
      setDetails(true)
  }

  const carouselRef = useRef<HTMLDivElement>(null)
  const focusCard = useRef(false)
  const carouselOpen = map.openPin && view === 'map' && map.highlight(map.openPin)
  const pickedCount = map.picked?.length

  // The card for the open pin slides to the middle; a pin tap also moves focus to its title.
  useEffect(() => {
    const card = carouselRef.current?.querySelector<HTMLElement>(`[data-card="${map.selected}"]`)

    if (!card || !carouselRef.current)
      return
    carouselRef.current.scrollTo({
      left: card.offsetLeft - (375 - CARD_WIDTH) / 2,
      behavior: reducedMotion() ? 'instant' : 'smooth',
    })
    if (focusCard.current) {
      focusCard.current = false
      card.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
    }
  }, [map.selected, carouselOpen])

  function openFromPin(id: string) {
    focusCard.current = true
    map.select(id)
  }

  // Swiping settles on a card, and its pin becomes the open one (once per swipe, not per frame).
  // The row holds only the places the filter keeps.
  function onScrollEnd(event: React.UIEvent<HTMLDivElement>) {
    const index = Math.round(event.currentTarget.scrollLeft / (CARD_WIDTH + 8))
    const pin = map.filtered[index]

    if (pin && pin.id !== map.selected)
      map.select(pin.id)
  }

  return (
    <>
      <div className="absolute inset-0">
        <GuestMap
          attempt={map.attempt}
          insets={{ top: 60, bottom: carouselOpen ? 210 + TAB_BAR : TAB_BAR }}
          label={c.mapLabel}
          pins={map.ranked}
          renderCluster={(members, zoomIn) => <PhotoCluster language={language} map={map} members={members} zoomIn={zoomIn} />}
          renderPin={pin => <PhotoPin language={language} look={lookOf(pin, map)} onSelect={openFromPin} />}
          selected={map.selected}
          showPins={map.pinsReady}
          onStatus={map.onStatus}
        />
        <MapStatusLayer className="top-[70px]" language={language} map={map} state={props.state} />

        {view === 'list' && (
          <div className="absolute inset-x-0 top-0 z-[8] overflow-y-auto bg-background px-4 pt-[60px] pb-4" style={{ bottom: TAB_BAR }}>
            <h2 className="pb-2 text-card-title font-semibold">{c.places(map.filtered.length)}</h2>
            {map.pinsReady && (
              <PinList
                language={language}
                map={{ ...map, select: (id) => {
                  map.select(id)
                  setDetails(true)
                } }}
              />
            )}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-3">
          <div className="flex items-start gap-2">
            <button
              aria-haspopup="dialog"
              className={`group relative flex h-8 items-center gap-1.5 rounded-full border-[1.5px] bg-surface px-3 text-[13px] font-medium shadow-surface outline-none focus-visible:focus-ring after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] ${pickedCount ? 'border-accent' : 'border-transparent'}`}
              data-selected={Boolean(pickedCount)}
              type="button"
              onClick={() => setFilterOpen(true)}
            >
              <FilterIcon size={16} />
              {pickedCount ? c.categoriesCount(pickedCount) : c.categories}
              <ChipCheck />
            </button>
            <span className="flex-1" />
            <button
              aria-pressed={view === 'list'}
              className="relative flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium shadow-surface outline-none focus-visible:focus-ring after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"
              type="button"
              onClick={() => setView(view === 'map' ? 'list' : 'map')}
            >
              {view === 'map' ? <BulletListIcon size={16} /> : <PickupIcon size={16} />}
              {view === 'map' ? c.list : c.map}
            </button>
          </div>
          {map.notice && <GoneNotice language={language} onDismiss={map.dismissNotice} />}
        </div>
        <LiveRegion text={map.announce} />
        {view === 'map' && (
          // Under the buttons while the card row is up, so the credits stay visible.
          <CompactCredits className="absolute start-3 z-10" style={carouselOpen ? { top: 52 } : { bottom: TAB_BAR + 8 }} />
        )}

        {carouselOpen && map.openPin && (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape closes it
          <section
            aria-labelledby={headingId}
            className="absolute inset-x-0 z-20"
            // V9 change: about 12 px above the frame's foot (the credits move up while a card is open).
            style={{ bottom: TAB_BAR }}
            onKeyDown={(event) => {
              if (event.key === 'Escape')
                map.close()
            }}
          >
            <h2 className="sr-only" id={headingId}>{c.places(map.filtered.length)}</h2>
            <div className="flex justify-end px-6 pb-2">
              <Button isIconOnly aria-label={c.close} className="size-11 min-w-11 rounded-full bg-surface shadow-overlay" variant="tertiary" onPress={map.close}>
                <CloseIcon size={20} />
              </Button>
            </div>
            <div
              ref={carouselRef}
              // V9 change: cards share the row's height; each card keeps its buttons at its foot.
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-8 pb-3 [scrollbar-width:none]"
              onScrollEnd={onScrollEnd}
            >
              {map.filtered.map(pin => (
                <CompactCard
                  key={pin.id}
                  active={pin.id === map.selected}
                  language={language}
                  pin={pin.id === map.openPin?.id ? map.openPin : pin}
                  props={props}
                  onDetails={() => setDetails(true)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <PlaceSheet
        isOpen={Boolean(details && map.openPin)}
        language={language}
        map={map}
        props={props}
        onClose={() => setDetails(false)}
      />
      {filterOpen && (
        <FilterSheet
          isOpen
          language={language}
          map={map}
          onApplied={(firstId) => {
            // Back on the map with the card row open on the first place the filter keeps.
            setView('map')
            setDetails(false)
            if (firstId)
              openFromPin(firstId)
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </>
  )
}
