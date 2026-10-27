import type { ReactNode } from 'react'

import { Chip, ToggleButton } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { memo } from 'react'

import { ClockIcon, FavouriteIcon, RatingIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'

export interface ListingCardProps {
  to: '/$lang/gifts/$slug' | '/$lang/tours/$slug'
  slug: string
  name: string
  photo?: string
  fromLabel: string
  price: string
  metadata: string
  supplementaryMetadata?: ReactNode
  badge?: string
  statusLabel?: string
  languageNote?: string
  rating?: { value: string, count: string, label: string }
  favourite?: { isSaved: boolean, onToggle: () => void, label: string }
  layout?: 'carousel' | 'grid'
  disabled?: boolean
}

/**
 * Card builders make `rating` and `favourite` as new objects on every render, and `onToggle` as a
 * new closure that only ever toggles this one listing. Comparing them by what they show keeps a
 * list of cards from re-rendering when one heart is tapped or the page above changes.
 */
export function sameListing(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)])

  for (const key of keys) {
    if (key === 'favourite') {
      const a = prev.favourite as ListingCardProps['favourite']
      const b = next.favourite as ListingCardProps['favourite']

      if (
        !a !== !b
        || (a && b && (a.isSaved !== b.isSaved || a.label !== b.label))
      ) {
        return false
      }
    }
    else if (key === 'rating') {
      const a = prev.rating as ListingCardProps['rating']
      const b = next.rating as ListingCardProps['rating']

      if (
        !a !== !b
        || (a
          && b
          && (a.value !== b.value || a.count !== b.count || a.label !== b.label))
      ) {
        return false
      }
    }
    else if (!Object.is(prev[key], next[key])) {
      return false
    }
  }

  return true
}

/** The shared photo, price, typography and heart treatment for gifts and tours. */
export const ListingCard = memo(function ListingCard({
  to,
  slug,
  name,
  photo,
  fromLabel,
  price,
  metadata,
  supplementaryMetadata,
  badge,
  statusLabel,
  languageNote,
  rating,
  favourite,
  layout = 'grid',
  disabled = false,
}: ListingCardProps) {
  const { language } = useLocale()
  const contentClass
    = 'flex h-full flex-col gap-2.5 rounded-3xl outline-none focus-visible:focus-ring transition-transform active:scale-[0.98]'
  const content = (
    <>
      <Media alt="" className="aspect-[4/3] rounded-3xl" photo={photo}>
        {badge && (
          <Chip
            className="pill absolute start-2.5 top-2.5 font-semibold"
            size="md"
            variant="secondary"
          >
            <Chip.Label>{badge}</Chip.Label>
          </Chip>
        )}
        <span className="pill absolute start-2.5 bottom-2.5 rounded-full px-3 py-1 text-sm">
          <span className="text-muted">
            {fromLabel}
            {' '}
          </span>
          <span className="font-semibold tabular-nums">{price}</span>
        </span>
      </Media>
      <div className="flex flex-col gap-0.5 px-0.5">
        <h3 className="font-serif text-card-title text-balance">{name}</h3>
        {languageNote && <p className="text-xs text-muted">{languageNote}</p>}
        {rating && (
          <p
            aria-label={rating.label}
            className="flex items-center gap-1 text-label"
          >
            <RatingIcon aria-hidden size={14} weight="Filled" />
            <span aria-hidden className="font-semibold tabular-nums">
              {rating.value}
            </span>
            <span aria-hidden className="text-muted tabular-nums">
              (
              {rating.count}
              )
            </span>
          </p>
        )}
        {statusLabel
          ? (
              <div className="pt-1">
                <StatusChip tone="neutral">{statusLabel}</StatusChip>
              </div>
            )
          : (
              <p className="flex items-start gap-1.5 text-label text-muted">
                <ClockIcon className="mt-0.5 shrink-0" size={14} />
                {metadata}
              </p>
            )}
        {supplementaryMetadata}
      </div>
    </>
  )

  return (
    <div
      className={`relative ${layout === 'carousel' ? 'w-60 shrink-0 snap-start' : 'h-full'}`}
    >
      {disabled
        ? (
            <div aria-disabled="true" className={contentClass}>
              {content}
            </div>
          )
        : (
            <Link className={contentClass} params={{ lang: language, slug }} to={to}>
              {content}
            </Link>
          )}

      {favourite && (
        <ToggleButton
          isIconOnly
          aria-label={favourite.label}
          className="pill absolute end-2.5 top-2.5 z-10 [&_svg]:size-[22px] data-[hovered=true]:bg-white data-[pressed=true]:bg-white data-[selected=true]:bg-white/80 data-[selected=true]:text-accent"
          isSelected={favourite.isSaved}
          size="sm"
          onChange={favourite.onToggle}
        >
          <FavouriteIcon
            size={22}
            weight={favourite.isSaved ? 'Filled' : 'Outline'}
          />
        </ToggleButton>
      )}
    </div>
  )
}, sameListing)
