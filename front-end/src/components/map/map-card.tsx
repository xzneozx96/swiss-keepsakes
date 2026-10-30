import type { ReactNode } from 'react'

import { Button } from '@heroui/react'
import { useEffect, useRef } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { focusStepButton } from './focus-step'
import { reducedMotion } from './reduced-motion'

/** A card in a `MapCardRow` is this wide (px), and the cards are this far apart. */
export const CARD_WIDTH = 311
const GAP = 8

/** The words of the step buttons; without them they say "Previous" and "Next". */
export interface MapCardNavLabels {
  previous: string
  next: string
}

/** "‹ 2 of 6 ›": which card of how many, and the way to the neighbours. */
export interface MapCardNavProps {
  /** Zero-based. */
  index: number
  count: number
  onStep: (delta: 1 | -1) => void
  labels?: MapCardNavLabels
}

function MapCardNav({ index, count, onStep, labels }: MapCardNavProps) {
  const { t } = useLocale()

  return (
    <>
      <Button
        isIconOnly
        aria-label={labels?.previous ?? t('map.card.previous')}
        data-step="previous"
        isDisabled={index <= 0}
        variant="tertiary"
        onPress={() => onStep(-1)}
      >
        <ChevronLeftIcon size={18} />
      </Button>
      <span className="min-w-14 text-center text-xs text-muted tabular-nums">
        {t('map.card.position', { number: index + 1, count })}
      </span>
      <Button
        isIconOnly
        aria-label={labels?.next ?? t('map.card.next')}
        data-step="next"
        isDisabled={index >= count - 1}
        variant="tertiary"
        onPress={() => onStep(1)}
      >
        <ChevronRightIcon size={18} />
      </Button>
    </>
  )
}

/** The round ✕ over a card's top right: 36 px to look at, a 44 px hit area to press. `floating` places it over the card's top right edge; without it the caller places it. */
export function MapCardClose({ floating = false, onClose }: { floating?: boolean, onClose: () => void }) {
  const { t } = useLocale()

  return (
    <Button
      isIconOnly
      aria-label={t('map.card.close')}
      className={`${floating ? 'absolute end-0 bottom-full mb-2' : 'relative'} size-9 min-w-9 rounded-full bg-surface text-foreground shadow-overlay before:absolute before:-inset-1 before:content-['']`}
      size="sm"
      variant="tertiary"
      onPress={onClose}
    >
      <CloseIcon size={18} />
    </Button>
  )
}

/**
 * The card of one place or stop over a map, the tour route map's card: an eyebrow, a serif title (one line), a text
 * (two lines at most), the picture on the right, then `‹ n of m ›` and one action. A card in a row takes the height of
 * the tallest, and the buttons sit on its bottom edge. `active: false` takes the buttons out of the tab order (a card
 * that is in the row but not open). `onClose` puts the ✕ over the card's top right: a row has its own.
 */
export function MapCard({
  id,
  title,
  titleLang,
  headingLevel = 2,
  eyebrow,
  text,
  textLang,
  thumb,
  nav,
  action,
  active = true,
  onClose,
}: {
  id: string
  title: string
  titleLang?: string
  headingLevel?: 2 | 3
  eyebrow?: string
  text?: string
  textLang?: string
  /** A `MapThumb`, or a photo made the same size: 76 px square. */
  thumb: ReactNode
  nav?: MapCardNavProps
  /** "View more" Button or "Read the story" Link. */
  action?: ReactNode
  active?: boolean
  onClose?: () => void
}) {
  const Heading = `h${headingLevel}` as const
  const titleId = `map-card-${id}`

  return (
    <article aria-labelledby={titleId} className="relative flex w-full flex-col justify-between gap-2 rounded-2xl bg-surface p-3 shadow-overlay" data-card={id}>
      {onClose && <MapCardClose floating onClose={onClose} />}
      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {eyebrow && <p className="truncate text-xs text-muted tabular-nums">{eyebrow}</p>}
          <Heading className="truncate font-serif text-card-title font-semibold outline-none" id={titleId} lang={titleLang} tabIndex={-1}>
            {title}
          </Heading>
          {text && <p className="line-clamp-2 text-sm text-muted" lang={textLang}>{text}</p>}
        </div>
        <div className="size-[76px] shrink-0 overflow-hidden rounded-xl">{thumb}</div>
      </div>
      {(nav || action) && (
        <div className="flex items-center gap-1" inert={!active}>
          {nav && <MapCardNav {...nav} />}
          <span className="flex-1" />
          {action}
        </div>
      )}
    </article>
  )
}

/**
 * The row of cards over a map, `bottom` px above the bottom edge (plus the home-indicator inset). It swipes in
 * step with the pins: the open card slides to the middle, and a swipe that settles on a card opens it (once per
 * swipe, not per frame). With two cards or more each card gets `‹ n of m ›`: a step button opens the neighbour and keeps focus on the same kind of button there. Escape
 * from inside the row closes it. The ✕ sits over the row's right edge, outside the scroll.
 */
export function MapCardRow<T extends { id: string }>({
  items,
  selectedId,
  label,
  bottom,
  renderCard,
  onSelect,
  onClose,
}: {
  items: T[]
  selectedId: string
  /** The row's accessible name. */
  label: string
  bottom: number
  renderCard: (item: T, state: { active: boolean, nav: MapCardNavProps | undefined }) => ReactNode
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const row = rowRef.current
    const card = row?.querySelector<HTMLElement>(`[data-card-slot="${selectedId}"]`)

    if (!row || !card)
      return
    row.scrollTo({
      left: card.offsetLeft - (row.clientWidth - CARD_WIDTH) / 2,
      behavior: reducedMotion() ? 'instant' : 'smooth',
    })
  }, [selectedId])

  function onScrollEnd(event: React.UIEvent<HTMLDivElement>) {
    const item = items[Math.round(event.currentTarget.scrollLeft / (CARD_WIDTH + GAP))]

    if (item && item.id !== selectedId)
      onSelect(item.id)
  }

  function stepFrom(index: number, delta: 1 | -1) {
    const target = items[index + delta]

    if (!target)
      return
    onSelect(target.id)
    focusStepButton(document.querySelector(`[data-card-slot="${target.id}"]`), delta, index + delta, items.length)
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape closes the row
    <section
      aria-label={label}
      className="absolute inset-x-0 z-20"
      style={{ bottom: `calc(env(safe-area-inset-bottom,0px) + ${bottom}px)` }}
      onKeyDown={(event) => {
        if (event.key === 'Escape')
          onClose()
      }}
    >
      <div className="flex justify-end px-6 pb-2">
        <MapCardClose onClose={onClose} />
      </div>
      <div
        ref={rowRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-[calc(50%-155.5px)] pb-3 [scrollbar-width:none]"
        onScrollEnd={onScrollEnd}
      >
        {items.map((item, index) => (
          <div key={item.id} className="flex w-[311px] shrink-0 snap-center" data-card-slot={item.id}>
            {renderCard(item, { active: item.id === selectedId, nav: items.length > 1 ? { index, count: items.length, onStep: delta => stepFrom(index, delta) } : undefined })}
          </div>
        ))}
      </div>
    </section>
  )
}
