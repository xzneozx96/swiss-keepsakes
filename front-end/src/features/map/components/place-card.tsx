import type { PublicMapItem } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { Button, buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { MapCard, MapCardRow } from '@/components/map/map-card'
import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'
import { CARD_ROW_BOTTOM } from '@/features/map/lib/layout'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'

/** The words a card shows besides the pin's own fields, when the caller has them (the guest map's category names; the place editor's preview adds the tip). */
export interface CardExtras {
  /** The tips from a local, in the language they are written in. */
  tip?: { text: string, language: Language }
  /** The names of the pin's categories, the most specific first. */
  categories?: string[]
}

/**
 * The card of one pin (N03, the part E4.6 builds): a thumbnail slot on the left that is always there (the place icon
 * when there is no photo), the title, the first category and the next date, and the tip (two lines) beside it,
 * centred against the picture, `‹ n of m ›`, and "Read the story" when the pin has a main story. No price. The
 * details sheet, hours, address and directions are E4.7.
 */
function PlaceCard({ pin, active, photoSrc, extras, nav, onReadStory }: {
  pin: PublicMapItem
  active: boolean
  photoSrc?: string
  extras?: CardExtras
  nav: React.ComponentProps<typeof MapCard>['nav']
  onReadStory?: (pin: PublicMapItem) => void
}) {
  const { t, language, intlLocale } = useLocale()
  const date = pin.nextDate
    ? nextDateLine(pin.nextDate, zurichToday(new Date()), intlLocale, {
        until: day => t('map.date.until', { day }),
        from: time => t('map.date.from', { time }),
      })
    : undefined

  return (
    <MapCard
      action={pin.hasMainStory && pin.mainStorySlug
        ? onReadStory
          ? <Button size="sm" variant="secondary" onPress={() => onReadStory(pin)}>{t('map.card.readStory')}</Button>
          : (
              <Link
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                params={{ lang: language, slug: pin.mainStorySlug }}
                to="/$lang/stories/$slug"
              >
                {t('map.card.readStory')}
              </Link>
            )
        : undefined}
      active={active}
      eyebrow={[extras?.categories?.[0], date].filter(Boolean).join(' · ')}
      id={pin.id}
      layout="pin"
      nav={nav}
      text={extras?.tip?.text}
      textLang={extras?.tip?.language}
      thumb={<MapThumb className="size-full" iconSize={32} src={photoSrc} />}
      title={pin.title}
      titleLang={pin.language}
    />
  )
}

/**
 * The row of place cards above the tab bar. It holds only the places the filter keeps and swipes
 * in step with the pins (see `MapCardRow`). It sits `bottom` px above the bottom edge (plus the
 * home-indicator inset): the default clears the guest tab bar and the music button, a screen without them
 * passes a smaller one.
 */
export function PlaceCardRow({
  pins,
  selectedId,
  photoOf,
  extrasOf,
  bottom = CARD_ROW_BOTTOM,
  onReadStory,
  onSelect,
  onClose,
}: {
  pins: PublicMapItem[]
  selectedId: string
  /** The picture of a pin, when the caller knows it (the place editor's preview); without it a card shows the place icon. */
  photoOf?: (pin: PublicMapItem) => string | undefined
  /** The category names and tips of a pin, when the caller knows them; without them a card shows neither. */
  extrasOf?: (pin: PublicMapItem) => CardExtras | undefined
  /** Space under the row (px). The guest map keeps `CARD_ROW_BOTTOM`; the editor's preview has no tab bar or music button. */
  bottom?: number
  /** Opens the story in place of the link to the story page (the place editor's preview, which stays on its page). */
  onReadStory?: (pin: PublicMapItem) => void
  onSelect: (id: string) => void
  /** Without it the row has no ✕. */
  onClose?: () => void
}) {
  const { t } = useLocale()

  return (
    <MapCardRow
      bottom={bottom}
      items={pins}
      label={t(pins.length === 1 ? 'map.places.one' : 'map.places.other', { count: pins.length })}
      renderCard={(pin, { active, nav }) => <PlaceCard active={active} extras={extrasOf?.(pin)} nav={nav} photoSrc={photoOf?.(pin)} pin={pin} onReadStory={onReadStory} />}
      selectedId={selectedId}
      onClose={onClose}
      onSelect={onSelect}
    />
  )
}
