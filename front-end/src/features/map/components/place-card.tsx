import type { PublicMapItem } from '@sk/api-contract'

import { Button, buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { CloseIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'
import { PinThumb } from './pin-marker'

const CARD_WIDTH = 311
const GAP = 8

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The card of one pin (N03, the part E4.6 builds): a thumbnail slot that is always there (the
 * place icon when there is no photo), so every card in the row has one height; the title; the
 * next date when the pin has dates; and the main story when it has one. No price. The details
 * sheet, hours, address and directions are E4.7.
 */
function PlaceCard({ pin, active }: { pin: PublicMapItem, active: boolean }) {
  const { t, language, intlLocale } = useLocale()
  const date = pin.nextDate
    ? nextDateLine(pin.nextDate, zurichToday(new Date()), intlLocale, {
        until: day => t('map.date.until', { day }),
        from: time => t('map.date.from', { time }),
      })
    : undefined

  return (
    <article
      aria-labelledby={`place-card-${pin.id}`}
      className="flex w-[311px] shrink-0 snap-center flex-col gap-3 rounded-3xl bg-surface p-3 shadow-overlay"
      data-card={pin.id}
    >
      <div className="flex gap-3">
        <PinThumb className="size-[84px] shrink-0 rounded-2xl" iconSize={32} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate font-serif text-card-title outline-none" id={`place-card-${pin.id}`} lang={pin.language} tabIndex={-1}>
            {pin.title}
          </h2>
          {date && <p className="truncate text-label text-muted tabular-nums">{date}</p>}
        </div>
      </div>
      {pin.hasMainStory && pin.mainStorySlug && (
        <div className="mt-auto flex" inert={!active}>
          <Link
            className={`${buttonVariants({ variant: 'secondary', fullWidth: true })} min-h-11`}
            params={{ lang: language, slug: pin.mainStorySlug }}
            to="/$lang/stories/$slug"
          >
            {t('map.card.readStory')}
          </Link>
        </div>
      )}
    </article>
  )
}

/**
 * The row of place cards above the tab bar. It holds only the places the filter keeps and swipes
 * in step with the pins: the open pin's card slides to the middle, and a swipe that settles on a
 * card opens that pin (once per swipe, not per frame).
 */
export function PlaceCardRow({
  pins,
  selectedId,
  onSelect,
  onClose,
}: {
  pins: PublicMapItem[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const row = rowRef.current
    const card = row?.querySelector<HTMLElement>(`[data-card="${selectedId}"]`)

    if (!row || !card)
      return
    row.scrollTo({
      left: card.offsetLeft - (row.clientWidth - CARD_WIDTH) / 2,
      behavior: reducedMotion() ? 'instant' : 'smooth',
    })
  }, [selectedId])

  function onScrollEnd(event: React.UIEvent<HTMLDivElement>) {
    const pin = pins[Math.round(event.currentTarget.scrollLeft / (CARD_WIDTH + GAP))]

    if (pin && pin.id !== selectedId)
      onSelect(pin.id)
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape closes the row
    <section
      aria-label={t(pins.length === 1 ? 'map.places.one' : 'map.places.other', { count: pins.length })}
      className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+124px)] z-20"
      onKeyDown={(event) => {
        if (event.key === 'Escape')
          onClose()
      }}
    >
      <div className="flex justify-end px-6 pb-2">
        <Button isIconOnly aria-label={t('map.card.close')} className="size-11 min-w-11 rounded-full bg-surface shadow-overlay" variant="tertiary" onPress={onClose}>
          <CloseIcon size={20} />
        </Button>
      </div>
      <div
        ref={rowRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-[calc(50%-155.5px)] pb-3 [scrollbar-width:none]"
        onScrollEnd={onScrollEnd}
      >
        {pins.map(pin => <PlaceCard key={pin.id} active={pin.id === selectedId} pin={pin} />)}
      </div>
    </section>
  )
}
